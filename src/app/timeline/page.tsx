'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { OpportunityProvider } from '@/lib/store';
import { TimelineView } from '@/components/views/TimelineView';
import { OpportunityModal } from '@/components/modals/OpportunityModal';

export default function TimelinePage() {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  return (
    <OpportunityProvider>
      <TimelineView onEventClick={setSelectedOppId} />
      {selectedOppId && (
        <OpportunityModal
          opportunityId={selectedOppId}
          onClose={() => setSelectedOppId(null)}
        />
      )}
    </OpportunityProvider>
  );
}
