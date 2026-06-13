import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, requireUser } from '@/lib/api';
import { assertCan } from '@/lib/rbac';
import { generateMonthlyBonuses, publishMonthlyBonuses } from '@/server/services/bonus.service';

const schema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

// POST /api/bonus/publish — recompute then publish bonuses for a period.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user.role, 'bonus.publish');
    const { year, month } = schema.parse(await req.json());

    await generateMonthlyBonuses(year, month);
    const count = await publishMonthlyBonuses(year, month, user.id);

    return ok({ published: count, year, month });
  } catch (e) {
    return handleError(e);
  }
}
