import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/dashboard/page-header';
import { formatRupiah } from '@/lib/utils';

export default async function SettingsPage() {
  const session = await auth();
  if (!can(session!.user.role, 'scoring.configure')) redirect('/dashboard');

  const [config, rate, departments, userCount] = await Promise.all([
    prisma.scoringConfig.findFirst({ where: { departmentId: null, isActive: true } }),
    prisma.conversionRate.findFirst({ where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } }),
    prisma.department.findMany({ include: { _count: { select: { members: true } } } }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration (read-only preview)" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scoring Engine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {config ? (
              <>
                <Row label="Difficulty multipliers" value={`${config.multTrivial} · ${config.multEasy} · ${config.multMedium} · ${config.multHard} · ${config.multCritical}`} />
                <Row label="Early bonus / day" value={`${config.earlyBonusPerDay} (cap ${config.earlyBonusCap})`} />
                <Row label="Late penalty / day" value={`${config.latePenaltyPerDay} (cap ${config.latePenaltyCap})`} />
                <Row label="Compensation threshold" value={`${config.compensationThresholdDays} day(s) late`} />
                <Row label="Workdays per late day" value={`${config.compensationDaysPerLateDay}`} />
              </>
            ) : (
              <p className="text-muted-foreground">No scoring config found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Point → Money Conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Rate" value={`${formatRupiah(rate?.rupiahPerPoint ?? 1000)} / point`} />
            <Row label="Currency" value={rate?.currency ?? 'IDR'} />
            <Row label="Active since" value={(rate?.effectiveFrom ?? new Date()).toLocaleDateString('id-ID')} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Departments · {userCount} active users</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {departments.map((d) => (
              <Badge key={d.id} variant="secondary" style={{ borderColor: d.colorHex }}>
                {d.name} · {d._count.members}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Editing these values via UI is on the roadmap (Phase 2). The values above are seeded defaults and are already
        used live by the scoring engine.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
