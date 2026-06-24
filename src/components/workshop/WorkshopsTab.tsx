'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Sparkles, Loader2, Layers, Upload, CheckCircle2,
} from 'lucide-react';

const SOLUTION_STACK = [
  { id: 'galent_ai', label: 'Galent AI Platform' },
  { id: 'knowledge_graph', label: 'Knowledge Graph' },
  { id: 'harness_ai', label: 'HarnessAI' },
  { id: 'ambient_ai', label: 'AmbientAI' },
  { id: 'neuro_ql', label: 'NeuroQL' },
  { id: 'microprompts', label: 'MicroPrompts' },
  { id: 'spec_driven', label: 'Spec-Driven Dev' },
  { id: 'fde_pods', label: 'FDE Pod Squads' },
  { id: 'managed_capacity', label: 'Managed Capacity' },
];

export default function WorkshopsTab() {
  const { data: workshops = [], isLoading } = trpc.workshop.list.useQuery();
  const createMutation = trpc.workshop.create.useMutation();
  const chatMutation = trpc.ai.chat.useMutation();

  const { data: templates = [] } = trpc.workshop.listTemplates.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<'ai' | 'template'>('ai');
  const [aiInput, setAiInput] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [pendingWorkshop, setPendingWorkshop] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleAiCreate = () => {
    if (!aiInput.trim()) return;
    setAiParsing(true);
    chatMutation.mutate({
      message: `Extract workshop details from this input. Return JSON only — no markdown.

"${aiInput.slice(0, 2000)}"

JSON: {"customerName":"<company>","title":"<short title>","assessmentType":"<type>","context":"<1 sentence>","suggestedLevels":[{"name":"<level>","weight":0.33,"dimensions":[{"name":"<dim>","probe":"<question>"}]}],"suggestedWorkstreams":[{"code":"WS1","name":"<name>","objective":"<goal>"}],"stakeholders":[{"name":"<person>","title":"<role>"}],"technologies":["<tech>"]}`,
      context: { page: 'workshop-create' },
    }, {
      onSuccess: (data) => {
        try {
          // Strip markdown code fences if present
          const cleaned = data.response.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) {
            setPendingWorkshop(JSON.parse(match[0]));
          } else {
            // AI didn't return JSON — create basic workshop from input
            const nameMatch = aiInput.match(/(?:for|with|at)\s+([A-Z][A-Za-z\s&]+?)(?:\s*[-—–]|\s*$|\s*,)/);
            setPendingWorkshop({
              customerName: nameMatch?.[1]?.trim() || 'New Client',
              title: `${nameMatch?.[1]?.trim() || 'New Client'} — Assessment Workshop`,
              assessmentType: 'Custom',
              context: data.response.slice(0, 200),
              suggestedLevels: [],
              suggestedWorkstreams: [],
              stakeholders: [],
              technologies: [],
            });
          }
        } catch {
          setPendingWorkshop({
            customerName: 'New Client',
            title: 'Assessment Workshop',
            assessmentType: 'Custom',
            context: 'AI parsing failed — edit the fields below and confirm.',
            suggestedLevels: [],
            suggestedWorkstreams: [],
            stakeholders: [],
            technologies: [],
          });
        }
        setAiParsing(false);
      },
      onError: (err) => {
        console.error('Workshop AI creation error:', err);
        // Fallback: create basic workshop even if AI fails
        setPendingWorkshop({
          customerName: 'New Client',
          title: 'Assessment Workshop',
          assessmentType: 'Custom',
          context: 'AI unavailable — fill in the details manually.',
          suggestedLevels: [],
          suggestedWorkstreams: [],
          stakeholders: [],
          technologies: [],
        });
        setAiParsing(false);
      },
    });
  };

  const handleConfirmCreate = () => {
    if (!pendingWorkshop?.customerName) return;
    createMutation.mutate({
      customerName: pendingWorkshop.customerName,
      title: pendingWorkshop.title || `${pendingWorkshop.customerName} — Assessment`,
      mode: 'with_ai',
      format: 'in-person',
      sponsor: pendingWorkshop.sponsor || undefined,
    }, {
      onSuccess: (data: any) => {
        setPendingWorkshop(null); setAiInput(''); setShowCreate(false);
        window.location.href = `/workshop/${data.id}`;
      },
    });
  };

  // Inline readiness stats
  const computeStats = (ws: any) => {
    const levels = ws.framework?.levels || [];
    const allDims = levels.flatMap((l: any) => l.dimensions || []);
    const scored = allDims.filter((d: any) => d.currentScore != null);
    const rawSum = levels.reduce((s: number, l: any) => s + (l.weight || 1), 0);
    let idx = 0, wsum = 0;
    levels.forEach((l: any) => {
      const lScored = (l.dimensions || []).filter((d: any) => d.currentScore != null);
      if (lScored.length > 0) {
        const cur = (lScored.reduce((s: number, d: any) => s + d.currentScore, 0) / lScored.length / 4) * 100;
        const nw = (l.weight || 1) / rawSum;
        idx += cur * nw; wsum += nw;
      }
    });
    const index = wsum > 0 ? Math.round(idx / wsum) : 0;
    const stage = index === 0 ? 'Not Started' : index < 20 ? 'Emerging' : index < 40 ? 'Developing' : index < 60 ? 'Governed' : index < 80 ? 'Scaling' : 'Optimized';
    return { index, stage, dimensionsScored: scored.length, totalDimensions: allDims.length };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Client Workshops</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">AI-led assessment workshops — describe it, AI builds it</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A867F] text-white text-xs font-medium hover:bg-[#0A867F]/90 transition-colors">
          <Sparkles className="h-3.5 w-3.5" /> New Workshop
        </button>
      </div>

      {/* Creation mode selector + forms */}
      {showCreate && (
        <div className="space-y-4 animate-flow-in">
          {/* Mode tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/40 w-fit">
            <button onClick={() => setCreateMode('ai')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors ${createMode === 'ai' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              <Sparkles className="h-3.5 w-3.5" /> AI from Description
            </button>
            <button onClick={() => setCreateMode('template')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors ${createMode === 'template' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              <Layers className="h-3.5 w-3.5" /> From Template
            </button>
          </div>

          {/* Template picker mode */}
          {createMode === 'template' && (
            <div className="p-5 rounded-xl g-surface g-elevated space-y-4">
              <div className="text-xs font-semibold text-foreground">Pick a starting template — you can customize everything after creation</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(templates as any[]).map((tpl: any) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  const dimCount = (tpl.framework?.levels || []).reduce((s: number, l: any) => s + (l.dimensions?.length || 0), 0);
                  const wsCount = (tpl.framework?.workstreams || []).length;
                  return (
                    <button key={tpl.id} onClick={() => setSelectedTemplateId(isSelected ? null : tpl.id)}
                      className={`p-4 rounded-xl text-left transition-all ${isSelected ? 'bg-[#0A867F]/10 border-2 border-[#0A867F]/40' : 'bg-card border border-border hover:border-[#0A867F]/20'}`}>
                      <div className="text-xs font-semibold text-foreground">{tpl.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{tpl.description}</div>
                      <div className="flex gap-2 mt-2 text-[9px] text-muted-foreground">
                        <span>{dimCount} dimensions</span>
                        <span>·</span>
                        <span>{wsCount} workstreams</span>
                        <span>·</span>
                        <span>{(tpl.framework?.levels || []).length} levels</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedTemplateId && (
                <div className="flex items-center gap-3">
                  <input value={pendingWorkshop?.customerName || ''}
                    onChange={e => setPendingWorkshop((p: any) => ({ ...(p || {}), customerName: e.target.value }))}
                    placeholder="Customer name *" className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground" />
                  <button onClick={() => {
                    const name = pendingWorkshop?.customerName;
                    if (!name) return;
                    createMutation.mutate({ customerName: name, title: `${name} — Assessment`, templateId: selectedTemplateId, mode: 'with_ai', format: 'in-person' }, {
                      onSuccess: (data: any) => { window.location.href = `/workshop/${data.id}`; },
                    });
                  }} disabled={!pendingWorkshop?.customerName || createMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A867F] text-white text-xs font-medium disabled:opacity-50">
                    {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Create from Template
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI creation mode */}
          {createMode === 'ai' && (<>
          <div className="p-5 rounded-xl g-surface g-elevated"
            style={{ background: 'linear-gradient(135deg, rgba(10,134,127,0.05), transparent)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-[#0A867F]/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#0A867F]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Describe your workshop</div>
                <div className="text-[10px] text-muted-foreground">AI will build the assessment framework, dimensions, and workstreams</div>
              </div>
            </div>
            <textarea value={aiInput} onChange={e => setAiInput(e.target.value)}
              placeholder={`Describe the workshop, paste an email, or upload a document:\n\n• "Running a modernization assessment for Hughes — legacy Java billing platform, cloud migration to AWS"\n• Paste a client email or meeting notes\n• "Engineering maturity assessment for Acme Corp — SDLC, DevOps, testing"`}
              rows={4} className="w-full px-4 py-3 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0A867F]/40 resize-none" />

            {/* Solution Stack */}
            <div className="mt-3">
              <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Galent Solution Stack (include in assessment)</div>
              <div className="flex flex-wrap gap-2">
                {SOLUTION_STACK.map(opt => (
                  <label key={opt.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border cursor-pointer hover:border-foreground/30 transition-colors text-[10px]">
                    <input type="checkbox" className="w-3 h-3 rounded accent-[#0A867F]" />
                    <span className="text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border cursor-pointer hover:border-[#0A867F]/30 transition-colors text-[10px] text-muted-foreground hover:text-foreground">
                <Upload className="h-3 w-3" /> Upload doc / email
                <input type="file" className="hidden" accept=".pdf,.docx,.txt,.eml,.msg,.html"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
                      // PDFs: just note the filename, AI will work with the description
                      setAiInput(p => p + `\n\n[Document uploaded: ${f.name} (${(f.size / 1024).toFixed(0)}KB PDF) — Please build the workshop framework based on the document title and any context I've provided above.]`);
                    } else {
                      // Text-based files: read content
                      const r = new FileReader();
                      r.onload = () => {
                        const text = (r.result as string).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').slice(0, 4000);
                        setAiInput(p => p + `\n\n[Uploaded: ${f.name}]\n${text}`);
                      };
                      r.readAsText(f);
                    }
                  }} />
              </label>
              <div className="flex gap-2">
                <button onClick={() => { setShowCreate(false); setPendingWorkshop(null); setAiInput(''); }} className="px-3 py-1.5 text-xs text-muted-foreground">Cancel</button>
                <button onClick={handleAiCreate} disabled={!aiInput.trim() || aiParsing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A867F] text-white text-xs font-medium hover:bg-[#0A867F]/90 disabled:opacity-50 transition-colors">
                  {aiParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Analyze & Build Workshop
                </button>
              </div>
            </div>
          </div>

          {/* AI-generated confirmation card */}
          {pendingWorkshop && (
            <div className="p-5 rounded-xl border-2 border-[#0A867F]/30 space-y-4 animate-flow-in"
              style={{ background: 'linear-gradient(135deg, rgba(10,134,127,0.03), transparent)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0A867F]" />
                <span className="text-sm font-semibold text-[#0A867F]">AI Workshop Blueprint</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Customer</label>
                  <input value={pendingWorkshop.customerName || ''} onChange={e => setPendingWorkshop((p: any) => ({ ...p, customerName: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:border-[#0A867F]/40" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Title</label>
                  <input value={pendingWorkshop.title || ''} onChange={e => setPendingWorkshop((p: any) => ({ ...p, title: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:border-[#0A867F]/40" />
                </div>
              </div>
              {pendingWorkshop.context && <div className="text-xs text-foreground bg-card/50 p-3 rounded-lg border border-border italic">{pendingWorkshop.context}</div>}
              <div className="flex flex-wrap gap-2">
                {pendingWorkshop.assessmentType && <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#0A867F]/10 text-[#0A867F] font-medium">{pendingWorkshop.assessmentType}</span>}
                {(pendingWorkshop.technologies || []).map((t: string) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{t}</span>)}
                {(pendingWorkshop.stakeholders || []).map((s: any) => <span key={s.name} className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed]">{s.name}{s.title ? ` (${s.title})` : ''}</span>)}
              </div>
              {(pendingWorkshop.suggestedLevels || []).length > 0 && (
                <div>
                  <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested Levels & Dimensions</div>
                  {pendingWorkshop.suggestedLevels.map((level: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-card border border-border mb-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-[#0A867F]">L{i + 1}</span>
                        <span className="text-xs font-semibold text-foreground">{level.name}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto">{(level.dimensions || []).length} dims</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(level.dimensions || []).map((dim: any, j: number) => <span key={j} className="text-[9px] px-2 py-0.5 rounded-full bg-secondary/50 text-foreground" title={dim.probe}>{dim.name}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(pendingWorkshop.suggestedWorkstreams || []).length > 0 && (
                <div>
                  <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested Workstreams</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {pendingWorkshop.suggestedWorkstreams.map((ws: any) => (
                      <div key={ws.code} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/30 text-[10px]">
                        <span className="font-mono font-semibold text-[#7c3aed]">{ws.code}</span>
                        <span className="text-foreground truncate">{ws.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={handleConfirmCreate} disabled={!pendingWorkshop.customerName || createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A867F] text-white text-sm font-semibold hover:bg-[#0A867F]/90 disabled:opacity-50 transition-colors">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirm & Create Workshop
                </button>
                <button onClick={() => setPendingWorkshop(null)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">Edit</button>
              </div>
            </div>
          )}
        </>)}
        </div>
      )}

      {/* Workshop list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#0A867F]" /></div>
      ) : (workshops as any[]).length > 0 ? (
        <div className="space-y-3">
          {(workshops as any[]).map((ws: any) => {
            const stats = computeStats(ws);
            return (
              <a key={ws.id} href={`/workshop/${ws.id}`} className="flex items-center gap-4 p-4 rounded-xl g-surface g-elevated hover-lift transition-all group cursor-pointer">
                <div className="relative w-12 h-12 shrink-0">
                  <svg width="48" height="48" className="transform -rotate-90">
                    <circle cx="24" cy="24" r="18" stroke="var(--g-line)" strokeWidth="4" fill="none" />
                    <circle cx="24" cy="24" r="18" stroke="#0A867F" strokeWidth="4" fill="none" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 18} strokeDashoffset={2 * Math.PI * 18 * (1 - (stats.index || 0) / 100)} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{stats.index || 0}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground group-hover:text-[#0A867F] transition-colors">{ws.customerName}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      ws.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' :
                      ws.status === 'Scoring Complete' ? 'bg-emerald-500/10 text-emerald-400' :
                      ws.status === 'Proposal Generated' ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'bg-blue-500/10 text-blue-400'
                    }`}>{ws.status}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{ws.title}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-foreground">{stats.dimensionsScored}/{stats.totalDimensions}</div>
                  <div className="text-[9px] text-muted-foreground">scored</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{stats.stage}</div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">No workshops yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Create your first workshop to start an AI assessment</p>
        </div>
      )}
    </div>
  );
}
