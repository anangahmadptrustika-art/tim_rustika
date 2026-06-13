'use client';

import { signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { initials } from '@/lib/utils';
import { Bell, LogOut } from 'lucide-react';

interface Props {
  name: string;
  role: string;
  avatarUrl?: string | null;
  unread?: number;
}

export function Topbar({ name, role, avatarUrl, unread = 0 }: Props) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="text-sm font-medium text-muted-foreground">Welcome back</h1>
        <p className="font-semibold">{name}</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={avatarUrl ?? undefined} alt={name} />
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{name}</p>
            <Badge variant="secondary" className="mt-1 text-[10px]">
              {role.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
