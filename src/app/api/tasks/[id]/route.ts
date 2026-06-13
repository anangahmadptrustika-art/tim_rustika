import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, ok, requireUser } from '@/lib/api';
import { can, ForbiddenError } from '@/lib/rbac';
import { updateTaskProgressSchema } from '@/lib/validations';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        creator: { select: { id: true, name: true } },
        department: true,
        attachments: true,
        comments: { include: { author: { select: { name: true, avatarUrl: true } } }, orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        approvals: true,
        compensation: { include: { workdays: true } },
        pointTransactions: true,
      },
    });
    if (!task) return ok(null, { status: 404 });
    if (task.assigneeId !== user.id && !can(user.role, 'task.viewAll')) {
      throw new ForbiddenError();
    }
    return ok(task);
  } catch (e) {
    return handleError(e);
  }
}

// PATCH /api/tasks/[id] — assignee updates progress / starts work.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return ok(null, { status: 404 });
    if (task.assigneeId !== user.id) throw new ForbiddenError('Only the assignee can update progress');

    const { progress } = updateTaskProgressSchema.parse(await req.json());
    const nextStatus = progress > 0 && task.status === 'TODO' ? 'IN_PROGRESS' : task.status;

    const updated = await prisma.task.update({
      where: { id },
      data: { progress, status: nextStatus },
    });
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
