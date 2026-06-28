'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { workshopStats, levelReadiness, gapsForWorkshop, priorityRank, rollupByWorkstream } from '@/lib/workshop/scoring';
import {
  BarChart3, Target, Layers, Zap, Users, Flag, TrendingUp, FileText,
  Award, Sparkles, Loader2, AlertTriangle, CheckCircle, X, Clock,
  ArrowUpRight, ArrowDownRight, Brain, Activity, Shield, Gauge,
  ChevronDown, ChevronUp, Flame, Radio, Eye, Lightbulb, Compass,
} from 'lucide-react';
import ReadinessSpine from './exhibits/ReadinessSpine';
import GapHeatmap from './exhibits/GapHeatmap';

import { MATURITY_LABELS as MATURITY, MATURITY_COLORS } from '@/lib/workshop/constants';

interface WorkshopCockpitProps {
  workshop: any;
}

function IndexDial({ value, stage }: { value: number; stage: string }) {
  const color = value < 25 ? '#C3C9D4' : value < 50 ? '#6E97C2' : value < 75 ? '#3A93A0' : '#0A867F';
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${value * 2.64} ${264 - value * 2.64}`}
          strokeLinecap="round" className="transition-all duration-1000" />
        {/* Target ring */}
        <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white font-display">{value}</span>
        <span className="text-[7px] font-mono uppercase tracking-widest text-[#0FB5AD]/70">INDEX</span>
      </div>
    </div>
  );
}

export default function WorkshopCockpit({ workshop }: WorkshopCockpitProps) {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const useCases = workshop.useCases || [];
  const scopeItems = workshop.scopeItems || [];
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  const topGaps = useMemo(() =>
    [...gaps].sort((a, b) => b.gap - a.gap || (b.priority ? 1 : 0) - (a.priority ? 1 : 0)).slice(0, 8),
    [gaps]
  );

  const criticalCount = gaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority)).length;

  const avgMaturity = useMemo(() => {
    const allDims = levels.flatMap((l: any) => l.dimensions || []);
    const scored = allDims.filter((d: any) => d.currentScore != null);
    return scored.length > 0 ? (scored.reduce((s: number, d: any) => s + d.currentScore, 0) / scored.length) : 0;
  }, [levels]);

  const avgTarget = useMemo(() => {
    const allDims = levels.flatMap((l: any) => l.dimensions || []);
    const scored = allDims.filter((d: any) => d.targetScore != null);
    return scored.length > 0 ? (scored.reduce((s: number, d: any) => s + d.targetScore, 0) / scored.length) : 0;
  }, [levels]);

  const maturityDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    levels.forEach((l: any) => {
      (l.dimensions || []).forEach((d: any) => {
        if (d.currentScore != null) dist[d.currentScore]++;
      });
    });
    return dist;
  }, [levels]);

  const rollups = useMemo(() => rollupByWorkstream(gaps, workstreams, scopeItems), [gaps, workstreams, scopeItems]);

  const completionPct = Math.round((stats.dimensionsScored / Math.max(1, stats.totalDimensions)) * 100);
  const findingsCount = levels.flatMap((l: any) => l.dimensions || []).filter((d: any) => d.finding?.body).length;

  return (
    <div className="space-y-4">
      {/* ═══════ HERO BANNER ═══════ */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0B1120 0%, #151538 40%, #0B1120 100%)' }}>
        <div className="p-6" style={{ backgroundImage: 'radial-gradient(80% 120% at 85% -15%, rgba(15,181,173,0.2), transparent 55%), radial-gradient(50% 90% at 5% 110%, rgba(124,58,237,0.08), transparent 50%)' }}>
          <div className="flex items-start gap-6 flex-wrap">
            <IndexDial value={stats.index} stage={stats.stage} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#0FB5AD]">Assessment Cockpit</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                  stats.index >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
                  stats.index >= 40 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>{stats.stage}</span>
              </div>
              <div className="text-lg font-semibold font-display text-white">{workshop.customerName}</div>
              <div className="text-xs text-white/40 mt-0.5">{workshop.title}</div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                {[
                  { label: 'Avg Maturity', value: avgMaturity.toFixed(1), sub: `/ 4.0 · Target ${avgTarget.toFixed(1)}`, icon: Gauge, color: '#0FB5AD' },
                  { label: 'Coverage', value: `${completionPct}%`, sub: `${stats.dimensionsScored}/${stats.totalDimensions} dims`, icon: Activity, color: '#3b82f6' },
                  { label: 'Critical Gaps', value: criticalCount.toString(), sub: `${stats.gapCount} total · ${stats.priorityGapCount} priority`, icon: Flame, color: '#C8472E' },
                  { label: 'Use Cases', value: stats.useCaseCount.toString(), sub: `${stats.pilotCount} pilots selected`, icon: Brain, color: '#7c3aed' },
                  { label: 'Scope', value: stats.scopeItemCount.toString(), sub: `${stats.totalEffort} effort pts`, icon: Target, color: '#f59e0b' },
                ].map(kpi => (
                  <div key={kpi.label} className="rounded-lg bg-white/5 border border-white/5 px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <kpi.icon className="h-2.5 w-2.5" style={{ color: kpi.color }} />
                      <span className="text-[7px] font-mono uppercase tracking-wider text-white/35">{kpi.label}</span>
                    </div>
                    <div className="text-sm font-bold text-white font-display">{kpi.value}</div>
                    <div className="text-[8px] text-white/25">{kpi.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ LEVEL READINESS CARDS ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {levels.map((level: any, li: number) => {
          const r = levelReadiness(level);
          const levelGaps = gaps.filter(g => g.levelId === level.id);
          const levelCritical = levelGaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority));
          const dims = level.dimensions || [];
          const isExpanded = expandedLevel === level.id;
          const weightNorm = Math.round((level.weight || 1) / levels.reduce((s: number, l: any) => s + (l.weight || 1), 0) * 100);

          return (
            <div key={level.id} className="rounded-xl bg-card border border-border overflow-hidden hover:border-[#0A867F]/30 transition-colors">
              <button onClick={() => setExpandedLevel(isExpanded ? null : level.id)}
                className="w-full text-left px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0B1120] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#0FB5AD] font-display">{level.code || `L${li + 1}`}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{level.name}</div>
                    <div className="text-[9px] text-muted-foreground">{r.scored}/{r.total} scored · Weight {weightNorm}%</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold font-display" style={{ color: MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))] }}>
                      {r.currentPct}%
                    </div>
                  </div>
                </div>

                {/* Readiness bar */}
                <div className="mt-3 relative">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.currentPct}%`, backgroundColor: MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))] }} />
                  </div>
                  {r.targetPct > 0 && (
                    <div className="absolute top-0 h-2 w-0.5 bg-[#D97A2B] rounded-full" style={{ left: `${Math.min(100, r.targetPct)}%` }} title={`Target: ${r.targetPct}%`} />
                  )}
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  <span className="text-[9px] text-muted-foreground">{levelGaps.length} gaps</span>
                  {levelCritical.length > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">{levelCritical.length} critical</span>
                  )}
                  {r.targetPct > 0 && (
                    <span className="text-[9px] text-[#D97A2B]">Gap to target: {r.targetPct - r.currentPct}%</span>
                  )}
                </div>
              </button>

              {/* Expanded: dimension mini-cards */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-1.5 bg-muted/5">
                  {dims.map((dim: any) => {
                    const hasGap = dim.currentScore != null && dim.targetScore != null && dim.targetScore > dim.currentScore;
                    const gapSize = hasGap ? dim.targetScore - dim.currentScore : 0;
                    return (
                      <div key={dim.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/20 transition-colors">
                        {/* Score indicator */}
                        {dim.currentScore != null ? (
                          <div className="w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center"
                            style={{ backgroundColor: MATURITY_COLORS[dim.currentScore], color: '#fff' }}>
                            {dim.currentScore}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded border border-dashed border-border flex items-center justify-center text-[8px] text-muted-foreground">?</div>
                        )}
                        <span className="text-[10px] text-foreground flex-1 truncate">{dim.name}</span>
                        {dim.priority && <Flag className="h-2.5 w-2.5 text-[#D97A2B]" />}
                        {hasGap && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                            gapSize >= 3 ? 'bg-red-500/10 text-red-400' :
                            gapSize >= 2 ? 'bg-amber-500/10 text-amber-400' :
                            'bg-yellow-500/10 text-yellow-400'
                          }`}>+{gapSize}</span>
                        )}
                        {dim.currentScore != null && !hasGap && dim.targetScore != null && (
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                        )}
                        {dim.finding?.body && <FileText className="h-2.5 w-2.5 text-muted-foreground" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══════ INFOGRAPHICS ROW ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Readiness Spine */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> Readiness Spine
          </div>
          <ReadinessSpine levels={levels} />
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

      {/* ═══════ MATURITY DISTRIBUTION + TOP GAPS ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Maturity Distribution */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3" /> Maturity Distribution
          </div>
          <div className="flex items-end justify-between h-24 px-3">
            {maturityDist.map((count, i) => {
              const maxCount = Math.max(...maturityDist, 1);
              const height = (count / maxCount) * 100;
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[9px] font-mono font-bold text-foreground">{count}</span>
                  <div className="w-full max-w-[24px] rounded-t transition-all duration-700"
                    style={{ height: `${Math.max(height, 4)}%`, backgroundColor: MATURITY_COLORS[i] }} />
                  <span className="text-[7px] font-mono text-muted-foreground text-center leading-tight truncate w-full">{MATURITY[i]}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border text-center">
            <span className="text-[9px] text-muted-foreground">Average: </span>
            <span className="text-xs font-bold font-display" style={{ color: MATURITY_COLORS[Math.round(avgMaturity)] }}>
              {avgMaturity.toFixed(1)} — {MATURITY[Math.round(avgMaturity)]}
            </span>
          </div>
        </div>

        {/* Top Gaps — Prioritized */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Top Gaps — Priority Ranked
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {topGaps.length === 0 ? (
              <div className="text-[10px] text-muted-foreground text-center py-4">No gaps detected yet</div>
            ) : topGaps.map((g, i) => (
              <div key={g.dimensionId} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/20 transition-colors">
                <span className="text-[8px] font-mono font-bold text-muted-foreground w-4">{i + 1}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="w-4 h-4 rounded-sm text-[7px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: MATURITY_COLORS[g.current], color: '#fff' }}>{g.current}</div>
                  <ArrowUpRight className="h-2.5 w-2.5 text-[#D97A2B]" />
                  <div className="w-4 h-4 rounded-sm text-[7px] font-bold flex items-center justify-center border"
                    style={{ borderColor: MATURITY_COLORS[g.target], color: MATURITY_COLORS[g.target] }}>{g.target}</div>
                </div>
                <span className="text-[10px] text-foreground flex-1 truncate">{g.dimensionName}</span>
                {g.priority && <Flag className="h-2.5 w-2.5 text-[#D97A2B]" />}
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${
                  g.gap >= 3 ? 'bg-red-500/10 text-red-400' :
                  g.gap >= 2 ? 'bg-amber-500/10 text-amber-400' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>Δ{g.gap}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ WORKSTREAM IMPACT + PROGRESS METRICS ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Assessment Progress */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Assessment Progress
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Dimensions Scored', pct: completionPct, value: `${stats.dimensionsScored}/${stats.totalDimensions}`, color: '#0A867F' },
              { label: 'Findings Captured', pct: Math.round(findingsCount / Math.max(1, stats.totalDimensions) * 100), value: `${findingsCount}`, color: '#3b82f6' },
              { label: 'Use Cases Defined', pct: Math.min(100, stats.useCaseCount * 10), value: `${stats.useCaseCount}`, color: '#7c3aed' },
              { label: 'Scope Generated', pct: stats.scopeItemCount > 0 ? 100 : 0, value: `${stats.scopeItemCount} items`, color: '#f59e0b' },
            ].map(bar => (
              <div key={bar.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-muted-foreground">{bar.label}</span>
                  <span className="text-[9px] font-medium text-foreground">{bar.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bar.pct}%`, backgroundColor: bar.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workstream Impact */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Radio className="h-3 w-3" /> Impacted Workstreams
          </div>
          {rollups.length === 0 ? (
            <div className="text-[10px] text-muted-foreground text-center py-4">Score dimensions to see workstream impact</div>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {rollups.slice(0, 6).map(ws => (
                <div key={ws.code} className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-[#7c3aed] font-bold w-7">{ws.code}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-foreground truncate">{ws.name}</div>
                    <div className="text-[8px] text-muted-foreground">{ws.gaps.length} gaps · {ws.totalEffort} pts</div>
                  </div>
                  <div className="flex gap-0.5">
                    {ws.phases.map(p => (
                      <span key={p} className="text-[7px] font-mono px-1 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed]">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Intelligence */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Compass className="h-3 w-3" /> Assessment Intelligence
          </div>
          <div className="space-y-2.5">
            {/* Auto-insights from data */}
            {avgMaturity < 2 && (
              <div className="flex items-start gap-2 text-[10px]">
                <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                <span className="text-foreground">Overall maturity is <strong>below Repeatable</strong> — foundational capabilities need immediate attention before scaling.</span>
              </div>
            )}
            {criticalCount > 0 && (
              <div className="flex items-start gap-2 text-[10px]">
                <Flame className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                <span className="text-foreground"><strong>{criticalCount} critical gaps</strong> require immediate intervention — {criticalCount >= 3 ? 'systemic remediation' : 'targeted action'} recommended.</span>
              </div>
            )}
            {stats.priorityGapCount > stats.gapCount * 0.5 && (
              <div className="flex items-start gap-2 text-[10px]">
                <Flag className="h-3 w-3 text-[#D97A2B] shrink-0 mt-0.5" />
                <span className="text-foreground">Over half the gaps are flagged <strong>priority</strong> — triage and sequence before proposing a plan.</span>
              </div>
            )}
            {strengthDimsCount(levels) >= 5 && (
              <div className="flex items-start gap-2 text-[10px]">
                <Award className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-foreground"><strong>{strengthDimsCount(levels)} dimensions at Governed+</strong> — strong foundation to build on.</span>
              </div>
            )}
            {completionPct < 50 && (
              <div className="flex items-start gap-2 text-[10px]">
                <Eye className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
                <span className="text-foreground">Only <strong>{completionPct}%</strong> assessed — continue scoring for reliable analysis.</span>
              </div>
            )}
            {stats.useCaseCount === 0 && completionPct > 30 && (
              <div className="flex items-start gap-2 text-[10px]">
                <Lightbulb className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-foreground">No use cases captured yet — move to Use Cases tab to define and prioritize.</span>
              </div>
            )}
            {stats.useCaseCount > 0 && stats.pilotCount === 0 && (
              <div className="flex items-start gap-2 text-[10px]">
                <Zap className="h-3 w-3 text-[#7c3aed] shrink-0 mt-0.5" />
                <span className="text-foreground">{stats.useCaseCount} use cases defined but <strong>no pilots selected</strong> — recommend AI pilot selection.</span>
              </div>
            )}
            {completionPct >= 70 && stats.scopeItemCount === 0 && (
              <div className="flex items-start gap-2 text-[10px]">
                <Target className="h-3 w-3 text-[#f59e0b] shrink-0 mt-0.5" />
                <span className="text-foreground">Assessment is <strong>{completionPct}% complete</strong> — ready for scope generation.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ CONSISTENCY CHECK ═══════ */}
      {stats.dimensionsScored >= 3 && (
        <ConsistencyCheck workshop={workshop} />
      )}
    </div>
  );
}

function strengthDimsCount(levels: any[]): number {
  return levels.flatMap((l: any) => l.dimensions || []).filter((d: any) => d.currentScore != null && d.currentScore >= 3).length;
}

function ConsistencyCheck({ workshop }: { workshop: any }) {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const runAssist = trpc.workshop.runAssist.useMutation();

  const handleCheck = () => {
    setLoading(true);
    const levels = workshop.framework?.levels || [];
    const dims = levels.flatMap((l: any) => (l.dimensions || []).filter((d: any) => d.currentScore != null).map((d: any) => ({
      id: d.id, name: d.name, score: d.currentScore, finding: d.finding?.body,
    })));
    runAssist.mutate({
      workshopId: workshop.id,
      assistKey: 'consistency.check',
      input: { dimensions: dims },
    }, {
      onSuccess: (data) => {
        const output: any = typeof data.output === 'object' ? data.output : {};
        setIssues(output.issues || []);
        setChecked(true);
        setLoading(false);
      },
      onError: () => { setChecked(true); setLoading(false); },
    });
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" /> Quality & Consistency Check
        </div>
        <button onClick={handleCheck} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 disabled:opacity-40 transition-colors">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Run Check
        </button>
      </div>
      {checked && issues.length === 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <CheckCircle className="h-3 w-3" /> No inconsistencies — scores align with findings
        </div>
      )}
      {issues.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {issues.map((issue: any, i: number) => (
            <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/5 text-xs">
              <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-mono text-[10px] text-muted-foreground">{issue.dimensionId}</span>
                <span className="text-foreground ml-1">{issue.issue}</span>
                {issue.suggestion && <div className="text-[10px] text-[#0A867F] mt-0.5">→ {issue.suggestion}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
