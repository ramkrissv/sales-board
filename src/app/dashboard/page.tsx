'use client';

export const dynamic = 'force-dynamic';

import { OpportunityProvider } from '@/lib/store';
import { DashboardView } from '@/components/views/DashboardView';

export default function DashboardPage() {
  return (
    <OpportunityProvider>
      <DashboardView />
    </OpportunityProvider>
  );
}
