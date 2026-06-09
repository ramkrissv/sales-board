import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOpportunities } from '@/lib/store';
import { Status, Region, Industry } from '@/lib/types';
import { X } from 'lucide-react';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_STATUSES: Status[] = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];
const ALL_REGIONS: Region[] = ['North America', 'Europe', 'APAC', 'Latin America', 'Middle East'];
const ALL_INDUSTRIES: Industry[] = ['Healthcare', 'Financial Services', 'Hospitality', 'Professional Services', 'Manufacturing', 'Retail', 'Technology', 'Other'];

export function FilterPanel({ isOpen, onClose }: FilterPanelProps) {
  const { filters, setFilters, opportunities } = useOpportunities();

  if (!isOpen) return null;

  const toggleStatus = (status: Status) => {
    setFilters(prev => {
      const current = prev.status;
      const next = current.includes(status)
        ? current.filter(s => s !== status)
        : [...current, status];
      return { ...prev, status: next };
    });
  };

  const toggleRegion = (region: Region) => {
    setFilters(prev => {
      const current = prev.region;
      const next = current.includes(region)
        ? current.filter(r => r !== region)
        : [...current, region];
      return { ...prev, region: next };
    });
  };

  const toggleIndustry = (industry: Industry) => {
    setFilters(prev => {
      const current = prev.industry;
      const next = current.includes(industry)
        ? current.filter(i => i !== industry)
        : [...current, industry];
      return { ...prev, industry: next };
    });
  };

  const clearFilters = () => {
    setFilters(prev => ({
      ...prev,
      status: [],
      industry: [],
      region: [],
      primaryOwner: []
    }));
  };

  // Get unique owners
  const owners = Array.from(new Set(opportunities.map(o => o.primaryOwner)));

  const toggleOwner = (owner: string) => {
    setFilters(prev => {
      const current = prev.primaryOwner;
      const next = current.includes(owner)
        ? current.filter(o => o !== owner)
        : [...current, owner];
      return { ...prev, primaryOwner: next };
    });
  };

  return (
    <div className="w-full sm:w-80 border-l bg-slate-50 dark:bg-slate-900/50 h-[calc(100vh-4rem)] flex flex-col fixed right-0 top-16 z-40 shadow-xl transition-transform animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-slate-900">
        <h3 className="font-semibold text-lg">Filters</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Status</Label>
            <div className="space-y-2">
              {ALL_STATUSES.map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`status-${status}`} 
                    checked={filters.status.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <Label htmlFor={`status-${status}`} className="text-sm font-normal cursor-pointer">{status}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Owner Filter */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Primary Owner</Label>
            <div className="space-y-2">
              {owners.map(owner => (
                <div key={owner} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`owner-${owner}`}
                    checked={filters.primaryOwner.includes(owner)}
                    onCheckedChange={() => toggleOwner(owner)}
                  />
                  <Label htmlFor={`owner-${owner}`} className="text-sm font-normal cursor-pointer">{owner}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Region Filter */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Region</Label>
            <div className="space-y-2">
              {ALL_REGIONS.map(region => (
                <div key={region} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`region-${region}`}
                    checked={filters.region.includes(region)}
                    onCheckedChange={() => toggleRegion(region)}
                  />
                  <Label htmlFor={`region-${region}`} className="text-sm font-normal cursor-pointer">{region}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Industry Filter */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Industry</Label>
            <div className="space-y-2">
              {ALL_INDUSTRIES.map(industry => (
                <div key={industry} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`industry-${industry}`}
                    checked={filters.industry.includes(industry)}
                    onCheckedChange={() => toggleIndustry(industry)}
                  />
                  <Label htmlFor={`industry-${industry}`} className="text-sm font-normal cursor-pointer">{industry}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-white dark:bg-slate-900">
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          Clear All Filters
        </Button>
      </div>
    </div>
  );
}
