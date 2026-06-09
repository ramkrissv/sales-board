'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { isToday, isPast, isAfter, endOfWeek, addWeeks, startOfDay, isThisWeek } from 'date-fns';
import { format } from 'date-fns';

function ScheduleContent() {
  const { opportunities, isLoading } = useOpportunities();

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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {buckets.map(bucket => (
          <div key={bucket.label} className={`rounded-xl bg-card border ${bucket.color} p-3`}>
            <div className={`text-xs font-semibold uppercase tracking-wider ${bucket.textColor} mb-3`}>
              {bucket.label} <span className="text-muted-foreground ml-1">{bucket.items.length}</span>
            </div>
            <div className="space-y-2">
              {bucket.items.map(opp => (
                <div key={opp.id} className="p-2.5 rounded-lg bg-secondary border border-border hover:border-purple-500/20 transition-all">
                  <div className="text-xs font-medium text-foreground truncate">{opp.customerName}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{opp.opportunityName}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{format(new Date(opp.expectedCloseDate), 'MMM d')}</span>
                    {opp.tcv > 0 && <span className="text-[10px] text-muted-foreground">${(opp.tcv/1000).toFixed(0)}k</span>}
                  </div>
                </div>
              ))}
              {bucket.items.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">No deals</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <OpportunityProvider>
      <ScheduleContent />
    </OpportunityProvider>
  );
}
