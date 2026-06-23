'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Plus, Trash2, GripVertical, Pencil, Check, X, Sparkles,
  ChevronDown, ChevronUp, Layers, Target, Loader2, Zap,
} from 'lucide-react';

interface FrameworkBuilderProps {
  workshop: any;
  onRefresh: () => void;
}

export default function FrameworkBuilder({ workshop, onRefresh }: FrameworkBuilderProps) {
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editingDim, setEditingDim] = useState<string | null>(null);
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [showAddDim, setShowAddDim] = useState<string | null>(null); // levelId
  const [showAddWs, setShowAddWs] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // Forms
  const [levelForm, setLevelForm] = useState({ name: '', weight: 0.33, summary: '' });
  const [dimForm, setDimForm] = useState({ name: '', probe: '', workstreamCode: '', guidance: '' });
  const [wsForm, setWsForm] = useState({ code: '', name: '', objective: '' });

  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const wsId = workshop.id;

  // Direct MongoDB update via a generic mutation
  const updateMutation = trpc.workshop.updateMeta.useMutation({ onSuccess: onRefresh });

  // For now, use the workshop document directly — framework editing adds/removes embedded arrays
  // We'll use a custom mutation for this

  const handleAddLevel = async () => {
    if (!levelForm.name) return;
    const newId = `L${levels.length + 1}`;
    const newLevel = {
      id: newId,
      name: levelForm.name,
      summary: levelForm.summary,
      weight: levelForm.weight,
      order: levels.length,
      sections: [],
      dimensions: [],
    };
    // Push to framework.levels array
    try {
      const res = await fetch('/api/trpc/workshop.addLevel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { workshopId: wsId, ...levelForm, id: newId, order: levels.length } }),
      });
    } catch {}
    onRefresh();
    setShowAddLevel(false);
    setLevelForm({ name: '', weight: 0.33, summary: '' });
  };

  const handleAddDimension = async (levelId: string) => {
    if (!dimForm.name) return;
    const level = levels.find((l: any) => l.id === levelId);
    const existingDims = level?.dimensions?.length || 0;
    const dimNum = existingDims + 1;
    const levelNum = levelId.replace('L', '');
    const newId = `${levelNum}.${dimNum}`;

    // Use tRPC to add dimension
    try {
      const res = await fetch('/api/trpc/workshop.addDimension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { workshopId: wsId, levelId, id: newId, name: dimForm.name, probe: dimForm.probe, workstreamCode: dimForm.workstreamCode, guidance: dimForm.guidance, order: dimNum - 1 } }),
      });
    } catch {}
    onRefresh();
    setShowAddDim(null);
    setDimForm({ name: '', probe: '', workstreamCode: '', guidance: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Framework Builder</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {levels.length} levels · {levels.reduce((s: number, l: any) => s + (l.dimensions?.length || 0), 0)} dimensions · {workstreams.length} workstreams
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddLevel(!showAddLevel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A867F]/10 text-[#0A867F] text-[10px] font-medium hover:bg-[#0A867F]/20 transition-colors">
            <Plus className="h-3 w-3" /> Add Level
          </button>
          <button onClick={() => setShowAddWs(!showAddWs)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-medium hover:bg-[#7c3aed]/20 transition-colors">
            <Plus className="h-3 w-3" /> Add Workstream
          </button>
        </div>
      </div>

      {/* Add level form */}
      {showAddLevel && (
        <div className="p-4 rounded-xl bg-[#0A867F]/5 border border-[#0A867F]/20 space-y-3 animate-flow-in">
          <div className="text-[10px] font-semibold text-[#0A867F] uppercase tracking-wider">New Assessment Level</div>
          <div className="grid grid-cols-3 gap-2">
            <input value={levelForm.name} onChange={e => setLevelForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Engineering Maturity" className="col-span-2 px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-muted-foreground whitespace-nowrap">Weight:</label>
              <input type="number" step="0.05" min="0" max="1" value={levelForm.weight}
                onChange={e => setLevelForm(p => ({ ...p, weight: Number(e.target.value) }))}
                className="w-20 px-2 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
            </div>
          </div>
          <textarea value={levelForm.summary} onChange={e => setLevelForm(p => ({ ...p, summary: e.target.value }))}
            placeholder="Level description — what does this level assess?" rows={2}
            className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground resize-none" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddLevel(false)} className="text-[10px] text-muted-foreground px-3 py-1.5">Cancel</button>
            <button onClick={handleAddLevel} disabled={!levelForm.name}
              className="px-3 py-1.5 text-[10px] rounded-lg bg-[#0A867F] text-white font-medium disabled:opacity-50">Add Level</button>
          </div>
        </div>
      )}

      {/* Add workstream form */}
      {showAddWs && (
        <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20 space-y-3 animate-flow-in">
          <div className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">New Workstream</div>
          <div className="grid grid-cols-3 gap-2">
            <input value={wsForm.code} onChange={e => setWsForm(p => ({ ...p, code: e.target.value }))}
              placeholder="WS9" className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground font-mono" />
            <input value={wsForm.name} onChange={e => setWsForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Workstream name" className="col-span-2 px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
          </div>
          <input value={wsForm.objective} onChange={e => setWsForm(p => ({ ...p, objective: e.target.value }))}
            placeholder="Objective — what does this workstream deliver?" className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddWs(false)} className="text-[10px] text-muted-foreground px-3 py-1.5">Cancel</button>
            <button onClick={() => { setShowAddWs(false); setWsForm({ code: '', name: '', objective: '' }); }} disabled={!wsForm.name}
              className="px-3 py-1.5 text-[10px] rounded-lg bg-[#7c3aed] text-white font-medium disabled:opacity-50">Add Workstream</button>
          </div>
        </div>
      )}

      {/* Levels with dimensions */}
      <div className="space-y-3">
        {levels.map((level: any) => {
          const isExpanded = expandedLevel === level.id;
          const dims = level.dimensions || [];
          const scored = dims.filter((d: any) => d.currentScore != null).length;
          const totalWeight = levels.reduce((s: number, l: any) => s + (l.weight || 0), 0);
          const normalizedPct = totalWeight > 0 ? Math.round((level.weight / totalWeight) * 100) : 0;

          return (
            <div key={level.id} className="rounded-xl bg-card border border-border overflow-hidden">
              {/* Level header */}
              <button onClick={() => setExpandedLevel(isExpanded ? null : level.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#0B1120] flex items-center justify-center text-sm font-bold font-display text-[#0FB5AD] shrink-0">
                  {level.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">{level.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{level.summary}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground">
                  <span>{dims.length} dims</span>
                  <span>{scored} scored</span>
                  <span className="font-mono font-semibold text-[#0A867F]">{normalizedPct}%</span>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {/* Expanded: dimension list + add button */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--g-line)' }}>
                  <div className="space-y-1.5 mt-3">
                    {dims.sort((a: any, b: any) => a.order - b.order).map((dim: any) => (
                      <div key={dim.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors group">
                        <span className="text-[10px] font-mono text-muted-foreground w-6">{dim.id}</span>
                        <span className="text-xs text-foreground flex-1 truncate">{dim.name}</span>
                        {dim.workstreamCode && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#0A867F]/10 text-[#0A867F]">{dim.workstreamCode}</span>
                        )}
                        {dim.currentScore != null && (
                          <span className="text-[10px] font-mono text-foreground">{dim.currentScore}→{dim.targetScore ?? '?'}</span>
                        )}
                        <button className="p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add dimension form */}
                  {showAddDim === level.id ? (
                    <div className="mt-3 p-3 rounded-lg bg-[#0A867F]/5 border border-[#0A867F]/20 space-y-2 animate-flow-in">
                      <div className="text-[9px] font-semibold text-[#0A867F] uppercase tracking-wider">New Dimension in {level.name}</div>
                      <input value={dimForm.name} onChange={e => setDimForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Dimension name (e.g. API Integration Testing)" className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
                      <textarea value={dimForm.probe} onChange={e => setDimForm(p => ({ ...p, probe: e.target.value }))}
                        placeholder="Diagnostic probe — the question asked in the room" rows={2}
                        className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground resize-none" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={dimForm.workstreamCode} onChange={e => setDimForm(p => ({ ...p, workstreamCode: e.target.value }))}
                          className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground">
                          <option value="">Workstream...</option>
                          {workstreams.map((ws: any) => (
                            <option key={ws.code} value={ws.code}>{ws.code} — {ws.name}</option>
                          ))}
                        </select>
                        <input value={dimForm.guidance} onChange={e => setDimForm(p => ({ ...p, guidance: e.target.value }))}
                          placeholder="Optional guidance / rubric notes" className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAddDim(null)} className="text-[10px] text-muted-foreground px-3 py-1">Cancel</button>
                        <button onClick={() => handleAddDimension(level.id)} disabled={!dimForm.name}
                          className="px-3 py-1 text-[10px] rounded-lg bg-[#0A867F] text-white font-medium disabled:opacity-50">Add Dimension</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddDim(level.id)}
                      className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-[#0A867F]/30 w-full transition-colors">
                      <Plus className="h-3 w-3" /> Add dimension to {level.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Workstreams overview */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workstreams ({workstreams.length})</div>
        <div className="grid grid-cols-2 gap-2">
          {workstreams.map((ws: any) => {
            const dimCount = levels.reduce((s: number, l: any) =>
              s + (l.dimensions || []).filter((d: any) => d.workstreamCode === ws.code).length, 0);
            return (
              <div key={ws.code} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/20 text-xs">
                <span className="font-mono font-semibold text-[#7c3aed] w-8">{ws.code}</span>
                <span className="flex-1 text-foreground truncate">{ws.name}</span>
                <span className="text-[10px] text-muted-foreground">{dimCount} dims</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
