'use client';

import { AlertTriangle, Rocket, Clock, User, DollarSign, CheckCircle2, RefreshCw, ChevronRight } from 'lucide-react';
import type { PipelineNudge } from '@/lib/intelligence/InsightStore';

const NUDGE_ICONS: Record<string, any> = {
  alert: AlertTriangle,
  rocket: Rocket,
  clock: Clock,
  user: User,
  dollar: DollarSign,
  check: CheckCircle2,
};

const NUDGE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  red: { bg: 'bg-red-500/5', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
  amber: { bg: 'bg-amber-500/5', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-500/5', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-500/5', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-500/5', text: 'text-purple-400', border: 'border-purple-500/20', dot: 'bg-purple-500' },
};

interface PilotNudgesProps {
  nudges: PipelineNudge[];
  isLoading?: boolean;
  onNudgeClick?: (nudge: PipelineNudge) => void;
  onRefresh?: () => void;
}

export default function PilotNudges({ nudges, isLoading, onNudgeClick, onRefresh }: PilotNudgesProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 rounded-xl g-surface border border-border animate-pulse">
            <div className="h-4 bg-card rounded w-3/4 mb-2" />
            <div className="h-3 bg-card rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (nudges.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-pulse-live" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pilot Nudges</span>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
            <RefreshCw className="h-2.5 w-2.5" /> Refresh
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {nudges.slice(0, 4).map(nudge => {
          const Icon = NUDGE_ICONS[nudge.icon] || AlertTriangle;
          const colors = NUDGE_COLORS[nudge.color] || NUDGE_COLORS.purple;

          return (
            <button
              key={nudge.id}
              onClick={() => onNudgeClick?.(nudge)}
              className={`p-4 rounded-xl border ${colors.bg} ${colors.border} text-left transition-all hover:scale-[1.02] hover:shadow-md group`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                  <Icon className={`h-4 w-4 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground leading-tight">{nudge.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{nudge.detail}</div>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
