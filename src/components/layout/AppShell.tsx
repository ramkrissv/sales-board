'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  Kanban, TrendingUp, CalendarClock, Table as TableIcon,
  LayoutDashboard, CheckSquare, Users, Network, Sparkles,
  Bot, Link2, Settings, Bell, Plus, Sun, Moon,
} from 'lucide-react';
import { NewDealModal } from '@/components/modals/NewDealModal';

const navItems = [
  { icon: LayoutDashboard, label: 'Home', href: '/' },
  { icon: Kanban, label: 'Pipeline', href: '/pipeline' },
  { icon: TrendingUp, label: 'Timeline', href: '/timeline' },
  { icon: CalendarClock, label: 'Schedule', href: '/schedule' },
  { icon: TableIcon, label: 'Table', href: '/table' },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: Users, label: 'Stakeholders', href: '/stakeholders' },
  { icon: Network, label: 'Accounts', href: '/accounts' },
  { icon: Sparkles, label: 'Forecasting', href: '/forecasting' },
  { icon: Bot, label: 'Agents', href: '/agents' },
  { icon: Link2, label: 'Integrations', href: '/integrations' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [showNewDeal, setShowNewDeal] = useState(false);

  useEffect(() => setMounted(true), []);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Thin icon sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-14 z-50 flex flex-col items-center py-3 gap-1"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
        {/* Logo */}
        <Link href="/" className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-emerald-500 flex items-center justify-center mb-4">
          <Sparkles className="h-4 w-4 text-white" />
        </Link>

        {/* Nav icons */}
        <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative',
                  isActive
                    ? 'bg-purple-600/20 text-purple-600 dark:text-purple-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-purple-500" />}
                <div className="absolute left-14 px-2 py-1 rounded bg-card border border-border text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-lg">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom icons */}
        <div className="flex flex-col gap-1 mt-2">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={mounted ? `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
          >
            {mounted && resolvedTheme === 'dark' ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </button>
          <button className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary">
            <Settings className="h-[18px] w-[18px]" />
          </button>
          <div className="w-8 h-8 rounded-full bg-purple-600/20 dark:bg-purple-600/30 flex items-center justify-center text-purple-600 dark:text-purple-300 text-xs font-bold mx-auto">
            AU
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-14">
        {/* Top command bar */}
        <header className="sticky top-0 z-40 h-12 backdrop-blur-xl flex items-center px-5 gap-4"
          style={{ background: 'var(--topbar-bg)', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setCommandOpen(!commandOpen)}
            className="flex-1 max-w-xl flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:border-purple-500/30 hover:text-foreground transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span>Ask Galent anything about your pipeline...</span>
            <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">&#x2318;K</kbd>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Bell className="h-4 w-4" />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full" />
            </button>
            <button
              onClick={() => setShowNewDeal(true)}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Deal
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-5">
          {children}
        </main>
      </div>

      {/* New Deal Modal */}
      <NewDealModal isOpen={showNewDeal} onClose={() => setShowNewDeal(false)} />
    </div>
  );
}
