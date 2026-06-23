'use client';

import { gapsForWorkshop, priorityRank } from '@/lib/workshop/scoring';
import { Flag } from 'lucide-react';

const MATURITY_COLORS = ['#C3C9D4', '#9DB0C6', '#6E97C2', '#3A93A0', '#0A867F'];
const GAP_COLORS = ['transparent', '#D97A2B30', '#D97A2B60', '#C8472E60', '#C8472E90'];

interface GapHeatmapProps {
  workshop: any;
  maxGaps?: number;
}

export default function GapHeatmap({ workshop, maxGaps = 10 }: GapHeatmapProps) {
  const gaps = gapsForWorkshop(workshop)
    .sort((a, b) => b.gap - a.gap || (b.priority ? 1 : 0) - (a.priority ? 1 : 0))
    .slice(0, maxGaps);

  if (gaps.length === 0) {
    return <div className="text-[10px] text-muted-foreground text-center py-4">No gaps identified yet — score dimensions with current + target</div>;
  }

  return (
    <div className="space-y-1.5">
      {gaps.map(g => (
        <div key={g.dimensionId} className="flex items-center gap-2">
          <span className="text-[10px] text-foreground flex-1 min-w-0 truncate">{g.dimensionName}</span>
          {g.priority && <Flag className="h-2.5 w-2.5 text-red-400 shrink-0" />}
          {/* 5-cell maturity bar */}
          <div className="flex gap-0.5 shrink-0">
            {[0, 1, 2, 3, 4].map(cell => {
              const isCurrent = cell <= g.current;
              const isGap = cell > g.current && cell <= g.target;
              const isTarget = cell === g.target;
              return (
                <div key={cell} className="w-3.5 h-3.5 rounded-sm transition-all relative"
                  style={{
                    backgroundColor: isCurrent ? MATURITY_COLORS[cell] : isGap ? GAP_COLORS[g.gap] || '#D97A2B30' : 'var(--g-line, #333)',
                  }}>
                  {isTarget && (
                    <div className="absolute inset-0 border-2 border-amber-500 rounded-sm" />
                  )}
                </div>
              );
            })}
          </div>
          <span className="text-[10px] font-mono font-bold shrink-0 w-6 text-right"
            style={{ color: g.gap >= 3 ? '#C8472E' : g.gap >= 2 ? '#D97A2B' : '#3A93A0' }}>
            +{g.gap}
          </span>
        </div>
      ))}
    </div>
  );
}
