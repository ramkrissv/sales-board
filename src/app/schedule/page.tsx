'use client';

import { useState } from 'react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { DealDetail } from '@/components/modals/DealDetail';
import { isToday, isPast, isAfter, endOfWeek, addWeeks, startOfDay, isThisWeek } from 'date-fns';
import { format } from 'date-fns';
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

function ScheduleContent() {
  const { opportunities, isLoading } = useOpportunities();
  const pathname = usePathname();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading schedule...</div>;
  }

  const activeDeals = opportunities.filter(o => !['Won', 'Lost'].includes(o.status));
  const today = startOfDay(new Date());
  const weekEnd = endOfWeek(today);
  const nextWeekEnd = endOfWeek(addWeeks(today, 1));

  const buckets = [
    { label: 'Overdue', color: 'border-red-500/30', textColor: 'text-red-400', items: activeDeals.filter(o => isPast(new Date(o.expectedCloseDate)) && !isToday(new Date(o.expectedCloseDate))) },
    { label: 'Today', color: 'border-purple-500/30', textColor: 'text-purple-400', items: activeDeals.filter(o => isToday(new Date(o.expectedCloseDate))) },
    { label: 'This Week', color: 'border-blue-500/30', textColor: 'text-blue-400', items: activeDeals.filter(o => { const d = new Date(o.expectedCloseDate); return !isPast(d) && !isToday(d) && isThisWeek(d); }) },
    { label: 'Next Week', color: 'border-amber-500/30', textColor: 'text-amber-400', items: activeDeals.filter(o => { const d = new Date(o.expectedCloseDate); return isAfter(d, weekEnd) && !isAfter(d, nextWeekEnd); }) },
    { label: 'Future', color: 'border-emerald-500/30', textColor: 'text-emerald-400', items: activeDeals.filter(o => isAfter(new Date(o.expectedCloseDate), nextWeekEnd)) },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">Deals organized by close date</p>
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {buckets.map(bucket => (
          <div key={bucket.label} className={`rounded-xl bg-card border ${bucket.color} p-3`}>
            <div className={`text-xs font-semibold uppercase tracking-wider ${bucket.textColor} mb-3`}>
              {bucket.label} <span className="text-muted-foreground ml-1">{bucket.items.length}</span>
            </div>
            <div className="space-y-2">
              {bucket.items.map(opp => (
                <button key={opp.id} onClick={() => setSelectedOppId(opp.id)}
                  className="w-full text-left p-2.5 rounded-lg bg-card border border-border hover:border-purple-500/20 hover-lift transition-all">
                  <div className="text-xs font-medium text-foreground truncate">{opp.customerName}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{opp.opportunityName}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{format(new Date(opp.expectedCloseDate), 'MMM d')}</span>
                    {opp.tcv > 0 && <span className="text-[10px] text-muted-foreground">${(opp.tcv/1000).toFixed(0)}k</span>}
                  </div>
                </button>
              ))}
              {bucket.items.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">No deals</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedOppId && <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <OpportunityProvider>
      <FilterPanel />
      <ScheduleContent />
    </OpportunityProvider>
  );
}
