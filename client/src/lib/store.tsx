import React, { createContext, useContext, useEffect, useState } from 'react';
import { Opportunity, AppSettings, Status } from './types';

interface FilterState {
  status: Status[];
  primaryOwner: string[];
  industry: string[];
  region: string[];
  search: string;
}

interface OpportunityContextType {
  opportunities: Opportunity[];
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
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    primaryOwner: [],
    industry: [],
    region: [],
    search: '',
  });

  // Fetch opportunities from API
  const refreshOpportunities = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/opportunities');
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      const data = await response.json();
      setOpportunities(data);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load opportunities on mount
  useEffect(() => {
    refreshOpportunities();
  }, []);

  const addOpportunity = async (opportunity: Opportunity) => {
    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opportunity),
      });
      
      if (!response.ok) throw new Error('Failed to create opportunity');
      
      const created = await response.json();
      setOpportunities((prev) => [created, ...prev]);
    } catch (error) {
      console.error('Error creating opportunity:', error);
      throw error;
    }
  };

  const updateOpportunity = async (id: string, updates: Partial<Opportunity>) => {
    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update opportunity');
      
      const updated = await response.json();
      setOpportunities((prev) =>
        prev.map((opp) => (opp.id === id ? updated : opp))
      );
    } catch (error) {
      console.error('Error updating opportunity:', error);
      throw error;
    }
  };

  const deleteOpportunity = async (id: string) => {
    try {
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete opportunity');
      
      setOpportunities((prev) => prev.filter((opp) => opp.id !== id));
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      throw error;
    }
  };

  return (
    <OpportunityContext.Provider
      value={{
        opportunities,
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
    throw new Error('useOpportunities must be used within a OpportunityProvider');
  }
  return context;
}
