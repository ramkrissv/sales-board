'use client';

import { workshopStats, levelReadiness, gapsForWorkshop, priorityRank } from '@/lib/workshop/scoring';
import { BarChart3, Target, Layers, Zap, Users, Flag, TrendingUp } from 'lucide-react';

const MATURITY_COLORS = ['#C3C9D4', '#9DB0C6', '#6E97C2', '#3A93A0', '#0A867F'];

interface WorkshopCockpitProps {
  workshop: any;
}

function IndexDial({ value, stage }: { value: number; stage: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value < 25 ? '#C3C9D4' : value < 50 ? '#6E97C2' : value < 75 ? '#3A93A0' : '#0A867F';

  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" className="transform -rotate-90">
        <circle cx="48" cy="48" r={radius} stroke="var(--g-line, #333)" strokeWidth="6" fill="none" />
        <circle cx="48" cy="48" r={radius} stroke={color} strokeWidth="6" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground font-display">{value}</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-[#0A867F]">Index</span>
      </div>
    </div>
  );
}

export default function WorkshopCockpit({ workshop }: WorkshopCockpitProps) {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const topGaps = gaps.sort((a, b) => b.gap - a.gap || (b.priority ? 1 : 0) - (a.priority ? 1 : 0)).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Hero: Index + Stage + Level Readiness */}
      <div className="p-6 rounded-xl bg-[#0B1120] text-white"
        style={{ backgroundImage: 'radial-gradient(80% 120% at 88% -20%, rgba(15,181,173,0.18), transparent 55%), radial-gradient(70% 100% at 0% 120%, rgba(217,122,43,0.10), transparent 50%)' }}>
        <div className="flex items-center gap-6">
          <IndexDial value={stats.index} stage={stats.stage} />
          <div className="flex-1">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#0FB5AD]">Readiness</div>
            <div className="text-lg font-semibold font-display mt-1">{stats.stage}</div>
            <div className="text-xs text-[#0FB5AD] mt-1">
              {stats.dimensionsScored}/{stats.totalDimensions} dimensions scored · {stats.gapCount} gaps identified
            </div>
          </div>
        </div>

        {/* KPI chips */}
        <div className="flex gap-3 mt-5 flex-wrap">
          {[
            { label: 'Dimensions', value: `${stats.dimensionsScored}/${stats.totalDimensions}`, icon: Layers },
            { label: 'Priority Gaps', value: stats.priorityGapCount, icon: Flag },
            { label: 'Use Cases', value: stats.useCaseCount, icon: Target },
            { label: 'Pilots', value: stats.pilotCount, icon: Zap },
            { label: 'Scope Items', value: stats.scopeItemCount, icon: BarChart3 },
          ].map(k => (
            <div key={k.label} className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-xs">
              <k.icon className="h-3 w-3 text-[#0FB5AD]" />
              <span className="text-white/60 font-mono text-[9px] uppercase">{k.label}</span>
              <span className="text-white font-semibold font-display">{k.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Level Readiness Bars */}
      <div className="p-5 rounded-xl bg-card border border-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" /> Per-Level Readiness
        </div>
        <div className="space-y-3">
          {stats.levelReadiness.map((lr: any) => (
            <div key={lr.levelId} className="flex items-center gap-3">
              <div className="text-[10px] font-mono font-semibold text-white bg-[#0B1120] w-7 h-6 rounded-md flex items-center justify-center shrink-0">
                {lr.levelId}
              </div>
              <span className="text-xs font-semibold text-foreground w-44 truncate">{lr.name}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden relative">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${lr.currentPct}%`, background: `linear-gradient(90deg, #6E97C2, #0A867F)` }} />
                {lr.targetPct > 0 && (
                  <div className="absolute top-[-2px] w-0.5 h-[12px] bg-amber-500 rounded"
                    style={{ left: `${lr.targetPct}%` }} title={`Target: ${lr.targetPct}%`} />
                )}
              </div>
              <span className="text-xs font-mono font-semibold text-foreground w-10 text-right">{lr.currentPct}%</span>
              <span className="text-[10px] text-muted-foreground w-12 text-right">{lr.scored}/{lr.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Gaps */}
      {topGaps.length > 0 && (
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Flag className="h-3 w-3" /> Top Gaps
          </div>
          <div className="space-y-2">
            {topGaps.map(g => {
              const rank = priorityRank(g);
              const rankColors = ['#9DB0C6', '#3A93A0', '#D97A2B', '#C8472E'];
              return (
                <div key={g.dimensionId} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: rankColors[rank] }} />
                  <span className="text-[10px] font-mono text-muted-foreground w-6">{g.dimensionId}</span>
                  <span className="text-xs text-foreground flex-1 truncate">{g.dimensionName}</span>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                    <span style={{ color: MATURITY_COLORS[g.current] }}>{g.current}</span>
                    <span className="text-[#0A867F]">→</span>
                    <span style={{ color: MATURITY_COLORS[g.target] }}>{g.target}</span>
                  </div>
                  <span className="text-xs font-bold font-display" style={{ color: rankColors[rank] }}>+{g.gap}</span>
                  {g.priority && <Flag className="h-3 w-3 text-red-400" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
