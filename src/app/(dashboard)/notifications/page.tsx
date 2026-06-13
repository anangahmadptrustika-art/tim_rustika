import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { Bell } from 'lucide-react';

export default async function NotificationsPage() {
  const user = (await auth())!.user;
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${items.filter((i) => !i.isRead).length} unread`} />

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">No notifications yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={cn(!n.isRead && 'border-primary/40 bg-primary/5')}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {n.createdAt.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
