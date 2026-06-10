'use client';

import { Opportunity } from '@/lib/types';
import { format } from 'date-fns';

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'];
const STAGE_COLORS: Record<string, string> = {
  Discovery: '#3b82f6', Qualification: '#f59e0b', Proposal: '#5B4FE9',
  Negotiation: '#22c55e', Won: '#10b981', Lost: '#ef4444', 'On Hold': '#f97316',
};

interface DealLifecycleProps {
  opportunity: Opportunity;
}

export function DealLifecycle({ opportunity }: DealLifecycleProps) {
  const currentIndex = STAGES.indexOf(opportunity.status);

  return (
    <div className="space-y-3">
      <div className="g-section-label">Deal Lifecycle</div>
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => {
          const isPast = i < currentIndex;
          const isCurrent = i === currentIndex;
          const color = STAGE_COLORS[stage] || '#6b7280';

          return (
            <div key={stage} className="flex items-center flex-1">
              {/* Stage node */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    isCurrent ? 'scale-110' : ''
                  }`}
                  style={{
                    borderColor: color,
                    backgroundColor: isPast || isCurrent ? color + '20' : 'transparent',
                    color: isPast || isCurrent ? color : 'var(--g-fg-3)',
                  }}
                >
                  {isPast ? '✓' : i + 1}
                </div>
                <span className={`text-[9px] mt-1 ${isCurrent ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                  {stage}
                </span>
              </div>
              {/* Connector line */}
              {i < STAGES.length - 1 && (
                <div className="h-0.5 flex-1 mx-1" style={{ backgroundColor: isPast ? color : 'var(--g-line)' }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground px-2">
        <span>Started: {format(new Date(opportunity.startDate), 'MMM d, yyyy')}</span>
        <span>Close: {format(new Date(opportunity.expectedCloseDate), 'MMM d, yyyy')}</span>
      </div>
    </div>
  );
}
