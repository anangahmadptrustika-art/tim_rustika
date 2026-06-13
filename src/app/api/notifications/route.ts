import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, ok, requireUser } from '@/lib/api';

// GET /api/notifications — current user's notifications (newest first).
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id, ...(unreadOnly ? { isRead: false } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    return ok({ items, unread });
  } catch (e) {
    return handleError(e);
  }
}

// PATCH /api/notifications — mark all (or one) as read.
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const { id } = (await req.json().catch(() => ({}))) as { id?: string };
    await prisma.notification.updateMany({
      where: { userId: user.id, ...(id ? { id } : {}), isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return ok({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}
