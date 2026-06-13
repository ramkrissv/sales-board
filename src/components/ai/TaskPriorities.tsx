'use client';

import { Sparkles, ArrowRight, AlertTriangle, Clock } from 'lucide-react';

interface TaskPrioritiesProps {
  opportunities: any[];
  onDealClick?: (dealId: string) => void;
}

interface PrioritizedTask {
  task: any;
  deal: any;
  urgencyScore: number;
  reason: string;
}

function prioritizeTasks(opportunities: any[]): PrioritizedTask[] {
  const now = Date.now();
  const tasks: PrioritizedTask[] = [];

  for (const opp of opportunities) {
    if (['Closed Won', 'Closed Lost', 'Won', 'Lost'].includes(opp.status)) continue;
    const subTasks = opp.subTasks || [];

    for (const task of subTasks) {
      if (task.status === 'complete') continue;

      let urgencyScore = 50; // base
      let reason = '';

      // Overdue tasks get highest priority
      const dueDate = new Date(task.dueDate);
      const daysOverdue = Math.floor((now - dueDate.getTime()) / (24 * 60 * 60 * 1000));
      if (daysOverdue > 0) {
        urgencyScore += 30 + Math.min(daysOverdue * 2, 20);
        reason = `${daysOverdue}d overdue`;
      } else {
        const daysUntil = Math.floor((dueDate.getTime() - now) / (24 * 60 * 60 * 1000));
        if (daysUntil <= 2) {
          urgencyScore += 20;
          reason = daysUntil === 0 ? 'Due today' : `Due in ${daysUntil}d`;
        }
      }

      // High-value deals bump priority
      if (opp.tcv > 200000) urgencyScore += 15;
      else if (opp.tcv > 50000) urgencyScore += 8;

      // Negotiation stage tasks are more urgent
      if (opp.status === 'Negotiation') urgencyScore += 10;
      else if (opp.status === 'Proposal') urgencyScore += 5;

      // Critical/High priority tasks
      if (task.priority === 'Critical') urgencyScore += 15;
      else if (task.priority === 'High') urgencyScore += 8;

      // Close date proximity
      const closeDate = opp.expectedCloseDate ? new Date(opp.expectedCloseDate) : null;
      if (closeDate) {
        const daysToClose = Math.floor((closeDate.getTime() - now) / (24 * 60 * 60 * 1000));
        if (daysToClose <= 14) urgencyScore += 10;
      }

      if (!reason) {
        reason = opp.status === 'Negotiation' ? 'Deal in negotiation' :
                 opp.tcv > 200000 ? 'High-value deal' :
                 task.priority === 'Critical' ? 'Critical priority' :
                 'Pending';
      }

      tasks.push({ task, deal: opp, urgencyScore, reason });
    }
  }

  return tasks.sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 5);
}

export default function TaskPriorities({ opportunities, onDealClick }: TaskPrioritiesProps) {
  const prioritized = prioritizeTasks(opportunities);

  if (prioritized.length === 0) return null;

  return (
    <div className="g-surface g-elevated p-4 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
        <span className="text-xs font-semibold text-foreground">Pilot Priorities</span>
        <span className="text-[10px] text-muted-foreground">AI-ranked by urgency</span>
      </div>

      <div className="space-y-1.5">
        {prioritized.map((item, i) => {
          const isOverdue = item.reason.includes('overdue');
          const dueDate = new Date(item.task.dueDate);
          const customer = item.deal.customerName || item.deal.customer;

          return (
            <div key={`${item.deal.id}-${item.task.name}-${i}`}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors hover:bg-card/80 ${
                isOverdue ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-card'
              }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                i === 0 ? 'bg-[#7c3aed]/15 text-[#7c3aed]' :
                isOverdue ? 'bg-red-500/15 text-red-400' :
                'bg-card border border-border text-muted-foreground'
              }`}>{i + 1}</div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{item.task.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {customer} · {item.task.owner || 'Unassigned'}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-medium ${
                  isOverdue ? 'text-red-400' : 'text-muted-foreground'
                }`}>
                  {isOverdue ? <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" /> :
                   <Clock className="h-2.5 w-2.5 inline mr-0.5" />}
                  {item.reason}
                </span>
                {onDealClick && (
                  <button onClick={() => onDealClick(item.deal.id)}
                    className="p-1 rounded text-muted-foreground hover:text-[#7c3aed]">
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
