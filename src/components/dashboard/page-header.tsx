export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
