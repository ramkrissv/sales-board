'use client';

import { levelReadiness } from '@/lib/workshop/scoring';

const MATURITY_COLORS = ['#C3C9D4', '#9DB0C6', '#6E97C2', '#3A93A0', '#0A867F'];

interface ReadinessSpineProps {
  levels: any[];
}

export default function ReadinessSpine({ levels }: ReadinessSpineProps) {
  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-border" />

      <div className="space-y-3">
        {levels.map((level: any, i: number) => {
          const r = levelReadiness(level);
          const dims = level.dimensions || [];
          const barWidth = Math.max(4, r.currentPct);

          return (
            <div key={level.id} className="relative flex items-stretch gap-3">
              {/* Level node */}
              <div className="relative z-10 w-14 shrink-0 flex flex-col items-center">
                <div className="w-[54px] h-[54px] rounded-xl bg-[#0B1120] flex flex-col items-center justify-center overflow-hidden relative">
                  {/* Fill bar from bottom */}
                  <div className="absolute bottom-0 left-0 right-0 transition-all duration-700"
                    style={{ height: `${r.currentPct}%`, background: `linear-gradient(180deg, ${MATURITY_COLORS[4]}, ${MATURITY_COLORS[2]})`, opacity: 0.85 }} />
                  <span className="relative z-10 text-white font-display font-bold text-sm">{level.id}</span>
                  <span className="relative z-10 text-[7px] font-mono text-[#0FB5AD]">{r.currentPct}%</span>
                </div>
              </div>

              {/* Level detail */}
              <div className="flex-1 p-3 rounded-xl bg-card border border-border min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs font-semibold text-foreground">{level.name}</div>
                    <div className="text-[9px] text-muted-foreground">{r.scored}/{r.total} scored · Weight: {Math.round((level.weight || 0) * 100)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-display text-[#0A867F]">{r.currentPct}%</div>
                    {r.targetPct > 0 && (
                      <div className="text-[9px] text-amber-500">Target: {r.targetPct}%</div>
                    )}
                  </div>
                </div>

                {/* Current vs target bar */}
                <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${MATURITY_COLORS[2]}, ${MATURITY_COLORS[4]})` }} />
                  {r.targetPct > 0 && (
                    <div className="absolute top-[-2px] w-0.5 h-[18px] bg-amber-500 rounded"
                      style={{ left: `${r.targetPct}%` }} />
                  )}
                </div>

                {/* Dimension mini-dots */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {dims.map((dim: any) => {
                    const hasScore = dim.currentScore != null;
                    const gap = dim.currentScore != null && dim.targetScore != null ? dim.targetScore - dim.currentScore : 0;
                    return (
                      <div key={dim.id} className="group relative">
                        <div className={`w-5 h-5 rounded-md text-[7px] font-mono font-bold flex items-center justify-center transition-all cursor-default ${
                          !hasScore ? 'bg-secondary text-muted-foreground' :
                          gap > 2 ? 'bg-red-500/20 text-red-400' :
                          gap > 0 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {hasScore ? dim.currentScore : '·'}
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-[#0B1120] text-white text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                          {dim.id} {dim.name}
                          {hasScore && ` (${dim.currentScore}→${dim.targetScore ?? '?'})`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
