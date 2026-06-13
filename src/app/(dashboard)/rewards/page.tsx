import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { periodPoints } from '@/server/services/bonus.service';
import { formatRupiah } from '@/lib/utils';
import { Coins, Activity, Wallet } from 'lucide-react';

export default async function RewardsPage() {
  const user = (await auth())!.user;
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const [points, rate, transactions, bonuses] = await Promise.all([
    periodPoints(user.id, year, month),
    prisma.conversionRate.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } }),
    prisma.pointTransaction.findMany({
      where: { userId: user.id, periodYear: year, periodMonth: month },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.monthlyBonus.findMany({
      where: { userId: user.id },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      take: 12,
    }),
  ]);

  const rupiahPerPoint = rate?.rupiahPerPoint ?? 1000;
  const estBonus = Math.max(0, points) * rupiahPerPoint;

  return (
    <div>
      <PageHeader title="Points & Bonus" subtitle={`Your rewards for ${year}-${String(month).padStart(2, '0')}`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Points this month" value={points} icon={Activity} tone="success" />
        <StatCard label="Conversion rate" value={`${formatRupiah(rupiahPerPoint)}/pt`} icon={Coins} />
        <StatCard label="Est. bonus" value={formatRupiah(estBonus)} icon={Wallet} hint="points × rate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Point Ledger (this month)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transactions.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">{tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{tx.reason ?? '—'}</p>
                </div>
                <span className={tx.points >= 0 ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                  {tx.points >= 0 ? '+' : ''}
                  {tx.points}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Bonus History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bonuses.length === 0 && <p className="text-sm text-muted-foreground">No bonus records yet.</p>}
            {bonuses.map((b) => (
              <div key={b.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">
                    {b.periodYear}-{String(b.periodMonth).padStart(2, '0')}
                  </p>
                  <p className="text-xs text-muted-foreground">{b.totalPoints} pts</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatRupiah(b.netAmount)}</span>
                  <Badge variant={b.isPublished ? 'success' : 'secondary'}>
                    {b.isPublished ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
