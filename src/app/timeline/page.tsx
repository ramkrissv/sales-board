'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { format, differenceInDays, addDays, startOfDay } from 'date-fns';

function TimelineContent() {
  const { opportunities, isLoading } = useOpportunities();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading timeline...</div>;
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
        <h1 className="text-xl font-semibold text-white">Timeline</h1>
        <p className="text-sm text-slate-400 mt-1">{activeDeals.length} active deals over the next 90 days</p>
      </div>

      <div className="rounded-xl bg-[#111127] border border-[#2a2a4a] p-5 overflow-x-auto">
        {/* Month headers */}
        <div className="flex mb-4 border-b border-[#2a2a4a] pb-2">
          {Array.from({ length: 4 }, (_, i) => {
            const monthDate = addDays(timelineStart, i * 30);
            return (
              <div key={i} className="flex-1 text-xs text-slate-500 uppercase tracking-wider">
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
                <div className="w-32 text-xs text-slate-400 truncate flex-shrink-0">{opp.customerName}</div>
                <div className="flex-1 relative h-6">
                  <div
                    className={`absolute h-full rounded-md ${statusColors[opp.status] || 'bg-slate-500/40'} flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${opp.opportunityName}\n${format(start, 'MMM d')} \u2192 ${format(end, 'MMM d')}`}
                  >
                    <span className="text-[10px] text-white truncate">{opp.opportunityName.slice(0, 30)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <OpportunityProvider>
      <TimelineContent />
    </OpportunityProvider>
  );
}
