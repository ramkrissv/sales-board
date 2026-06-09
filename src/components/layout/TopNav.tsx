'use client';

import { Search, Bell, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Pipeline', href: '/' },
  { label: 'Accounts', href: '/accounts' },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-6 gap-6">
      {/* Page Title / Tabs */}
      <nav className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href === '/' && pathname === '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search pipeline, accounts, or agents..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button className="px-3 py-1.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1.5 transition-colors">
          <span className="text-yellow-300">⚡</span>
          Invoke Agent
        </button>
        <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-600">
          <Bell className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-600">
          <Clock className="h-5 w-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-300 text-xs font-bold ml-1">
          AU
        </div>
      </div>
    </header>
  );
}
