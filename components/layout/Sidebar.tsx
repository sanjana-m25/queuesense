"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Users, 
  ClipboardList, 
  Stethoscope, 
  Settings,
  LayoutDashboard,
  CalendarPlus
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Queue', href: '/admin/queue', icon: LayoutDashboard },
  { label: 'Appointments', href: '/admin/appointments', icon: ClipboardList },
  { label: 'Waitlist', href: '/admin/waitlist', icon: Users },
  { label: 'Slots', href: '/admin/slots', icon: CalendarPlus },
  { label: 'Doctors', href: '/admin/doctors', icon: Stethoscope },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

/**
 * Sidebar component for admin navigation.
 */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-[calc(100vh-64px)] sticky top-16">
      <nav className="flex-grow p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50" 
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900/50"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-900">
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3">
          <p className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-1">
            System Status
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Live Updates Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
