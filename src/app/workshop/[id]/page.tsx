'use client';

import { useState, useCallback } from 'react';
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
import { Wrench } from 'lucide-react';

type WorkshopTab = 'overview' | 'assess' | 'usecases' | 'scope' | 'proposal' | 'builder' | 'settings';

const TABS: { id: WorkshopTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'assess', label: 'Assess', icon: Layers },
  { id: 'usecases', label: 'Use Cases', icon: Target },
  { id: 'scope', label: 'Scope', icon: FileText },
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

          {/* Dimension cards */}
          <div className="space-y-4">
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
