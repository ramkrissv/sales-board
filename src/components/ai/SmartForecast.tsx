'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles, Loader2, TrendingUp, TrendingDown, Target, DollarSign,
  BarChart3, Sliders, Play, RefreshCw, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine } from 'recharts';
import { trpc } from '@/lib/trpc/client';

const STAGE_WEIGHTS: Record<string, number> = {
  Discovery: 0.10, Qualification: 0.25, Proposal: 0.50, Negotiation: 0.75, Won: 1.0, Lost: 0, 'On Hold': 0.05,
};

interface SmartForecastProps {
  opportunities: any[];
}

export default function SmartForecast({ opportunities }: SmartForecastProps) {
  const [winRateAdjust, setWinRateAdjust] = useState(0); // -20 to +20 percentage point adjustment
  const [dealSlippage, setDealSlippage] = useState(15); // % of deals that slip to next quarter
  const [scenarioName, setScenarioName] = useState<'base' | 'optimistic' | 'conservative'>('base');
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);
  const [monteCarloResult, setMonteCarloResult] = useState<any>(null);

  const chatMutation = trpc.ai.chat.useMutation();

  const active = useMemo(() => opportunities.filter(o => !['Won', 'Lost'].includes(o.status)), [opportunities]);
  const won = useMemo(() => opportunities.filter(o => o.status === 'Won'), [opportunities]);

  // Scenario calculations
  const scenario = useMemo(() => {
    const adjustments = {
      base: { winMod: 0, slipMod: 0 },
      optimistic: { winMod: 10, slipMod: -5 },
      conservative: { winMod: -10, slipMod: 10 },
    };
    const adj = adjustments[scenarioName];
    const effectiveWinAdj = winRateAdjust + adj.winMod;
    const effectiveSlip = Math.max(0, Math.min(50, dealSlippage + adj.slipMod));

    const totalPipeline = active.reduce((s, o) => s + (o.tcv || 0), 0);
    const baseWeighted = active.reduce((s, o) => s + (o.tcv || 0) * (STAGE_WEIGHTS[o.status] || 0), 0);

    // Apply win rate adjustment
    const adjustedWeighted = active.reduce((s, o) => {
      const baseProb = STAGE_WEIGHTS[o.status] || 0;
      const adjustedProb = Math.max(0, Math.min(1, baseProb + effectiveWinAdj / 100));
      return s + (o.tcv || 0) * adjustedProb;
    }, 0);

    // Apply slippage
    const slippageReduction = adjustedWeighted * (effectiveSlip / 100);
    const finalForecast = adjustedWeighted - slippageReduction;

    // Quarterly projections
    const quarters: Record<string, { quarter: string; pipeline: number; weighted: number; won: number }> = {};
    [...active, ...won].forEach(o => {
      const d = new Date(o.expectedCloseDate);
      const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
      if (!quarters[q]) quarters[q] = { quarter: q, pipeline: 0, weighted: 0, won: 0 };
      if (o.status === 'Won') {
        quarters[q].won += o.tcv || 0;
      } else {
        quarters[q].pipeline += o.tcv || 0;
        const prob = Math.max(0, Math.min(1, (STAGE_WEIGHTS[o.status] || 0) + effectiveWinAdj / 100));
        quarters[q].weighted += (o.tcv || 0) * prob * (1 - effectiveSlip / 100);
      }
    });

    return {
      totalPipeline,
      baseWeighted,
      adjustedWeighted,
      slippageReduction,
      finalForecast,
      quarters: Object.values(quarters).sort((a, b) => a.quarter.localeCompare(b.quarter)),
      wonRevenue: won.reduce((s, o) => s + (o.tcv || 0), 0),
    };
  }, [active, won, winRateAdjust, dealSlippage, scenarioName]);

  // Monte Carlo simulation
  const runMonteCarlo = () => {
    setShowMonteCarlo(true);
    const iterations = 1000;
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let total = 0;
      for (const opp of active) {
        const baseProb = STAGE_WEIGHTS[opp.status] || 0;
        // Add randomness: normal distribution around base probability
        const rand = baseProb + (Math.random() - 0.5) * 0.3;
        const prob = Math.max(0, Math.min(1, rand));
        if (Math.random() < prob) {
          // Deal won — random TCV variation ±20%
          total += (opp.tcv || 0) * (0.8 + Math.random() * 0.4);
        }
      }
      results.push(total);
    }

    results.sort((a, b) => a - b);

    // Build distribution
    const buckets = 20;
    const min = results[0];
    const max = results[results.length - 1];
    const bucketSize = (max - min) / buckets;
    const distribution = Array.from({ length: buckets }, (_, i) => {
      const rangeStart = min + i * bucketSize;
      const rangeEnd = rangeStart + bucketSize;
      const count = results.filter(r => r >= rangeStart && r < rangeEnd).length;
      return {
        range: `$${(rangeStart / 1000).toFixed(0)}k`,
        count,
        value: rangeStart + bucketSize / 2,
      };
    });

    setMonteCarloResult({
      p10: results[Math.floor(iterations * 0.1)],
      p25: results[Math.floor(iterations * 0.25)],
      p50: results[Math.floor(iterations * 0.5)],
      p75: results[Math.floor(iterations * 0.75)],
      p90: results[Math.floor(iterations * 0.9)],
      mean: results.reduce((a, b) => a + b, 0) / iterations,
      distribution,
    });
  };

  return (
    <div className="space-y-6">
      {/* Scenario selector */}
      <div className="flex items-center gap-2">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Scenario:</div>
        {(['base', 'optimistic', 'conservative'] as const).map(s => (
          <button key={s} onClick={() => setScenarioName(s)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
              scenarioName === s
                ? s === 'optimistic' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : s === 'conservative' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/30'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button onClick={runMonteCarlo}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9] transition-colors">
          <Sparkles className="h-3 w-3" /> Monte Carlo (1k runs)
        </button>
      </div>

      {/* Forecast KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl g-surface g-elevated">
          <div className="text-[9px] text-muted-foreground uppercase">Pipeline</div>
          <div className="text-lg font-bold text-[#7c3aed]">${(scenario.totalPipeline / 1e6).toFixed(1)}M</div>
          <div className="text-[9px] text-muted-foreground">{active.length} deals</div>
        </div>
        <div className="p-3 rounded-xl g-surface g-elevated">
          <div className="text-[9px] text-muted-foreground uppercase">Base Weighted</div>
          <div className="text-lg font-bold text-blue-400">${(scenario.baseWeighted / 1e6).toFixed(1)}M</div>
          <div className="text-[9px] text-muted-foreground">stage-probability</div>
        </div>
        <div className="p-3 rounded-xl g-surface g-elevated">
          <div className="text-[9px] text-muted-foreground uppercase">Adjusted</div>
          <div className="text-lg font-bold text-foreground">${(scenario.adjustedWeighted / 1e6).toFixed(1)}M</div>
          <div className="text-[9px] text-muted-foreground">{winRateAdjust >= 0 ? '+' : ''}{winRateAdjust}% win adj</div>
        </div>
        <div className="p-3 rounded-xl g-surface g-elevated">
          <div className="text-[9px] text-muted-foreground uppercase">Slippage</div>
          <div className="text-lg font-bold text-amber-400">-${(scenario.slippageReduction / 1000).toFixed(0)}k</div>
          <div className="text-[9px] text-muted-foreground">{dealSlippage}% slip rate</div>
        </div>
        <div className="p-3 rounded-xl g-surface g-elevated border-2 border-[#7c3aed]/20">
          <div className="text-[9px] text-[#7c3aed] uppercase font-semibold">Forecast</div>
          <div className="text-lg font-bold text-[#7c3aed]">${(scenario.finalForecast / 1e6).toFixed(2)}M</div>
          <div className="text-[9px] text-muted-foreground">{scenarioName} scenario</div>
        </div>
      </div>

      {/* What-if sliders */}
      <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-3">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="h-3 w-3" /> What-If Adjustments
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-foreground">Win Rate Adjustment</label>
              <span className="text-xs font-mono text-foreground">{winRateAdjust >= 0 ? '+' : ''}{winRateAdjust}%</span>
            </div>
            <input type="range" min={-20} max={20} value={winRateAdjust}
              onChange={e => setWinRateAdjust(Number(e.target.value))}
              className="w-full accent-[#7c3aed]" />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>-20%</span><span>Base</span><span>+20%</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-foreground">Deal Slippage</label>
              <span className="text-xs font-mono text-foreground">{dealSlippage}%</span>
            </div>
            <input type="range" min={0} max={50} value={dealSlippage}
              onChange={e => setDealSlippage(Number(e.target.value))}
              className="w-full accent-[#7c3aed]" />
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>0%</span><span>25%</span><span>50%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quarterly projection chart */}
      {scenario.quarters.length > 0 && (
        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quarterly Projection</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scenario.quarters}>
              <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'var(--g-card)', border: '1px solid var(--g-line)', borderRadius: 8, fontSize: 11 }}
                formatter={(value: any, name: any) => [`$${(Number(value) / 1000).toFixed(0)}k`, name]}
              />
              <Bar dataKey="won" stackId="a" fill="#22c55e" name="Won Revenue" radius={[0, 0, 0, 0]} />
              <Bar dataKey="weighted" stackId="a" fill="#7c3aed" name="Weighted Forecast" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monte Carlo results */}
      {showMonteCarlo && monteCarloResult && (
        <div className="p-5 rounded-xl g-surface g-elevated space-y-4 animate-flow-in">
          <div className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Monte Carlo Simulation (1,000 iterations)
          </div>

          {/* Confidence intervals */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'P10', value: monteCarloResult.p10, desc: 'Worst likely' },
              { label: 'P25', value: monteCarloResult.p25, desc: 'Conservative' },
              { label: 'P50', value: monteCarloResult.p50, desc: 'Most likely' },
              { label: 'P75', value: monteCarloResult.p75, desc: 'Optimistic' },
              { label: 'P90', value: monteCarloResult.p90, desc: 'Best case' },
            ].map((p, i) => (
              <div key={p.label} className={`p-2 rounded-lg text-center ${i === 2 ? 'bg-[#7c3aed]/10 border border-[#7c3aed]/30' : 'bg-secondary/30'}`}>
                <div className="text-[9px] text-muted-foreground uppercase">{p.label}</div>
                <div className={`text-sm font-bold ${i === 2 ? 'text-[#7c3aed]' : 'text-foreground'}`}>
                  ${(p.value / 1e6).toFixed(2)}M
                </div>
                <div className="text-[8px] text-muted-foreground">{p.desc}</div>
              </div>
            ))}
          </div>

          {/* Distribution chart */}
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={monteCarloResult.distribution}>
              <XAxis dataKey="range" tick={{ fontSize: 8, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 8, fill: 'var(--g-fg-3)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--g-card)', border: '1px solid var(--g-line)', borderRadius: 8, fontSize: 10 }}
                formatter={(value: any) => [value, 'Simulations']}
              />
              <Area type="monotone" dataKey="count" fill="#7c3aed" fillOpacity={0.2} stroke="#7c3aed" strokeWidth={2} />
              <ReferenceLine x={monteCarloResult.distribution[Math.floor(monteCarloResult.distribution.length / 2)]?.range}
                stroke="#7c3aed" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
