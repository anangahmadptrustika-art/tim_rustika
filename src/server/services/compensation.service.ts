import { prisma } from '@/lib/prisma';
import { isCompensationEligibleDay, periodOf } from '@/lib/datetime';
import { notify } from './notification.service';
import { writeAudit } from './audit.service';

/** Log a weekend/holiday make-up workday against a compensation obligation. */
export async function logCompensationWorkday(input: {
  compensationId: string;
  workDate: Date;
  hours: number;
  note?: string;
  proofUrl?: string;
  actorId: string;
}) {
  const comp = await prisma.compensation.findUnique({ where: { id: input.compensationId } });
  if (!comp) throw new Error('Compensation not found');
  if (comp.userId !== input.actorId) throw new Error('Not your compensation obligation');

  const holidays = (await prisma.holiday.findMany({ select: { date: true } })).map((h) => h.date);
  if (!isCompensationEligibleDay(input.workDate, holidays)) {
    throw new Error('Compensation workdays must fall on a weekend or holiday');
  }

  const workday = await prisma.$transaction(async (tx) => {
    const wd = await tx.compensationWorkday.create({
      data: {
        compensationId: comp.id,
        workDate: input.workDate,
        hours: input.hours,
        note: input.note,
        proofUrl: input.proofUrl,
      },
    });
    const served = comp.servedWorkdays + input.hours / 8;
    await tx.compensation.update({
      where: { id: comp.id },
      data: {
        servedWorkdays: served,
        status: served >= comp.requiredWorkdays ? 'SUBMITTED' : 'IN_PROGRESS',
      },
    });
    return wd;
  });

  await writeAudit({ actorId: input.actorId, action: 'compensation.logWorkday', entity: 'Compensation', entityId: comp.id });
  return workday;
}

/**
 * Manager verification: clears the obligation and credits the previously
 * deducted late penalty back to the employee's ledger.
 */
export async function verifyCompensation(compensationId: string, verifierId: string) {
  const comp = await prisma.compensation.findUnique({
    where: { id: compensationId },
    include: { task: true },
  });
  if (!comp) throw new Error('Compensation not found');

  const now = new Date();
  const { year, month } = periodOf(now);

  await prisma.$transaction(async (tx) => {
    await tx.compensation.update({
      where: { id: compensationId },
      data: { status: 'VERIFIED', verifiedById: verifierId, verifiedAt: now },
    });
    await tx.compensationWorkday.updateMany({
      where: { compensationId },
      data: { verified: true },
    });
    if (comp.pointsToRestore > 0) {
      await tx.pointTransaction.create({
        data: {
          userId: comp.userId,
          taskId: comp.taskId,
          type: 'COMPENSATION_CREDIT',
          points: comp.pointsToRestore,
          reason: 'Late penalty restored after verified compensation',
          periodYear: year,
          periodMonth: month,
          createdBy: verifierId,
        },
      });
    }
  });

  await notify({
    userId: comp.userId,
    type: 'COMPENSATION_VERIFIED',
    title: 'Compensation verified ✅',
    body: `Your make-up work was verified. ${comp.pointsToRestore} points restored.`,
    data: { compensationId },
    channels: ['IN_APP', 'EMAIL'],
  });

  await writeAudit({ actorId: verifierId, action: 'compensation.verify', entity: 'Compensation', entityId: compensationId });
}
