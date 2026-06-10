'use client';

import { trpc } from '@/lib/trpc/client';
import { TrendingUp, Target, Percent, DollarSign } from 'lucide-react';

export default function ForecastingPage() {
  const { data, isLoading } = trpc.forecast.getSummary.useQuery();

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
      <div>
        <h1 className="text-xl font-semibold text-foreground">Forecasting</h1>
        <p className="text-sm text-muted-foreground mt-1">Pipeline forecast across {data.activeDeals} active deals</p>
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

      {/* Pipeline by Stage */}
      <div className="p-5 rounded-xl g-surface g-elevated">
        <div className="text-sm font-medium text-foreground mb-4">Pipeline by Stage</div>
        <div className="space-y-3">
          {data.byStage.filter(s => s.count > 0 || !['Lost', 'On Hold'].includes(s.stage)).map((stage, i) => {
            const colors = ['bg-blue-500', 'bg-sky-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-red-500', 'bg-zinc-500'];
            const width = Math.max((stage.tcv / maxStageTcv) * 100, 4);
            return (
              <div key={stage.stage} className="flex items-center gap-3">
                <div className="w-24 text-xs text-muted-foreground text-right shrink-0">{stage.stage}</div>
                <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${colors[i] || 'bg-slate-500'} rounded-lg flex items-center px-3 transition-all`}
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-xs font-medium text-white">{stage.count}</span>
                  </div>
                </div>
                <div className="w-20 text-xs text-muted-foreground text-right shrink-0">${(stage.tcv / 1000).toFixed(0)}k</div>
                <div className="w-24 text-xs text-muted-foreground text-right shrink-0">W: ${(stage.weighted / 1000).toFixed(0)}k</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Forecast by Rep */}
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-sm font-medium text-foreground mb-4">Forecast by Rep</div>
          {data.byOwner.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active deals.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
                <span>Owner</span>
                <span className="text-right">Deals</span>
                <span className="text-right">TCV</span>
                <span className="text-right">Weighted</span>
              </div>
              {data.byOwner.map(row => (
                <div key={row.owner} className="grid grid-cols-4 gap-2 py-2 border-b border-border/50">
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
            <div className="space-y-3">
              {data.byQuarter.map(q => {
                const width = Math.max((q.tcv / maxQuarterTcv) * 100, 6);
                return (
                  <div key={q.quarter}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{q.quarter}</span>
                      <span className="text-xs text-foreground">${(q.tcv / 1000).toFixed(0)}k ({q.count} deals)</span>
                    </div>
                    <div className="h-6 bg-muted rounded-lg overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-lg transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
