'use client';

import { Opportunity } from '@/lib/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast } from 'date-fns';
import { ArrowRight, Clock, Sparkles, AlertTriangle, Zap, TrendingUp, Shield } from 'lucide-react';
import { computeOpportunityHealth } from '@/lib/health-scores';

// Stage probability weights for weighted value
const STAGE_WEIGHTS: Record<string, number> = {
  'Discovery': 0.10, 'Qualification': 0.25, 'Proposal': 0.50,
  'Negotiation': 0.75, 'Won': 1.0, 'Lost': 0, 'On Hold': 0.05,
};

function formatCompact(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
  return String(value);
}

interface KanbanCardProps {
  opportunity: Opportunity;
  onClick: (id: string) => void;
}

export function KanbanCard({ opportunity, onClick }: KanbanCardProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: opportunity.id,
    data: { type: 'Opportunity', opportunity },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const opp = opportunity;
  const health = computeOpportunityHealth(opp as any);
  const weight = STAGE_WEIGHTS[opp.status] || 0;
  const weightedValue = Math.round((opp.tcv || 0) * weight);

  // Next step: most urgent pending task
  const pendingTasks = (opp.subTasks || [])
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextTask = pendingTasks[0];

  // Time in stage (use updatedAt as proxy if stageEnteredDate not available)
  const stageDate = new Date(opp.updatedAt || opp.createdAt);
  const daysInStage = differenceInDays(new Date(), stageDate);
  const stageColor = daysInStage <= 7 ? 'text-emerald-500' : daysInStage <= 14 ? 'text-amber-500' : 'text-red-500';

  // Close date coloring
  const closeDate = new Date(opp.expectedCloseDate);
  const daysToClose = differenceInDays(closeDate, new Date());
  const closeDateColor = isPast(closeDate) ? 'text-red-500' : daysToClose <= 30 ? 'text-amber-500' : 'text-muted-foreground';

  // Duration normalization
  const normDuration = (opp.dealDuration || '')
    .replace('12+ months', '12m+')
    .replace(/ months?/, 'm')
    .replace(/ weeks?/, 'w')
    .replace(/ years?/, 'y');

  // Service line abbreviation
  const slMap: Record<string, string> = {
    'IT Services': 'ITS', 'Staffing': 'STF', 'Legacy Modernization': 'LM',
    'Data & AI': 'D&AI', 'Testing & QA': 'QA', 'Managed Services / SRE': 'SRE',
    'Cloud & Infrastructure': 'Cloud',
  };
  const slBadge = (opp.serviceLine && slMap[opp.serviceLine]) || '';

  // Owner initials
  const ownerInitials = opp.primaryOwner.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(opp.id)}
      title={`Deal ID: ${opp.id}`}
      className={cn(
        'p-3 rounded-xl bg-card border border-border cursor-pointer transition-all hover:border-[#5B4FE9]/30 group mb-3 touch-none hover-lift',
        isDragging && 'opacity-50 rotate-1 shadow-lg'
      )}
    >
      {/* Header: Company + SL badge + time in stage */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-foreground truncate">
            {opp.customerName}
          </span>
          {slBadge && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-secondary text-muted-foreground flex-shrink-0">{slBadge}</span>
          )}
        </div>
        <span className={`text-[10px] flex items-center gap-0.5 flex-shrink-0 ${stageColor}`} title={`${daysInStage} days in ${opp.status}`}>
          <Clock className="h-2.5 w-2.5" />
          {daysInStage}d
        </span>
      </div>

      {/* Deal name */}
      <div className="text-[11px] text-muted-foreground truncate mb-2">{opp.opportunityName}</div>

      {/* Value: face + weighted */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-sm font-bold text-foreground tabular-nums">
          {opp.tcv > 0 ? `$${formatCompact(opp.tcv)}` : '$0'}
        </span>
        {opp.tcv > 0 && weight > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            &rarr; ${formatCompact(weightedValue)} wtd
          </span>
        )}
        {opp.margin !== undefined && (
          <span className="text-[10px] text-muted-foreground ml-auto">{opp.margin}%</span>
        )}
      </div>

      {/* AI Signal indicators — health score, risk flags, recent signals */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {/* Health score badge — always visible, computed */}
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${
          health.score >= 70 ? 'bg-emerald-500/10 text-emerald-400' :
          health.score >= 45 ? 'bg-amber-500/10 text-amber-400' :
          'bg-red-500/10 text-red-400'
        }`}>
          <Shield className="h-2 w-2" /> {health.score} {health.grade}
        </span>
        {/* Win probability badge */}
        {(opp as any).winProbability > 0 && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 ${
            (opp as any).winProbability >= 60 ? 'bg-emerald-500/10 text-emerald-400' :
            (opp as any).winProbability >= 30 ? 'bg-amber-500/10 text-amber-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            <TrendingUp className="h-2 w-2" /> {(opp as any).winProbability}%
          </span>
        )}
        {/* Signal origin badge */}
        {(opp.source === 'Signal' || (opp as any).convertedFromLeadId) && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center gap-0.5">
            <Zap className="h-2 w-2" /> Signal
          </span>
        )}
        {/* Missing DM warning */}
        {!(opp.customerStakeholders || []).some((s: any) => s.isDecisionMaker) && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 flex items-center gap-0.5">
            <AlertTriangle className="h-2 w-2" /> No DM
          </span>
        )}
        {/* Workshop badge */}
        {(opp as any).workshopId && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0A867F]/10 text-[#0A867F] flex items-center gap-0.5">
            <Sparkles className="h-2 w-2" /> Workshop
          </span>
        )}
        {/* Recent activity signal */}
        {daysInStage <= 2 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] flex items-center gap-0.5">
            <Zap className="h-2 w-2" /> Active
          </span>
        )}
      </div>

      {/* Next step strip */}
      {nextTask ? (
        <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-secondary mb-2 text-[10px]">
          <ArrowRight className="h-2.5 w-2.5 text-[#5B4FE9] flex-shrink-0" />
          <span className="text-foreground truncate">{nextTask.name}</span>
          <span className={`flex-shrink-0 ${isPast(new Date(nextTask.dueDate)) ? 'text-red-500' : 'text-muted-foreground'}`}>
            &middot; {format(new Date(nextTask.dueDate), 'MMM d')}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-orange-500/5 border border-orange-500/10 mb-2 text-[10px] text-orange-500">
          <span>No next step defined</span>
        </div>
      )}

      {/* Footer: close date, billing, duration, owner */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className={closeDateColor}>
            {format(closeDate, 'MMM d')}
          </span>
          {opp.billingModel && (
            <span>{opp.billingModel === 'Time & Material' ? 'T&M' : opp.billingModel === 'Fixed Price' ? 'FP' : opp.billingModel === 'Retainer' ? 'RET' : opp.billingModel === 'Milestone-based' ? 'MB' : opp.billingModel}</span>
          )}
          {normDuration && <span>{normDuration}</span>}
        </div>
        <div className="w-6 h-6 rounded-full bg-[#5B4FE9]/10 flex items-center justify-center text-[#5B4FE9] text-[9px] font-bold" title={opp.primaryOwner}>
          {ownerInitials}
        </div>
      </div>
    </div>
  );
}
