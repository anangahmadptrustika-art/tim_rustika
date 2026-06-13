import { NextRequest } from 'next/server';
import { handleError, ok, requireUser } from '@/lib/api';
import { assertCan } from '@/lib/rbac';
import { approvalSchema } from '@/lib/validations';
import { approveTaskCompletion, rejectTaskCompletion } from '@/server/services/task.service';

interface Ctx {
  params: Promise<{ id: string }>;
}

// POST /api/tasks/[id]/approve — manager approves or rejects a submission.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    assertCan(user.role, 'task.approve');
    const { id } = await params;
    const { decision, note } = approvalSchema.parse(await req.json());

    if (decision === 'APPROVED') {
      const result = await approveTaskCompletion(id, user.id, note);
      return ok(result);
    }
    await rejectTaskCompletion(id, user.id, note);
    return ok({ status: 'REJECTED' });
  } catch (e) {
    return handleError(e);
  }
}
