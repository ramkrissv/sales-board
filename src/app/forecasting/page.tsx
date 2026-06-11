'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { ScopeSwitch, type Scope } from '@/components/shared/ScopeSwitch';
import { TrendingUp, Target, Percent, DollarSign, CheckCircle, TrendingDown, Clock, EyeOff, LayoutDashboard, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORY_META: Record<string, { label: string; color: string; bgColor: string; icon: any; description: string }> = {
  commit: { label: 'Commit', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckCircle, description: 'Owner says will close' },
  best_case: { label: 'Best Case', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: TrendingUp, description: 'Likely but not certain' },
  pipeline: { label: 'Pipeline', color: 'text-purple-400', bgColor: 'bg-purple-500/10', icon: Clock, description: 'In progress' },
  omitted: { label: 'Omitted', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', icon: EyeOff, description: 'Excluded from forecast' },
};

export default function ForecastingPage() {
  const [scope, setScope] = useState<Scope>('org');
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.forecast.getSummary.useQuery();
  const updateOpp = trpc.opportunity.update.useMutation({
    onSuccess: () => { utils.forecast.getSummary.invalidate(); },
  });

  if (isLoading || !data) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-card rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-card rounded-xl animate-pulse" />
          <div className="h-48 bg-card rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const maxStageTcv = Math.max(...data.byStage.map(s => s.tcv), 1);
  const maxQuarterTcv = Math.max(...data.byQuarter.map(q => q.tcv), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Analytics tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 w-fit">
        <Link href="/dashboard" className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <div className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-card text-foreground shadow-sm border border-border">
          <BarChart3 className="h-3.5 w-3.5 text-[#7c3aed]" /> Forecast
        </div>
        <Link href="/waterfall" className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <TrendingUp className="h-3.5 w-3.5" /> Waterfall
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Forecasting</h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline forecast across {data.activeDeals} active deals</p>
        </div>
        <ScopeSwitch value={scope} onChange={setScope} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Pipeline', value: `$${(data.totalPipeline / 1e6).toFixed(1)}M`, sub: `${data.activeDeals} active deals`, color: 'text-purple-400', icon: DollarSign },
          { label: 'Weighted Forecast', value: `$${(data.weightedForecast / 1e6).toFixed(1)}M`, sub: 'probability-adjusted', color: 'text-blue-400', icon: Target },
          { label: 'Win Rate', value: `${data.winRate}%`, sub: 'won vs closed', color: 'text-emerald-400', icon: Percent },
          { label: 'Avg Deal Size', value: `$${(data.avgDealSize / 1000).toFixed(0)}k`, sub: 'active deals', color: 'text-amber-400', icon: TrendingUp },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <div className={`text-xl font-semibold text-foreground`}>{kpi.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Ongoing Revenue */}
      {(data as any).wonRevenue > 0 && (
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-sm font-medium text-foreground mb-4">Ongoing Revenue</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Revenue</div>
              <div className="text-xl font-semibold text-emerald-400">${((data as any).wonRevenue / 12 / 1000).toFixed(0)}k</div>
              <div className="text-[11px] text-muted-foreground mt-1">{(data as any).wonDealCount} active engagements</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Quarterly Run Rate</div>
              <div className="text-xl font-semibold text-blue-400">${((data as any).wonRevenue / 4 / 1000).toFixed(0)}k</div>
              <div className="text-[11px] text-muted-foreground mt-1">from won deals</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">YTD Revenue (est.)</div>
              <div className="text-xl font-semibold text-purple-400">${((data as any).wonRevenue / 12 * new Date().getMonth() / 1000).toFixed(0)}k</div>
              <div className="text-[11px] text-muted-foreground mt-1">{new Date().getMonth()} months elapsed</div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline by Stage */}
      <div className="p-5 rounded-xl g-surface g-elevated">
        <div className="text-sm font-medium text-foreground mb-4">Pipeline by Stage</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.byStage.filter(s => s.count > 0 || !['Lost', 'On Hold'].includes(s.stage))} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v: any) => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="stage" tick={{ fill: '#888', fontSize: 11 }} width={90} />
            <Tooltip formatter={(value: any, name: any) => [`$${(value / 1000).toFixed(0)}k`, name === 'tcv' ? 'TCV' : name]} contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} labelStyle={{ color: '#ccc' }} itemStyle={{ color: '#ccc' }} />
            <Bar dataKey="tcv" radius={[0, 6, 6, 0]}>
              {data.byStage.filter(s => s.count > 0 || !['Lost', 'On Hold'].includes(s.stage)).map((entry, i) => {
                const stageColors: Record<string, string> = { Discovery: '#3b82f6', Qualification: '#f59e0b', Proposal: '#7c3aed', Negotiation: '#22c55e', Won: '#10b981' };
                return <Cell key={entry.stage} fill={stageColors[entry.stage] || '#6b7280'} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Forecast by Rep */}
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-sm font-medium text-foreground mb-4">Forecast by Rep</div>
          {data.byOwner.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active deals.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
                <span>Owner</span>
                <span className="text-right">Deals</span>
                <span className="text-right">TCV</span>
                <span className="text-right">Weighted</span>
              </div>
              {data.byOwner.map(row => (
                <div key={row.owner} className="grid grid-cols-2 md:grid-cols-4 gap-2 py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-[9px] font-bold shrink-0">
                      {row.owner.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-sm text-foreground truncate">{row.owner}</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-right">{row.count}</span>
                  <span className="text-sm text-foreground text-right">${(row.tcv / 1000).toFixed(0)}k</span>
                  <span className="text-sm text-purple-400 text-right">${(row.weighted / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Forecast by Quarter */}
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-sm font-medium text-foreground mb-4">Forecast by Quarter</div>
          {data.byQuarter.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deals with close dates.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byQuarter} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <XAxis dataKey="quarter" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(v: any) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: any, name: any) => [`$${(Number(value) / 1000).toFixed(0)}k`, name === 'tcv' ? 'TCV' : 'Deals']} contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} labelStyle={{ color: '#ccc' }} itemStyle={{ color: '#ccc' }} />
                <Bar dataKey="tcv" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Forecast by Category Cards */}
      {data.byCategory && (
        <>
          <div>
            <h2 className="text-sm font-medium text-foreground mb-3">Forecast by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.byCategory.map((cat: any) => {
                const meta = CATEGORY_META[cat.category] || CATEGORY_META.pipeline;
                const Icon = meta.icon;
                return (
                  <div key={cat.category} className={`p-4 rounded-xl g-surface g-elevated`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{meta.label}</span>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="text-xl font-semibold text-foreground">${(cat.tcv / 1e6).toFixed(1)}M</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{cat.count} deals &middot; {meta.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deals by Forecast Category Table */}
          <div className="p-5 rounded-xl g-surface g-elevated">
            <div className="text-sm font-medium text-foreground mb-4">Deals by Forecast Category</div>
            <div className="space-y-1">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
                <span>Customer</span>
                <span>Opportunity</span>
                <span className="text-right">TCV</span>
                <span>Stage</span>
                <span>Owner</span>
                <span>Category</span>
              </div>
              {(data.activeOpportunities || []).map((opp: any) => (
                <div key={opp.id} className="grid grid-cols-3 md:grid-cols-6 gap-2 py-2 border-b border-border/50 items-center">
                  <span className="text-sm text-foreground truncate">{opp.customerName}</span>
                  <span className="text-sm text-muted-foreground truncate">{opp.opportunityName}</span>
                  <span className="text-sm text-foreground text-right">${(opp.tcv / 1000).toFixed(0)}k</span>
                  <span className="text-xs text-muted-foreground">{opp.status}</span>
                  <span className="text-xs text-muted-foreground truncate">{opp.primaryOwner}</span>
                  <select
                    value={opp.forecastCategory || 'pipeline'}
                    onChange={(e) => {
                      updateOpp.mutate({ id: opp.id, forecastCategory: e.target.value as any });
                    }}
                    className="text-xs bg-card border border-border rounded px-1.5 py-1 text-foreground"
                  >
                    <option value="commit">Commit</option>
                    <option value="best_case">Best Case</option>
                    <option value="pipeline">Pipeline</option>
                    <option value="omitted">Omitted</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
