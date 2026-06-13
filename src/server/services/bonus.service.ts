import { prisma } from '@/lib/prisma';
import { pointsToRupiah } from '@/lib/scoring-engine';
import { notify } from './notification.service';
import { writeAudit } from './audit.service';

async function activeRupiahPerPoint(): Promise<number> {
  const rate = await prisma.conversionRate.findFirst({
    where: { isActive: true },
    orderBy: { effectiveFrom: 'desc' },
  });
  return rate?.rupiahPerPoint ?? 1000;
}

/** Sum a user's net points for a given period from the ledger. */
export async function periodPoints(userId: string, year: number, month: number): Promise<number> {
  const agg = await prisma.pointTransaction.aggregate({
    where: { userId, periodYear: year, periodMonth: month },
    _sum: { points: true },
  });
  return agg._sum.points ?? 0;
}

/**
 * Compute (and upsert) the monthly bonus for every active user in a period.
 * Idempotent: re-running recomputes unpublished bonuses.
 */
export async function generateMonthlyBonuses(year: number, month: number) {
  const rupiahPerPoint = await activeRupiahPerPoint();
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });

  const results = [];
  for (const { id: userId } of users) {
    const totalPoints = await periodPoints(userId, year, month);
    const grossAmount = pointsToRupiah(totalPoints, rupiahPerPoint);

    const bonus = await prisma.monthlyBonus.upsert({
      where: { userId_periodYear_periodMonth: { userId, periodYear: year, periodMonth: month } },
      create: {
        userId,
        periodYear: year,
        periodMonth: month,
        totalPoints,
        rupiahPerPoint,
        grossAmount,
        netAmount: grossAmount,
      },
      // Don't clobber a published bonus.
      update: {},
    });

    if (!bonus.isPublished) {
      await prisma.monthlyBonus.update({
        where: { id: bonus.id },
        data: { totalPoints, rupiahPerPoint, grossAmount, netAmount: grossAmount + bonus.adjustments },
      });
    }
    results.push(bonus);
  }

  await writeAudit({ action: 'bonus.generate', entity: 'MonthlyBonus', metadata: { year, month, count: results.length } });
  return results;
}

/** Publish bonuses for a period (locks amounts and notifies employees). */
export async function publishMonthlyBonuses(year: number, month: number, publishedBy: string) {
  const bonuses = await prisma.monthlyBonus.findMany({
    where: { periodYear: year, periodMonth: month, isPublished: false },
  });

  for (const bonus of bonuses) {
    await prisma.monthlyBonus.update({
      where: { id: bonus.id },
      data: { isPublished: true, publishedAt: new Date(), publishedBy },
    });
    await notify({
      userId: bonus.userId,
      type: 'BONUS_PUBLISHED',
      title: 'Monthly bonus published',
      body: `Your ${year}-${String(month).padStart(2, '0')} bonus: ${bonus.totalPoints} points → Rp ${bonus.netAmount.toLocaleString('id-ID')}.`,
      data: { bonusId: bonus.id },
      channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
    });
  }

  await writeAudit({ actorId: publishedBy, action: 'bonus.publish', entity: 'MonthlyBonus', metadata: { year, month, count: bonuses.length } });
  return bonuses.length;
}
