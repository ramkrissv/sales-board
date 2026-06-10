'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { FilterPanel } from '@/components/shared/FilterPanel';

function AnalyticsContent() {
  const { filteredOpportunities: opportunities, isLoading } = useOpportunities();

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
  const funnelStages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'] as const;
  const funnelData = funnelStages.map(status => ({
    status,
    count: opportunities.filter(o => o.status === status).length,
    tcv: opportunities.filter(o => o.status === status).reduce((sum, o) => sum + (o.tcv || 0), 0),
  }));
  const maxFunnelCount = Math.max(...funnelData.map(f => f.count), 1);

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
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pipeline Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance across {opportunities.length} opportunities</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Pipeline', value: `$${(totalPipeline / 1e6).toFixed(1)}M`, sub: `${activeDeals.length} active`, color: 'text-purple-400' },
          { label: 'Won Revenue', value: `$${(wonTcv / 1e6).toFixed(1)}M`, sub: `${wonDeals.length} deals`, color: 'text-emerald-400' },
          { label: 'Win Rate', value: `${winRate}%`, sub: `${wonDeals.length}W / ${lostDeals.length}L`, color: 'text-blue-400' },
          { label: 'Avg Deal Size', value: `$${activeDeals.length > 0 ? Math.round(totalPipeline / activeDeals.length / 1000) : 0}k`, sub: 'active deals', color: 'text-amber-400' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</div>
            <div className={`text-xl font-semibold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Sales Funnel — Conversion Flow */}
      <div className="p-5 rounded-xl g-surface g-elevated">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-4">Sales Funnel &mdash; Conversion Flow</div>
        <div className="flex items-end justify-center gap-0.5">
          {funnelStages.map((stage, i) => {
            const count = funnelData[i].count;
            const tcv = funnelData[i].tcv;
            const widthPct = 100 - (i * 15);
            const height = Math.max(30, (count / maxFunnelCount) * 80);
            const colors = ['#3b82f6', '#f59e0b', '#7c3aed', '#22c55e', '#10b981'];

            const nextCount = i < 4 ? funnelData[i + 1]?.count || 0 : 0;
            const conversionRate = count > 0 && i < 4 ? Math.round((nextCount / count) * 100) : 0;

            return (
              <div key={stage} className="flex flex-col items-center" style={{ width: `${widthPct}%` }}>
                <div className="w-full rounded-t-lg flex items-center justify-center transition-all"
                  style={{ height: `${height}px`, backgroundColor: `${colors[i]}20`, borderBottom: `3px solid ${colors[i]}` }}>
                  <span className="text-base font-semibold text-foreground">{count}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 text-center">{stage}</div>
                <div className="text-[10px] text-muted-foreground">${(tcv / 1000).toFixed(0)}k</div>
                {i < 4 && conversionRate > 0 && (
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    &rarr; {conversionRate}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Business Segmentation: Net New vs Existing + By Region */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl g-surface g-elevated">
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

        <div className="p-5 rounded-xl g-surface g-elevated">
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
      <div className="p-5 rounded-xl g-surface g-elevated">
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
        <div className="p-5 rounded-xl g-surface g-elevated">
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
        <div className="p-5 rounded-xl g-surface g-elevated">
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

export default function DashboardPage() {
  return (
    <OpportunityProvider>
      <FilterPanel />
      <AnalyticsContent />
    </OpportunityProvider>
  );
}
