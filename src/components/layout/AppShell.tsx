'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Kanban, TrendingUp, CalendarClock, CalendarDays, Table as TableIcon,
  LayoutDashboard, CheckSquare, Users, Network, Sparkles, Magnet,
  Bot, Link2, Settings, Bell, Plus, Sun, Moon, LogOut, FileText, Shield, GitBranch, MessageSquare, MessageCircle, Menu,
} from 'lucide-react';
import { NewDealModal } from '@/components/modals/NewDealModal';
import { MeetingNotesModal } from '@/components/modals/MeetingNotesModal';
import { CopilotPanel } from '@/components/ai/CopilotPanel';
import { NotificationPopover } from '@/components/shared/NotificationPopover';

// Grouped navigation — end-to-end sales lifecycle
const navGroups = [
  {
    label: 'Pipeline',
    items: [
      { icon: LayoutDashboard, label: 'Command Center', href: '/' },
      { icon: Magnet, label: 'Leads', href: '/leads' },
      { icon: Kanban, label: 'Pipeline', href: '/pipeline' },
      { icon: FileText, label: 'Contracts', href: '/contracts' },
      { icon: Network, label: 'Accounts', href: '/accounts' },
    ],
  },
  {
    label: 'Views',
    items: [
      { icon: TableIcon, label: 'Table', href: '/table' },
      { icon: CalendarDays, label: 'Calendar', href: '/calendar' },
      { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
      { icon: Users, label: 'Contacts', href: '/stakeholders' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: Sparkles, label: 'Forecasting', href: '/forecasting' },
      { icon: Bot, label: 'Agents', href: '/agents' },
      { icon: MessageCircle, label: 'Ask Galent', href: '/ask' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { icon: Link2, label: 'Integrations', href: '/integrations' },
      { icon: GitBranch, label: 'Workflows', href: '/workflows' },
      { icon: Settings, label: 'Settings', href: '/settings' },
    ],
  },
];
// Flat list for mobile menu (includes all sub-pages)
const navItems = [
  { icon: LayoutDashboard, label: 'Command Center', href: '/' },
  { icon: Magnet, label: 'Leads', href: '/leads' },
  { icon: Kanban, label: 'Pipeline', href: '/pipeline' },
  { icon: TableIcon, label: 'Table', href: '/table' },
  { icon: CalendarDays, label: 'Calendar', href: '/calendar' },
  { icon: TrendingUp, label: 'Timeline', href: '/timeline' },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: Users, label: 'Contacts', href: '/stakeholders' },
  { icon: FileText, label: 'Contracts', href: '/contracts' },
  { icon: Network, label: 'Accounts', href: '/accounts' },
  { icon: Sparkles, label: 'Forecasting', href: '/forecasting' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Bot, label: 'Agents', href: '/agents' },
  { icon: Link2, label: 'Integrations', href: '/integrations' },
  { icon: GitBranch, label: 'Workflows', href: '/workflows' },
  { icon: Shield, label: 'Users', href: '/admin/users' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showMeetingNotes, setShowMeetingNotes] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userInitials = session?.user?.name
    ? session.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AU';
  const userName = session?.user?.name || 'Admin User';

  useEffect(() => setMounted(true), []);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen g-scene text-foreground">
      {/* Thin icon sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-48 z-50 hidden md:flex flex-col py-3"
        style={{ background: 'var(--g-bg)', borderRight: '1px solid var(--g-line)' }}>
        {/* Galent Logo */}
        <Link href="/" className="mb-4 flex-shrink-0 flex items-center gap-2 px-3" title="Galent SalesPilot">
          <img src="/galent-logo.svg" alt="Galent" className="w-7 h-7 rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          
        </Link>

        {/* Nav icons — grouped */}
        <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="mx-2 my-2 border-t" style={{ borderColor: 'var(--g-line)' }} />}
              <div className="px-3 mb-1">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
              </div>
              {group.items.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative mx-2',
                  isActive
                    ? 'bg-[#7c3aed]/10 text-[#7c3aed]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                {isActive && <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-[#7c3aed]" />}
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
            </div>
          ))}
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
          <button className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary"
            title="Settings">
            <Settings className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
          <div className="w-8 h-8 rounded-full bg-purple-600/20 dark:bg-purple-600/30 flex items-center justify-center text-purple-600 dark:text-purple-300 text-xs font-bold mx-auto"
            title={userName}>
            {userInitials}
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden flex flex-col bg-card border-r" style={{ borderColor: 'var(--g-line)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--g-line)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#7c3aed]" />
                <span className="text-sm font-bold text-foreground">Galent SalesPilot</span>
              </div>
            </div>
            <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
              {navItems.map(item => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* Main content */}
      <div className={`md:ml-14 transition-all duration-300 ${copilotOpen ? 'mr-96' : ''}`}>
        {/* Top command bar */}
        <header className="sticky top-0 z-40 h-12 g-glass flex items-center px-3 md:px-5 gap-2 md:gap-4"
          style={{ borderBottom: '1px solid rgba(var(--g-line-rgb), 0.4)' }}>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCopilotOpen(!copilotOpen)}
            className="flex-1 max-w-xl flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:border-purple-500/30 hover:text-foreground transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span className="hidden sm:inline">Ask Galent anything about your pipeline...</span>
            <span className="sm:hidden">Ask Galent...</span>
            <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden sm:inline">&#x2318;K</kbd>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <NotificationPopover />
            <button
              onClick={() => setShowMeetingNotes(true)}
              className="px-2 md:px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Notes</span>
            </button>
            <button
              onClick={() => setShowNewDeal(true)}
              className="px-2 md:px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">New Deal</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-5">
          {children}
        </main>
      </div>

      {/* AI Copilot Panel */}
      <CopilotPanel isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />

      {/* New Deal Modal */}
      <NewDealModal isOpen={showNewDeal} onClose={() => setShowNewDeal(false)} />

      {/* Meeting Notes Modal */}
      <MeetingNotesModal isOpen={showMeetingNotes} onClose={() => setShowMeetingNotes(false)} />
    </div>
  );
}
