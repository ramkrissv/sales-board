'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { OpportunityProvider } from '@/lib/store';
import { Sparkles } from 'lucide-react';

const KanbanBoard = dynamic(
  () => import('@/components/kanban/KanbanBoard').then(m => ({ default: m.KanbanBoard })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <Sparkles className="h-5 w-5 animate-pulse text-purple-400" />
        <span>Loading pipeline...</span>
      </div>
    </div>
  )}
);

const OpportunityModal = dynamic(
  () => import('@/components/modals/OpportunityModal').then(m => ({ default: m.OpportunityModal })),
  { ssr: false }
);

export default function PipelinePage() {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  return (
    <OpportunityProvider>
      <KanbanBoard onCardClick={setSelectedOppId} />
      {selectedOppId && (
        <OpportunityModal
          opportunityId={selectedOppId}
          onClose={() => setSelectedOppId(null)}
        />
      )}
    </OpportunityProvider>
  );
}
