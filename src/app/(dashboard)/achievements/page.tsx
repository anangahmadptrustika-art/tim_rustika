import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { Award, Lock } from 'lucide-react';

const TIER_COLOR: Record<string, string> = {
  BRONZE: 'text-amber-700',
  SILVER: 'text-slate-400',
  GOLD: 'text-yellow-500',
  PLATINUM: 'text-cyan-400',
};

export default async function AchievementsPage() {
  const user = (await auth())!.user;
  const [badges, earned, achievements] = await Promise.all([
    prisma.badge.findMany({ where: { isActive: true }, orderBy: { tier: 'asc' } }),
    prisma.userBadge.findMany({ where: { userId: user.id }, select: { badgeId: true, earnedAt: true } }),
    prisma.achievement.findMany({ where: { userId: user.id }, orderBy: { earnedAt: 'desc' }, take: 20 }),
  ]);
  const earnedMap = new Map(earned.map((e) => [e.badgeId, e.earnedAt]));

  return (
    <div>
      <PageHeader title="Achievements" subtitle="Badges & milestones" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => {
          const has = earnedMap.has(b.id);
          return (
            <Card key={b.id} className={cn(!has && 'opacity-60')}>
              <CardContent className="flex items-start gap-4 p-5">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-muted', has ? TIER_COLOR[b.tier] : 'text-muted-foreground')}>
                  {has ? <Award className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{b.name}</p>
                    <Badge variant="outline" className="text-[10px]">{b.tier}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                  {has && (
                    <p className="mt-1 text-[10px] text-success">
                      Earned {earnedMap.get(b.id)!.toLocaleDateString('id-ID')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {achievements.length > 0 && (
        <Card className="mt-6">
          <CardContent className="space-y-2 p-5">
            <p className="font-medium">Recent achievements</p>
            {achievements.map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span>{a.title}</span>
                <span className="text-muted-foreground">+{a.points} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
