import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { TaskStatusBadge, DifficultyLabel } from '@/components/dashboard/status-badge';
import { TaskSubmitButton } from '@/components/tasks/task-submit-button';
import { Plus } from 'lucide-react';

export default async function TasksPage() {
  const session = await auth();
  const user = session!.user;
  const canManage = can(user.role, 'task.create');
  const where = can(user.role, 'task.viewAll') ? {} : { assigneeId: user.id };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
    include: {
      assignee: { select: { id: true, name: true } },
      department: { select: { name: true, colorHex: true } },
    },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={canManage ? 'All tasks across the organization' : 'Your assigned tasks'}
        action={
          canManage ? (
            <Button asChild>
              <Link href="/tasks/new">
                <Plus className="h-4 w-4" /> New Task
              </Link>
            </Button>
          ) : undefined
        }
      />

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">No tasks yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => {
            const canSubmit = t.assigneeId === user.id && ['TODO', 'IN_PROGRESS', 'REJECTED'].includes(t.status);
            return (
              <Card key={t.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                      <TaskStatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 truncate font-medium">{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>👤 {t.assignee.name}</span>
                      {t.department && <span>🏢 {t.department.name}</span>}
                      <DifficultyLabel difficulty={t.difficulty} />
                      <span>⚖ weight {t.weight}</span>
                      <span>🎯 {t.basePoints} pts</span>
                      <span>📅 due {t.deadline.toLocaleDateString('id-ID')}</span>
                      {t.awardedPoints != null && <span className="text-success">★ {t.awardedPoints} earned</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:w-56">
                    <Progress value={t.progress} className="flex-1" />
                    <span className="w-10 text-right text-xs text-muted-foreground">{t.progress}%</span>
                  </div>
                  {canSubmit && <TaskSubmitButton taskId={t.id} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
