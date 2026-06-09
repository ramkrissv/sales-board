'use client';

export const dynamic = 'force-dynamic';

import { OpportunityProvider } from '@/lib/store';
import { TasksView } from '@/components/views/TasksView';

export default function TasksPage() {
  return (
    <OpportunityProvider>
      <TasksView />
    </OpportunityProvider>
  );
}
