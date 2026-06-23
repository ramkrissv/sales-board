'use client';

import { useState, useCallback } from 'react';
import { Flag, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import MaturityChips from './MaturityChips';

interface DimensionCardProps {
  dimension: any;
  levelId: string;
  workshopId: string;
  mode: 'with_ai' | 'without_ai';
  onScore: (dimId: string, field: string, value: any) => void;
  onFindingChange: (dimId: string, body: string) => void;
}

export default function DimensionCard({ dimension, levelId, workshopId, mode, onScore, onFindingChange }: DimensionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const gap = dimension.currentScore != null && dimension.targetScore != null
    ? Math.max(0, dimension.targetScore - dimension.currentScore)
    : null;

  const gapColor = gap === null ? 'text-muted-foreground' : gap === 0 ? 'text-emerald-400' : gap <= 1 ? 'text-blue-400' : gap <= 2 ? 'text-amber-400' : 'text-red-400';
  const gapBg = gap === null ? 'bg-secondary/30' : gap === 0 ? 'bg-emerald-500/10' : gap <= 1 ? 'bg-blue-500/10' : gap <= 2 ? 'bg-amber-500/10' : 'bg-red-500/10';

  return (
    <div className="p-5 rounded-xl bg-card border border-border transition-all hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-[10px] font-mono font-semibold text-muted-foreground pt-1 shrink-0">{dimension.id}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{dimension.name}</span>
            {dimension.workstreamCode && (
              <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#0A867F]/10 text-[#0A867F]">
                {dimension.workstreamCode}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-600">Probe — </span>
            {dimension.probe}
          </p>
        </div>
        {/* Priority flag */}
        <button
          onClick={() => onScore(dimension.id, 'priority', !dimension.priority)}
          className={`p-1.5 rounded-lg border transition-all shrink-0 ${
            dimension.priority
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
          title={dimension.priority ? 'Priority gap (click to remove)' : 'Mark as priority'}
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
        {/* Gap pill */}
        <div className={`text-center min-w-[60px] px-2.5 py-2 rounded-lg shrink-0 ${gapBg}`}>
          <div className={`text-lg font-bold font-display leading-none ${gapColor}`}>
            {gap !== null ? `+${gap}` : '—'}
          </div>
          <div className="text-[7px] font-mono uppercase tracking-wider text-muted-foreground mt-1">Gap</div>
        </div>
      </div>

      {/* Scoring chips */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <MaturityChips
          value={dimension.currentScore}
          onChange={v => onScore(dimension.id, 'currentScore', v)}
          label="Current State"
        />
        <MaturityChips
          value={dimension.targetScore}
          onChange={v => onScore(dimension.id, 'targetScore', v)}
          label="Target State"
          isTarget
        />
      </div>

      {/* Finding + details toggle */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--g-line)' }}>
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground mb-2">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Finding & Evidence
        </button>

        {expanded && (
          <div className="space-y-3 animate-flow-in">
            <textarea
              value={dimension.finding?.body || ''}
              onChange={e => onFindingChange(dimension.id, e.target.value)}
              placeholder="What did you hear in the room? Key observations, quotes, evidence..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0A867F]/40 resize-none"
            />

            {mode === 'with_ai' && (
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#0A867F]/10 text-[#0A867F] hover:bg-[#0A867F]/20 transition-colors">
                  <Sparkles className="h-3 w-3" /> Synthesize Finding
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors">
                  <Sparkles className="h-3 w-3" /> Detail Dimension
                </button>
              </div>
            )}

            {/* AI Detail children would render here in Phase 2 */}
            {(dimension.details || []).length > 0 && (
              <div className="space-y-1.5 ml-4 border-l-2 border-[#0A867F]/20 pl-3">
                {dimension.details.map((d: any) => (
                  <div key={d.id} className="text-xs text-foreground">
                    <span className="text-[9px] font-mono uppercase text-muted-foreground">{d.kind} — </span>
                    {d.body}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
