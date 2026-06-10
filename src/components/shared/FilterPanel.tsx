'use client';

import { useOpportunities } from '@/lib/store';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown, Check } from 'lucide-react';

const DIMENSIONS = [
  { key: 'status' as const, label: 'Status' },
  { key: 'primaryOwner' as const, label: 'Owner' },
  { key: 'industry' as const, label: 'Industry' },
  { key: 'region' as const, label: 'Region' },
];

export function FilterPanel() {
  const { opportunities, filters, setFilters } = useOpportunities();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Extract unique values for each filter dimension
  const options = useMemo(() => ({
    status: [...new Set(opportunities.map(o => o.status))].sort(),
    primaryOwner: [...new Set(opportunities.map(o => o.primaryOwner))].sort(),
    industry: [...new Set(opportunities.map(o => o.industry))].filter(Boolean).sort(),
    region: [...new Set(opportunities.map(o => o.region))].filter(Boolean).sort(),
  }), [opportunities]);

  const activeFilterCount =
    filters.status.length +
    filters.primaryOwner.length +
    filters.industry.length +
    filters.region.length;

  const toggleFilter = (dimension: 'status' | 'primaryOwner' | 'industry' | 'region', value: string) => {
    setFilters(prev => {
      const current = prev[dimension] as string[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [dimension]: updated };
    });
  };

  const clearAll = () => {
    setFilters({ status: [], primaryOwner: [], industry: [], region: [], search: '' });
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={panelRef} className="flex items-center gap-2 flex-wrap py-3 px-1">
      {/* Filter icon + badge */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
        <Filter className="h-3.5 w-3.5" />
        <span className="font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">
            {activeFilterCount}
          </span>
        )}
      </div>

      {/* Dropdowns */}
      {DIMENSIONS.map(dim => {
        const selected = filters[dim.key] as string[];
        const isOpen = openDropdown === dim.key;
        const dimOptions = options[dim.key];

        return (
          <div key={dim.key} className="relative">
            <button
              onClick={() => setOpenDropdown(isOpen ? null : dim.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                selected.length > 0
                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                  : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              {dim.label}
              {selected.length > 0 && (
                <span className="text-[10px] font-bold text-purple-400">({selected.length})</span>
              )}
              <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px] max-h-[280px] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                {dimOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No options</div>
                ) : (
                  dimOptions.map(opt => {
                    const isSelected = selected.includes(opt);
                    return (
                      <button
                        key={opt}
                        onClick={() => toggleFilter(dim.key, opt)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-zinc-800 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-purple-600 border-purple-600'
                            : 'border-zinc-600'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={isSelected ? 'text-foreground' : 'text-zinc-400'}>
                          {opt}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Active filter chips */}
      {DIMENSIONS.map(dim => {
        const selected = filters[dim.key] as string[];
        return selected.map(val => (
          <span
            key={`${dim.key}-${val}`}
            className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20"
          >
            {val}
            <button
              onClick={() => toggleFilter(dim.key, val)}
              className="hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ));
      })}

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="ml-1 flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="h-3 w-3" />
          Clear All
        </button>
      )}
    </div>
  );
}
