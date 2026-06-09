import { useState } from 'react';
import { Header } from './Header';
import { FilterPanel } from './FilterPanel';
import { CreateOpportunityModal } from '../modals/CreateOpportunityModal';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header 
        toggleFilters={() => setIsFiltersOpen(!isFiltersOpen)} 
        isFiltersOpen={isFiltersOpen}
        onNewOpportunity={() => setIsNewModalOpen(true)}
      />
      
      <div className="flex flex-1 relative overflow-hidden">
        <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950">
          <div className="h-full p-2 md:p-6">
            {children}
          </div>
        </main>
        
        <FilterPanel 
          isOpen={isFiltersOpen} 
          onClose={() => setIsFiltersOpen(false)} 
        />
      </div>

      <CreateOpportunityModal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
      />
    </div>
  );
}
