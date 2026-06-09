import { Opportunity } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Users, ListTodo, MessageSquare, Briefcase, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface KanbanCardProps {
  opportunity: Opportunity;
  onClick: (id: string) => void;
}

export function KanbanCard({ opportunity, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: opportunity.id,
    data: {
      type: 'Opportunity',
      opportunity,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedTasks = opportunity.subTasks.filter(t => t.status === 'complete').length;
  const totalTasks = opportunity.subTasks.length;
  const decisionMakers = opportunity.customerStakeholders.filter(s => s.isDecisionMaker).length;

  // Format currency
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none mb-3 group",
        isDragging ? "opacity-50 z-50" : "opacity-100"
      )}
      onClick={() => onClick(opportunity.id)}
    >
      <Card className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        {/* Color stripe based on status intensity or priority logic could go here, keeping it clean for now */}
        <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-primary/50 transition-colors" />

        <CardHeader className="p-4 pb-2 space-y-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider line-clamp-1">
                  {opportunity.customerName}
                </p>
                {opportunity.serviceLine && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-slate-300">
                    {opportunity.serviceLine === 'IT Services' ? 'ITS' : 'STF'}
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-slate-900 dark:text-slate-100">
                {opportunity.opportunityName}
              </h4>
            </div>
            <div className="text-xs font-mono text-muted-foreground shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {opportunity.id.split('-').pop()}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {formatter.format(opportunity.tcv)}
            </div>
            {opportunity.margin !== undefined && (
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-1.5 py-0.5 rounded">
                <Percent className="h-3 w-3" />
                {opportunity.margin}%
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-4 py-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5" title="Expected Close Date">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(opportunity.expectedCloseDate), 'MMM d')}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Deal Duration">
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {opportunity.dealDuration}
              </span>
            </div>
            {opportunity.billingModel && (
              <div className="flex items-center gap-1.5" title="Billing Model">
                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {opportunity.billingModel === 'Time & Material' ? 'T&M' : 
                   opportunity.billingModel === 'Fixed Price' ? 'FP' : 
                   opportunity.billingModel === 'Milestone-based' ? 'MB' : 'RET'}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-2 flex items-center justify-between border-t bg-slate-50/50 dark:bg-slate-900/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" title={`${completedTasks}/${totalTasks} Tasks Complete`}>
              <ListTodo className={cn("h-3.5 w-3.5", totalTasks > 0 && completedTasks === totalTasks ? "text-green-600" : "")} />
              <span>{completedTasks}/{totalTasks}</span>
            </div>
            <div className="flex items-center gap-1" title={`${opportunity.customerStakeholders.length} Stakeholders (${decisionMakers} Decision Makers)`}>
              <Users className="h-3.5 w-3.5" />
              <span>{opportunity.customerStakeholders.length}</span>
            </div>
          </div>
          
          <Avatar className="h-6 w-6 border-2 border-white dark:border-slate-950">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {opportunity.primaryOwner.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </AvatarFallback>
          </Avatar>
        </CardFooter>
      </Card>
    </div>
  );
}
