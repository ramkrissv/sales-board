'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Plus, Trash2, Sparkles, Loader2, Star, Target, Zap,
  ChevronDown, ChevronUp, Edit2, Check, X, Upload,
} from 'lucide-react';

interface WorkshopUseCasesProps {
  workshop: any;
  onRefresh: () => void;
}

const TOWERS = ['Business Operations', 'IT Operations', 'Engineering', 'Customer Experience', 'Data & Analytics', 'Security', 'Custom'];
const QUADRANT_LABELS: Record<string, { label: string; color: string }> = {
  'fund_first': { label: 'Fund First', color: '#0A867F' },
  'strategic_bet': { label: 'Strategic Bet', color: '#6E97C2' },
  'quick_win': { label: 'Quick Win', color: '#D97A2B' },
  'reconsider': { label: 'Reconsider', color: '#C3C9D4' },
};

function getQuadrant(value: number, feasibility: number) {
  if (value >= 3 && feasibility >= 3) return 'fund_first';
  if (value >= 3) return 'strategic_bet';
  if (feasibility >= 3) return 'quick_win';
  return 'reconsider';
}

export default function WorkshopUseCases({ workshop, onRefresh }: WorkshopUseCasesProps) {
  const useCases = workshop.useCases || [];
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', sponsor: '', problem: '', tower: '', value: 3, feasibility: 3 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pilotRecs, setPilotRecs] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const runAssistMutation = trpc.workshop.runAssist.useMutation();
  const [showMatrix, setShowMatrix] = useState(true);

  const addMutation = trpc.workshop.addUseCase.useMutation({ onSuccess: onRefresh });
  const updateMutation = trpc.workshop.updateUseCase.useMutation({ onSuccess: onRefresh });
  const deleteMutation = trpc.workshop.deleteUseCase.useMutation({ onSuccess: onRefresh });
  const chatMutation = trpc.ai.chat.useMutation();
  const [extracting, setExtracting] = useState(false);

  // Upload docs → AI extracts use cases with smart prioritization
  const handleDocUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setExtracting(true);
    const fileNames = Array.from(files).map(f => f.name).join(', ');
    // Read text content from text-based files
    let content = '';
    for (const file of Array.from(files)) {
      if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|csv|json)$/i)) {
        const text = await file.text();
        content += `\n[${file.name}]:\n${text.slice(0, 2000)}\n`;
      } else {
        content += `\n[${file.name}]: ${(file.size/1024).toFixed(0)}KB ${file.name.split('.').pop()?.toUpperCase()} document\n`;
      }
    }
    try {
      const result = await chatMutation.mutateAsync({
        message: `Extract use cases from these documents for ${workshop.customerName}. Return JSON array of use cases with AI-driven prioritization:\n\nDocuments: ${fileNames}\n${content}\n\nReturn ONLY JSON: [{"name":"<use case>","sponsor":"<if mentioned>","problem":"<problem statement>","tower":"<Business Operations|IT Operations|Engineering|Customer Experience|Data & Analytics|Security>","value":1-5,"feasibility":1-5,"isPilot":false}]\n\nPrioritize: high value + high feasibility first. Set value/feasibility based on business impact and technical complexity. Mark top 2-3 as isPilot=true.`,
        context: { page: 'workshop-create' },
      });
      const match = result.response.match(/\[[\s\S]*\]/);
      if (match) {
        const items = JSON.parse(match[0]);
        for (const item of items) {
          addMutation.mutate({
            workshopId: workshop.id,
            name: item.name || 'Untitled',
            sponsor: item.sponsor || undefined,
            problem: item.problem || undefined,
            tower: TOWERS.includes(item.tower) ? item.tower : 'Business Operations',
            value: Math.min(5, Math.max(1, item.value || 3)),
            feasibility: Math.min(5, Math.max(1, item.feasibility || 3)),
            isPilot: !!item.isPilot,
          });
        }
      }
    } catch {}
    setExtracting(false);
  };

  // Group by tower
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    useCases.forEach((uc: any) => {
      const tower = uc.tower || 'Ungrouped';
      if (!g[tower]) g[tower] = [];
      g[tower].push(uc);
    });
    return g;
  }, [useCases]);

  const pilots = useCases.filter((u: any) => u.isPilot);
  const ranked = [...useCases].sort((a: any, b: any) => (b.value + b.feasibility) - (a.value + a.feasibility));

  const handleAdd = () => {
    if (!form.name) return;
    addMutation.mutate({
      workshopId: workshop.id,
      name: form.name,
      sponsor: form.sponsor || undefined,
      problem: form.problem || undefined,
      tower: form.tower || undefined,
      value: form.value,
      feasibility: form.feasibility,
    });
    setShowAdd(false);
    setForm({ name: '', sponsor: '', problem: '', tower: '', value: 3, feasibility: 3 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Use Cases & Prioritization</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {useCases.length} use cases · {pilots.length} pilots selected
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowMatrix(!showMatrix)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground">
            <Target className="h-3 w-3" /> {showMatrix ? 'Hide' : 'Show'} Matrix
          </button>
          {useCases.length >= 3 && (
            <button onClick={() => {
              setRecLoading(true);
              runAssistMutation.mutate({
                workshopId: workshop.id,
                assistKey: 'pilot.recommend',
                input: { useCases: useCases.map((uc: any) => ({ name: uc.name, value: uc.value, feasibility: uc.feasibility })) },
              }, {
                onSuccess: (data) => {
                  const output: any = typeof data.output === 'object' ? data.output : {};
                  setPilotRecs(output.pilots || []);
                  setRecLoading(false);
                },
                onError: () => setRecLoading(false),
              });
            }} disabled={recLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-medium hover:bg-[#7c3aed]/20 disabled:opacity-40">
              {recLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI: Recommend Pilots
            </button>
          )}
          {/* Upload docs → AI extracts use cases */}
          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] cursor-pointer transition-colors ${extracting ? 'text-[#7c3aed]' : 'text-muted-foreground hover:text-foreground'}`}>
            {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {extracting ? 'Extracting...' : 'Upload Docs'}
            <input type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.pptx,.txt,.md,.csv,.json,.xlsx"
              onChange={e => handleDocUpload(e.target.files)} />
          </label>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A867F] text-white text-[10px] font-medium hover:bg-[#0A867F]/90">
            <Plus className="h-3 w-3" /> Add Use Case
          </button>
        </div>
      </div>

      {/* Value/Feasibility Matrix */}
      {showMatrix && useCases.length > 0 && (
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Value × Feasibility Matrix</div>
          <div className="relative" style={{ width: '100%', maxWidth: 400, height: 300, margin: '0 auto' }}>
            {/* Grid background */}
            <svg width="100%" height="100%" viewBox="0 0 300 250" className="absolute inset-0">
              {/* Axes */}
              <line x1="40" y1="210" x2="290" y2="210" stroke="var(--g-line)" strokeWidth="1" />
              <line x1="40" y1="210" x2="40" y2="10" stroke="var(--g-line)" strokeWidth="1" />
              {/* Grid lines */}
              {[1, 2, 3, 4, 5].map(v => (
                <g key={v}>
                  <line x1={40 + (v - 1) * 62.5} y1="10" x2={40 + (v - 1) * 62.5} y2="210" stroke="var(--g-line)" strokeWidth="0.5" strokeDasharray="2 4" />
                  <line x1="40" y1={210 - (v - 1) * 50} x2="290" y2={210 - (v - 1) * 50} stroke="var(--g-line)" strokeWidth="0.5" strokeDasharray="2 4" />
                  <text x={40 + (v - 1) * 62.5} y="225" textAnchor="middle" fontSize="8" fill="var(--g-fg-3)">{v}</text>
                  <text x="32" y={214 - (v - 1) * 50} textAnchor="end" fontSize="8" fill="var(--g-fg-3)">{v}</text>
                </g>
              ))}
              {/* Quadrant labels */}
              <text x="80" y="30" fontSize="8" fill="#0A867F" fontWeight="600" opacity="0.5">FUND FIRST</text>
              <text x="200" y="30" fontSize="8" fill="#D97A2B" fontWeight="600" opacity="0.5">STRATEGIC BET</text>
              <text x="80" y="195" fontSize="8" fill="#6E97C2" fontWeight="600" opacity="0.5">QUICK WIN</text>
              <text x="200" y="195" fontSize="8" fill="#C3C9D4" fontWeight="600" opacity="0.5">RECONSIDER</text>
              {/* Quadrant fill */}
              <rect x="165" y="10" width="125" height="100" fill="#0A867F" opacity="0.03" rx="4" />
              {/* Axis labels */}
              <text x="165" y="242" textAnchor="middle" fontSize="9" fill="var(--g-fg-3)" fontWeight="500">Feasibility →</text>
              <text x="8" y="110" textAnchor="middle" fontSize="9" fill="var(--g-fg-3)" fontWeight="500" transform="rotate(-90, 8, 110)">Value →</text>
              {/* Use case dots */}
              {useCases.map((uc: any, i: number) => {
                const x = 40 + ((uc.feasibility || 3) - 1) * 62.5;
                const y = 210 - ((uc.value || 3) - 1) * 50;
                const q = getQuadrant(uc.value, uc.feasibility);
                const color = QUADRANT_LABELS[q].color;
                return (
                  <g key={uc.id}>
                    <circle cx={x} cy={y} r={uc.isPilot ? 10 : 7} fill={color} opacity="0.8" stroke={uc.isPilot ? '#fff' : 'none'} strokeWidth="2" />
                    <text x={x} y={y + 3} textAnchor="middle" fontSize="7" fill="#fff" fontWeight="600">{i + 1}</text>
                    {uc.isPilot && <text x={x} y={y - 13} textAnchor="middle" fontSize="8" fill="#f59e0b">★</text>}
                  </g>
                );
              })}
            </svg>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-muted-foreground">
            {Object.entries(QUADRANT_LABELS).map(([key, q]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: q.color }} />
                {q.label}
              </span>
            ))}
            <span className="flex items-center gap-1"><Star className="h-2.5 w-2.5 text-amber-400" /> Pilot</span>
          </div>
        </div>
      )}

      {/* AI Pilot Recommendations */}
      {pilotRecs.length > 0 && (
        <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20 space-y-2 animate-flow-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> AI Recommended Pilots
            </div>
            <button onClick={() => setPilotRecs([])} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
          </div>
          {pilotRecs.map((rec: any, i: number) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-card border border-border">
              <span className="w-5 h-5 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[9px] font-bold text-[#7c3aed] shrink-0">{rec.sequence || i + 1}</span>
              <div className="flex-1">
                <div className="text-xs font-medium text-foreground">{rec.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{rec.reasoning}</div>
              </div>
              <button onClick={() => {
                const uc = useCases.find((u: any) => u.name === rec.name);
                if (uc) updateMutation.mutate({ workshopId: workshop.id, useCaseId: uc.id, isPilot: true });
              }} className="px-2 py-1 rounded-md bg-[#7c3aed] text-white text-[9px] font-medium shrink-0">
                <Star className="h-2.5 w-2.5 inline mr-0.5" /> Select
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="p-4 rounded-xl bg-[#0A867F]/5 border border-[#0A867F]/20 space-y-3 animate-flow-in">
          <div className="text-[10px] font-semibold text-[#0A867F] uppercase tracking-wider">New Use Case</div>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Use case name" className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
          <div className="grid grid-cols-3 gap-2">
            <input value={form.sponsor} onChange={e => setForm(p => ({ ...p, sponsor: e.target.value }))}
              placeholder="Sponsor" className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
            <select value={form.tower} onChange={e => setForm(p => ({ ...p, tower: e.target.value }))}
              className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground">
              <option value="">Select tower...</option>
              {TOWERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea value={form.problem} onChange={e => setForm(p => ({ ...p, problem: e.target.value }))}
              placeholder="Problem statement" rows={1} className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground resize-none" />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-muted-foreground uppercase">Value (1-5):</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, value: v }))}
                    className={`w-6 h-6 rounded-md text-[10px] font-mono font-semibold ${form.value === v ? 'bg-[#0B1120] text-white' : 'bg-card border border-border text-muted-foreground'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-muted-foreground uppercase">Feasibility (1-5):</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, feasibility: v }))}
                    className={`w-6 h-6 rounded-md text-[10px] font-mono font-semibold ${form.feasibility === v ? 'bg-[#0B1120] text-white' : 'bg-card border border-border text-muted-foreground'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="text-[10px] text-muted-foreground px-3 py-1.5">Cancel</button>
            <button onClick={handleAdd} disabled={!form.name}
              className="px-3 py-1.5 text-[10px] rounded-lg bg-[#0A867F] text-white font-medium disabled:opacity-50">Add Use Case</button>
          </div>
        </div>
      )}

      {/* Use case list grouped by tower */}
      {Object.entries(grouped).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([tower, ucs]) => (
            <div key={tower}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-[#0A867F]" /> {tower} ({ucs.length})
              </div>
              <div className="space-y-1.5">
                {(ucs as any[]).map((uc: any, i: number) => {
                  const q = getQuadrant(uc.value, uc.feasibility);
                  const qInfo = QUADRANT_LABELS[q];
                  const rank = ranked.findIndex(r => r.id === uc.id) + 1;
                  return (
                    <div key={uc.id} className="rounded-lg bg-card border border-border hover:border-[#0A867F]/20 transition-all group">
                      {editingId === uc.id ? (
                        <div className="px-3 py-2.5 space-y-2">
                          <input defaultValue={uc.name} id={`uc-name-${uc.id}`}
                            className="w-full px-2 py-1 text-xs bg-secondary/30 border border-border rounded text-foreground" placeholder="Use case name" />
                          <div className="grid grid-cols-2 gap-2">
                            <input defaultValue={uc.sponsor || ''} id={`uc-sponsor-${uc.id}`}
                              className="px-2 py-1 text-xs bg-secondary/30 border border-border rounded text-foreground" placeholder="Sponsor" />
                            <input defaultValue={uc.problem || ''} id={`uc-problem-${uc.id}`}
                              className="px-2 py-1 text-xs bg-secondary/30 border border-border rounded text-foreground" placeholder="Problem statement" />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="text-[10px] text-muted-foreground px-2 py-1">Cancel</button>
                            <button onClick={() => {
                              const name = (document.getElementById(`uc-name-${uc.id}`) as HTMLInputElement)?.value;
                              const sponsor = (document.getElementById(`uc-sponsor-${uc.id}`) as HTMLInputElement)?.value;
                              const problem = (document.getElementById(`uc-problem-${uc.id}`) as HTMLInputElement)?.value;
                              updateMutation.mutate({ workshopId: workshop.id, useCaseId: uc.id, name, sponsor, problem });
                              setEditingId(null);
                            }} className="px-2 py-1 text-[10px] rounded bg-[#0A867F] text-white">Save</button>
                          </div>
                        </div>
                      ) : (
                      <div className="flex items-center gap-3 px-3 py-2.5">
                      <span className="text-[10px] font-mono text-muted-foreground w-5">#{rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground">{uc.name}</div>
                        {uc.sponsor && <div className="text-[10px] text-muted-foreground mt-0.5">{uc.sponsor}</div>}
                      </div>
                      {/* Scores */}
                      <div className="flex items-center gap-1.5 text-[10px] shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-secondary font-mono">V:{uc.value}</span>
                        <span className="px-1.5 py-0.5 rounded bg-secondary font-mono">F:{uc.feasibility}</span>
                      </div>
                      {/* Quadrant badge */}
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: qInfo.color + '15', color: qInfo.color }}>
                        {qInfo.label}
                      </span>
                      {/* Pilot toggle */}
                      <button onClick={() => updateMutation.mutate({ workshopId: workshop.id, useCaseId: uc.id, isPilot: !uc.isPilot })}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${uc.isPilot ? 'bg-amber-500 text-white' : 'border border-border text-muted-foreground hover:text-amber-400'}`}
                        title={uc.isPilot ? 'Remove pilot' : 'Mark as pilot'}>
                        <Star className="h-3 w-3" />
                      </button>
                      {/* Edit */}
                      <button onClick={() => setEditingId(uc.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      {/* Delete */}
                      <button onClick={() => deleteMutation.mutate({ workshopId: workshop.id, useCaseId: uc.id })}
                        className="p-1 rounded text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">No use cases yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Add use cases to prioritize and identify pilots</p>
        </div>
      )}
    </div>
  );
}
