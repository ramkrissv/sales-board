'use client';

import { useState } from 'react';
import { Bookmark, ChevronDown } from 'lucide-react';

interface SavedView {
  id: string;
  name: string;
  filters: {
    status: string[];
    primaryOwner: string[];
    industry: string[];
    region: string[];
  };
}

const DEFAULT_VIEWS: SavedView[] = [
  { id: 'my-deals', name: 'My Deals', filters: { status: [], primaryOwner: ['Sreeram'], industry: [], region: [] } },
  { id: 'at-risk', name: 'At Risk', filters: { status: ['Discovery', 'Qualification'], primaryOwner: [], industry: [], region: [] } },
  { id: 'closing', name: 'Closing Soon', filters: { status: ['Negotiation', 'Proposal'], primaryOwner: [], industry: [], region: [] } },
  { id: 'north-america', name: 'North America', filters: { status: [], primaryOwner: [], industry: [], region: ['North America'] } },
  { id: 'healthcare', name: 'Healthcare', filters: { status: [], primaryOwner: [], industry: ['Healthcare'], region: [] } },
];

interface SavedViewsProps {
  onApply: (filters: SavedView['filters']) => void;
}

export function SavedViews({ onApply }: SavedViewsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [views] = useState<SavedView[]>(DEFAULT_VIEWS);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
        <Bookmark className="h-3.5 w-3.5" />
        Views
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-1 right-0 w-48 z-40 g-surface g-elevated p-1 shadow-lg">
            {views.map(view => (
              <button key={view.id}
                onClick={() => { onApply(view.filters); setIsOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground rounded-lg hover:bg-secondary transition-colors text-left">
                <Bookmark className="h-3 w-3 text-[#5B4FE9]" />
                {view.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
