import { NextRequest } from 'next/server';
import { handleError, ok, requireUser } from '@/lib/api';
import { compensationWorkdaySchema } from '@/lib/validations';
import { logCompensationWorkday } from '@/server/services/compensation.service';

// POST /api/compensation/workday — employee logs a weekend make-up workday.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = compensationWorkdaySchema.parse(await req.json());
    const workday = await logCompensationWorkday({ ...body, actorId: user.id });
    return ok(workday, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
