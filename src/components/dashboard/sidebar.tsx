'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ListChecks,
  Trophy,
  Coins,
  CalendarClock,
  Users,
  Settings,
  BarChart3,
  Bell,
  Award,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/tasks', label: 'Tasks', icon: ListChecks, roles: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/approvals', label: 'Approvals', icon: CalendarClock, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, roles: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/rewards', label: 'Points & Bonus', icon: Coins, roles: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/achievements', label: 'Achievements', icon: Award, roles: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { href: '/team', label: 'Team', icon: Users, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { href: '/notifications', label: 'Notifications', icon: Bell, roles: ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN'] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          R
        </div>
        <span className="font-semibold">Rustika PMS</span>
      </div>
      <nav className="space-y-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
