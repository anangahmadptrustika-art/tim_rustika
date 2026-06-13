import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { DifficultyLabel } from '@/components/dashboard/status-badge';
import { ApprovalActions } from '@/components/tasks/approval-actions';

export default async function ApprovalsPage() {
  const session = await auth();
  if (!can(session!.user.role, 'task.approve')) redirect('/dashboard');

  const tasks = await prisma.task.findMany({
    where: { status: 'SUBMITTED' },
    orderBy: { submittedAt: 'asc' },
    include: { assignee: { select: { name: true } }, department: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader title="Approvals" subtitle={`${tasks.length} task(s) awaiting your review`} />

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Nothing to review right now. 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => {
            const late = new Date() > t.deadline;
            return (
              <Card key={t.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                      <DifficultyLabel difficulty={t.difficulty} />
                      {late && <span className="text-xs font-medium text-destructive">⏰ overdue</span>}
                    </div>
                    <p className="mt-1 font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.assignee.name} · {t.department?.name ?? '—'} · due {t.deadline.toLocaleDateString('id-ID')} ·{' '}
                      {t.basePoints} base pts
                    </p>
                  </div>
                  <ApprovalActions taskId={t.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
