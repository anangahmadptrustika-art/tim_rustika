import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, ok, requireUser } from '@/lib/api';
import { assertCan, can } from '@/lib/rbac';
import { createTaskSchema } from '@/lib/validations';
import { writeAudit } from '@/server/services/audit.service';
import { notify } from '@/server/services/notification.service';

// GET /api/tasks — list tasks visible to the current user.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;

    // Employees see only their own tasks; managers/admins see all (or their team).
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (!can(user.role, 'task.viewAll')) {
      where.assigneeId = user.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { deadline: 'asc' },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        department: { select: { id: true, name: true, colorHex: true } },
        _count: { select: { attachments: true, comments: true } },
      },
      take: 100,
    });
    return ok(tasks);
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/tasks — create & assign a task (managers + admins).
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user.role, 'task.create');
    const body = createTaskSchema.parse(await req.json());

    const seq = (await prisma.task.count()) + 1;
    const task = await prisma.task.create({
      data: {
        code: `TSK-${String(seq).padStart(5, '0')}`,
        title: body.title,
        description: body.description,
        assigneeId: body.assigneeId,
        creatorId: user.id,
        departmentId: body.departmentId,
        difficulty: body.difficulty,
        weight: body.weight,
        basePoints: body.basePoints,
        startDate: body.startDate,
        deadline: body.deadline,
        status: 'TODO',
      },
    });

    await prisma.taskStatusHistory.create({
      data: { taskId: task.id, from: null, to: 'TODO', changedBy: user.id, note: 'Task created & assigned' },
    });

    await notify({
      userId: body.assigneeId,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      body: `You were assigned "${task.title}" (due ${body.deadline.toLocaleDateString('id-ID')}).`,
      data: { taskId: task.id },
      channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
    });
    await writeAudit({ actorId: user.id, action: 'task.create', entity: 'Task', entityId: task.id });

    return ok(task, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
