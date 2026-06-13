import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PageHeader } from '@/components/dashboard/page-header';
import { initials } from '@/lib/utils';

export default async function TeamPage() {
  const session = await auth();
  if (!can(session!.user.role, 'analytics.team')) redirect('/dashboard');

  const isManager = session!.user.role === 'MANAGER';
  const members = await prisma.user.findMany({
    where: { isActive: true, ...(isManager ? { managerId: session!.user.id } : {}) },
    include: {
      department: { select: { name: true } },
      _count: { select: { assignedTasks: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Active task counts per member
  const active = await prisma.task.groupBy({
    by: ['assigneeId'],
    where: { status: { in: ['TODO', 'IN_PROGRESS', 'SUBMITTED'] } },
    _count: { _all: true },
  });
  const activeMap = new Map(active.map((a) => [a.assigneeId, a._count._all]));

  return (
    <div>
      <PageHeader title="Team" subtitle={`${members.length} member(s)`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex items-center gap-4 p-5">
              <Avatar className="h-12 w-12">
                <AvatarFallback>{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">{m.role.replace('_', ' ')}</Badge>
                  {m.department && <Badge variant="secondary" className="text-[10px]">{m.department.name}</Badge>}
                  <span className="text-[10px] text-muted-foreground">{activeMap.get(m.id) ?? 0} active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
