'use client';

export const dynamic = 'force-dynamic';

import { OpportunityProvider } from '@/lib/store';
import { StakeholdersView } from '@/components/views/StakeholdersView';

export default function StakeholdersPage() {
  return (
    <OpportunityProvider>
      <StakeholdersView />
    </OpportunityProvider>
  );
}
