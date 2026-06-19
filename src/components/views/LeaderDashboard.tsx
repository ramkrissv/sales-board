'use client';

import { useMemo } from 'react';
import { useOpportunities } from '@/lib/store';
import {
  DollarSign, TrendingUp, Users, Target, BarChart3, Award,
  ArrowRight, Clock, CheckCircle, AlertTriangle, Percent,
  Briefcase, Calendar, ChevronRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface LeaderDashboardProps {
  onDealClick: (id: string) => void;
}

const STAGE_WEIGHTS: Record<string, number> = {
  Discovery: 0.10, Qualification: 0.25, Proposal: 0.50, Negotiation: 0.75, Won: 1.0, Lost: 0, 'On Hold': 0.05,
};

export default function LeaderDashboard({ onDealClick }: LeaderDashboardProps) {
  const { filteredOpportunities: opportunities } = useOpportunities();

  const metrics = useMemo(() => {
    const active = opportunities.filter(o => !['Won', 'Lost'].includes(o.status));
    const won = opportunities.filter(o => o.status === 'Won');
    const lost = opportunities.filter(o => o.status === 'Lost');
    const totalPipeline = active.reduce((s, o) => s + (o.tcv || 0), 0);
    const wonRevenue = won.reduce((s, o) => s + (o.tcv || 0), 0);
    const arr = wonRevenue; // Annualized
    const mrr = Math.round(wonRevenue / 12);
    const winRate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    const weightedForecast = active.reduce((s, o) => s + (o.tcv || 0) * (STAGE_WEIGHTS[o.status] || 0), 0);
    const avgDealSize = active.length > 0 ? Math.round(totalPipeline / active.length) : 0;
    const avgCycle = won.length > 0
      ? Math.round(won.reduce((s, o) => {
          const created = new Date(o.createdAt || o.startDate).getTime();
          const closed = new Date(o.updatedAt || o.expectedCloseDate).getTime();
          return s + (closed - created) / 86400000;
        }, 0) / won.length)
      : 0;

    // By owner performance
    const byOwner: Record<string, { name: string; active: number; won: number; pipeline: number; weighted: number; revenue: number }> = {};
    opportunities.forEach(o => {
      const owner = o.primaryOwner || 'Unassigned';
      if (!byOwner[owner]) byOwner[owner] = { name: owner, active: 0, won: 0, pipeline: 0, weighted: 0, revenue: 0 };
      if (!['Won', 'Lost'].includes(o.status)) {
        byOwner[owner].active++;
        byOwner[owner].pipeline += o.tcv || 0;
        byOwner[owner].weighted += (o.tcv || 0) * (STAGE_WEIGHTS[o.status] || 0);
      }
      if (o.status === 'Won') {
        byOwner[owner].won++;
        byOwner[owner].revenue += o.tcv || 0;
      }
    });

    // By industry
    const byIndustry: Record<string, { count: number; tcv: number }> = {};
    active.forEach(o => {
      const ind = o.industry || 'Other';
      if (!byIndustry[ind]) byIndustry[ind] = { count: 0, tcv: 0 };
      byIndustry[ind].count++;
      byIndustry[ind].tcv += o.tcv || 0;
    });

    // By stage for funnel
    const byStage = ['Discovery', 'Qualification', 'Proposal', 'Negotiation'].map(stage => {
      const deals = active.filter(o => o.status === stage);
      return { stage, count: deals.length, tcv: deals.reduce((s, o) => s + (o.tcv || 0), 0) };
    });

    // Cohort: deals by month created
    const byCohort: Record<string, { month: string; created: number; won: number }> = {};
    opportunities.forEach(o => {
      const d = new Date(o.createdAt || o.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byCohort[key]) byCohort[key] = { month: key, created: 0, won: 0 };
      byCohort[key].created++;
      if (o.status === 'Won') byCohort[key].won++;
    });

    return {
      active, won, lost, totalPipeline, wonRevenue, arr, mrr, winRate,
      weightedForecast, avgDealSize, avgCycle,
      owners: Object.values(byOwner).sort((a, b) => b.pipeline - a.pipeline),
      industries: Object.entries(byIndustry).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.tcv - a.tcv),
      byStage,
      cohorts: Object.values(byCohort).sort((a, b) => a.month.localeCompare(b.month)).slice(-6),
    };
  }, [opportunities]);

  const COLORS = ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Executive KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'ARR', value: `$${(metrics.arr / 1e6).toFixed(1)}M`, icon: DollarSign, color: '#22c55e' },
          { label: 'MRR', value: `$${(metrics.mrr / 1000).toFixed(0)}k`, icon: TrendingUp, color: '#10b981' },
          { label: 'Pipeline', value: `$${(metrics.totalPipeline / 1e6).toFixed(1)}M`, icon: BarChart3, color: '#7c3aed' },
          { label: 'Weighted', value: `$${(metrics.weightedForecast / 1e6).toFixed(1)}M`, icon: Target, color: '#3b82f6' },
          { label: 'Win Rate', value: `${metrics.winRate}%`, icon: Percent, color: metrics.winRate >= 40 ? '#22c55e' : '#f59e0b' },
          { label: 'Avg Deal', value: `$${(metrics.avgDealSize / 1000).toFixed(0)}k`, icon: Briefcase, color: '#f59e0b' },
          { label: 'Avg Cycle', value: `${metrics.avgCycle}d`, icon: Clock, color: '#06b6d4' },
          { label: 'Deals Won', value: `${metrics.won.length}`, icon: Award, color: '#22c55e' },
        ].map(kpi => (
          <div key={kpi.label} className="p-3 rounded-xl g-surface g-elevated text-center">
            <kpi.icon className="h-4 w-4 mx-auto mb-1" style={{ color: kpi.color }} />
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{kpi.label}</div>
            <div className="text-sm font-bold text-foreground mt-0.5" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rep Performance */}
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users className="h-3 w-3" /> Rep Performance
          </div>
          <div className="space-y-2">
            {metrics.owners.slice(0, 6).map((owner, i) => (
              <div key={owner.name} className="flex items-center gap-3 text-xs">
                <span className="w-5 h-5 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[9px] font-bold text-[#7c3aed]">{i + 1}</span>
                <span className="flex-1 font-medium text-foreground truncate">{owner.name}</span>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{owner.active} active</span>
                  <span className="text-emerald-400">{owner.won} won</span>
                  <span className="font-mono font-semibold text-foreground">${(owner.pipeline / 1000).toFixed(0)}k</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline by Stage Chart */}
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3" /> Pipeline by Stage
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={metrics.byStage}>
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'var(--g-card)', border: '1px solid var(--g-line)', borderRadius: 8, fontSize: 11 }}
                formatter={(value: any) => [`$${(Number(value) / 1000).toFixed(0)}k`, 'TCV']}
              />
              <Bar dataKey="tcv" radius={[4, 4, 0, 0]}>
                {metrics.byStage.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Industry Distribution */}
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Briefcase className="h-3 w-3" /> By Industry
          </div>
          <div className="flex gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={metrics.industries.slice(0, 5)} dataKey="tcv" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={25}>
                  {metrics.industries.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {metrics.industries.slice(0, 5).map((ind, i) => (
                <div key={ind.name} className="flex items-center gap-2 text-[10px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 text-foreground truncate">{ind.name}</span>
                  <span className="text-muted-foreground">{ind.count}</span>
                  <span className="font-mono text-foreground">${(ind.tcv / 1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Cohorts */}
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Deal Cohorts
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={metrics.cohorts}>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--g-card)', border: '1px solid var(--g-line)', borderRadius: 8, fontSize: 11 }}
              />
              <Bar dataKey="created" fill="#7c3aed" radius={[3, 3, 0, 0]} name="Created" />
              <Bar dataKey="won" fill="#22c55e" radius={[3, 3, 0, 0]} name="Won" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top deals table */}
      <div className="p-5 rounded-xl g-surface g-elevated">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Target className="h-3 w-3" /> Top Deals by Value
        </div>
        <div className="space-y-1">
          {metrics.active
            .sort((a, b) => (b.tcv || 0) - (a.tcv || 0))
            .slice(0, 8)
            .map(deal => {
              const daysToClose = Math.ceil((new Date(deal.expectedCloseDate).getTime() - Date.now()) / 86400000);
              return (
                <button key={deal.id} onClick={() => onDealClick(deal.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-card/80 transition-colors text-xs group">
                  <span className="font-medium text-foreground flex-1 text-left truncate">{deal.customerName}</span>
                  <span className="text-[10px] text-muted-foreground">{deal.status}</span>
                  <span className="text-[10px] text-muted-foreground">{deal.primaryOwner}</span>
                  <span className={`text-[10px] ${daysToClose < 14 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    {daysToClose > 0 ? `${daysToClose}d` : 'Overdue'}
                  </span>
                  <span className="font-mono font-semibold text-foreground">${((deal.tcv || 0) / 1000).toFixed(0)}k</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-[#7c3aed] transition-colors" />
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
