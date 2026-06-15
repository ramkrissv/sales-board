'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { ScopeSwitch } from '@/components/shared/ScopeSwitch';
import { DealDetail } from '@/components/modals/DealDetail';
import { ImportModal } from '@/components/modals/ImportModal';
import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import {
  Search, Download, Upload, ChevronDown, ChevronRight, ChevronUp,
  Sparkles, Users, CheckSquare, MoreHorizontal,
  Loader2, Kanban, Table as TableIcon, CalendarDays, TrendingUp, Clock, Eye
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type GroupBy = 'none' | 'status' | 'primaryOwner' | 'industry' | 'region' | 'serviceLine' | 'engagementType';
type BizFilter = 'all' | 'new' | 'existing' | 'product' | 'services' | 'hybrid';
type SortField = 'customerName' | 'tcv' | 'margin' | 'expectedCloseDate' | 'status' | 'primaryOwner';
type SortDir = 'asc' | 'desc';

const VIEW_MODES = [
  { id: 'kanban', label: 'Board', icon: Kanban, href: '/pipeline' },
  { id: 'table', label: 'Table', icon: TableIcon, href: '/table' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '/calendar' },
  { id: 'timeline', label: 'Timeline', icon: TrendingUp, href: '/timeline' },
  { id: 'schedule', label: 'Schedule', icon: Clock, href: '/schedule' },
  { id: 'graph', label: 'Graph', icon: Eye, href: '/graph' },
];

function TableContent() {
  const { filteredOpportunities: opportunities, isLoading, updateOpportunity, filters, setFilters } = useOpportunities();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [bizFilter, setBizFilter] = useState<BizFilter>('all');
  const [sortField, setSortField] = useState<SortField>('tcv');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Apply business filter
  const bizFiltered = useMemo(() => {
    return opportunities.filter(o => {
      if (bizFilter === 'new') return o.clientType === 'New';
      if (bizFilter === 'existing') return o.clientType === 'Existing';
      if (bizFilter === 'product') return (o.engagementType || '').toLowerCase().includes('product') || (o.opportunityType || '').toLowerCase().includes('product');
      if (bizFilter === 'services') return o.serviceLine === 'IT Services' || o.serviceLine === 'Staffing';
      if (bizFilter === 'hybrid') return (o.engagementType || '').includes('Hybrid') || (o.engagementType || '').includes('Combined');
      return true;
    }).filter(o => {
      if (!search) return true;
      const s = search.toLowerCase();
      return o.customerName.toLowerCase().includes(s) || o.opportunityName.toLowerCase().includes(s) || o.primaryOwner.toLowerCase().includes(s);
    });
  }, [opportunities, bizFilter, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...bizFiltered].sort((a, b) => {
      let aVal: string | number = (a as unknown as Record<string, unknown>)[sortField] as string | number;
      let bVal: string | number = (b as unknown as Record<string, unknown>)[sortField] as string | number;
      if (sortField === 'expectedCloseDate') { aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime(); }
      if (sortField === 'tcv' || sortField === 'margin') { aVal = (aVal as number) || 0; bVal = (bVal as number) || 0; }
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = ((bVal as string) || '').toLowerCase(); }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [bizFiltered, sortField, sortDir]);

  // Group
  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: 'All', items: sorted }];
    const map = new Map<string, typeof sorted>();
    sorted.forEach(o => {
      const key = String((o as unknown as Record<string, unknown>)[groupBy] || 'Unknown');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key, label: key, items,
    })).sort((a, b) => b.items.reduce((s, o) => s + (o.tcv || 0), 0) - a.items.reduce((s, o) => s + (o.tcv || 0), 0));
  }, [sorted, groupBy]);

  // When groupBy changes, expand all groups by default
  useEffect(() => {
    if (groupBy !== 'none') {
      setExpandedGroups(new Set(groups.map(g => g.key)));
      setAllExpanded(true);
    }
  }, [groupBy, groups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const isGroupExpanded = (key: string) => {
    if (groupBy === 'none') return true;
    return allExpanded ? !expandedGroups.has(key) : expandedGroups.has(key);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleStageChange = async (oppId: string, newStage: string) => {
    await updateOpportunity(oppId, { status: newStage as import('@/lib/types').Status });
    setEditingStage(null);
  };

  const handleExport = () => {
    const headers = ['Customer', 'Project', 'Stage', 'TCV', 'Margin', 'Service Line', 'Engagement Type', 'Owner', 'Industry', 'Region', 'Close Date', 'Ageing (days)'];
    const rows = sorted.map(o => {
      const days = Math.floor((Date.now() - new Date(o.updatedAt || o.createdAt || o.expectedCloseDate).getTime()) / (1000 * 60 * 60 * 24));
      return [o.customerName, o.opportunityName, o.status, o.tcv, o.margin || '', o.serviceLine || '', o.engagementType || o.billingModel || '', o.primaryOwner, o.industry, o.region, o.expectedCloseDate, days];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pipeline.csv'; a.click();
  };

  const totalTcv = sorted.reduce((s, o) => s + (o.tcv || 0), 0);
  const dealsWithMargin = sorted.filter(o => o.margin);
  const avgMargin = dealsWithMargin.length > 0 ? Math.round(dealsWithMargin.reduce((s, o) => s + (o.margin || 0), 0) / dealsWithMargin.length) : 0;

  const statuses: import('@/lib/types').Status[] = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];
  const statusColors: Record<string, string> = {
    'Discovery': 'text-blue-400 bg-blue-500/10', 'Qualification': 'text-amber-400 bg-amber-500/10',
    'Proposal': 'text-purple-400 bg-purple-500/10', 'Negotiation': 'text-emerald-400 bg-emerald-500/10',
    'Won': 'text-green-400 bg-green-500/10', 'Lost': 'text-red-400 bg-red-500/10', 'On Hold': 'text-orange-400 bg-orange-500/10',
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="h-96 bg-card rounded-xl animate-pulse flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 px-2 sm:px-0">
      {/* View Mode Tab Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 w-fit mb-6">
        {VIEW_MODES.map(mode => {
          const isActive = pathname === mode.href;
          return (
            <Link key={mode.id} href={mode.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <mode.icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#7c3aed]' : ''}`} />
              {mode.label}
            </Link>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pipeline Table</h1>
          <p className="text-sm text-muted-foreground">{sorted.length} projects &middot; ${(totalTcv / 1e6).toFixed(1)}M total &middot; {avgMargin}% avg margin</p>
        </div>
        <div className="flex items-center gap-2">
          <ScopeSwitch
            value={filters.scope || 'org'}
            onChange={(scope) => setFilters(prev => ({ ...prev, scope, scopeOwner: session?.user?.name || '' }))}
          />
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Business Segmentation Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {([
          { id: 'all' as BizFilter, label: 'All' },
          { id: 'new' as BizFilter, label: 'Net New' },
          { id: 'existing' as BizFilter, label: 'Existing' },
          { id: 'services' as BizFilter, label: 'Services' },
          { id: 'product' as BizFilter, label: 'Product' },
          { id: 'hybrid' as BizFilter, label: 'Hybrid' },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setBizFilter(tab.id)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${bizFilter === tab.id ? 'bg-[#7c3aed]/20 text-[#7c3aed] border border-[#7c3aed]/30' : 'text-muted-foreground hover:text-foreground border border-transparent'}`}>
            {tab.label}
          </button>
        ))}

        {/* Group By */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Group by:</span>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)}
            className="px-2 py-1 text-xs bg-card border border-border rounded-lg text-foreground">
            <option value="none">None</option>
            <option value="status">Stage</option>
            <option value="primaryOwner">Owner</option>
            <option value="industry">Industry</option>
            <option value="region">Region</option>
            <option value="serviceLine">Service Line</option>
            <option value="engagementType">Engagement Type</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
      </div>

      {/* Table */}
      <div className="rounded-xl g-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--g-line, hsl(var(--border)))' }}>
                {([
                  { field: 'customerName' as SortField, label: 'Customer / Project' },
                  { field: 'status' as SortField, label: 'Stage' },
                  { field: 'tcv' as SortField, label: 'TCV' },
                  { field: 'margin' as SortField, label: 'Margin' },
                ]).map(col => (
                  <th key={col.field} className="px-4 py-3 text-left cursor-pointer hover:bg-card/50 transition-colors" onClick={() => toggleSort(col.field)}>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                      {col.label}
                      {sortField === col.field && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider font-medium text-left">Type</th>
                <th className="px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider font-medium text-left cursor-pointer hover:bg-card/50 transition-colors" onClick={() => toggleSort('primaryOwner')}>
                  <div className="flex items-center gap-1">
                    Owner
                    {sortField === 'primaryOwner' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider font-medium text-left">Tasks</th>
                <th className="px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider font-medium text-left cursor-pointer hover:bg-card/50 transition-colors" onClick={() => toggleSort('expectedCloseDate')}>
                  <div className="flex items-center gap-1">
                    Close
                    {sortField === 'expectedCloseDate' && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider font-medium text-left">Ageing</th>
                <th className="px-4 py-3 text-[11px] text-muted-foreground uppercase tracking-wider font-medium text-left">Stakeholders</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => {
                const groupTcv = group.items.reduce((s, o) => s + (o.tcv || 0), 0);
                const groupMarginItems = group.items.filter(o => o.margin);
                const groupAvgMargin = groupMarginItems.length > 0 ? Math.round(groupMarginItems.reduce((s, o) => s + (o.margin || 0), 0) / groupMarginItems.length) : 0;
                const expanded = groupBy === 'none' || isGroupExpanded(group.key);

                return (
                  <Fragment key={`group-${group.key}`}>
                    {/* Group header */}
                    {groupBy !== 'none' && (
                      <tr className="border-b cursor-pointer hover:bg-card/30" style={{ borderColor: 'var(--g-line, hsl(var(--border)))' }}
                        onClick={() => toggleGroup(group.key)}>
                        <td colSpan={9} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className="text-sm font-medium text-foreground">{group.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed]">{group.items.length}</span>
                            <span className="text-xs text-muted-foreground ml-2">${(groupTcv / 1000).toFixed(0)}k TCV</span>
                            {groupAvgMargin > 0 && <span className="text-xs text-muted-foreground">&middot; {groupAvgMargin}% margin</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Rows */}
                    {expanded && group.items.map(opp => {
                      const tasks = opp.subTasks || [];
                      const completed = tasks.filter(t => t.status === 'complete').length;
                      const sc = statusColors[opp.status] || 'text-muted-foreground bg-zinc-500/10';
                      const stakeholderCount = (opp.customerStakeholders || []).length;

                      return (
                        <tr key={opp.id} className="border-b cursor-pointer hover:bg-card/50 transition-colors group/row"
                          style={{ borderColor: 'var(--g-line, hsl(var(--border)))' }}
                          onClick={() => setSelectedOppId(opp.id)}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-foreground group-hover/row:text-[#7c3aed] transition-colors">{opp.customerName}</div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[250px]">{opp.opportunityName}</div>
                          </td>
                          <td className="px-4 py-3" onClick={e => { e.stopPropagation(); setEditingStage(opp.id); }}>
                            {editingStage === opp.id ? (
                              <select value={opp.status} onChange={e => handleStageChange(opp.id, e.target.value)}
                                onBlur={() => setEditingStage(null)} autoFocus
                                className="px-2 py-1 text-xs bg-card border border-[#7c3aed]/40 rounded text-foreground">
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sc} cursor-pointer hover:opacity-80`}>{opp.status}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground tabular-nums">{opp.tcv > 0 ? `$${(opp.tcv / 1000).toFixed(0)}k` : '\u2014'}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{opp.margin ? `${opp.margin}%` : '\u2014'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {opp.serviceLine && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-muted-foreground">{
                                ({ 'IT Services': 'ITS', 'Staffing': 'STF', 'Legacy Modernization': 'LM', 'Data & AI': 'D&AI', 'Testing & QA': 'QA', 'Managed Services / SRE': 'SRE', 'Cloud & Infrastructure': 'Cloud' } as any)[opp.serviceLine] || opp.serviceLine
                              }</span>}
                              {opp.engagementType && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed]">{opp.engagementType}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{opp.primaryOwner}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <CheckSquare className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground tabular-nums">{completed}/{tasks.length}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{format(new Date(opp.expectedCloseDate), 'MMM d')}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const days = Math.floor((Date.now() - new Date(opp.updatedAt || opp.createdAt || opp.expectedCloseDate).getTime()) / (1000 * 60 * 60 * 24));
                              const color = days > 14 ? 'text-red-400 bg-red-500/10' : days > 7 ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10';
                              return (
                                <span className={`text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full ${color}`} title={`${days} days in ${opp.status}`}>
                                  {days}d
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground tabular-nums">{stakeholderCount}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
            {/* Summary footer */}
            <tfoot>
              <tr className="border-t" style={{ borderColor: 'var(--g-line, hsl(var(--border)))' }}>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{sorted.length} projects</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-sm font-semibold text-foreground tabular-nums">${(totalTcv / 1000).toFixed(0)}k</td>
                <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{avgMargin}%</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {selectedOppId && <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />}
      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

// Need Fragment import
import { Fragment } from 'react';

export default function TablePage() {
  return (
    <OpportunityProvider>
      <FilterPanel />
      <TableContent />
    </OpportunityProvider>
  );
}
