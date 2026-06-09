'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { AICopilot } from './AICopilot';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64',
          copilotOpen ? 'mr-80' : 'mr-0'
        )}
      >
        <TopNav />
        <main className="p-6">
          {children}
        </main>
      </div>

      <AICopilot
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(!copilotOpen)}
      />
    </div>
  );
}
