import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, ok, requireUser } from '@/lib/api';
import { ForbiddenError } from '@/lib/rbac';
import { notify } from '@/server/services/notification.service';

interface Ctx {
  params: Promise<{ id: string }>;
}

// POST /api/tasks/[id]/submit — employee submits completed work for review.
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id }, include: { creator: true } });
    if (!task) return ok(null, { status: 404 });
    if (task.assigneeId !== user.id) throw new ForbiddenError('Only the assignee can submit');
    if (!['TODO', 'IN_PROGRESS', 'REJECTED'].includes(task.status)) {
      return ok({ error: `Cannot submit from status ${task.status}` }, { status: 409 });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date(), progress: 100 },
    });
    await prisma.taskStatusHistory.create({
      data: { taskId: id, from: task.status, to: 'SUBMITTED', changedBy: user.id },
    });

    await notify({
      userId: task.creatorId,
      type: 'APPROVAL_REQUESTED',
      title: 'Task awaiting approval',
      body: `${user.name} submitted "${task.title}" for review.`,
      data: { taskId: id },
      channels: ['IN_APP', 'EMAIL'],
    });

    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
