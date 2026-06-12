'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Kanban, TrendingUp, CalendarDays, Table as TableIcon,
  LayoutDashboard, CheckSquare, Users, Network, Sparkles, Magnet,
  Bot, Link2, Settings, Bell, Plus, Sun, Moon, LogOut, FileText,
  GitBranch, MessageSquare, MessageCircle, Menu,
  BookOpen, Presentation, DollarSign, BarChart3, Globe, Eye, Mail, Puzzle,
  Home, Target, Briefcase, BarChart, Zap, ChevronDown, ChevronRight,
} from 'lucide-react';
import { NewDealModal } from '@/components/modals/NewDealModal';
import { MeetingNotesModal } from '@/components/modals/MeetingNotesModal';
import { CopilotPanel } from '@/components/ai/CopilotPanel';
import { NotificationPopover } from '@/components/shared/NotificationPopover';

// ── Simplified navigation: 8 core items + expandable sections ──
const navItems: { icon: any; label: string; href: string; children?: { icon: any; label: string; href: string }[] }[] = [
  { icon: Home, label: 'Command Center', href: '/' },
  { icon: Magnet, label: 'Leads', href: '/leads',
    children: [
      { icon: Globe, label: 'Signal Intake', href: '/intake' },
      { icon: Mail, label: 'Campaigns', href: '/campaigns' },
    ],
  },
  { icon: Kanban, label: 'Pipeline', href: '/pipeline',
    children: [
      { icon: TableIcon, label: 'Table', href: '/table' },
      { icon: CalendarDays, label: 'Calendar', href: '/calendar' },
      { icon: TrendingUp, label: 'Timeline', href: '/timeline' },
      { icon: MessageCircle, label: 'Deal Room', href: '/deal-room' },
    ],
  },
  { icon: Network, label: 'Accounts', href: '/accounts',
    children: [
      { icon: Users, label: 'Contacts', href: '/stakeholders' },
      { icon: TrendingUp, label: 'Growth', href: '/growth' },
    ],
  },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: Briefcase, label: 'Presales', href: '/presales',
    children: [
      { icon: DollarSign, label: 'Pricing', href: '/pricing' },
      { icon: FileText, label: 'Contracts', href: '/contracts' },
    ],
  },
  { icon: BarChart, label: 'Analytics', href: '/dashboard',
    children: [
      { icon: BarChart3, label: 'Forecast', href: '/forecasting' },
      { icon: Eye, label: 'Deal Graph', href: '/graph' },
      { icon: Sparkles, label: 'Insights', href: '/insights' },
    ],
  },
  { icon: Bot, label: 'AI & Automation', href: '/agents',
    children: [
      { icon: MessageSquare, label: 'Ask Galent', href: '/ask' },
      { icon: BookOpen, label: 'Enablement', href: '/enablement' },
    ],
  },
];

const platformItems: { icon: any; label: string; href: string }[] = [
  { icon: Link2, label: 'Integrations', href: '/integrations' },
  { icon: GitBranch, label: 'Workflows', href: '/workflows' },
  { icon: BookOpen, label: 'Guide', href: '/guide' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

// Flat list for mobile
const allNavItems = [
  ...navItems.flatMap(item => [item, ...(item.children || [])]),
  ...platformItems,
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showMeetingNotes, setShowMeetingNotes] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedNav, setExpandedNav] = useState<string | null>(null);

  const userInitials = session?.user?.name
    ? session.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AU';
  const userName = session?.user?.name || 'Admin User';

  useEffect(() => setMounted(true), []);

  // Auto-expand the nav section that contains the current route
  useEffect(() => {
    for (const item of navItems) {
      if (item.children) {
        const childMatch = item.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'));
        if (childMatch || pathname === item.href || pathname.startsWith(item.href + '/')) {
          setExpandedNav(item.href);
          break;
        }
      }
    }
  }, [pathname]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const isNavActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isParentActive = (item: typeof navItems[0]) => {
    if (isNavActive(item.href)) return true;
    return item.children?.some(c => isNavActive(c.href)) ?? false;
  };

  return (
    <div className="min-h-screen g-scene text-foreground">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 bottom-0 w-52 z-50 hidden md:flex flex-col g-hex"
        style={{ background: 'var(--g-bg)', borderRight: '1px solid var(--g-line)' }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-4 py-4 border-b" style={{ borderColor: 'var(--g-line)' }}>
          <img src="/galent-logo.svg" alt="Galent" className="w-8 h-8 rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <div className="text-sm font-bold text-foreground font-display tracking-tight">Galent</div>
            <div className="text-[9px] text-muted-foreground tracking-wider uppercase">SalesPilot</div>
          </div>
        </Link>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active = isParentActive(item);
            const isExpanded = expandedNav === item.href;
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.href}>
                {/* Parent item */}
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all relative',
                      active
                        ? 'bg-[#7c3aed]/10 text-[#7c3aed]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    )}
                  >
                    {active && <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#7c3aed]" />}
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                  {hasChildren && (
                    <button
                      onClick={() => setExpandedNav(isExpanded ? null : item.href)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                  )}
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                  <div className="ml-5 pl-3 border-l border-border/50 space-y-0.5 mt-0.5 mb-1">
                    {item.children!.map(child => {
                      const childActive = isNavActive(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-colors',
                            childActive
                              ? 'text-[#7c3aed] font-medium'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Separator */}
          <div className="my-3 mx-2 border-t" style={{ borderColor: 'var(--g-line)' }} />

          {/* Platform items */}
          {platformItems.map(item => {
            const active = isNavActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors',
                  active
                    ? 'text-[#7c3aed] font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom bar */}
        <div className="px-3 py-3 border-t space-y-2" style={{ borderColor: 'var(--g-line)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#7c3aed]/15 flex items-center justify-center text-[#7c3aed] text-[10px] font-bold">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-foreground truncate">{userName}</div>
              <div className="text-[9px] text-muted-foreground">Admin</div>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Toggle theme">
                {mounted && resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-1 rounded text-muted-foreground hover:text-[var(--g-red)] transition-colors" title="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden flex flex-col bg-card border-r" style={{ borderColor: 'var(--g-line)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--g-line)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#7c3aed]" />
                <span className="text-sm font-bold text-foreground font-display">Galent SalesPilot</span>
              </div>
            </div>
            <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
              {allNavItems.map(item => {
                const active = isNavActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                      active ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    )}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* ── Main content ── */}
      <div className={cn('md:ml-52 transition-all duration-300', copilotOpen && 'mr-96')}>
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-12 g-glass flex items-center px-3 md:px-5 gap-2 md:gap-3"
          style={{ borderBottom: '1px solid var(--g-line)' }}>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>

          {/* Copilot search bar */}
          <button onClick={() => setCopilotOpen(!copilotOpen)}
            className="flex-1 max-w-lg flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-muted-foreground hover:border-[#7c3aed]/30 hover:text-foreground transition-colors">
            <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
            <span className="hidden sm:inline">Ask Galent anything...</span>
            <span className="sm:hidden">Ask Galent...</span>
            <kbd className="ml-auto text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded hidden sm:inline">&#x2318;K</kbd>
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <NotificationPopover />
            <button onClick={() => setShowMeetingNotes(true)}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs transition-colors" title="Meeting Notes">
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setShowNewDeal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium transition-colors">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">New Opportunity</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Copilot Panel */}
      <CopilotPanel isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />

      {/* Modals */}
      <NewDealModal isOpen={showNewDeal} onClose={() => setShowNewDeal(false)} />
      <MeetingNotesModal isOpen={showMeetingNotes} onClose={() => setShowMeetingNotes(false)} />
    </div>
  );
}
