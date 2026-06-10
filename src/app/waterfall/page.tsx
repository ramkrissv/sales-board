'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { DollarSign, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

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
      <div>
        <h1 className="text-xl font-semibold text-foreground">Revenue Waterfall</h1>
        <p className="text-sm text-muted-foreground">Pipeline movement over the last 30 days</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
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
        <div className="text-sm font-semibold text-foreground mb-6">Pipeline Waterfall</div>
        <div className="flex items-end gap-4" style={{ height: '250px' }}>
          {waterfallSteps.map((step, i) => {
            const barHeight = Math.max(20, (Math.abs(step.value) / maxVal) * 200);
            const color = step.type === 'positive' ? '#22c55e' : step.type === 'negative' ? '#ef4444' : '#7c3aed';

            return (
              <div key={step.label} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-bold g-metric" style={{ color }}>{step.value >= 0 ? '+' : ''}{(step.value/1000).toFixed(0)}k</span>
                <div className="w-full flex flex-col items-center">
                  <div className="w-full rounded-lg reveal transition-all"
                    style={{ height: `${barHeight}px`, backgroundColor: color + '20', border: `1px solid ${color}40`, animationDelay: `${i * 0.1}s` }}>
                    <div className="h-full w-full flex items-center justify-center">
                      {step.type === 'positive' && <TrendingUp className="h-4 w-4" style={{ color }} />}
                      {step.type === 'negative' && <TrendingDown className="h-4 w-4" style={{ color }} />}
                      {step.type === 'neutral' && <DollarSign className="h-4 w-4" style={{ color }} />}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground text-center">{step.label}</span>
              </div>
            );
          })}
        </div>

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
