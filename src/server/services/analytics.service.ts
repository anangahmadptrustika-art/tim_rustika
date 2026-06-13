import { prisma } from '@/lib/prisma';

/** Company-wide KPI snapshot for the executive dashboard. */
export async function executiveKpis() {
  const [active, completed, late, employees, pointsAgg] = await Promise.all([
    prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS', 'SUBMITTED'] } } }),
    prisma.task.count({ where: { status: 'COMPLETED' } }),
    prisma.task.count({ where: { status: 'COMPLETED', wasLate: true } }),
    prisma.user.count({ where: { isActive: true, role: 'EMPLOYEE' } }),
    prisma.pointTransaction.aggregate({ _sum: { points: true } }),
  ]);

  const onTimeRate = completed > 0 ? Math.round(((completed - late) / completed) * 100) : 0;

  return {
    activeTasks: active,
    completedTasks: completed,
    lateTasks: late,
    employees,
    totalPoints: pointsAgg._sum.points ?? 0,
    onTimeRate,
  };
}

/** Employee leaderboard by net points in a period. */
export async function employeeRanking(year: number, month: number, take = 10) {
  const grouped = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: { periodYear: year, periodMonth: month },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take,
  });

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true, avatarUrl: true, department: { select: { name: true } } },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return grouped.map((g, i) => ({
    rank: i + 1,
    userId: g.userId,
    name: byId.get(g.userId)?.name ?? 'Unknown',
    department: byId.get(g.userId)?.department?.name ?? '—',
    avatarUrl: byId.get(g.userId)?.avatarUrl ?? null,
    points: g._sum.points ?? 0,
  }));
}

/** Department ranking by aggregate net points in a period. */
export async function departmentRanking(year: number, month: number) {
  const tx = await prisma.pointTransaction.findMany({
    where: { periodYear: year, periodMonth: month },
    select: { points: true, user: { select: { departmentId: true } } },
  });
  const totals = new Map<string, number>();
  for (const t of tx) {
    const dep = t.user.departmentId ?? 'unassigned';
    totals.set(dep, (totals.get(dep) ?? 0) + t.points);
  }
  const departments = await prisma.department.findMany({ select: { id: true, name: true, colorHex: true } });
  return departments
    .map((d) => ({ ...d, points: totals.get(d.id) ?? 0 }))
    .sort((a, b) => b.points - a.points);
}

/** 12-month productivity trend (completed tasks + points per month). */
export async function productivityTrend(months = 12) {
  const now = new Date();
  const series: { period: string; completed: number; points: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const [completed, pointsAgg] = await Promise.all([
      prisma.task.count({ where: { status: 'COMPLETED', completedAt: { gte: start, lt: end } } }),
      prisma.pointTransaction.aggregate({
        where: { periodYear: year, periodMonth: month },
        _sum: { points: true },
      }),
    ]);
    series.push({ period: `${year}-${String(month).padStart(2, '0')}`, completed, points: pointsAgg._sum.points ?? 0 });
  }
  return series;
}

/** Contribution heatmap: completed tasks by weekday x week for the last N weeks. */
export async function completionHeatmap(weeks = 12) {
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
  const tasks = await prisma.task.findMany({
    where: { status: 'COMPLETED', completedAt: { gte: since } },
    select: { completedAt: true },
  });
  const cells: Record<string, number> = {};
  for (const t of tasks) {
    if (!t.completedAt) continue;
    const key = t.completedAt.toISOString().slice(0, 10);
    cells[key] = (cells[key] ?? 0) + 1;
  }
  return cells;
}
