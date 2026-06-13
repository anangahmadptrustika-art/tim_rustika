import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/dashboard/stat-card';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatRupiah } from '@/lib/utils';
import {
  executiveKpis,
  employeeRanking,
  productivityTrend,
} from '@/server/services/analytics.service';
import { periodPoints } from '@/server/services/bonus.service';
import { Activity, CheckCircle2, Clock, Coins, ListChecks, Trophy, Users } from 'lucide-react';

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  if (user.role === 'EMPLOYEE') {
    return <EmployeeDashboard userId={user.id} year={year} month={month} />;
  }
  return <ExecutiveDashboard year={year} month={month} />;
}

async function ExecutiveDashboard({ year, month }: { year: number; month: number }) {
  const [kpis, ranking, trend] = await Promise.all([
    executiveKpis(),
    employeeRanking(year, month, 5),
    productivityTrend(12),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Executive Overview</h2>
        <p className="text-muted-foreground">Company-wide performance for {year}-{String(month).padStart(2, '0')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Tasks" value={kpis.activeTasks} icon={ListChecks} />
        <StatCard label="Completed" value={kpis.completedTasks} icon={CheckCircle2} tone="success" />
        <StatCard label="Late Tasks" value={kpis.lateTasks} icon={Clock} tone="destructive" hint={`${kpis.onTimeRate}% on-time`} />
        <StatCard label="Employees" value={kpis.employees} icon={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Productivity Trend (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" /> Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ranking.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            {ranking.map((r) => (
              <div key={r.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {r.rank}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.department}</p>
                  </div>
                </div>
                <Badge variant="secondary">{r.points} pts</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function EmployeeDashboard({ userId, year, month }: { userId: string; year: number; month: number }) {
  const [tasks, points, rate, openComp] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId, status: { in: ['TODO', 'IN_PROGRESS', 'SUBMITTED', 'REJECTED'] } },
      orderBy: { deadline: 'asc' },
      take: 6,
    }),
    periodPoints(userId, year, month),
    prisma.conversionRate.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } }),
    prisma.compensation.count({ where: { userId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
  ]);

  const rupiahPerPoint = rate?.rupiahPerPoint ?? 1000;
  const estBonus = Math.max(0, points) * rupiahPerPoint;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Performance</h2>
        <p className="text-muted-foreground">Your tasks, points & rewards this month</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Tasks" value={tasks.length} icon={ListChecks} />
        <StatCard label="Points (month)" value={points} icon={Activity} tone="success" />
        <StatCard label="Est. Bonus" value={formatRupiah(estBonus)} icon={Coins} hint={`${rupiahPerPoint}/pt`} />
        <StatCard label="Open Compensation" value={openComp} icon={Clock} tone={openComp ? 'warning' : 'default'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">No active tasks. 🎉</p>}
          {tasks.map((t) => (
            <div key={t.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{t.title}</p>
                <Badge variant={t.status === 'SUBMITTED' ? 'warning' : 'secondary'}>{t.status}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Due {t.deadline.toLocaleDateString('id-ID')}</span>
                <span>{t.difficulty} · weight {t.weight}</span>
              </div>
              <Progress value={t.progress} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
