import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { TrendChart } from '@/components/dashboard/trend-chart';
import {
  executiveKpis,
  productivityTrend,
  departmentRanking,
} from '@/server/services/analytics.service';
import { CheckCircle2, Clock, ListChecks, TrendingUp } from 'lucide-react';

export default async function AnalyticsPage() {
  const session = await auth();
  if (!can(session!.user.role, 'analytics.team')) redirect('/dashboard');

  const now = new Date();
  const [kpis, trend, departments] = await Promise.all([
    executiveKpis(),
    productivityTrend(12),
    departmentRanking(now.getUTCFullYear(), now.getUTCMonth() + 1),
  ]);
  const maxDept = Math.max(1, ...departments.map((d) => d.points));

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Productivity & performance insights" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active" value={kpis.activeTasks} icon={ListChecks} />
        <StatCard label="Completed" value={kpis.completedTasks} icon={CheckCircle2} tone="success" />
        <StatCard label="Late" value={kpis.lateTasks} icon={Clock} tone="destructive" />
        <StatCard label="On-time rate" value={`${kpis.onTimeRate}%`} icon={TrendingUp} tone="success" />
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
            <CardTitle>Department Points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments.map((d) => (
              <div key={d.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{d.points}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${(d.points / maxDept) * 100}%`, backgroundColor: d.colorHex }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
