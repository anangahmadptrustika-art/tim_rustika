import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageHeader } from '@/components/dashboard/page-header';
import { employeeRanking, departmentRanking } from '@/server/services/analytics.service';
import { initials } from '@/lib/utils';

const MEDAL = ['🥇', '🥈', '🥉'];

export default async function LeaderboardPage() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const [people, departments] = await Promise.all([
    employeeRanking(year, month, 20),
    departmentRanking(year, month),
  ]);

  const maxDept = Math.max(1, ...departments.map((d) => d.points));

  return (
    <div>
      <PageHeader title="Leaderboard" subtitle={`Ranking for ${year}-${String(month).padStart(2, '0')}`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Employees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {people.length === 0 && <p className="text-sm text-muted-foreground">No points recorded yet.</p>}
            {people.map((r) => (
              <div key={r.userId} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-lg">{MEDAL[r.rank - 1] ?? <span className="text-sm font-bold text-muted-foreground">{r.rank}</span>}</span>
                  <Avatar>
                    <AvatarFallback>{initials(r.name)}</AvatarFallback>
                  </Avatar>
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

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments.map((d) => (
              <div key={d.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">{d.points} pts</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(d.points / maxDept) * 100}%`, backgroundColor: d.colorHex }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
