'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { gapsForWorkshop, rollupByWorkstream, priorityRank, defaultEffort } from '@/lib/workshop/scoring';
import {
  FileText, Sparkles, Loader2, ChevronDown, ChevronUp, Plus,
  Target, Zap, Users, BarChart3, Settings, ArrowRight,
} from 'lucide-react';

const PRIORITY_COLORS = ['#9DB0C6', '#3A93A0', '#D97A2B', '#C8472E'];
const MATURITY_LABELS = ['Absent', 'Ad hoc', 'Repeatable', 'Governed', 'Optimized'];

// Execution model types
const EXECUTION_MODELS = [
  { id: 'pod_squad', name: 'FDE Pod Squad', desc: 'Dedicated engineering pods with tech lead + devs + QA', icon: Users, color: '#7c3aed' },
  { id: 'managed_capacity', name: 'Managed Capacity', desc: 'Staff augmentation with SLA and oversight', icon: BarChart3, color: '#3b82f6' },
  { id: 'outcome_based', name: 'Outcome-Based', desc: 'Fixed deliverables with milestone payments', icon: Target, color: '#22c55e' },
  { id: 'ai_stream', name: 'AI-Powered Stream', desc: 'AI-accelerated delivery with Claude + agents', icon: Sparkles, color: '#0A867F' },
  { id: 'hybrid', name: 'Hybrid Blend', desc: 'Mix of pod squad + managed capacity', icon: Settings, color: '#f59e0b' },
];

interface WorkshopScopeProps {
  workshop: any;
  onRefresh: () => void;
}

export default function WorkshopScope({ workshop, onRefresh }: WorkshopScopeProps) {
  const [expandedWs, setExpandedWs] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({ title: '', effort: 3, phase: 'P1', owner: '' });
  const [filterMode, setFilterMode] = useState<'all' | 'priority'>('all');
  const [generating, setGenerating] = useState(false);

  const chatMutation = trpc.ai.chat.useMutation();
  const addScopeMutation = trpc.workshop.addScopeItem.useMutation({ onSuccess: onRefresh });
  const updateScopeMutation = trpc.workshop.updateScopeItem.useMutation({ onSuccess: onRefresh });

  const gaps = useMemo(() => gapsForWorkshop(workshop), [workshop]);
  const workstreams = workshop.framework?.workstreams || [];
  const scopeItems = workshop.scopeItems || [];

  const filteredGaps = filterMode === 'priority' ? gaps.filter(g => g.priority) : gaps;
  const rollups = useMemo(() => rollupByWorkstream(filteredGaps, workstreams, scopeItems), [filteredGaps, workstreams, scopeItems]);

  const totalEffort = scopeItems.length > 0
    ? scopeItems.reduce((s: number, item: any) => s + (item.effort || 0), 0)
    : filteredGaps.reduce((s: number, g: any) => s + defaultEffort(g.gap), 0);

  // AI Generate Scope
  const handleGenerateScope = () => {
    if (gaps.length === 0) return;
    setGenerating(true);

    const gapList = gaps.map(g => `${g.dimensionId} ${g.dimensionName} [${g.workstreamCode}] ${g.current}→${g.target}${g.priority ? ' ★priority' : ''}: ${g.finding || g.probe || ''}`).join('\n');
    const wsList = workstreams.map((ws: any) => `${ws.code}: ${ws.name} — ${ws.objective}`).join('\n');

    chatMutation.mutate({
      message: `Generate scope items from these assessment gaps. Group by workstream, include effort estimates and phasing.

GAPS:
${gapList}

WORKSTREAMS:
${wsList}

Also recommend an EXECUTION MODEL for each workstream from: Pod Squad (dedicated eng pods), Managed Capacity (staff aug), Outcome-Based (fixed deliverables), AI-Powered (AI-accelerated), Hybrid.

Return JSON only:
{"items":[{"workstreamCode":"WS1","title":"<action-oriented title>","description":"<1 sentence>","effort":<points>,"phase":"P1|P2|P3","sourceDimensionId":"<dim id>","executionModel":"pod_squad|managed_capacity|outcome_based|ai_stream|hybrid"}]}`,
      context: { page: 'workshop-scope' },
    }, {
      onSuccess: (data) => {
        try {
          const match = data.response.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            (parsed.items || []).forEach((item: any) => {
              addScopeMutation.mutate({
                workshopId: workshop.id,
                workstreamCode: item.workstreamCode,
                sourceDimensionId: item.sourceDimensionId,
                title: item.title,
                description: `${item.description || ''}\n[Execution: ${item.executionModel || 'TBD'}]`,
                effort: item.effort || 3,
                phase: item.phase || 'P1',
              });
            });
          }
        } catch {}
        setGenerating(false);
      },
      onError: () => setGenerating(false),
    });
  };

  const handleManualAdd = (wsCode: string) => {
    if (!manualForm.title) return;
    addScopeMutation.mutate({
      workshopId: workshop.id,
      workstreamCode: wsCode,
      title: manualForm.title,
      effort: manualForm.effort,
      phase: manualForm.phase,
      owner: manualForm.owner || undefined,
      isManual: true,
    });
    setShowManualAdd(null);
    setManualForm({ title: '', effort: 3, phase: 'P1', owner: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Scope Builder</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {filteredGaps.length} gaps → {scopeItems.length || filteredGaps.length} scope items · {totalEffort} effort points
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex border border-border rounded-full overflow-hidden">
            <button onClick={() => setFilterMode('all')}
              className={`px-3 py-1 text-[10px] font-medium ${filterMode === 'all' ? 'bg-[#0B1120] text-white' : 'text-muted-foreground'}`}>
              All Gaps
            </button>
            <button onClick={() => setFilterMode('priority')}
              className={`px-3 py-1 text-[10px] font-medium ${filterMode === 'priority' ? 'bg-[#0B1120] text-white' : 'text-muted-foreground'}`}>
              Priority Only
            </button>
          </div>
          {/* Generate button */}
          <button onClick={handleGenerateScope} disabled={generating || gaps.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A867F] text-white text-xs font-medium hover:bg-[#0A867F]/90 disabled:opacity-50 transition-colors">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate Scope with AI
          </button>
        </div>
      </div>

      {/* Execution model legend */}
      <div className="flex flex-wrap gap-2">
        {EXECUTION_MODELS.map(em => (
          <div key={em.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] bg-card border border-border">
            <em.icon className="h-2.5 w-2.5" style={{ color: em.color }} />
            <span className="text-muted-foreground">{em.name}</span>
          </div>
        ))}
      </div>

      {/* Workstream rollups */}
      {rollups.length > 0 ? (
        <div className="space-y-3">
          {rollups.map(ws => {
            const isExpanded = expandedWs === ws.code;
            const wsItems = scopeItems.filter((si: any) => si.workstreamCode === ws.code);
            const displayItems = wsItems.length > 0 ? wsItems : ws.gaps.map((g: any) => ({
              id: `gap-${g.dimensionId}`,
              title: `Move ${g.dimensionName}: ${MATURITY_LABELS[g.current]} → ${MATURITY_LABELS[g.target]}`,
              description: g.finding || g.probe,
              effort: defaultEffort(g.gap),
              phase: 'P1',
              sourceDimensionId: g.dimensionId,
              _isGap: true,
            }));

            return (
              <div key={ws.code} className="rounded-xl bg-card border border-border overflow-hidden">
                {/* Workstream header */}
                <button onClick={() => setExpandedWs(isExpanded ? null : ws.code)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#0B1120] flex items-center justify-center text-[10px] font-mono font-bold text-white shrink-0">
                    {ws.code}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-semibold text-foreground">{ws.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{ws.objective}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{displayItems.length} items</span>
                    <span className="text-sm font-bold font-display text-[#0A867F]">{ws.totalEffort} <span className="text-[9px] font-mono font-normal text-muted-foreground">pts</span></span>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t space-y-2" style={{ borderColor: 'var(--g-line)' }}>
                    {displayItems.map((item: any) => {
                      const rank = item._isGap ? priorityRank(ws.gaps.find((g: any) => g.dimensionId === item.sourceDimensionId) || { gap: 1, priority: false } as any) : 1;
                      return (
                        <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                          {/* Priority bar */}
                          <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: PRIORITY_COLORS[rank] }} />
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground">{item.title}</div>
                            {item.sourceDimensionId && (
                              <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                {item.sourceDimensionId} · {item._isGap ? `${MATURITY_LABELS[ws.gaps.find((g: any) => g.dimensionId === item.sourceDimensionId)?.current || 0]} → ${MATURITY_LABELS[ws.gaps.find((g: any) => g.dimensionId === item.sourceDimensionId)?.target || 4]}` : ''}
                              </div>
                            )}
                            {item.description && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 italic line-clamp-1">{item.description}</div>
                            )}
                          </div>
                          {/* Controls */}
                          <div className="flex items-center gap-2 shrink-0">
                            <select value={item.phase || 'P1'}
                              onChange={e => !item._isGap && updateScopeMutation.mutate({ workshopId: workshop.id, scopeItemId: item.id, phase: e.target.value })}
                              className="px-2 py-1 text-[10px] font-mono bg-card border border-border rounded-md text-foreground">
                              <option value="P1">P1</option>
                              <option value="P2">P2</option>
                              <option value="P3">P3</option>
                            </select>
                            <input type="number" value={item.effort || 0}
                              onChange={e => !item._isGap && updateScopeMutation.mutate({ workshopId: workshop.id, scopeItemId: item.id, effort: Number(e.target.value) })}
                              className="w-14 px-2 py-1 text-[10px] font-mono bg-card border border-border rounded-md text-foreground text-center" />
                          </div>
                        </div>
                      );
                    })}

                    {/* Add manual scope item */}
                    {showManualAdd === ws.code ? (
                      <div className="mt-2 p-3 rounded-lg bg-secondary/20 space-y-2 animate-flow-in">
                        <input value={manualForm.title} onChange={e => setManualForm(p => ({ ...p, title: e.target.value }))}
                          placeholder="Scope item title..." className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
                        <div className="flex gap-2 items-center">
                          <select value={manualForm.phase} onChange={e => setManualForm(p => ({ ...p, phase: e.target.value }))}
                            className="px-2 py-1 text-[10px] bg-card border border-border rounded-md text-foreground">
                            <option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option>
                          </select>
                          <input type="number" value={manualForm.effort} onChange={e => setManualForm(p => ({ ...p, effort: Number(e.target.value) }))}
                            className="w-14 px-2 py-1 text-[10px] bg-card border border-border rounded-md text-foreground text-center" />
                          <input value={manualForm.owner} onChange={e => setManualForm(p => ({ ...p, owner: e.target.value }))}
                            placeholder="Owner" className="flex-1 px-2 py-1 text-[10px] bg-card border border-border rounded-md text-foreground" />
                          <button onClick={() => handleManualAdd(ws.code)} disabled={!manualForm.title}
                            className="px-2 py-1 text-[10px] rounded-md bg-[#0A867F] text-white disabled:opacity-50">Add</button>
                          <button onClick={() => setShowManualAdd(null)} className="text-[10px] text-muted-foreground">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowManualAdd(ws.code)}
                        className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-[#0A867F]/30 w-full transition-colors">
                        <Plus className="h-3 w-3" /> Add manual scope item
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">No gaps identified yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Score dimensions with current + target to surface gaps</p>
        </div>
      )}

      {/* Summary footer */}
      {rollups.length > 0 && (
        <div className="p-4 rounded-xl bg-[#0B1120] text-white flex items-center justify-between">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#0FB5AD]">Scope Summary</div>
            <div className="text-sm font-semibold mt-1">{rollups.length} workstreams · {scopeItems.length || filteredGaps.length} items · {totalEffort} total effort points</div>
          </div>
          <div className="flex items-center gap-3">
            {['P1', 'P2', 'P3'].map(phase => {
              const phaseItems = scopeItems.filter((si: any) => si.phase === phase);
              const phaseEffort = phaseItems.reduce((s: number, si: any) => s + (si.effort || 0), 0);
              return (
                <div key={phase} className="text-center">
                  <div className="text-xs font-mono text-[#0FB5AD]">{phase}</div>
                  <div className="text-sm font-bold">{phaseEffort} pts</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
