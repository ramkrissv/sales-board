'use client';

import { workshopStats, levelReadiness, gapsForWorkshop, priorityRank } from '@/lib/workshop/scoring';
import { BarChart3, Target, Layers, Zap, Users, Flag, TrendingUp, FileText, Award } from 'lucide-react';
import ReadinessSpine from './exhibits/ReadinessSpine';
import GapHeatmap from './exhibits/GapHeatmap';

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

      {/* Readiness Spine Exhibit — the signature visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> Readiness Spine
          </div>
          <ReadinessSpine levels={workshop.framework?.levels || []} />
        </div>

        {/* Gap Heatmap */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Flag className="h-3 w-3" /> Gap Heatmap
          </div>
          <GapHeatmap workshop={workshop} maxGaps={10} />
          {topGaps.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-4">Score dimensions to surface gaps</div>
          )}
        </div>
      </div>

      {/* Workshop progress + recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Assessment Progress</div>
          <div className="relative h-2 rounded-full bg-secondary overflow-hidden mb-2">
            <div className="h-full rounded-full bg-[#0A867F] transition-all" style={{ width: `${Math.round((stats.dimensionsScored / Math.max(1, stats.totalDimensions)) * 100)}%` }} />
          </div>
          <div className="text-xs text-foreground">{stats.dimensionsScored} of {stats.totalDimensions} dimensions scored</div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Scope Readiness</div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-display text-[#0A867F]">{stats.gapCount}</span>
            <span className="text-xs text-muted-foreground">gaps → {stats.scopeItemCount} scope items</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">{stats.priorityGapCount} priority · {stats.totalEffort} effort pts</div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Use Cases</div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-display text-[#7c3aed]">{stats.useCaseCount}</span>
            <span className="text-xs text-muted-foreground">identified · {stats.pilotCount} pilots</span>
          </div>
        </div>
      </div>
    </div>
  );
}
