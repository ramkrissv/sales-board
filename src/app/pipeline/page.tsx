'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { OpportunityProvider } from '@/lib/store';
import { DealDetail } from '@/components/modals/DealDetail';
import { Sparkles, MessageCircle, Table as TableIcon, Eye } from 'lucide-react';
import Link from 'next/link';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { ScopeSwitch } from '@/components/shared/ScopeSwitch';
import { useOpportunities } from '@/lib/store';

const KanbanBoard = dynamic(
  () => import('@/components/kanban/KanbanBoard').then(m => ({ default: m.KanbanBoard })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Sparkles className="h-5 w-5 animate-pulse text-purple-400" />
        <span>Loading pipeline...</span>
      </div>
    </div>
  )}
);

function PipelineScopeHeader() {
  const { filters, setFilters } = useOpportunities();
  const { data: session } = useSession();
  return (
    <div className="flex items-center justify-end mb-4">
      <ScopeSwitch
        value={filters.scope || 'org'}
        onChange={(scope) => setFilters(prev => ({ ...prev, scope, scopeOwner: session?.user?.name || '' }))}
      />
    </div>
  );
}

export default function PipelinePage() {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  return (
    <OpportunityProvider>
      <FilterPanel />
      <PipelineScopeHeader />
      <KanbanBoard onCardClick={setSelectedOppId} />
      <div className="flex gap-2 mt-4">
        <Link href="/deal-room" className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg g-surface hover-glow transition-all text-muted-foreground hover:text-foreground">
          <MessageCircle className="h-3 w-3" /> Deal Room
        </Link>
        <Link href="/table" className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg g-surface hover-glow transition-all text-muted-foreground hover:text-foreground">
          <TableIcon className="h-3 w-3" /> Table View
        </Link>
        <Link href="/graph" className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg g-surface hover-glow transition-all text-muted-foreground hover:text-foreground">
          <Eye className="h-3 w-3" /> Deal Graph
        </Link>
      </div>
      {selectedOppId && (
        <DealDetail
          opportunityId={selectedOppId}
          onClose={() => setSelectedOppId(null)}
        />
      )}
    </OpportunityProvider>
  );
}
