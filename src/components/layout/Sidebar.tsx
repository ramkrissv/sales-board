'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Kanban,
  TrendingUp,
  Network,
  Sparkles,
  Bot,
  Link2,
  Plus,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Table as TableIcon,
  LayoutDashboard,
  CheckSquare,
  Users,
} from 'lucide-react';

const navItems = [
  { icon: Kanban, label: 'Kanban', href: '/' },
  { icon: TrendingUp, label: 'Timeline', href: '/timeline' },
  { icon: CalendarClock, label: 'Schedule', href: '/schedule' },
  { icon: TableIcon, label: 'Table', href: '/table' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: Users, label: 'Stakeholders', href: '/stakeholders' },
  { icon: Network, label: 'Account 360', href: '/accounts' },
  { icon: Sparkles, label: 'AI Forecasting', href: '/forecasting' },
  { icon: Bot, label: 'Agent Registry', href: '/agents' },
  { icon: Link2, label: 'Integrations', href: '/integrations' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-green-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-purple-700 dark:text-purple-400">Galent AI</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sales Intelligence</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* New Opportunity Button */}
      <div className="px-3 py-4">
        <button
          className={cn(
            'flex items-center gap-2 w-full rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors',
            collapsed ? 'justify-center p-2' : 'px-4 py-2.5'
          )}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">New Opportunity</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-l-2 border-purple-600'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900',
            collapsed && 'justify-center px-2'
          )}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <Link
          href="/support"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900',
            collapsed && 'justify-center px-2'
          )}
        >
          <HelpCircle className="h-4 w-4" />
          {!collapsed && <span>Support</span>}
        </Link>

        {/* User Profile */}
        <div className={cn(
          'flex items-center gap-3 px-3 py-2 mt-2',
          collapsed && 'justify-center px-2'
        )}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-300 text-xs font-bold flex-shrink-0">
              AU
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-950" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">Admin User</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Platform Admin</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
