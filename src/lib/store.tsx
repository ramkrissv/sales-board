'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { Opportunity, Status } from './types';

interface FilterState {
  status: Status[];
  primaryOwner: string[];
  industry: string[];
  region: string[];
  search: string;
  scope: 'my' | 'team' | 'org';
}

interface OpportunityContextType {
  opportunities: Opportunity[];
  filteredOpportunities: Opportunity[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  isLoading: boolean;
  addOpportunity: (opportunity: Opportunity) => Promise<void>;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => Promise<void>;
  deleteOpportunity: (id: string) => Promise<void>;
  refreshOpportunities: () => Promise<void>;
}

const OpportunityContext = createContext<OpportunityContextType | undefined>(undefined);

export function OpportunityProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    primaryOwner: [],
    industry: [],
    region: [],
    search: '',
    scope: 'org',
  });

  const utils = trpc.useUtils();
  const { data: opportunities = [], isLoading } = trpc.opportunity.list.useQuery();

  const createMutation = trpc.opportunity.create.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
    },
  });

  const updateMutation = trpc.opportunity.update.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
    },
  });

  const deleteMutation = trpc.opportunity.delete.useMutation({
    onSuccess: () => {
      utils.opportunity.list.invalidate();
    },
  });

  const addOpportunity = async (opportunity: Opportunity) => {
    await createMutation.mutateAsync(opportunity as any);
  };

  const updateOpportunity = async (id: string, updates: Partial<Opportunity>) => {
    await updateMutation.mutateAsync({ id, ...updates } as any);
  };

  const deleteOpportunity = async (id: string) => {
    await deleteMutation.mutateAsync({ id } as any);
  };

  const refreshOpportunities = async () => {
    await utils.opportunity.list.invalidate();
  };

  const filteredOpportunities = useMemo(() => {
    return (opportunities as Opportunity[]).filter(opp => {
      if (filters.search && !opp.customerName.toLowerCase().includes(filters.search.toLowerCase()) && !opp.opportunityName.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.status.length > 0 && !filters.status.includes(opp.status)) return false;
      if (filters.primaryOwner.length > 0 && !filters.primaryOwner.includes(opp.primaryOwner)) return false;
      if (filters.industry.length > 0 && !filters.industry.includes(opp.industry)) return false;
      if (filters.region.length > 0 && !filters.region.includes(opp.region)) return false;
      if (filters.scope === 'my') {
        if (opp.primaryOwner !== 'Sreeram' && opp.primaryOwner !== 'Admin') return false;
      }
      // 'team' shows all (in a real implementation, filter by team members)
      // 'org' shows everything
      return true;
    });
  }, [opportunities, filters]);

  return (
    <OpportunityContext.Provider
      value={{
        opportunities: opportunities as Opportunity[],
        filteredOpportunities,
        filters,
        setFilters,
        isLoading,
        addOpportunity,
        updateOpportunity,
        deleteOpportunity,
        refreshOpportunities,
      }}
    >
      {children}
    </OpportunityContext.Provider>
  );
}

export function useOpportunities() {
  const context = useContext(OpportunityContext);
  if (context === undefined) {
    throw new Error('useOpportunities must be used within an OpportunityProvider');
  }
  return context;
}
