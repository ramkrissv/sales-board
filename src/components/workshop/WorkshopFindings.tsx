'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { workshopStats, gapsForWorkshop, levelReadiness } from '@/lib/workshop/scoring';
import ReadinessSpine from './exhibits/ReadinessSpine';
import GapHeatmap from './exhibits/GapHeatmap';
import {
  Sparkles, Loader2, Download, Copy, Check, FileText,
  Target, BarChart3, AlertTriangle, CheckCircle, Zap,
  ArrowRight, Users, Shield, Lightbulb, X, Plus,
} from 'lucide-react';

const MATURITY = ['Absent', 'Ad hoc', 'Repeatable', 'Governed', 'Optimized'];

interface WorkshopFindingsProps {
  workshop: any;
  onRefresh: () => void;
}

export default function WorkshopFindings({ workshop, onRefresh }: WorkshopFindingsProps) {
  const [generating, setGenerating] = useState(false);
  const [findings, setFindings] = useState<any>(null);
  const [customRecs, setCustomRecs] = useState<string[]>([]);
  const [newRec, setNewRec] = useState('');
  const [copied, setCopied] = useState(false);

  const runAssist = trpc.workshop.runAssist.useMutation();
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];

  const topGaps = useMemo(() =>
    gaps.sort((a, b) => b.gap - a.gap || (b.priority ? 1 : 0) - (a.priority ? 1 : 0)).slice(0, 8),
    [gaps]
  );

  const handleGenerateFindings = () => {
    setGenerating(true);
    const levelData = levels.map((l: any) => {
      const r = levelReadiness(l);
      const dims = (l.dimensions || []).filter((d: any) => d.currentScore != null);
      return {
        name: l.name,
        readiness: r.currentPct,
        dims: dims.map((d: any) => ({
          name: d.name,
          score: d.currentScore,
          finding: d.finding?.body,
        })),
      };
    });

    runAssist.mutate({
      workshopId: workshop.id,
      assistKey: 'currentstate.narrative',
      input: { levels: levelData },
    }, {
      onSuccess: (data) => {
        const narrative = typeof data.output === 'string' ? data.output : data.raw || '';
        setFindings({
          narrative: narrative.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim(),
          generatedAt: new Date().toISOString(),
        });
        setGenerating(false);
      },
      onError: () => setGenerating(false),
    });
  };

  const handleCopyAll = () => {
    const text = [
      `# Workshop Findings — ${workshop.customerName}`,
      `## ${workshop.title}`,
      `Readiness Index: ${stats.index}/100 (${stats.stage})`,
      `Dimensions Scored: ${stats.dimensionsScored}/${stats.totalDimensions}`,
      `Gaps: ${stats.gapCount} (${stats.priorityGapCount} priority)`,
      '',
      '## Current State Assessment',
      findings?.narrative || '',
      '',
      '## Key Gaps',
      ...topGaps.map(g => `- ${g.dimensionId} ${g.dimensionName}: ${MATURITY[g.current]} → ${MATURITY[g.target]} (+${g.gap})${g.priority ? ' ★' : ''}`),
      '',
      '## Recommendations',
      ...customRecs.map((r, i) => `${i + 1}. ${r}`),
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Workshop Findings & Recommendations</h3>
          <p className="text-[10px] text-muted-foreground">Assessment summary with infographics, key gaps, and actionable recommendations</p>
        </div>
        <div className="flex gap-2">
          {findings && (
            <button onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground">
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy Report'}
            </button>
          )}
          <button onClick={handleGenerateFindings} disabled={generating || stats.dimensionsScored === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A867F] text-white text-xs font-medium disabled:opacity-40">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {findings ? 'Regenerate' : 'Generate Findings Report'}
          </button>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="p-6 rounded-xl bg-[#0B1120] text-white"
        style={{ backgroundImage: 'radial-gradient(80% 120% at 88% -20%, rgba(15,181,173,0.18), transparent 55%)' }}>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold font-display text-[#0FB5AD]">{stats.index}</div>
            <div className="text-[8px] font-mono uppercase tracking-wider text-[#0FB5AD]/60 mt-1">Readiness Index</div>
          </div>
          <div className="h-12 w-px bg-white/10" />
          <div className="flex-1">
            <div className="text-lg font-semibold font-display">{workshop.customerName}</div>
            <div className="text-xs text-white/60 mt-0.5">{workshop.title} · {stats.stage}</div>
            <div className="flex gap-4 mt-2 text-[10px] text-white/50">
              <span>{stats.dimensionsScored}/{stats.totalDimensions} dimensions</span>
              <span>{stats.gapCount} gaps ({stats.priorityGapCount} priority)</span>
              <span>{stats.useCaseCount} use cases · {stats.pilotCount} pilots</span>
            </div>
          </div>
        </div>
      </div>

      {/* Infographics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Readiness Spine */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3" /> Readiness Spine
          </div>
          <ReadinessSpine levels={levels} />
        </div>

        {/* Gap Heatmap */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Gap Heatmap
          </div>
          <GapHeatmap workshop={workshop} maxGaps={8} />
        </div>
      </div>

      {/* Per-Level Summary Cards */}
      <div className="space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Level Summaries</div>
        {levels.map((level: any) => {
          const r = levelReadiness(level);
          const dims = (level.dimensions || []).filter((d: any) => d.currentScore != null);
          const levelGaps = gaps.filter(g => g.levelId === level.id);
          return (
            <div key={level.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#0B1120] flex items-center justify-center text-xs font-bold text-[#0FB5AD]">{level.id}</div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-foreground">{level.name}</div>
                  <div className="text-[10px] text-muted-foreground">{r.scored}/{r.total} scored · {r.currentPct}% readiness · {levelGaps.length} gaps</div>
                </div>
                <div className="text-lg font-bold font-display text-[#0A867F]">{r.currentPct}%</div>
              </div>
              {/* Key findings for this level */}
              {dims.filter((d: any) => d.finding?.body).slice(0, 3).map((d: any) => (
                <div key={d.id} className="text-[10px] text-muted-foreground mt-1 pl-11">
                  <span className="font-mono text-foreground">{d.id}</span> {d.finding.body.slice(0, 120)}{d.finding.body.length > 120 ? '...' : ''}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* AI-Generated Narrative */}
      {findings && (
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#0A867F] mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Current State Assessment
          </div>
          <div className="text-xs text-foreground leading-relaxed whitespace-pre-line">{findings.narrative}</div>
        </div>
      )}

      {/* Recommendations — AI + human driven */}
      <div className="p-5 rounded-xl bg-card border border-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#7c3aed] mb-3 flex items-center gap-1.5">
          <Lightbulb className="h-3 w-3" /> Key Recommendations
        </div>
        <div className="space-y-2">
          {customRecs.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <span className="w-5 h-5 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[9px] font-bold text-[#7c3aed] shrink-0">{i + 1}</span>
              <span className="text-xs text-foreground flex-1">{rec}</span>
              <button onClick={() => setCustomRecs(prev => prev.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={newRec} onChange={e => setNewRec(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newRec.trim()) { setCustomRecs(prev => [...prev, newRec.trim()]); setNewRec(''); } }}
            placeholder="Add a recommendation..."
            className="flex-1 px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
          <button onClick={() => {
            if (!newRec.trim()) return;
            setCustomRecs(prev => [...prev, newRec.trim()]);
            setNewRec('');
          }} disabled={!newRec.trim()}
            className="px-3 py-2 text-[10px] rounded-lg bg-[#7c3aed] text-white font-medium disabled:opacity-40">
            <Plus className="h-3 w-3" />
          </button>
          {/* AI suggest recommendations */}
          <button onClick={() => {
            runAssist.mutate({
              workshopId: workshop.id,
              assistKey: 'gap.narrative',
              input: { dimensionName: topGaps[0]?.dimensionName || 'overall', current: topGaps[0]?.current || 1, target: topGaps[0]?.target || 3, finding: topGaps[0]?.finding },
            }, {
              onSuccess: (data) => {
                const text = typeof data.output === 'string' ? data.output : data.raw || '';
                const clean = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
                if (clean) setCustomRecs(prev => [...prev, clean]);
              },
            });
          }} disabled={topGaps.length === 0}
            className="px-3 py-2 text-[10px] rounded-lg bg-[#0A867F]/10 text-[#0A867F] font-medium disabled:opacity-40">
            <Sparkles className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Stage Gate Status */}
      <div className="p-4 rounded-xl bg-secondary/20 border border-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Findings Readiness</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Dimensions Scored', done: stats.dimensionsScored >= stats.totalDimensions * 0.7, value: `${stats.dimensionsScored}/${stats.totalDimensions}` },
            { label: 'Findings Captured', done: levels.flatMap((l: any) => l.dimensions || []).filter((d: any) => d.finding?.body).length > 3, value: `${levels.flatMap((l: any) => l.dimensions || []).filter((d: any) => d.finding?.body).length} findings` },
            { label: 'Narrative Generated', done: !!findings, value: findings ? 'Ready' : 'Not yet' },
            { label: 'Recommendations', done: customRecs.length >= 3, value: `${customRecs.length} recs` },
          ].map(gate => (
            <div key={gate.label} className="flex items-center gap-2 text-xs">
              {gate.done ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-border shrink-0" />}
              <div>
                <div className={gate.done ? 'text-foreground' : 'text-muted-foreground'}>{gate.label}</div>
                <div className="text-[9px] text-muted-foreground">{gate.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
