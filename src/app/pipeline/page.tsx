'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { OpportunityProvider } from '@/lib/store';
import { DealDetail } from '@/components/modals/DealDetail';
import { Sparkles, MessageCircle, Table as TableIcon, Eye, Kanban, CalendarDays, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { ScopeSwitch } from '@/components/shared/ScopeSwitch';
import { useOpportunities } from '@/lib/store';

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

const VIEW_MODES = [
  { id: 'kanban', label: 'Board', icon: Kanban, href: '/pipeline' },
  { id: 'funnel', label: 'Funnel', icon: TrendingUp, href: '/funnel' },
  { id: 'table', label: 'Table', icon: TableIcon, href: '/table' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '/calendar' },
  { id: 'graph', label: 'Graph', icon: Eye, href: '/graph' },
];

function PipelineHeader() {
  const { filteredOpportunities, filters, setFilters } = useOpportunities();
  const { data: session } = useSession();
  const pathname = usePathname();
  const activeDeals = filteredOpportunities.filter(o => !['Won', 'Lost'].includes(o.status));
  const totalPipeline = activeDeals.reduce((s, o) => s + (o.tcv || 0), 0);

  return (
    <div className="space-y-4 mb-6">
      {/* Title + KPIs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-display">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeDeals.length} active opportunities · ${(totalPipeline / 1e6).toFixed(1)}M pipeline
          </p>
        </div>
        <ScopeSwitch
          value={filters.scope || 'org'}
          onChange={(scope) => setFilters(prev => ({ ...prev, scope, scopeOwner: session?.user?.name || '' }))}
        />
      </div>

      {/* View mode tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 w-fit">
        {VIEW_MODES.map(mode => {
          const isActive = pathname === mode.href;
          return (
            <Link key={mode.id} href={mode.href}
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
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  return (
    <OpportunityProvider>
      <FilterPanel />
      <PipelineHeader />
      <KanbanBoard onCardClick={setSelectedOppId} />
      {selectedOppId && (
        <DealDetail
          opportunityId={selectedOppId}
          onClose={() => setSelectedOppId(null)}
        />
      )}
    </OpportunityProvider>
  );
}
