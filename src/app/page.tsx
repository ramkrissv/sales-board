'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { OpportunityProvider } from '@/lib/store';
import { Loader2 } from 'lucide-react';

const KanbanBoard = dynamic(() => import('@/components/kanban/KanbanBoard').then(m => ({ default: m.KanbanBoard })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>,
});

const OpportunityModal = dynamic(() => import('@/components/modals/OpportunityModal').then(m => ({ default: m.OpportunityModal })), {
  ssr: false,
});

export default function HomePage() {
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
