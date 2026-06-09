import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OpportunityProvider } from "@/lib/store";
import { Layout } from "@/components/layout/Layout";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { OpportunityModal } from "@/components/modals/OpportunityModal";
import { TableView } from "@/components/views/TableView";
import { TimelineView } from "@/components/views/TimelineView";
import { DashboardView } from "@/components/views/DashboardView";
import { TimeBoardView } from "@/components/views/TimeBoardView";
import { TasksView } from "@/components/views/TasksView";
import { StakeholdersView } from "@/components/views/StakeholdersView";
import { LandingPage } from "@/pages/LandingPage";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function AppContent() {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const handleTimeBoardClick = (id: string, type: 'opportunity' | 'task') => {
    setSelectedOppId(id);
  };

  return (
    <Layout>
      <Switch>
        <Route path="/">
           <KanbanBoard onCardClick={setSelectedOppId} />
        </Route>
        <Route path="/timeline">
           <TimelineView onEventClick={setSelectedOppId} />
        </Route>
        <Route path="/schedule">
           <TimeBoardView onItemClick={handleTimeBoardClick} />
        </Route>
        <Route path="/table">
           <TableView onRowClick={setSelectedOppId} />
        </Route>
        <Route path="/dashboard" component={DashboardView} />
        <Route path="/tasks" component={TasksView} />
        <Route path="/stakeholders" component={StakeholdersView} />
        <Route component={NotFound} />
      </Switch>

      {selectedOppId && (
        <OpportunityModal 
          opportunityId={selectedOppId} 
          onClose={() => setSelectedOppId(null)} 
        />
      )}
    </Layout>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <OpportunityProvider>
      <AppContent />
    </OpportunityProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthenticatedApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
