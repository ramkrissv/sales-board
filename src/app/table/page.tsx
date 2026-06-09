'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { OpportunityProvider } from '@/lib/store';
import { TableView } from '@/components/views/TableView';
import { OpportunityModal } from '@/components/modals/OpportunityModal';

export default function TablePage() {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  return (
    <OpportunityProvider>
      <TableView onRowClick={setSelectedOppId} />
      {selectedOppId && (
        <OpportunityModal
          opportunityId={selectedOppId}
          onClose={() => setSelectedOppId(null)}
        />
      )}
    </OpportunityProvider>
  );
}
