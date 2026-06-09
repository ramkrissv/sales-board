'use client';

import { useOpportunities } from '@/lib/store';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface TimelineViewProps {
  onEventClick?: (id: string) => void;
}

export function TimelineView({ onEventClick }: TimelineViewProps) {
  const { opportunities } = useOpportunities();

  // Simple timeline implementation
  // We'll show next 3 months
  const today = new Date();
  const startDate = startOfWeek(addDays(today, -14)); // Start 2 weeks ago
  const endDate = addDays(today, 90); // Show next 90 days
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalDays = days.length;

  const getPosition = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = differenceInDays(date, startDate);
    return Math.max(0, Math.min(diff, totalDays)); // Clamp
  };

  const getWidth = (startStr: string, endStr: string) => {
    const start = Math.max(0, differenceInDays(new Date(startStr), startDate));
    const end = Math.min(totalDays, differenceInDays(new Date(endStr), startDate));
    return Math.max(1, end - start);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border rounded-md overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Opportunity Timeline</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="min-w-[1200px] p-6">
          {/* Header Row (Months/Weeks) */}
          <div className="flex border-b pb-2 mb-4">
            <div className="w-48 shrink-0 font-medium text-sm text-muted-foreground">Opportunity</div>
            <div className="flex-1 relative h-6">
               {/* Simplified axis for mockup */}
               <div className="absolute left-0 text-xs text-muted-foreground">Now</div>
               <div className="absolute left-1/3 text-xs text-muted-foreground">+1 Month</div>
               <div className="absolute left-2/3 text-xs text-muted-foreground">+2 Months</div>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-4">
            {opportunities.map(opp => {
              const startPos = getPosition(opp.startDate);
              const duration = getWidth(opp.startDate, opp.expectedCloseDate);
              const percentStart = (startPos / totalDays) * 100;
              const percentWidth = (duration / totalDays) * 100;

              return (
                <div key={opp.id} className="flex items-center group cursor-pointer" onClick={() => onEventClick && onEventClick(opp.id)}>
                  <div className="w-48 shrink-0 pr-4">
                    <div className="font-medium text-sm truncate">{opp.opportunityName}</div>
                    <div className="text-xs text-muted-foreground truncate">{opp.customerName}</div>
                  </div>
                  <div className="flex-1 h-8 bg-slate-50 dark:bg-slate-800 rounded relative border border-slate-100 dark:border-slate-800">
                    {/* Timeline Bar */}
                    <div 
                      className={cn(
                        "absolute h-5 top-1.5 rounded-sm shadow-sm opacity-80 hover:opacity-100 transition-opacity flex items-center px-2 text-[10px] text-white font-medium whitespace-nowrap overflow-hidden",
                        opp.status === 'Discovery' && "bg-blue-500",
                        opp.status === 'Qualification' && "bg-yellow-500",
                        opp.status === 'Proposal' && "bg-orange-500",
                        opp.status === 'Negotiation' && "bg-emerald-500",
                        opp.status === 'Won' && "bg-green-500",
                        opp.status === 'Lost' && "bg-slate-500",
                      )}
                      style={{ 
                        left: `${percentStart}%`, 
                        width: `${percentWidth}%`,
                        minWidth: '24px' 
                      }}
                    >
                      {opp.tcv > 500000 && <span>🔥</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
