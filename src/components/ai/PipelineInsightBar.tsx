'use client';

import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, AlertTriangle, Rocket, Clock } from 'lucide-react';
import type { PipelineInsights } from '@/lib/intelligence/InsightStore';

interface PipelineInsightBarProps {
  insights: PipelineInsights | null;
  isLoading?: boolean;
  onDealClick?: (dealId: string) => void;
}

export default function PipelineInsightBar({ insights, isLoading, onDealClick }: PipelineInsightBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="p-3 rounded-xl g-surface border border-border animate-pulse flex items-center gap-3">
        <Brain className="h-4 w-4 text-[#7c3aed] animate-pulse" />
        <div className="h-3 bg-card rounded w-48" />
      </div>
    );
  }

  if (!insights || insights.nudges.length === 0) return null;

  const topNudge = insights.nudges[0];
  const riskCount = insights.nudges.filter(n => n.type === 'risk').length;
  const actionCount = insights.nudges.filter(n => n.type === 'action').length;

  return (
    <div className="rounded-xl g-surface g-elevated overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-card/50 transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center flex-shrink-0">
          <Brain className="h-3.5 w-3.5 text-[#7c3aed]" />
        </div>
        <span className="text-xs text-foreground flex-1 text-left">{insights.summary}</span>
        <div className="flex items-center gap-2">
          {riskCount > 0 && (
            <span className="g-chip bg-red-500/10 text-red-400 text-[10px]">
              <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" />{riskCount} risk{riskCount > 1 ? 's' : ''}
            </span>
          )}
          {actionCount > 0 && (
            <span className="g-chip bg-amber-500/10 text-amber-400 text-[10px]">
              <Clock className="h-2.5 w-2.5 inline mr-0.5" />{actionCount} action{actionCount > 1 ? 's' : ''}
            </span>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'var(--g-line)' }}>
          {insights.nudges.map(nudge => (
            <div key={nudge.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                nudge.type === 'risk' ? 'bg-red-500' :
                nudge.type === 'action' ? 'bg-amber-500' :
                nudge.type === 'opportunity' ? 'bg-emerald-500' : 'bg-blue-500'
              }`} />
              <div className="flex-1">
                <div className="text-xs font-medium text-foreground">{nudge.title}</div>
                <div className="text-[10px] text-muted-foreground">{nudge.detail}</div>
              </div>
              {nudge.dealIds?.[0] && (
                <button onClick={() => onDealClick?.(nudge.dealIds![0])}
                  className="text-[10px] text-[#7c3aed] hover:underline">View</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
