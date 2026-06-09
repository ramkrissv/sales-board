'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';

function AnalyticsContent() {
  const { opportunities, isLoading } = useOpportunities();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading analytics...</div>;
  }

  const statuses = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];
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

  // Funnel
  const funnelData = statuses.filter(s => !['Lost', 'On Hold'].includes(s)).map(status => ({
    status,
    count: opportunities.filter(o => o.status === status).length,
    tcv: opportunities.filter(o => o.status === status).reduce((sum, o) => sum + (o.tcv || 0), 0),
  }));
  const maxCount = Math.max(...funnelData.map(f => f.count), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pipeline Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance across {opportunities.length} opportunities</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Pipeline', value: `$${(totalPipeline/1e6).toFixed(1)}M`, sub: `${activeDeals.length} active`, color: 'text-purple-400' },
          { label: 'Won Revenue', value: `$${(wonTcv/1e6).toFixed(1)}M`, sub: `${wonDeals.length} deals`, color: 'text-emerald-400' },
          { label: 'Win Rate', value: `${winRate}%`, sub: `${wonDeals.length}W / ${lostDeals.length}L`, color: 'text-blue-400' },
          { label: 'Avg Deal Size', value: `$${activeDeals.length > 0 ? Math.round(totalPipeline/activeDeals.length/1000) : 0}k`, sub: 'active deals', color: 'text-amber-400' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{kpi.label}</div>
            <div className="text-xl font-semibold text-foreground">{kpi.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Sales Funnel */}
      <div className="p-5 rounded-xl g-surface g-elevated">
        <div className="text-sm font-medium text-foreground mb-4">Sales Funnel</div>
        <div className="space-y-3">
          {funnelData.map((stage, i) => {
            const colors = ['bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-emerald-500', 'bg-green-500'];
            const width = Math.max((stage.count / maxCount) * 100, 8);
            return (
              <div key={stage.status} className="flex items-center gap-3">
                <div className="w-24 text-xs text-muted-foreground text-right">{stage.status}</div>
                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${colors[i] || 'bg-slate-500'} rounded-lg flex items-center px-3 transition-all`}
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-xs font-medium text-foreground">{stage.count}</span>
                  </div>
                </div>
                <div className="w-20 text-xs text-muted-foreground text-right">${(stage.tcv/1000).toFixed(0)}k</div>
              </div>
            );
          })}
        </div>
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
                    {owner.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <span className="text-sm text-foreground">{owner}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{data.count} deals</span>
                  {data.tcv > 0 && <span className="text-xs text-muted-foreground">${(data.tcv/1000).toFixed(0)}k</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Industry */}
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-sm font-medium text-foreground mb-4">By Industry</div>
          <div className="space-y-3">
            {Object.entries(byIndustry).sort((a,b) => b[1] - a[1]).map(([industry, count]) => (
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
      <AnalyticsContent />
    </OpportunityProvider>
  );
}
