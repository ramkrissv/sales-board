'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { gapsForWorkshop, rollupByWorkstream, overallIndex, maturityStage, workshopStats } from '@/lib/workshop/scoring';
import {
  FileText, Sparkles, Loader2, Download, Copy, Check,
  ChevronDown, ChevronUp, Pencil, Target, BarChart3,
  Zap, Users, ArrowRight, CheckCircle,
} from 'lucide-react';

const MATURITY_LABELS = ['Absent', 'Ad hoc', 'Repeatable', 'Governed', 'Optimized'];
const EXEC_LABELS: Record<string, string> = {
  pod_squad: 'FDE Pod Squad', managed_capacity: 'Managed Capacity',
  outcome_based: 'Outcome-Based', ai_stream: 'AI-Powered', hybrid: 'Hybrid',
};

interface WorkshopProposalProps {
  workshop: any;
  onRefresh: () => void;
}

export default function WorkshopProposal({ workshop, onRefresh }: WorkshopProposalProps) {
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [copied, setCopied] = useState(false);

  const runAssistMutation = trpc.workshop.runAssist.useMutation();
  const chatMutation = trpc.ai.chat.useMutation();
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const workstreams = workshop.framework?.workstreams || [];
  const scopeItems = workshop.scopeItems || [];
  const useCases = workshop.useCases || [];
  const pilots = useCases.filter((u: any) => u.isPilot);
  const rollups = rollupByWorkstream(gaps, workstreams, scopeItems);

  const handleGenerate = () => {
    if (gaps.length === 0) return;
    setGenerating(true);

    const scopeByWs = rollups.map(ws => ({
      workstream: `${ws.code}: ${ws.name}`,
      objective: ws.objective,
      items: (scopeItems.filter((si: any) => si.workstreamCode === ws.code).length > 0
        ? scopeItems.filter((si: any) => si.workstreamCode === ws.code)
        : ws.gaps
      ).map((item: any) => ({
        title: item.title || item.dimensionName,
        move: item.sourceDimensionId
          ? `${MATURITY_LABELS[ws.gaps.find((g: any) => g.dimensionId === item.sourceDimensionId)?.current || 0]} → ${MATURITY_LABELS[ws.gaps.find((g: any) => g.dimensionId === item.sourceDimensionId)?.target || 4]}`
          : '',
        finding: item.description || item.finding || '',
        effort: item.effort || 0,
        phase: item.phase || 'P1',
      })),
      totalEffort: ws.totalEffort,
    }));

    const prompt = `Write a McKinsey-grade commercial proposal for ${workshop.customerName}.

ASSESSMENT RESULTS:
- Readiness Index: ${stats.index}/100 (${stats.stage})
- Dimensions Scored: ${stats.dimensionsScored}/${stats.totalDimensions}
- Gaps Identified: ${stats.gapCount} (${stats.priorityGapCount} priority)
- Use Cases: ${stats.useCaseCount} (${stats.pilotCount} pilots selected)
- Scope Items: ${stats.scopeItemCount}

LEVEL READINESS:
${stats.levelReadiness.map((lr: any) => `${lr.levelId} ${lr.name}: ${lr.currentPct}% current → ${lr.targetPct}% target`).join('\n')}

WORKSTREAM SCOPE:
${JSON.stringify(scopeByWs, null, 2)}

PILOTS:
${pilots.map((p: any) => `- ${p.name} (Value:${p.value} Feasibility:${p.feasibility})`).join('\n') || 'None selected'}

Write a complete proposal with these sections (return as JSON):
{
  "title": "<proposal title>",
  "execSummary": "<2-3 paragraph executive summary — findings, recommendation, investment thesis>",
  "modules": [
    {
      "workstreamCode": "WS1",
      "workstreamName": "<name>",
      "objective": "<objective>",
      "currentState": "<what we found>",
      "recommendation": "<what we recommend>",
      "scopeItems": ["<item 1>", "<item 2>"],
      "executionModel": "<pod_squad|managed_capacity|outcome_based|ai_stream|hybrid>",
      "effort": <points>,
      "phase": "<P1|P2|P3>",
      "rationale": "<why this matters — the so-what>"
    }
  ],
  "investmentSummary": "<total effort, phasing, team shape recommendation>",
  "nextSteps": ["<immediate next step>"]
}

Be specific to ${workshop.customerName}. Reference actual assessment findings. Implication-first, no filler, board-ready prose.`;

    chatMutation.mutate({ message: prompt, context: { page: 'workshop-proposal' } }, {
      onSuccess: (data) => {
        try {
          const match = data.response.match(/\{[\s\S]*\}/);
          if (match) {
            setProposal(JSON.parse(match[0]));
          } else {
            setProposal({ title: `${workshop.customerName} — Proposal`, execSummary: data.response, modules: [], investmentSummary: '', nextSteps: [] });
          }
        } catch {
          setProposal({ title: `${workshop.customerName} — Proposal`, execSummary: data.response, modules: [], investmentSummary: '', nextSteps: [] });
        }
        setGenerating(false);
      },
      onError: () => setGenerating(false),
    });
  };

  const handleCopy = () => {
    if (!proposal) return;
    const text = [
      `# ${proposal.title}`,
      '',
      '## Executive Summary',
      proposal.execSummary,
      '',
      ...(proposal.modules || []).flatMap((m: any) => [
        `## ${m.workstreamCode}: ${m.workstreamName}`,
        `**Objective:** ${m.objective}`,
        `**Current State:** ${m.currentState}`,
        `**Recommendation:** ${m.recommendation}`,
        `**Execution Model:** ${EXEC_LABELS[m.executionModel] || m.executionModel}`,
        `**Effort:** ${m.effort} points · ${m.phase}`,
        `**Scope:** ${(m.scopeItems || []).map((s: string) => `- ${s}`).join('\n')}`,
        `**Rationale:** ${m.rationale}`,
        '',
      ]),
      '## Investment Summary',
      proposal.investmentSummary,
      '',
      '## Next Steps',
      ...(proposal.nextSteps || []).map((s: string) => `- ${s}`),
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
          <h3 className="text-sm font-semibold text-foreground">Commercial Proposal</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            AI-assembled from {stats.gapCount} gaps across {rollups.length} workstreams · Every line traces to a finding
          </p>
        </div>
        <div className="flex gap-2">
          {proposal && (
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground">
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy Markdown'}
            </button>
          )}
          <button onClick={handleGenerate} disabled={generating || gaps.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A867F] text-white text-xs font-medium hover:bg-[#0A867F]/90 disabled:opacity-50 transition-colors">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {proposal ? 'Regenerate' : 'Generate Proposal'}
          </button>
        </div>
      </div>

      {/* Generation prerequisites */}
      {!proposal && !generating && (
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Prerequisites</div>
          <div className="space-y-2">
            {[
              { label: 'Score dimensions', done: stats.dimensionsScored > 0, detail: `${stats.dimensionsScored}/${stats.totalDimensions} scored` },
              { label: 'Identify gaps', done: stats.gapCount > 0, detail: `${stats.gapCount} gaps (${stats.priorityGapCount} priority)` },
              { label: 'Build scope', done: scopeItems.length > 0, detail: scopeItems.length > 0 ? `${scopeItems.length} scope items` : 'Generate from Scope tab' },
              { label: 'Select pilots (optional)', done: pilots.length > 0, detail: pilots.length > 0 ? `${pilots.length} pilots` : 'Select in Use Cases tab' },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-2 text-xs">
                {p.done ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-border" />}
                <span className={p.done ? 'text-foreground' : 'text-muted-foreground'}>{p.label}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{p.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {generating && (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0A867F]/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-[#0A867F] animate-pulse" />
          </div>
          <div className="text-sm text-muted-foreground">Generating commercial proposal...</div>
          <div className="text-[10px] text-muted-foreground">Assembling {rollups.length} workstream modules from {stats.gapCount} gaps</div>
        </div>
      )}

      {/* Rendered proposal */}
      {proposal && (
        <div className="space-y-4">
          {/* Header block */}
          <div className="p-6 rounded-xl bg-[#0B1120] text-white"
            style={{ backgroundImage: 'radial-gradient(80% 120% at 88% -20%, rgba(15,181,173,0.18), transparent 55%)' }}>
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#0FB5AD]">Commercial Proposal</div>
            <h2 className="text-lg font-bold font-display mt-2">{proposal.title}</h2>
            <p className="text-xs text-white/70 mt-2 max-w-2xl leading-relaxed">{workshop.customerName} · Readiness Index {stats.index}/100 ({stats.stage}) · {rollups.length} workstreams · {stats.scopeItemCount || gaps.length} scope items</p>
          </div>

          {/* Executive summary */}
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#0A867F] mb-2">Executive Summary</div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{proposal.execSummary}</p>
          </div>

          {/* Modules */}
          {(proposal.modules || []).map((mod: any, i: number) => {
            const isEditing = editingSection === `mod-${i}`;
            // Find source gaps for traceability
            const wsGaps = gaps.filter(g => g.workstreamCode === mod.workstreamCode);

            return (
            <div key={i} className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#0B1120] flex items-center justify-center text-[10px] font-mono font-bold text-white shrink-0">
                  {mod.workstreamCode}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{mod.workstreamName}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{mod.objective}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {mod.executionModel && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] font-medium">
                      {EXEC_LABELS[mod.executionModel] || mod.executionModel}
                    </span>
                  )}
                  <span className="text-xs font-bold font-display text-[#0A867F]">{mod.effort} pts</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{mod.phase}</span>
                  {/* Edit toggle */}
                  <button onClick={() => {
                    if (isEditing) { setEditingSection(null); }
                    else { setEditingSection(`mod-${i}`); setEditBuffer(mod.recommendation || ''); }
                  }} className="p-1 rounded text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Current state — editable */}
              {isEditing ? (
                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-[9px] font-mono uppercase text-amber-500">Current State</label>
                    <textarea defaultValue={mod.currentState} rows={2}
                      onChange={e => { mod.currentState = e.target.value; }}
                      className="w-full mt-1 px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground resize-none focus:outline-none focus:border-[#0A867F]/40" />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase text-[#0A867F]">Recommendation</label>
                    <textarea defaultValue={mod.recommendation} rows={2}
                      onChange={e => { mod.recommendation = e.target.value; }}
                      className="w-full mt-1 px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground resize-none focus:outline-none focus:border-[#0A867F]/40" />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono uppercase text-muted-foreground">Rationale (So What)</label>
                    <textarea defaultValue={mod.rationale} rows={2}
                      onChange={e => { mod.rationale = e.target.value; }}
                      className="w-full mt-1 px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground resize-none focus:outline-none focus:border-[#0A867F]/40" />
                  </div>
                  <button onClick={() => setEditingSection(null)}
                    className="text-[10px] text-[#0A867F] hover:underline">Done editing</button>
                </div>
              ) : (
                <>
                  {mod.currentState && (
                    <div className="mb-2">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-amber-500">Current State: </span>
                      <span className="text-xs text-foreground">{mod.currentState}</span>
                    </div>
                  )}
                  {mod.recommendation && (
                    <div className="mb-2">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#0A867F]">Recommendation: </span>
                      <span className="text-xs text-foreground">{mod.recommendation}</span>
                    </div>
                  )}
                </>
              )}

              {/* Scope items */}
              {mod.scopeItems?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {mod.scopeItems.map((item: string, j: number) => (
                    <div key={j} className="flex items-start gap-2 text-xs text-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0A867F] mt-1.5 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {mod.rationale && !isEditing && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--g-line)' }}>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">So What: </span>
                  <span className="text-xs text-muted-foreground italic">{mod.rationale}</span>
                </div>
              )}

              {/* Traceability — source dimensions */}
              {wsGaps.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--g-line)' }}>
                  <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Source Dimensions</div>
                  <div className="flex flex-wrap gap-1">
                    {wsGaps.map(g => (
                      <span key={g.dimensionId} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground" title={`${g.dimensionName}: ${MATURITY_LABELS[g.current]} → ${MATURITY_LABELS[g.target]}`}>
                        {g.dimensionId} {g.dimensionName} (+{g.gap})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })}

          {/* Investment summary */}
          {proposal.investmentSummary && (
            <div className="p-5 rounded-xl bg-[#0A867F]/5 border border-[#0A867F]/20">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#0A867F] mb-2">Investment Summary</div>
              <p className="text-xs text-foreground leading-relaxed">{proposal.investmentSummary}</p>
            </div>
          )}

          {/* Next steps */}
          {proposal.nextSteps?.length > 0 && (
            <div className="p-5 rounded-xl bg-card border border-border">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Immediate Next Steps</div>
              <div className="space-y-1.5">
                {proposal.nextSteps.map((step: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="w-4 h-4 rounded-full bg-[#0A867F]/10 flex items-center justify-center text-[9px] font-bold text-[#0A867F] shrink-0">{i + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
