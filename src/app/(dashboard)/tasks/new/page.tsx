import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/dashboard/page-header';
import { CreateTaskForm } from '@/components/tasks/create-task-form';

export default async function NewTaskPage() {
  const session = await auth();
  if (!can(session!.user.role, 'task.create')) redirect('/tasks');

  // Managers assign within their team; admins to anyone active.
  const isManager = session!.user.role === 'MANAGER';
  const people = await prisma.user.findMany({
    where: {
      isActive: true,
      role: 'EMPLOYEE',
      ...(isManager ? { managerId: session!.user.id } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div>
      <PageHeader title="New Task" subtitle="Create and assign a task" />
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assignable employees found.</p>
      ) : (
        <CreateTaskForm people={people} />
      )}
    </div>
  );
}
