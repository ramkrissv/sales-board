'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { OpportunityProvider } from '@/lib/store';
import { computeFunnelHealth } from '@/lib/health-scores';
import { DealDetail } from '@/components/modals/DealDetail';
import { Sparkles, Table as TableIcon, Eye, Kanban, CalendarDays, TrendingUp, BarChart3, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { ScopeSwitch } from '@/components/shared/ScopeSwitch';
import { useOpportunities } from '@/lib/store';
import PipelineInsightBar from '@/components/ai/PipelineInsightBar';
import { usePipelineInsight } from '@/lib/intelligence/useInsight';
import { ConversationalPipeline } from '@/components/pipeline/ConversationalPipeline';
import LeaderDashboard from '@/components/views/LeaderDashboard';
import CustomDashboard from '@/components/views/CustomDashboard';

const KanbanBoard = dynamic(
  () => import('@/components/kanban/KanbanBoard').then(m => ({ default: m.KanbanBoard })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Sparkles className="h-5 w-5 animate-pulse text-[#7c3aed]" />
        <span>Loading pipeline...</span>
      </div>
    </div>
  )}
);

type LocalView = 'kanban' | 'leader' | 'custom';

const LINK_VIEWS = [
  { id: 'kanban', label: 'Board', icon: Kanban, href: '/pipeline' },
  { id: 'funnel', label: 'Funnel', icon: TrendingUp, href: '/funnel' },
  { id: 'table', label: 'Table', icon: TableIcon, href: '/table' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '/calendar' },
  { id: 'graph', label: 'Graph', icon: Eye, href: '/graph' },
];

const LOCAL_VIEWS = [
  { id: 'leader' as const, label: 'Leader', icon: BarChart3 },
  { id: 'custom' as const, label: 'Custom', icon: LayoutDashboard },
];

function PipelineHeader({ localView, setLocalView }: { localView: LocalView; setLocalView: (v: LocalView) => void }) {
  const { filteredOpportunities, filters, setFilters } = useOpportunities();
  const { data: session } = useSession();
  const pathname = usePathname();
  const activeDeals = filteredOpportunities.filter(o => !['Won', 'Lost'].includes(o.status));
  const totalPipeline = activeDeals.reduce((s, o) => s + (o.tcv || 0), 0);
  const funnelHealth = useMemo(() => computeFunnelHealth(filteredOpportunities as any), [filteredOpportunities]);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground font-display">Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeDeals.length} active · ${(totalPipeline / 1e6).toFixed(1)}M
            </p>
          </div>
          {/* Funnel Health Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{
            background: funnelHealth.color + '10', border: `1px solid ${funnelHealth.color}25`,
          }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{
              color: funnelHealth.color, background: funnelHealth.color + '18',
            }}>{funnelHealth.score}</div>
            <div>
              <div className="text-[10px] font-semibold" style={{ color: funnelHealth.color }}>
                Funnel Health {funnelHealth.grade}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {funnelHealth.metrics.winRate}% win · {funnelHealth.metrics.stakeholderCoverage}% DM
              </div>
            </div>
          </div>
        </div>
        <ScopeSwitch
          value={filters.scope || 'org'}
          onChange={(scope) => setFilters(prev => ({ ...prev, scope, scopeOwner: session?.user?.name || '' }))}
        />
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 w-fit">
        {/* Link-based views */}
        {LINK_VIEWS.map(mode => {
          const isActive = localView === 'kanban' && pathname === mode.href;
          return (
            <Link key={mode.id} href={mode.href}
              onClick={() => setLocalView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              <mode.icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#7c3aed]' : ''}`} />
              {mode.label}
            </Link>
          );
        })}
        {/* Local views (no navigation) */}
        {LOCAL_VIEWS.map(mode => (
          <button key={mode.id} onClick={() => setLocalView(mode.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              localView === mode.id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            <mode.icon className={`h-3.5 w-3.5 ${localView === mode.id ? 'text-[#7c3aed]' : ''}`} />
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PipelineInsightSection({ onDealClick }: { onDealClick: (id: string) => void }) {
  const { filteredOpportunities } = useOpportunities();
  const { insights, isLoading } = usePipelineInsight(filteredOpportunities);
  return <PipelineInsightBar insights={insights} isLoading={isLoading} onDealClick={onDealClick} />;
}

export default function PipelinePage() {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [localView, setLocalView] = useState<LocalView>('kanban');

  return (
    <OpportunityProvider>
      <FilterPanel />
      <PipelineHeader localView={localView} setLocalView={setLocalView} />

      {localView === 'kanban' && (
        <>
          <PipelineInsightSection onDealClick={setSelectedOppId} />
          <KanbanBoard onCardClick={setSelectedOppId} />
          <ConversationalPipeline onDealClick={setSelectedOppId} />
          <div className="h-16" />
        </>
      )}

      {localView === 'leader' && (
        <LeaderDashboard onDealClick={setSelectedOppId} />
      )}

      {localView === 'custom' && (
        <CustomDashboard onDealClick={setSelectedOppId} />
      )}

      {selectedOppId && (
        <DealDetail
          opportunityId={selectedOppId}
          onClose={() => setSelectedOppId(null)}
        />
      )}
    </OpportunityProvider>
  );
}
