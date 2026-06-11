'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { DollarSign, TrendingUp, TrendingDown, ArrowRight, LayoutDashboard, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Link from 'next/link';

function WaterfallContent() {
  const { opportunities } = useOpportunities();

  const wonDeals = opportunities.filter(o => o.status === 'Won');
  const lostDeals = opportunities.filter(o => o.status === 'Lost');
  const newDeals = opportunities.filter(o => {
    const created = new Date(o.createdAt);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return created > thirtyDaysAgo;
  });

  const openingPipeline = opportunities.filter(o => !['Won', 'Lost'].includes(o.status)).reduce((s, o) => s + (o.tcv || 0), 0);
  const newPipeline = newDeals.reduce((s, o) => s + (o.tcv || 0), 0);
  const wonRevenue = wonDeals.reduce((s, o) => s + (o.tcv || 0), 0);
  const lostRevenue = lostDeals.reduce((s, o) => s + (o.tcv || 0), 0);
  const currentPipeline = openingPipeline + newPipeline;

  const waterfallSteps = [
    { label: 'Opening Pipeline', value: openingPipeline, type: 'neutral' as const, cumulative: openingPipeline },
    { label: 'New Deals', value: newPipeline, type: 'positive' as const, cumulative: openingPipeline + newPipeline },
    { label: 'Won (Closed)', value: wonRevenue, type: 'positive' as const, cumulative: openingPipeline + newPipeline + wonRevenue },
    { label: 'Lost', value: -lostRevenue, type: 'negative' as const, cumulative: openingPipeline + newPipeline + wonRevenue - lostRevenue },
    { label: 'Current Pipeline', value: currentPipeline, type: 'neutral' as const, cumulative: currentPipeline },
  ];

  const maxVal = Math.max(...waterfallSteps.map(s => Math.abs(s.cumulative)), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Analytics tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 w-fit">
        <Link href="/dashboard" className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <Link href="/forecasting" className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <BarChart3 className="h-3.5 w-3.5" /> Forecast
        </Link>
        <div className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-card text-foreground shadow-sm border border-border">
          <TrendingUp className="h-3.5 w-3.5 text-[#7c3aed]" /> Waterfall
        </div>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-foreground">Revenue Waterfall</h1>
        <p className="text-sm text-muted-foreground">Pipeline movement over the last 30 days</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Opening', value: `$${(openingPipeline/1e6).toFixed(1)}M`, color: '#7c3aed' },
          { label: 'New Added', value: `+$${(newPipeline/1000).toFixed(0)}k`, color: '#22c55e' },
          { label: 'Won', value: `$${(wonRevenue/1000).toFixed(0)}k`, color: '#10b981' },
          { label: 'Lost', value: `-$${(lostRevenue/1000).toFixed(0)}k`, color: '#ef4444' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated hover-lift">
            <div className="g-section-label mb-1">{kpi.label}</div>
            <div className="g-kpi text-foreground" style={{ fontSize: '20px', color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Waterfall Chart */}
      <div className="g-surface g-elevated p-6">
        <div className="text-sm font-semibold text-foreground mb-4">Pipeline Waterfall</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={waterfallSteps.map(s => ({ ...s, absValue: Math.abs(s.value) }))}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={(v: any) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--g-card)', border: '1px solid var(--g-line)', borderRadius: 8, fontSize: 12 }}
              formatter={(value: any, name: any, props: any) => {
                const d = props?.payload;
                const prefix = d?.type === 'negative' ? '-' : d?.type === 'positive' ? '+' : '';
                return [`${prefix}$${(Number(value)/1000).toFixed(0)}k`, d?.label || name];
              }}
            />
            <Bar dataKey="absValue" radius={[6, 6, 0, 0]}>
              {waterfallSteps.map((step, i) => (
                <Cell key={i} fill={step.type === 'positive' ? '#22c55e' : step.type === 'negative' ? '#ef4444' : '#7c3aed'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Flow arrows */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>${(openingPipeline/1e6).toFixed(1)}M</span>
          <ArrowRight className="h-3 w-3" />
          <span className="text-emerald-400">+${(newPipeline/1000).toFixed(0)}k new</span>
          <ArrowRight className="h-3 w-3" />
          <span className="text-emerald-400">+${(wonRevenue/1000).toFixed(0)}k won</span>
          <ArrowRight className="h-3 w-3" />
          <span className="text-red-400">-${(lostRevenue/1000).toFixed(0)}k lost</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-semibold text-foreground">${(currentPipeline/1e6).toFixed(1)}M</span>
        </div>
      </div>
    </div>
  );
}

export default function WaterfallPage() {
  return (
    <OpportunityProvider>
      <WaterfallContent />
    </OpportunityProvider>
  );
}
