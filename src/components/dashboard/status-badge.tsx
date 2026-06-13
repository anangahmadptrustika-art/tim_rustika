import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@prisma/client';

const MAP: Record<TaskStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning' },
  TODO: { label: 'To Do', variant: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', variant: 'default' },
  SUBMITTED: { label: 'Submitted', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { label, variant } = MAP[status];
  return <Badge variant={variant}>{label}</Badge>;
}

const DIFF_COLOR: Record<string, string> = {
  TRIVIAL: 'text-muted-foreground',
  EASY: 'text-success',
  MEDIUM: 'text-primary',
  HARD: 'text-warning',
  CRITICAL: 'text-destructive',
};

export function DifficultyLabel({ difficulty }: { difficulty: string }) {
  return <span className={`text-xs font-medium ${DIFF_COLOR[difficulty] ?? ''}`}>{difficulty}</span>;
}
