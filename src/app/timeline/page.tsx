'use client';

import { useState } from 'react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { DealDetail } from '@/components/modals/DealDetail';
import { format, differenceInDays, addDays, startOfDay } from 'date-fns';
import { Kanban, Table as TableIcon, CalendarDays, TrendingUp, Clock, Eye } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const VIEW_MODES = [
  { id: 'kanban', label: 'Board', icon: Kanban, href: '/pipeline' },
  { id: 'table', label: 'Table', icon: TableIcon, href: '/table' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '/calendar' },
  { id: 'timeline', label: 'Timeline', icon: TrendingUp, href: '/timeline' },
  { id: 'schedule', label: 'Schedule', icon: Clock, href: '/schedule' },
  { id: 'graph', label: 'Graph', icon: Eye, href: '/graph' },
];

function TimelineContent() {
  const { opportunities, isLoading } = useOpportunities();
  const pathname = usePathname();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading timeline...</div>;
  }

  const activeDeals = opportunities.filter(o => !['Won', 'Lost'].includes(o.status));
  const today = startOfDay(new Date());
  const timelineStart = addDays(today, -14);
  const timelineEnd = addDays(today, 90);
  const totalDays = differenceInDays(timelineEnd, timelineStart);

  const statusColors: Record<string, string> = {
    'Discovery': 'bg-blue-500/60', 'Qualification': 'bg-amber-500/60', 'Proposal': 'bg-purple-500/60',
    'Negotiation': 'bg-emerald-500/60', 'On Hold': 'bg-orange-500/60',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">{activeDeals.length} active deals over the next 90 days</p>
      </div>

      {/* View Mode Tab Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 w-fit mb-6">
        {VIEW_MODES.map(mode => {
          const isActive = pathname === mode.href;
          return (
            <Link key={mode.id} href={mode.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <mode.icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#7c3aed]' : ''}`} />
              {mode.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl g-surface g-elevated p-5 overflow-x-auto">
        {/* Month headers */}
        <div className="flex mb-4 border-b border-border pb-2">
          {Array.from({ length: 4 }, (_, i) => {
            const monthDate = addDays(timelineStart, i * 30);
            return (
              <div key={i} className="flex-1 text-xs text-muted-foreground uppercase tracking-wider">
                {format(monthDate, 'MMM yyyy')}
              </div>
            );
          })}
        </div>

        {/* Deal bars */}
        <div className="space-y-2 min-w-[600px]">
          {activeDeals.slice(0, 20).map(opp => {
            const start = new Date(opp.startDate);
            const end = new Date(opp.expectedCloseDate);
            const leftPct = Math.max(0, Math.min(100, (differenceInDays(start, timelineStart) / totalDays) * 100));
            const widthPct = Math.max(3, Math.min(100 - leftPct, (differenceInDays(end, start) / totalDays) * 100));

            return (
              <div key={opp.id} className="flex items-center gap-3 h-8">
                <div className="w-32 text-xs text-muted-foreground truncate flex-shrink-0">{opp.customerName}</div>
                <div className="flex-1 relative h-6">
                  <button
                    onClick={() => setSelectedOppId(opp.id)}
                    className={`absolute h-full rounded-md ${statusColors[opp.status] || 'bg-slate-500/40'} flex items-center px-2 cursor-pointer hover:opacity-80 hover:scale-[1.02] transition-all`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${opp.opportunityName}\n${format(start, 'MMM d')} \u2192 ${format(end, 'MMM d')}`}
                  >
                    <span className="text-[10px] text-foreground truncate">{opp.opportunityName.slice(0, 30)}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedOppId && <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />}
    </div>
  );
}

export default function TimelinePage() {
  return (
    <OpportunityProvider>
      <FilterPanel />
      <TimelineContent />
    </OpportunityProvider>
  );
}
