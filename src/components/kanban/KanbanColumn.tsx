'use client';

import { Status, Opportunity } from '@/lib/types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanColumnProps {
  status: Status;
  opportunities: Opportunity[];
  onCardClick: (id: string) => void;
}

export function KanbanColumn({ status, opportunities, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'Column',
      status,
    },
  });

  const totalValue = opportunities.reduce((sum, opp) => sum + opp.tcv, 0);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  return (
    <div className="flex flex-col h-full min-w-[300px] w-[300px] bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-transparent">
      <div className="p-3 flex items-center justify-between shrink-0 sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("font-semibold border-0 bg-transparent px-0 text-sm")}>
            <span className={cn(
              "w-2 h-2 rounded-full mr-2 inline-block",
              status === 'Discovery' && "bg-blue-500",
              status === 'Qualification' && "bg-yellow-500",
              status === 'Proposal' && "bg-orange-500",
              status === 'Negotiation' && "bg-emerald-500",
              status === 'Won' && "bg-green-500",
              status === 'Lost' && "bg-slate-500",
              status === 'On Hold' && "bg-red-500",
            )} />
            {status}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
            {opportunities.length}
          </span>
        </div>
        <div className="text-xs font-semibold text-muted-foreground">
          {formatter.format(totalValue)}
        </div>
      </div>

      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 rounded-b-xl transition-colors",
          isOver ? "bg-slate-100/50 dark:bg-slate-800/50 ring-2 ring-primary/20 ring-inset" : ""
        )}
      >
        <SortableContext items={opportunities.map(o => o.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col h-full">
            {opportunities.map(opportunity => (
              <KanbanCard 
                key={opportunity.id} 
                opportunity={opportunity} 
                onClick={onCardClick}
              />
            ))}
            {opportunities.length === 0 && (
              <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                Drop here
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}