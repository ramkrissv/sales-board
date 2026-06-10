'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { ScopeSwitch } from '@/components/shared/ScopeSwitch';
import { LayoutDashboard, BarChart3, TrendingUp } from 'lucide-react';

const ANALYTICS_TABS: { id: string; label: string; icon: any; href?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'forecast', label: 'Forecast', icon: BarChart3, href: '/forecasting' },
  { id: 'waterfall', label: 'Waterfall', icon: TrendingUp, href: '/waterfall' },
];

function AnalyticsContent() {
  const { filteredOpportunities: opportunities, isLoading, filters, setFilters } = useOpportunities();
  const { data: session } = useSession();
  const [funnelView, setFunnelView] = useState<'funnel' | 'bar' | 'table'>('funnel');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading analytics...</div>;
  }

  const statuses = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'] as const;
  const activeDeals = opportunities.filter(o => !['Won', 'Lost'].includes(o.status));
  const totalPipeline = activeDeals.reduce((sum, o) => sum + (o.tcv || 0), 0);
  const wonDeals = opportunities.filter(o => o.status === 'Won');
  const wonTcv = wonDeals.reduce((sum, o) => sum + (o.tcv || 0), 0);
  const lostDeals = opportunities.filter(o => o.status === 'Lost');
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;

  // Group by owner
  const byOwner: Record<string, { count: number; tcv: number }> = {};
  opportunities.forEach(o => {
    if (!byOwner[o.primaryOwner]) byOwner[o.primaryOwner] = { count: 0, tcv: 0 };
    byOwner[o.primaryOwner].count++;
    byOwner[o.primaryOwner].tcv += o.tcv || 0;
  });
  const topOwners = Object.entries(byOwner).sort((a, b) => b[1].count - a[1].count).slice(0, 6);

  // Group by industry
  const byIndustry: Record<string, number> = {};
  opportunities.forEach(o => { byIndustry[o.industry] = (byIndustry[o.industry] || 0) + 1; });

  // Funnel stages (active pipeline flow)
  const funnelStages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'];
  const funnelData = funnelStages.map((stage, i) => {
    const deals = opportunities.filter(o => o.status === stage);
    const tcv = deals.reduce((s, o) => s + (o.tcv || 0), 0);
    const nextStage = funnelStages[i + 1];
    const nextCount = nextStage ? opportunities.filter(o => o.status === nextStage).length : 0;
    const convRate = deals.length > 0 && nextStage ? Math.round((nextCount / deals.length) * 100) : null;
    return { stage, count: deals.length, tcv, convRate };
  });
  const maxFunnelCount = Math.max(...funnelData.map(f => f.count), 1);
  const stageColors = ['#3b82f6', '#f59e0b', '#7c3aed', '#22c55e', '#10b981'];

  // Business segmentation data
  const newBiz = opportunities.filter(o => o.clientType === 'New');
  const existingBiz = opportunities.filter(o => o.clientType === 'Existing');
  const totalCount = opportunities.length || 1;

  // By region
  const byRegion: Record<string, number> = {};
  opportunities.forEach(o => { byRegion[o.region] = (byRegion[o.region] || 0) + 1; });
  const regionEntries = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);

  // Forecast data: pipeline by close month
  const byMonth: Record<string, { count: number; tcv: number }> = {};
  activeDeals.forEach(o => {
    const month = o.expectedCloseDate ? o.expectedCloseDate.substring(0, 7) : 'Unknown';
    if (!byMonth[month]) byMonth[month] = { count: 0, tcv: 0 };
    byMonth[month].count++;
    byMonth[month].tcv += o.tcv || 0;
  });
  const forecastMonths = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 6);
  const maxForecastTcv = Math.max(...forecastMonths.map(([, d]) => d.tcv), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-2 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pipeline Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance across {opportunities.length} opportunities</p>
        </div>
        <ScopeSwitch
          value={filters.scope || 'org'}
          onChange={(scope) => setFilters(prev => ({ ...prev, scope, scopeOwner: session?.user?.name || '' }))}
        />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Pipeline', value: `$${(totalPipeline / 1e6).toFixed(1)}M`, sub: `${activeDeals.length} active`, color: 'text-purple-400' },
          { label: 'Won Revenue', value: `$${(wonTcv / 1e6).toFixed(1)}M`, sub: `${wonDeals.length} deals`, color: 'text-emerald-400' },
          { label: 'Win Rate', value: `${winRate}%`, sub: `${wonDeals.length}W / ${lostDeals.length}L`, color: 'text-blue-400' },
          { label: 'Avg Deal Size', value: `$${activeDeals.length > 0 ? Math.round(totalPipeline / activeDeals.length / 1000) : 0}k`, sub: 'active deals', color: 'text-amber-400' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated hover-lift hover-glow">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</div>
            <div className={`text-xl font-semibold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Sales Funnel — Interactive Multi-View */}
      <div className="p-5 rounded-xl g-surface g-elevated hover-glow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Sales Funnel</h3>
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-secondary border border-border">
            {(['funnel', 'bar', 'table'] as const).map(v => (
              <button key={v} onClick={() => setFunnelView(v)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-md capitalize transition-all ${
                  funnelView === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {funnelView === 'funnel' && (
          <div className="space-y-1">
            {funnelData.map((d, i) => {
              const widthPct = Math.max(20, (d.count / maxFunnelCount) * 100);
              return (
                <div key={d.stage} className="reveal" style={{ animationDelay: `${i * 0.08}s` }}>
                  <Link href={`/pipeline/${encodeURIComponent(d.stage)}`}
                    className="flex items-center gap-3 group">
                    <div className="w-24 text-right text-xs text-muted-foreground group-hover:text-foreground transition-colors">{d.stage}</div>
                    <div className="flex-1">
                      <div className="relative h-10 rounded-lg overflow-hidden transition-all group-hover:scale-[1.02]"
                        style={{ width: `${widthPct}%`, backgroundColor: stageColors[i] + '20', border: `1px solid ${stageColors[i]}40` }}>
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span className="text-xs font-semibold" style={{ color: stageColors[i] }}>{d.count} deals</span>
                          <span className="text-[10px] text-muted-foreground">${(d.tcv/1000).toFixed(0)}k</span>
                        </div>
                        <div className="absolute bottom-0 left-0 h-1 rounded-b-lg transition-all" style={{ width: '100%', backgroundColor: stageColors[i], opacity: 0.5 }} />
                      </div>
                    </div>
                    {d.convRate !== null && (
                      <div className="w-14 text-center">
                        <span className="text-[10px] text-muted-foreground">&rarr; {d.convRate}%</span>
                      </div>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {funnelView === 'bar' && (
          <div className="flex items-end justify-center gap-4 h-48">
            {funnelData.map((d, i) => {
              const heightPct = Math.max(15, (d.count / maxFunnelCount) * 100);
              return (
                <Link key={d.stage} href={`/pipeline/${encodeURIComponent(d.stage)}`}
                  className="flex flex-col items-center gap-1 flex-1 group">
                  <span className="text-xs font-semibold text-foreground g-metric">{d.count}</span>
                  <div className="w-full rounded-t-lg transition-all group-hover:opacity-80 reveal"
                    style={{ height: `${heightPct}%`, backgroundColor: stageColors[i], animationDelay: `${i * 0.1}s` }} />
                  <span className="text-[10px] text-muted-foreground mt-1">{d.stage}</span>
                  <span className="text-[10px] text-muted-foreground">${(d.tcv/1000).toFixed(0)}k</span>
                </Link>
              );
            })}
          </div>
        )}

        {funnelView === 'table' && (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--g-line)' }}>
                  <th className="px-4 py-2 text-left g-section-label">Stage</th>
                  <th className="px-4 py-2 text-right g-section-label">Deals</th>
                  <th className="px-4 py-2 text-right g-section-label">TCV</th>
                  <th className="px-4 py-2 text-right g-section-label">Weighted</th>
                  <th className="px-4 py-2 text-right g-section-label">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {funnelData.map((d, i) => {
                  const weights = [0.1, 0.25, 0.5, 0.75, 1.0];
                  return (
                    <tr key={d.stage} className="border-b hover:bg-card/50 cursor-pointer transition-all" style={{ borderColor: 'var(--g-line)' }}
                      onClick={() => window.location.href = `/pipeline/${encodeURIComponent(d.stage)}`}>
                      <td className="px-4 py-2 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stageColors[i] }} />
                        <span className="text-foreground">{d.stage}</span>
                      </td>
                      <td className="px-4 py-2 text-right g-metric text-foreground">{d.count}</td>
                      <td className="px-4 py-2 text-right g-metric text-foreground">${(d.tcv/1000).toFixed(0)}k</td>
                      <td className="px-4 py-2 text-right g-metric text-muted-foreground">${(d.tcv * weights[i] / 1000).toFixed(0)}k</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{d.convRate !== null ? `${d.convRate}%` : '\u2014'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Business Segmentation: Net New vs Existing + By Region */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl g-surface g-elevated hover-lift hover-glow">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-3">Net New vs Existing</div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground">Net New</span>
                <span className="text-muted-foreground tabular-nums">{newBiz.length} ({Math.round(newBiz.length / totalCount * 100)}%)</span>
              </div>
              <div className="h-3 bg-card rounded-full overflow-hidden">
                <div className="h-full bg-[#7c3aed] rounded-full transition-all" style={{ width: `${(newBiz.length / totalCount) * 100}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">${(newBiz.reduce((s, o) => s + (o.tcv || 0), 0) / 1000).toFixed(0)}k TCV</div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground">Existing</span>
                <span className="text-muted-foreground tabular-nums">{existingBiz.length} ({Math.round(existingBiz.length / totalCount * 100)}%)</span>
              </div>
              <div className="h-3 bg-card rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(existingBiz.length / totalCount) * 100}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">${(existingBiz.reduce((s, o) => s + (o.tcv || 0), 0) / 1000).toFixed(0)}k TCV</div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl g-surface g-elevated hover-lift hover-glow">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-3">By Region</div>
          <div className="space-y-2">
            {regionEntries.map(([region, count]) => (
              <div key={region} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{region}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-muted-foreground">{count}</span>
              </div>
            ))}
            {regionEntries.length === 0 && <div className="text-xs text-muted-foreground">No data</div>}
          </div>
        </div>
      </div>

      {/* Forecast Chart — Pipeline by Close Month */}
      <div className="p-5 rounded-xl g-surface g-elevated hover-lift hover-glow">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-4">Pipeline Forecast &mdash; by Close Month</div>
        {forecastMonths.length > 0 ? (
          <div className="flex items-end gap-2" style={{ height: '120px' }}>
            {forecastMonths.map(([month, data]) => {
              const barHeight = Math.max(16, (data.tcv / maxForecastTcv) * 100);
              const label = month !== 'Unknown' ? month.substring(5) : '??';
              const yearLabel = month !== 'Unknown' ? month.substring(0, 4) : '';
              return (
                <div key={month} className="flex flex-col items-center flex-1">
                  <div className="text-[10px] text-muted-foreground tabular-nums mb-1">${(data.tcv / 1000).toFixed(0)}k</div>
                  <div className="w-full bg-[#7c3aed]/20 rounded-t-md transition-all flex items-end justify-center"
                    style={{ height: `${barHeight}px` }}>
                    <span className="text-[10px] text-[#7c3aed] font-medium mb-0.5">{data.count}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
                  {yearLabel && <div className="text-[9px] text-muted-foreground">{yearLabel}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No active deals with close dates</div>
        )}
      </div>

      {/* Two columns: By Owner + By Industry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Owner */}
        <div className="p-5 rounded-xl g-surface g-elevated hover-lift hover-glow">
          <div className="text-sm font-medium text-foreground mb-4">By Owner</div>
          <div className="space-y-3">
            {topOwners.map(([owner, data]) => (
              <div key={owner} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-[10px] font-bold">
                    {owner.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-sm text-foreground">{owner}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{data.count} deals</span>
                  {data.tcv > 0 && <span className="text-xs text-muted-foreground">${(data.tcv / 1000).toFixed(0)}k</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Industry */}
        <div className="p-5 rounded-xl g-surface g-elevated hover-lift hover-glow">
          <div className="text-sm font-medium text-foreground mb-4">By Industry</div>
          <div className="space-y-3">
            {Object.entries(byIndustry).sort((a, b) => b[1] - a[1]).map(([industry, count]) => (
              <div key={industry} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{industry}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTabBar() {
  return (
    <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-secondary/50 w-fit">
      {ANALYTICS_TABS.map(tab => {
        const isActive = tab.id === 'dashboard';
        return tab.href ? (
          <Link key={tab.id} href={tab.href}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </Link>
        ) : (
          <div key={tab.id}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-card text-foreground shadow-sm border border-border">
            <tab.icon className="h-3.5 w-3.5 text-[#7c3aed]" /> {tab.label}
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <OpportunityProvider>
      <FilterPanel />
      <AnalyticsTabBar />
      <AnalyticsContent />
    </OpportunityProvider>
  );
}
