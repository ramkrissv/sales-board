'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { OpportunityProvider } from '@/lib/store';
import { TimeBoardView } from '@/components/views/TimeBoardView';
import { OpportunityModal } from '@/components/modals/OpportunityModal';

export default function SchedulePage() {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const handleItemClick = (id: string, _type: 'opportunity' | 'task') => {
    setSelectedOppId(id);
  };

  return (
    <OpportunityProvider>
      <TimeBoardView onItemClick={handleItemClick} />
      {selectedOppId && (
        <OpportunityModal
          opportunityId={selectedOppId}
          onClose={() => setSelectedOppId(null)}
        />
      )}
    </OpportunityProvider>
  );
}
