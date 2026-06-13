import { NextRequest } from 'next/server';
import { handleError, ok, requireUser } from '@/lib/api';
import { assertCan } from '@/lib/rbac';
import { verifyCompensation } from '@/server/services/compensation.service';

interface Ctx {
  params: Promise<{ id: string }>;
}

// POST /api/compensation/[id]/verify — manager verifies make-up work.
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    assertCan(user.role, 'compensation.verify');
    const { id } = await params;
    await verifyCompensation(id, user.id);
    return ok({ verified: true });
  } catch (e) {
    return handleError(e);
  }
}
