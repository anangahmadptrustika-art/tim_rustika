import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { PageHeader } from '@/components/dashboard/page-header';
import { CreateUserForm } from '@/components/users/create-user-form';

export default async function NewUserPage() {
  const session = await auth();
  if (!can(session!.user.role, 'user.manage')) redirect('/team');

  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { isActive: true, role: { in: ['MANAGER', 'SUPER_ADMIN'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div>
      <PageHeader title="New Account" subtitle="Create a user account (Super Admin)" />
      <CreateUserForm departments={departments} managers={managers} />
    </div>
  );
}
