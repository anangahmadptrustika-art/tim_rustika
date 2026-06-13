import type { Role } from '@prisma/client';

/**
 * Role-based access control helpers.
 * Permissions are coarse-grained capabilities checked in API routes & UI.
 */
export type Permission =
  | 'task.create'
  | 'task.assign'
  | 'task.approve'
  | 'task.delete'
  | 'task.viewAll'
  | 'scoring.configure'
  | 'conversion.configure'
  | 'bonus.publish'
  | 'compensation.verify'
  | 'user.manage'
  | 'department.manage'
  | 'analytics.executive'
  | 'analytics.team'
  | 'audit.view';

const MATRIX: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'task.create',
    'task.assign',
    'task.approve',
    'task.delete',
    'task.viewAll',
    'scoring.configure',
    'conversion.configure',
    'bonus.publish',
    'compensation.verify',
    'user.manage',
    'department.manage',
    'analytics.executive',
    'analytics.team',
    'audit.view',
  ],
  MANAGER: [
    'task.create',
    'task.assign',
    'task.approve',
    'task.viewAll',
    'bonus.publish',
    'compensation.verify',
    'analytics.team',
  ],
  EMPLOYEE: [],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(permission) ?? false;
}

export function assertCan(role: Role | undefined | null, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
