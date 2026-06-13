import { prisma } from '@/lib/prisma';

interface AuditArgs {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAudit(args: AuditArgs) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: args.actorId ?? null,
        action: args.action,
        entity: args.entity,
        entityId: args.entityId,
        metadata: args.metadata as object | undefined,
        ipAddress: args.ipAddress,
        userAgent: args.userAgent,
      },
    });
  } catch (err) {
    // Audit must never break the primary flow.
    console.error('[audit] failed to write log', err);
  }
}
