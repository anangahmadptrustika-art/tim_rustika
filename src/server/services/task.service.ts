import type { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeScore } from '@/lib/scoring-engine';
import { periodOf } from '@/lib/datetime';
import { notify } from './notification.service';
import { writeAudit } from './audit.service';
import { emitToDepartment } from '@/server/realtime/emitter';

async function activeScoringConfig(departmentId?: string | null) {
  const config =
    (departmentId
      ? await prisma.scoringConfig.findFirst({ where: { departmentId, isActive: true } })
      : null) ?? (await prisma.scoringConfig.findFirst({ where: { departmentId: null, isActive: true } }));

  if (!config) throw new Error('No active ScoringConfig found. Seed the database.');
  return config;
}

async function transitionStatus(
  tx: Prisma.TransactionClient,
  taskId: string,
  from: TaskStatus | null,
  to: TaskStatus,
  changedBy: string,
  note?: string,
) {
  await tx.taskStatusHistory.create({ data: { taskId, from, to, changedBy, note } });
}

/**
 * Approve a task's completion. Runs the scoring engine, writes point
 * transactions, opens a compensation obligation when late, and fans out
 * notifications — all in a single transaction.
 */
export async function approveTaskCompletion(taskId: string, reviewerId: string, note?: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { assignee: true } });
  if (!task) throw new Error('Task not found');
  if (task.status !== 'SUBMITTED') {
    throw new Error(`Task must be SUBMITTED to approve (current: ${task.status})`);
  }

  const config = await activeScoringConfig(task.departmentId);
  const completedAt = new Date();
  const breakdown = computeScore({
    basePoints: task.basePoints,
    difficulty: task.difficulty,
    weight: task.weight,
    deadline: task.deadline,
    completedAt,
    config,
  });

  const { year, month } = periodOf(completedAt);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Finalize the task
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt,
        progress: 100,
        awardedPoints: breakdown.netPoints,
        wasLate: breakdown.wasLate,
        daysEarly: breakdown.daysEarly,
        daysLate: breakdown.daysLate,
      },
    });

    await transitionStatus(tx, taskId, 'SUBMITTED', 'COMPLETED', reviewerId, note);
    await tx.taskApproval.create({
      data: { taskId, reviewerId, decision: 'APPROVED', note, decidedAt: completedAt },
    });

    // 2. Write point transactions (one row per component for auditability)
    const components: { type: Parameters<typeof tx.pointTransaction.create>[0]['data']['type']; points: number; reason: string }[] = [
      { type: 'BASE', points: breakdown.adjustedBase, reason: `Base x difficulty(${breakdown.difficultyMultiplier}) x weight(${breakdown.weight})` },
    ];
    if (breakdown.earlyBonus > 0) {
      components.push({ type: 'EARLY_BONUS', points: breakdown.earlyBonus, reason: `${breakdown.daysEarly} day(s) early` });
    }
    if (breakdown.latePenalty > 0) {
      components.push({ type: 'LATE_PENALTY', points: -breakdown.latePenalty, reason: `${breakdown.daysLate} day(s) late` });
    }
    await tx.pointTransaction.createMany({
      data: components.map((c) => ({
        userId: task.assigneeId,
        taskId,
        type: c.type,
        points: c.points,
        reason: c.reason,
        periodYear: year,
        periodMonth: month,
      })),
    });

    // 3. Open a compensation obligation when lateness crosses the threshold
    if (breakdown.compensationRequired) {
      await tx.compensation.create({
        data: {
          taskId,
          userId: task.assigneeId,
          status: 'OPEN',
          daysLate: breakdown.daysLate,
          requiredWorkdays: breakdown.requiredWorkdays,
          pointsToRestore: breakdown.pointsToRestore,
          dueBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return updated;
  });

  // 4. Notifications & realtime (outside the transaction)
  await notify({
    userId: task.assigneeId,
    type: 'TASK_APPROVED',
    title: 'Task approved 🎉',
    body: `"${task.title}" approved. You earned ${breakdown.netPoints} points.`,
    data: { taskId, points: breakdown.netPoints },
    channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
  });
  await notify({
    userId: task.assigneeId,
    type: 'POINTS_AWARDED',
    title: 'Points awarded',
    body: `${breakdown.netPoints >= 0 ? '+' : ''}${breakdown.netPoints} points added for ${year}-${String(month).padStart(2, '0')}.`,
    data: { taskId, breakdown },
  });
  if (breakdown.compensationRequired) {
    await notify({
      userId: task.assigneeId,
      type: 'COMPENSATION_REQUIRED',
      title: 'Compensation required',
      body: `Task was ${breakdown.daysLate} day(s) late. Serve ${breakdown.requiredWorkdays} weekend workday(s) to recover ${breakdown.pointsToRestore} points.`,
      data: { taskId },
      channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
    });
  }

  if (task.departmentId) {
    emitToDepartment(task.departmentId, 'task:completed', { taskId, points: breakdown.netPoints });
  }

  await writeAudit({
    actorId: reviewerId,
    action: 'task.approve',
    entity: 'Task',
    entityId: taskId,
    metadata: { breakdown },
  });

  return { task: result, breakdown };
}

/** Reject a submitted task, sending it back to IN_PROGRESS. */
export async function rejectTaskCompletion(taskId: string, reviewerId: string, note?: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('Task not found');

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: taskId }, data: { status: 'IN_PROGRESS' } });
    await transitionStatus(tx, taskId, task.status, 'IN_PROGRESS', reviewerId, note);
    await tx.taskApproval.create({
      data: { taskId, reviewerId, decision: 'REJECTED', note, decidedAt: new Date() },
    });
  });

  await notify({
    userId: task.assigneeId,
    type: 'TASK_REJECTED',
    title: 'Revision requested',
    body: `"${task.title}" needs changes: ${note ?? 'see reviewer note'}.`,
    data: { taskId },
    channels: ['IN_APP', 'EMAIL'],
  });

  await writeAudit({ actorId: reviewerId, action: 'task.reject', entity: 'Task', entityId: taskId });
}
