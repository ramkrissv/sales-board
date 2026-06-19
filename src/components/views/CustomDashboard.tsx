'use client';

import { useState, useMemo } from 'react';
import { useOpportunities } from '@/lib/store';
import {
  Plus, X, GripVertical, BarChart3, DollarSign, Users, Target,
  TrendingUp, Percent, Clock, Award, Briefcase, Activity,
  PieChart as PieChartIcon, ArrowRight, Eye, Settings,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

type WidgetType = 'kpi' | 'bar_chart' | 'pie_chart' | 'list' | 'metric';

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  dataKey: string;
  size: 'sm' | 'md' | 'lg';
}

const WIDGET_CATALOG: { type: WidgetType; title: string; dataKey: string; icon: any; description: string; defaultSize: 'sm' | 'md' | 'lg' }[] = [
  { type: 'kpi', title: 'Total Pipeline', dataKey: 'totalPipeline', icon: DollarSign, description: 'Sum of active deal TCV', defaultSize: 'sm' },
  { type: 'kpi', title: 'Won Revenue', dataKey: 'wonRevenue', icon: Award, description: 'Total revenue from won deals', defaultSize: 'sm' },
  { type: 'kpi', title: 'Win Rate', dataKey: 'winRate', icon: Percent, description: 'Won vs total closed', defaultSize: 'sm' },
  { type: 'kpi', title: 'Active Deals', dataKey: 'activeCount', icon: Target, description: 'Number of active deals', defaultSize: 'sm' },
  { type: 'kpi', title: 'Avg Deal Size', dataKey: 'avgDealSize', icon: Briefcase, description: 'Average TCV of active deals', defaultSize: 'sm' },
  { type: 'kpi', title: 'Weighted Forecast', dataKey: 'weightedForecast', icon: TrendingUp, description: 'Stage-probability adjusted', defaultSize: 'sm' },
  { type: 'bar_chart', title: 'Pipeline by Stage', dataKey: 'byStage', icon: BarChart3, description: 'TCV distribution across stages', defaultSize: 'md' },
  { type: 'bar_chart', title: 'Pipeline by Owner', dataKey: 'byOwner', icon: Users, description: 'TCV per rep', defaultSize: 'md' },
  { type: 'pie_chart', title: 'Industry Mix', dataKey: 'byIndustry', icon: PieChartIcon, description: 'Deal distribution by industry', defaultSize: 'md' },
  { type: 'pie_chart', title: 'Stage Distribution', dataKey: 'stageDistribution', icon: PieChartIcon, description: 'Deal count by stage', defaultSize: 'md' },
  { type: 'list', title: 'Top Deals', dataKey: 'topDeals', icon: Target, description: 'Highest value active deals', defaultSize: 'lg' },
  { type: 'list', title: 'At-Risk Deals', dataKey: 'atRiskDeals', icon: Clock, description: 'Deals missing DM or $0 TCV', defaultSize: 'lg' },
  { type: 'list', title: 'Closing Soon', dataKey: 'closingSoon', icon: ArrowRight, description: 'Deals closing within 30 days', defaultSize: 'md' },
  { type: 'metric', title: 'MRR', dataKey: 'mrr', icon: DollarSign, description: 'Monthly recurring revenue', defaultSize: 'sm' },
  { type: 'metric', title: 'Avg Cycle', dataKey: 'avgCycle', icon: Clock, description: 'Average days to close', defaultSize: 'sm' },
];

const COLORS = ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
const STAGE_WEIGHTS: Record<string, number> = { Discovery: 0.10, Qualification: 0.25, Proposal: 0.50, Negotiation: 0.75 };

interface CustomDashboardProps {
  onDealClick: (id: string) => void;
}

export default function CustomDashboard({ onDealClick }: CustomDashboardProps) {
  const { filteredOpportunities: opportunities } = useOpportunities();
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: 'w1', type: 'kpi', title: 'Total Pipeline', dataKey: 'totalPipeline', size: 'sm' },
    { id: 'w2', type: 'kpi', title: 'Won Revenue', dataKey: 'wonRevenue', size: 'sm' },
    { id: 'w3', type: 'kpi', title: 'Win Rate', dataKey: 'winRate', size: 'sm' },
    { id: 'w4', type: 'kpi', title: 'Active Deals', dataKey: 'activeCount', size: 'sm' },
    { id: 'w5', type: 'bar_chart', title: 'Pipeline by Stage', dataKey: 'byStage', size: 'md' },
    { id: 'w6', type: 'pie_chart', title: 'Industry Mix', dataKey: 'byIndustry', size: 'md' },
  ]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Compute all data
  const data = useMemo(() => {
    const active = opportunities.filter(o => !['Won', 'Lost'].includes(o.status));
    const won = opportunities.filter(o => o.status === 'Won');
    const lost = opportunities.filter(o => o.status === 'Lost');
    const totalPipeline = active.reduce((s, o) => s + (o.tcv || 0), 0);
    const wonRevenue = won.reduce((s, o) => s + (o.tcv || 0), 0);

    // By stage
    const byStage = ['Discovery', 'Qualification', 'Proposal', 'Negotiation'].map(stage => {
      const deals = active.filter(o => o.status === stage);
      return { name: stage, value: deals.reduce((s, o) => s + (o.tcv || 0), 0), count: deals.length };
    });

    // By owner
    const ownerMap: Record<string, number> = {};
    active.forEach(o => { ownerMap[o.primaryOwner] = (ownerMap[o.primaryOwner] || 0) + (o.tcv || 0); });
    const byOwner = Object.entries(ownerMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

    // By industry
    const indMap: Record<string, number> = {};
    active.forEach(o => { indMap[o.industry || 'Other'] = (indMap[o.industry || 'Other'] || 0) + (o.tcv || 0); });
    const byIndustry = Object.entries(indMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const stageDistribution = byStage.map(s => ({ name: s.name, value: s.count }));

    return {
      totalPipeline: `$${(totalPipeline / 1e6).toFixed(1)}M`,
      wonRevenue: `$${(wonRevenue / 1e6).toFixed(1)}M`,
      winRate: `${won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0}%`,
      activeCount: `${active.length}`,
      avgDealSize: `$${active.length > 0 ? ((totalPipeline / active.length) / 1000).toFixed(0) : 0}k`,
      weightedForecast: `$${(active.reduce((s, o) => s + (o.tcv || 0) * (STAGE_WEIGHTS[o.status] || 0), 0) / 1e6).toFixed(1)}M`,
      mrr: `$${(wonRevenue / 12 / 1000).toFixed(0)}k`,
      avgCycle: `${won.length > 0 ? Math.round(won.reduce((s, o) => s + Math.abs(new Date(o.updatedAt || o.expectedCloseDate).getTime() - new Date(o.createdAt || o.startDate).getTime()) / 86400000, 0) / won.length) : 0}d`,
      byStage,
      byOwner,
      byIndustry,
      stageDistribution,
      topDeals: active.sort((a, b) => (b.tcv || 0) - (a.tcv || 0)).slice(0, 5),
      atRiskDeals: active.filter(o => !o.tcv || !(o.customerStakeholders || []).some((s: any) => s.isDecisionMaker)).slice(0, 5),
      closingSoon: active.filter(o => { const d = (new Date(o.expectedCloseDate).getTime() - Date.now()) / 86400000; return d > 0 && d < 30; }).slice(0, 5),
    };
  }, [opportunities]);

  const addWidget = (catalog: typeof WIDGET_CATALOG[0]) => {
    setWidgets(prev => [...prev, {
      id: `w-${Date.now()}`,
      type: catalog.type,
      title: catalog.title,
      dataKey: catalog.dataKey,
      size: catalog.defaultSize,
    }]);
    setShowCatalog(false);
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const renderWidget = (widget: Widget) => {
    const colSpan = widget.size === 'lg' ? 'md:col-span-4' : widget.size === 'md' ? 'md:col-span-2' : '';

    if (widget.type === 'kpi' || widget.type === 'metric') {
      const value = (data as any)[widget.dataKey] || '—';
      const catalogItem = WIDGET_CATALOG.find(c => c.dataKey === widget.dataKey);
      const Icon = catalogItem?.icon || BarChart3;
      return (
        <div key={widget.id} className={`p-4 rounded-xl g-surface g-elevated relative group ${colSpan}`}>
          {editMode && (
            <button onClick={() => removeWidget(widget.id)}
              className="absolute top-2 right-2 p-1 rounded bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-3 w-3" />
            </button>
          )}
          <Icon className="h-4 w-4 text-[#7c3aed] mb-2" />
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{widget.title}</div>
          <div className="text-xl font-bold text-foreground mt-1">{value}</div>
        </div>
      );
    }

    if (widget.type === 'bar_chart') {
      const chartData = (data as any)[widget.dataKey] || [];
      return (
        <div key={widget.id} className={`p-4 rounded-xl g-surface g-elevated relative group ${colSpan}`}>
          {editMode && (
            <button onClick={() => removeWidget(widget.id)}
              className="absolute top-2 right-2 z-10 p-1 rounded bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-3 w-3" />
            </button>
          )}
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">{widget.title}</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--g-card)', border: '1px solid var(--g-line)', borderRadius: 8, fontSize: 10 }}
                formatter={(v: any) => [`$${(Number(v) / 1000).toFixed(0)}k`, 'Value']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (widget.type === 'pie_chart') {
      const chartData = (data as any)[widget.dataKey] || [];
      return (
        <div key={widget.id} className={`p-4 rounded-xl g-surface g-elevated relative group ${colSpan}`}>
          {editMode && (
            <button onClick={() => removeWidget(widget.id)}
              className="absolute top-2 right-2 z-10 p-1 rounded bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-3 w-3" />
            </button>
          )}
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">{widget.title}</div>
          <div className="flex gap-3">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={chartData.slice(0, 5)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} innerRadius={20}>
                  {chartData.slice(0, 5).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {chartData.slice(0, 5).map((d: any, i: number) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[9px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 text-foreground truncate">{d.name}</span>
                  <span className="text-muted-foreground">{typeof d.value === 'number' && d.value > 1000 ? `$${(d.value / 1000).toFixed(0)}k` : d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (widget.type === 'list') {
      const items = (data as any)[widget.dataKey] || [];
      return (
        <div key={widget.id} className={`p-4 rounded-xl g-surface g-elevated relative group ${colSpan}`}>
          {editMode && (
            <button onClick={() => removeWidget(widget.id)}
              className="absolute top-2 right-2 z-10 p-1 rounded bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-3 w-3" />
            </button>
          )}
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">{widget.title}</div>
          <div className="space-y-1">
            {items.map((deal: any) => (
              <button key={deal.id} onClick={() => onDealClick(deal.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-[10px] text-left">
                <span className="flex-1 font-medium text-foreground truncate">{deal.customerName}</span>
                <span className="text-muted-foreground">{deal.status}</span>
                <span className="font-mono text-foreground">${((deal.tcv || 0) / 1000).toFixed(0)}k</span>
              </button>
            ))}
            {items.length === 0 && <div className="text-[10px] text-muted-foreground text-center py-2">No data</div>}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowCatalog(!showCatalog)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9] transition-colors">
          <Plus className="h-3 w-3" /> Add Widget
        </button>
        <button onClick={() => setEditMode(!editMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
            editMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}>
          <Settings className="h-3 w-3" /> {editMode ? 'Done Editing' : 'Edit Layout'}
        </button>
        <span className="text-[10px] text-muted-foreground ml-auto">{widgets.length} widgets</span>
      </div>

      {/* Widget catalog */}
      {showCatalog && (
        <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-2 animate-flow-in">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Widget Library</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {WIDGET_CATALOG.map(cat => {
              const alreadyAdded = widgets.some(w => w.dataKey === cat.dataKey);
              return (
                <button key={cat.dataKey} onClick={() => !alreadyAdded && addWidget(cat)}
                  disabled={alreadyAdded}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
                    alreadyAdded
                      ? 'bg-secondary/50 text-muted-foreground opacity-50 cursor-not-allowed'
                      : 'bg-card border border-border hover:border-[#7c3aed]/30 text-foreground'
                  }`}>
                  <cat.icon className="h-3.5 w-3.5 text-[#7c3aed] shrink-0" />
                  <div>
                    <div className="text-[10px] font-medium">{cat.title}</div>
                    <div className="text-[8px] text-muted-foreground">{cat.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {widgets.map(renderWidget)}
      </div>

      {widgets.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-xs text-muted-foreground">Add widgets to build your custom dashboard</p>
        </div>
      )}
    </div>
  );
}
