'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import {
  BarChart3, Layers, Target, FileText, Settings, ArrowLeft,
  Loader2, Sparkles, Zap, Clock, Users, CheckCircle,
} from 'lucide-react';
import WorkshopCockpit from '@/components/workshop/WorkshopCockpit';
import DimensionCard from '@/components/workshop/DimensionCard';
import WorkshopScope from '@/components/workshop/WorkshopScope';
import WorkshopUseCases from '@/components/workshop/WorkshopUseCases';
import FrameworkBuilder from '@/components/workshop/FrameworkBuilder';
import WorkshopProposal from '@/components/workshop/WorkshopProposal';
import WorkshopIntake from '@/components/workshop/WorkshopIntake';
import WorkshopFindings from '@/components/workshop/WorkshopFindings';
import { Wrench, ClipboardList, Award } from 'lucide-react';

type WorkshopTab = 'overview' | 'intake' | 'assess' | 'usecases' | 'scope' | 'findings' | 'proposal' | 'builder' | 'settings';

const TABS: { id: WorkshopTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'intake', label: 'Intake', icon: ClipboardList },
  { id: 'assess', label: 'Assess', icon: Layers },
  { id: 'usecases', label: 'Use Cases', icon: Target },
  { id: 'scope', label: 'Scope', icon: FileText },
  { id: 'findings', label: 'Findings', icon: Award },
  { id: 'proposal', label: 'Proposal', icon: FileText },
  { id: 'builder', label: 'Builder', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const STATUS_COLORS: Record<string, string> = {
  'Scheduled': 'bg-blue-500/10 text-blue-400',
  'In Progress': 'bg-amber-500/10 text-amber-400',
  'Scoring Complete': 'bg-emerald-500/10 text-emerald-400',
  'Proposal Generated': 'bg-[#7c3aed]/10 text-[#7c3aed]',
  'Delivered': 'bg-emerald-500/10 text-emerald-400',
};

export default function WorkshopPage() {
  const params = useParams();
  const router = useRouter();
  const workshopId = params.id as string;
  const utils = trpc.useUtils();

  const { data: workshop, isLoading } = trpc.workshop.getById.useQuery(
    { id: workshopId },
    { enabled: !!workshopId, refetchOnWindowFocus: false }
  );

  // Linked opportunity
  const { data: allOpps = [] } = trpc.opportunity.list.useQuery();
  const linkedOpp = (allOpps as any[]).find((o: any) => o.workshopId === workshopId || o.id === (workshop as any)?.opportunityId);
  const updateOppMutation = trpc.opportunity.update.useMutation({
    onSuccess: () => utils.opportunity.list.invalidate(),
  });

  const scoreMutation = trpc.workshop.scoreDimension.useMutation({
    onSuccess: () => utils.workshop.getById.invalidate({ id: workshopId }),
  });
  const findingMutation = trpc.workshop.updateFinding.useMutation({
    onSuccess: () => utils.workshop.getById.invalidate({ id: workshopId }),
  });

  const [activeTab, setActiveTab] = useState<WorkshopTab>('overview');
  const [activeLevel, setActiveLevel] = useState<string>('L1');

  // Debounced finding update
  const [findingTimers, setFindingTimers] = useState<Record<string, NodeJS.Timeout>>({});

  const handleScore = useCallback((dimId: string, field: string, value: any) => {
    const dim = (workshop as any)?.framework?.levels
      ?.flatMap((l: any) => l.dimensions || [])
      ?.find((d: any) => d.id === dimId);
    const level = (workshop as any)?.framework?.levels
      ?.find((l: any) => (l.dimensions || []).some((d: any) => d.id === dimId));
    if (!level) return;

    scoreMutation.mutate({
      workshopId,
      levelId: level.id,
      dimensionId: dimId,
      ...(field === 'currentScore' ? { currentScore: value } : {}),
      ...(field === 'targetScore' ? { targetScore: value } : {}),
      ...(field === 'priority' ? { priority: value } : {}),
    });
  }, [workshopId, workshop, scoreMutation]);

  const handleFindingChange = useCallback((dimId: string, body: string) => {
    // Debounce: save after 800ms of no typing
    if (findingTimers[dimId]) clearTimeout(findingTimers[dimId]);
    const level = (workshop as any)?.framework?.levels
      ?.find((l: any) => (l.dimensions || []).some((d: any) => d.id === dimId));
    if (!level) return;

    const timer = setTimeout(() => {
      findingMutation.mutate({ workshopId, levelId: level.id, dimensionId: dimId, body });
    }, 800);
    setFindingTimers(prev => ({ ...prev, [dimId]: timer }));
  }, [workshopId, workshop, findingMutation, findingTimers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[#0A867F]" />
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Workshop not found</p>
        <button onClick={() => router.push('/presales')} className="mt-4 text-[#7c3aed] hover:underline text-sm">← Back to Presales</button>
      </div>
    );
  }

  const ws = workshop as any;
  const levels = ws.framework?.levels || [];
  const currentLevel = levels.find((l: any) => l.id === activeLevel) || levels[0];
  const workstreams = ws.framework?.workstreams || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.push('/presales')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3 w-3" /> Back to Presales
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0B1120] flex items-center justify-center">
              <Layers className="h-6 w-6 text-[#0FB5AD]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground font-display">{ws.title}</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{ws.customerName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[ws.status] || 'bg-secondary text-muted-foreground'}`}>
                  {ws.status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ws.mode === 'with_ai' ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'bg-secondary text-muted-foreground'}`}>
                  {ws.mode === 'with_ai' ? '✨ AI-Assisted' : 'Manual'}
                </span>
                {ws.sponsor && <span>Sponsor: {ws.sponsor}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-saved
          </div>
        </div>
      </div>

      {/* Deal stage progression — links workshop to opportunity lifecycle */}
      {linkedOpp && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
          <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground shrink-0">Deal:</div>
          <span className="text-xs font-medium text-foreground truncate">{linkedOpp.customerName}</span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] font-mono text-muted-foreground">{linkedOpp.id}</span>
          <div className="flex-1" />
          {/* Stage pills */}
          <div className="flex items-center gap-0.5">
            {['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'].map((stage, i) => {
              const stages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'];
              const currentIdx = stages.indexOf(linkedOpp.status);
              const isActive = i === currentIdx;
              const isPast = i < currentIdx;
              const isNext = i === currentIdx + 1;
              return (
                <button key={stage} onClick={() => {
                  if (isNext) updateOppMutation.mutate({ id: linkedOpp.id, status: stage } as any);
                }}
                  className={`px-2 py-1 rounded-md text-[9px] font-medium transition-all ${
                    isActive ? 'bg-[#0A867F] text-white' :
                    isPast ? 'bg-[#0A867F]/10 text-[#0A867F]' :
                    isNext ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 cursor-pointer hover:bg-amber-500/20' :
                    'bg-secondary/50 text-muted-foreground'
                  }`}
                  title={isNext ? `Advance to ${stage}` : stage}
                >
                  {stage}
                </button>
              );
            })}
          </div>
          {linkedOpp.tcv > 0 && (
            <span className="text-xs font-mono font-semibold text-foreground ml-2">${((linkedOpp.tcv || 0) / 1000).toFixed(0)}k</span>
          )}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className={`h-3.5 w-3.5 ${activeTab === tab.id ? 'text-[#0A867F]' : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && <WorkshopCockpit workshop={ws} />}

      {/* ── INTAKE TAB ── */}
      {activeTab === 'intake' && (
        <WorkshopIntake workshop={ws} onRefresh={() => utils.workshop.getById.invalidate({ id: workshopId })} />
      )}

      {/* ── ASSESS TAB ── */}
      {activeTab === 'assess' && (
        <div className="space-y-4">
          {/* Level selector */}
          <div className="flex items-center gap-2">
            {levels.map((level: any) => {
              const isActive = level.id === activeLevel;
              const scored = (level.dimensions || []).filter((d: any) => d.currentScore != null).length;
              return (
                <button
                  key={level.id}
                  onClick={() => setActiveLevel(level.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#0B1120] text-white shadow-lg'
                      : 'bg-card border border-border text-foreground hover:border-[#0A867F]/30'
                  }`}
                >
                  <span className={`text-xs font-mono font-bold ${isActive ? 'text-[#0FB5AD]' : 'text-muted-foreground'}`}>
                    {level.id}
                  </span>
                  <span className="text-xs font-medium">{level.name}</span>
                  <span className={`text-[10px] font-mono ${isActive ? 'text-[#0FB5AD]' : 'text-muted-foreground'}`}>
                    {scored}/{(level.dimensions || []).length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Level intro */}
          {currentLevel && (
            <div className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border">
              <div className="w-14 h-14 rounded-xl bg-[#0B1120] flex items-center justify-center text-xl font-bold font-display text-white shrink-0">
                {currentLevel.id}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground font-display">{currentLevel.name}</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">{currentLevel.summary}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-[#0A867F] font-display">
                  {(() => {
                    const scored = (currentLevel.dimensions || []).filter((d: any) => d.currentScore != null);
                    return scored.length > 0
                      ? Math.round((scored.reduce((s: number, d: any) => s + d.currentScore, 0) / scored.length / 4) * 100)
                      : 0;
                  })()}%
                </div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Readiness</div>
              </div>
            </div>
          )}

          {/* Dimension cards + AI assessment sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main: dimension cards */}
            <div className="lg:col-span-2 space-y-4">
              {(currentLevel?.dimensions || [])
                .sort((a: any, b: any) => a.order - b.order)
                .map((dim: any) => (
                  <DimensionCard
                    key={dim.id}
                    dimension={dim}
                    levelId={currentLevel.id}
                    workshopId={workshopId}
                    mode={ws.mode}
                    onScore={handleScore}
                    onFindingChange={handleFindingChange}
                  />
                ))}
            </div>

            {/* Right sidebar: AI assessment chat + insights */}
            {ws.mode === 'with_ai' && (
              <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                {/* AI Assessment Assistant */}
                <AssessmentChat
                  workshopId={workshopId}
                  levelName={currentLevel?.name || ''}
                  dimensions={currentLevel?.dimensions || []}
                  customerName={ws.customerName}
                  onScore={handleScore}
                  levelId={currentLevel?.id || ''}
                />

                {/* Quick stats for this level */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Level Progress</div>
                  {(() => {
                    const dims = currentLevel?.dimensions || [];
                    const scored = dims.filter((d: any) => d.currentScore != null);
                    const gaps = dims.filter((d: any) => d.currentScore != null && d.targetScore != null && d.targetScore > d.currentScore);
                    const prio = dims.filter((d: any) => d.priority);
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Scored</span><span className="font-semibold text-foreground">{scored.length}/{dims.length}</span></div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-[#0A867F] transition-all" style={{ width: `${dims.length > 0 ? (scored.length / dims.length) * 100 : 0}%` }} />
                        </div>
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Gaps</span><span className="font-semibold text-amber-400">{gaps.length}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Priority</span><span className="font-semibold text-red-400">{prio.length}</span></div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── USE CASES TAB ── */}
      {activeTab === 'usecases' && (
        <WorkshopUseCases workshop={ws} onRefresh={() => utils.workshop.getById.invalidate({ id: workshopId })} />
      )}

      {/* ── SCOPE TAB ── */}
      {activeTab === 'scope' && (
        <WorkshopScope workshop={ws} onRefresh={() => utils.workshop.getById.invalidate({ id: workshopId })} />
      )}

      {/* ── FINDINGS TAB ── */}
      {activeTab === 'findings' && (
        <WorkshopFindings workshop={ws} onRefresh={() => utils.workshop.getById.invalidate({ id: workshopId })} />
      )}

      {/* ── PROPOSAL TAB ── */}
      {activeTab === 'proposal' && (
        <WorkshopProposal workshop={ws} onRefresh={() => utils.workshop.getById.invalidate({ id: workshopId })} />
      )}

      {/* ── FRAMEWORK BUILDER TAB ── */}
      {activeTab === 'builder' && (
        <FrameworkBuilder workshop={ws} onRefresh={() => utils.workshop.getById.invalidate({ id: workshopId })} />
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-card border border-border space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Workshop Settings</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Title</label>
                <div className="text-sm text-foreground">{ws.title}</div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Customer</label>
                <div className="text-sm text-foreground">{ws.customerName}</div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Mode</label>
                <div className="text-sm text-foreground">{ws.mode === 'with_ai' ? 'AI-Assisted' : 'Manual'}</div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Format</label>
                <div className="text-sm text-foreground capitalize">{ws.format}</div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Opportunity ID</label>
                <div className="text-sm text-foreground font-mono">{ws.opportunityId || '—'}</div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Framework</label>
                <div className="text-sm text-foreground">{ws.framework?.name || 'Custom'}</div>
              </div>
            </div>
          </div>

          {/* Framework structure overview */}
          <div className="p-5 rounded-xl bg-card border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3">Framework Structure</h3>
            <div className="space-y-2">
              {levels.map((l: any) => (
                <div key={l.id} className="flex items-center gap-3 text-xs">
                  <span className="font-mono font-bold text-[#0A867F] w-6">{l.id}</span>
                  <span className="font-medium text-foreground flex-1">{l.name}</span>
                  <span className="text-muted-foreground">{(l.dimensions || []).length} dimensions</span>
                  <span className="text-muted-foreground">Weight: {(l.weight * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--g-line)' }}>
              <div className="text-[10px] text-muted-foreground">
                {workstreams.length} workstreams: {workstreams.map((w: any) => w.code).join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assessment Chat — conversational AI for scoring and strategic insights ──
function AssessmentChat({ workshopId, levelName, dimensions, customerName, onScore, levelId }: {
  workshopId: string; levelName: string; dimensions: any[]; customerName: string;
  onScore: (dimId: string, field: string, value: any) => void; levelId: string;
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const chatMutation = trpc.ai.chat.useMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const MATURITY = ['Absent', 'Ad hoc', 'Repeatable', 'Governed', 'Optimized'];
  const scored = dimensions.filter((d: any) => d.currentScore != null);
  const unscored = dimensions.filter((d: any) => d.currentScore == null);

  const handleSend = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || thinking) return;

    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setThinking(true);

    const dimContext = dimensions.map((d: any) =>
      `${d.id} ${d.name}: ${d.currentScore != null ? MATURITY[d.currentScore] + (d.targetScore != null ? ' → ' + MATURITY[d.targetScore] : '') : 'not scored'}${d.finding?.body ? ' | Finding: ' + d.finding.body.slice(0, 80) : ''}`
    ).join('\n');

    chatMutation.mutate({
      message: `You are an expert consultant running an assessment workshop for ${customerName}. Current level: "${levelName}".

DIMENSIONS:
${dimContext}

USER: ${msg}

Respond concisely (2-4 sentences). If the user describes observations, suggest scores. If they ask strategic questions, give McKinsey-quality insights. If they want to score a dimension, confirm and provide rationale.

If suggesting scores, include at the end: [SCORE: dimId=X.X current=N target=N] for each suggestion.`,
      context: { page: 'workshop-assess-chat' },
    }, {
      onSuccess: (data) => {
        const response = data.response;

        // Extract and apply any score suggestions
        const scoreMatches = response.matchAll(/\[SCORE:\s*dimId=(\S+)\s+current=(\d)\s+target=(\d)\]/g);
        for (const match of scoreMatches) {
          const [, dimId, cur, tgt] = match;
          onScore(dimId, 'currentScore', parseInt(cur));
          onScore(dimId, 'targetScore', parseInt(tgt));
        }

        // Clean response (remove score tags for display)
        const cleanResponse = response.replace(/\[SCORE:[^\]]+\]/g, '').trim();
        setMessages(prev => [...prev, { role: 'ai', text: cleanResponse }]);
        setThinking(false);
      },
      onError: () => {
        setMessages(prev => [...prev, { role: 'ai', text: 'Unable to respond — try again.' }]);
        setThinking(false);
      },
    });
  };

  const quickPrompts = [
    unscored.length > 0 ? `Walk me through scoring "${unscored[0].name}"` : null,
    scored.length > 0 ? `What are the key gaps in ${levelName}?` : null,
    `What best practices should ${customerName} adopt for ${levelName}?`,
    `Suggest strategic priorities for this level`,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-3 bg-[#0B1120] text-white flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#0FB5AD]" />
        <span className="text-xs font-semibold">Assessment AI</span>
        <span className="text-[9px] text-white/50 ml-auto">{scored.length}/{dimensions.length} scored</span>
      </div>

      {/* Messages */}
      <div className="max-h-[350px] overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="space-y-2 py-2">
            <p className="text-[10px] text-muted-foreground text-center">Ask about scoring, strategy, or best practices</p>
            {quickPrompts.map((q, i) => (
              <button key={i} onClick={() => handleSend(q)}
                className="w-full text-left px-3 py-2 rounded-lg bg-secondary/30 text-[10px] text-foreground hover:bg-secondary/50 transition-colors">
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user' ? 'bg-[#0A867F] text-white rounded-tr-sm' : 'bg-secondary/50 text-foreground rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-xl bg-secondary/50 text-xs text-muted-foreground rounded-tl-sm flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-[#0A867F]" /> Analyzing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input with doc upload */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--g-line)' }}>
        <div className="flex gap-1.5">
          <label className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-[#0A867F]/30 cursor-pointer transition-colors shrink-0" title="Upload document">
            <FileText className="h-3.5 w-3.5" />
            <input type="file" className="hidden" accept=".pdf,.docx,.txt,.csv,.xlsx"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.name.endsWith('.pdf') || f.name.endsWith('.docx')) {
                  setInput(prev => (prev ? prev + ' ' : '') + `[Doc: ${f.name}] `);
                } else {
                  const r = new FileReader();
                  r.onload = () => {
                    const text = (r.result as string).replace(/[\x00-\x1F\x7F]/g, '').slice(0, 2000);
                    handleSend(`Analyze this document and suggest scores:\n\n[${f.name}]\n${text}`);
                  };
                  r.readAsText(f);
                }
              }} />
          </label>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Score, ask, upload docs..."
            className="flex-1 px-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0A867F]/40" />
          <button onClick={() => handleSend()} disabled={!input.trim() || thinking}
            className="p-1.5 rounded-lg bg-[#0A867F] text-white disabled:opacity-40">
            <Zap className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
