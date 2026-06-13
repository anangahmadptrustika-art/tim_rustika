import { NextRequest } from 'next/server';
import { handleError, ok, requireUser } from '@/lib/api';
import { assertCan } from '@/lib/rbac';
import {
  completionHeatmap,
  departmentRanking,
  employeeRanking,
  executiveKpis,
  productivityTrend,
} from '@/server/services/analytics.service';

// GET /api/analytics/executive — full executive dashboard payload.
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser();
    assertCan(user.role, 'analytics.executive');
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const [kpis, employees, departments, trend, heatmap] = await Promise.all([
      executiveKpis(),
      employeeRanking(year, month),
      departmentRanking(year, month),
      productivityTrend(12),
      completionHeatmap(12),
    ]);

    return ok({ kpis, employees, departments, trend, heatmap, period: { year, month } });
  } catch (e) {
    return handleError(e);
  }
}
