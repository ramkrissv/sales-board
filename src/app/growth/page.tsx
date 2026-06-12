'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { DealDetail } from '@/components/modals/DealDetail';
import { trpc } from '@/lib/trpc/client';
import {
  Grid3X3, Sparkles, TrendingUp, ShieldAlert, DollarSign,
  Plus, ArrowRight, CheckCircle2, CircleDot, Loader2,
} from 'lucide-react';

/* ── service-line columns for the whitespace map ── */
const SERVICE_LINES = ['AI', 'Cloud', 'App Dev', 'Managed Services', 'QA', 'Consulting'] as const;

/** Map raw serviceLine / opportunityName / tags into one of our canonical columns */
function inferServiceLine(opp: { serviceLine?: string; opportunityName: string; customTags: string[] }): string | null {
  const blob = [opp.serviceLine, opp.opportunityName, ...(opp.customTags || [])].join(' ').toLowerCase();
  if (/\bai\b|machine learning|ml\b|genai|artificial/.test(blob)) return 'AI';
  if (/cloud|aws|azure|gcp|infra/.test(blob)) return 'Cloud';
  if (/app dev|application|frontend|backend|fullstack|mobile|web dev|software dev/.test(blob)) return 'App Dev';
  if (/managed|support|operations|maintenance|ams/.test(blob)) return 'Managed Services';
  if (/qa|quality|testing|automation test|sdet/.test(blob)) return 'QA';
  if (/consult|advisory|strategy|transformation|digital/.test(blob)) return 'Consulting';
  return null;
}

/* ── AI expansion suggestion generator (deterministic, data-driven) ── */
function suggestExpansion(
  account: string,
  liveLines: string[],
  pipelineLines: string[],
  whiteLines: string[],
  totalArr: number,
): string {
  if (whiteLines.length === 0) return `Deepen engagement across ${liveLines.length} active service lines.`;
  const top = whiteLines[0];
  if (liveLines.includes('AI') && whiteLines.includes('Managed Services'))
    return `Cross-sell Managed Services — AI clients retain 2x longer with ops support.`;
  if (liveLines.includes('Cloud') && whiteLines.includes('AI'))
    return `Introduce AI/ML on existing Cloud estate — high win-rate pattern.`;
  if (totalArr > 500000)
    return `High-value account — propose ${top} pilot to expand footprint.`;
  return `Whitespace in ${top}${whiteLines.length > 1 ? ` +${whiteLines.length - 1} more` : ''} — schedule discovery call.`;
}

function GrowthContent() {
  const { opportunities, isLoading } = useOpportunities();
  const router = useRouter();
  const utils = trpc.useUtils();
  const createOppMutation = trpc.opportunity.create.useMutation({
    onSuccess: (data) => {
      utils.opportunity.list.invalidate();
      setSelectedOppId((data as any).id);
    },
  });
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ account: string; serviceLine: string } | null>(null);

  // Create opportunity from whitespace cell
  const handleWhitespaceClick = (accountName: string, serviceLine: string) => {
    const year = new Date().getFullYear();
    const id = `EN-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    createOppMutation.mutate({
      id,
      customerName: accountName,
      opportunityName: `${accountName} — ${serviceLine} Expansion`,
      status: 'Discovery',
      tcv: 0,
      dealDuration: '12 months',
      expectedCloseDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      startDate: new Date().toISOString(),
      primaryOwner: 'Sreeram',
      industry: 'Technology',
      region: 'North America',
      source: 'Expansion Play',
      serviceLine: serviceLine,
      salesPOCs: [],
      presalesPOCs: [],
      customTags: ['expansion', 'EN', serviceLine.toLowerCase()],
      conversationLog: `Expansion opportunity created from Growth whitespace map for ${serviceLine} service line.`,
      activityLog: [],
      lifecyclePhase: 'opportunity',
    } as any);
  };

  // Activate expansion play: create new opp if none active, navigate to presales
  const handleActivatePlay = (accountName: string, whitespaceLines: string[]) => {
    const acctOpps = opportunities.filter(o => o.customerName === accountName);
    const active = acctOpps.find(o => !['Won', 'Lost'].includes(o.status));

    if (active) {
      // Has active deal — go straight to presales with it
      router.push('/presales');
    } else {
      // No active deal — create expansion opportunity first, then navigate
      const topWhitespace = whitespaceLines[0] || 'IT Services';
      const year = new Date().getFullYear();
      const id = `EN-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      createOppMutation.mutate({
        id,
        customerName: accountName,
        opportunityName: `${accountName} — ${topWhitespace} Expansion`,
        status: 'Discovery',
        tcv: 0,
        dealDuration: '12 months',
        expectedCloseDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        startDate: new Date().toISOString(),
        primaryOwner: 'Sreeram',
        industry: 'Technology',
        region: 'North America',
        source: 'Expansion Play',
        serviceLine: topWhitespace,
        salesPOCs: [],
        presalesPOCs: [],
        customTags: ['expansion', 'EN', topWhitespace.toLowerCase()],
        conversationLog: `Expansion play activated from Growth page. Target service line: ${topWhitespace}. Whitespace opportunities: ${whitespaceLines.join(', ')}.`,
        activityLog: [],
        lifecyclePhase: 'opportunity',
      } as any, {
        onSuccess: () => router.push('/presales'),
      });
    }
  };

  /* ── compute EE accounts (2+ won deals) and their service-line coverage ── */
  const { accounts, kpis } = useMemo(() => {
    type OppRef = (typeof opportunities)[number];

    // Group all opps by customer
    const byCustomer: Record<string, OppRef[]> = {};
    opportunities.forEach(o => {
      if (!byCustomer[o.customerName]) byCustomer[o.customerName] = [];
      byCustomer[o.customerName].push(o);
    });

    // Only EE accounts: 2+ won deals
    const eeAccounts: {
      name: string;
      arr: number;
      dealCount: number;
      live: Set<string>;
      pipeline: Set<string>;
      white: string[];
      opps: OppRef[];
    }[] = [];

    let totalInstalledArr = 0;
    let totalWhitespace = 0;
    let renewalRisk = 0;

    Object.entries(byCustomer).forEach(([name, opps]) => {
      const wonOpps = opps.filter(o => o.status === 'Won');
      if (wonOpps.length < 2) return; // not EE

      const arr = wonOpps.reduce((s, o) => s + (o.tcv || 0), 0);
      totalInstalledArr += arr;

      const live = new Set<string>();
      const pipeline = new Set<string>();

      opps.forEach(o => {
        const sl = inferServiceLine(o);
        if (!sl) return;
        if (o.status === 'Won') live.add(sl);
        else if (!['Lost'].includes(o.status)) pipeline.add(sl);
      });

      const white = SERVICE_LINES.filter(sl => !live.has(sl) && !pipeline.has(sl));
      totalWhitespace += white.length;

      // Renewal risk: any deal with health < 50 or sentiment < 40
      const atRisk = opps.some(o => ((o as any).dealHealthScore ?? 100) < 50 || ((o as any).sentimentScore ?? 100) < 40);
      if (atRisk) renewalRisk++;

      eeAccounts.push({ name, arr, dealCount: opps.length, live, pipeline, white, opps });
    });

    eeAccounts.sort((a, b) => b.arr - a.arr);

    // NRR approximation: (installed + pipeline upsell) / installed
    const upsellPipeline = opportunities
      .filter(o => o.clientType === 'Existing' && !['Won', 'Lost'].includes(o.status))
      .reduce((s, o) => s + (o.tcv || 0), 0);
    const nrr = totalInstalledArr > 0 ? Math.round(((totalInstalledArr + upsellPipeline) / totalInstalledArr) * 100) : 100;

    return {
      accounts: eeAccounts,
      kpis: {
        installedArr: totalInstalledArr,
        nrr,
        whitespace: totalWhitespace,
        renewalRisk,
      },
    };
  }, [opportunities]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading growth data...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-2 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">EE Growth &mdash; Existing Business</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Whitespace maps and expansion plays across {accounts.length} existing-existing accounts
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Installed Base ARR', value: `$${(kpis.installedArr / 1e6).toFixed(1)}M`, icon: DollarSign, color: 'text-purple-400' },
          { label: 'Net Revenue Retention', value: `${kpis.nrr}%`, icon: TrendingUp, color: kpis.nrr >= 100 ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'Whitespace Identified', value: `${kpis.whitespace}`, icon: Grid3X3, color: 'text-blue-400' },
          { label: 'Renewal Risk', value: `${kpis.renewalRisk}`, icon: ShieldAlert, color: kpis.renewalRisk > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated hover-lift hover-glow">
            <div className="flex items-center gap-1.5 mb-1">
              <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            </div>
            <div className={`text-xl font-semibold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Whitespace Map (3 cols) */}
        <div className="lg:col-span-3 p-5 rounded-xl g-surface g-elevated hover-glow">
          <div className="flex items-center gap-2 mb-4">
            <Grid3X3 className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-foreground">Whitespace Map</h3>
          </div>

          {accounts.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center">
              No EE accounts found. Accounts need 2+ won deals to appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--g-line)' }}>
                    <th className="px-2 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium w-40">Account</th>
                    {SERVICE_LINES.map(sl => (
                      <th key={sl} className="px-1.5 py-2 text-center text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{sl}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acct, idx) => (
                    <tr key={acct.name} className="border-b hover:bg-card/50 transition-colors reveal" style={{ borderColor: 'var(--g-line)', animationDelay: `${idx * 0.04}s` }}>
                      <td className="px-2 py-2.5">
                        <div className="font-medium text-foreground truncate max-w-[160px]">{acct.name}</div>
                        <div className="text-[10px] text-muted-foreground">${(acct.arr / 1000).toFixed(0)}k ARR</div>
                      </td>
                      {SERVICE_LINES.map(sl => {
                        const isLive = acct.live.has(sl);
                        const isPipeline = acct.pipeline.has(sl);
                        return (
                          <td key={sl} className="px-1.5 py-2.5 text-center">
                            {isLive ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-600 text-white" title={`${sl}: Won deal`}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </div>
                            ) : isPipeline ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg border-2 border-purple-500 text-purple-400" title={`${sl}: Active pipeline`}>
                                <CircleDot className="h-3.5 w-3.5" />
                              </div>
                            ) : (
                              <button
                                onClick={() => handleWhitespaceClick(acct.name, sl)}
                                disabled={createOppMutation.isPending}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-dashed border-zinc-600 text-zinc-500 hover:border-purple-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all disabled:opacity-50"
                                title={`Create ${sl} opportunity for ${acct.name}`}
                              >
                                {createOppMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: 'var(--g-line)' }}>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-4 h-4 rounded bg-purple-600 flex items-center justify-center"><CheckCircle2 className="h-2.5 w-2.5 text-white" /></div>
                  Won (Live)
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-4 h-4 rounded border-2 border-purple-500 flex items-center justify-center"><CircleDot className="h-2.5 w-2.5 text-purple-400" /></div>
                  Pipeline
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-4 h-4 rounded border border-dashed border-zinc-600 flex items-center justify-center"><Plus className="h-2.5 w-2.5 text-zinc-500" /></div>
                  Whitespace
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: AI Expansion Plays (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-foreground">AI Expansion Plays</h3>
          </div>

          {accounts.length === 0 ? (
            <div className="p-5 rounded-xl g-surface g-elevated text-xs text-muted-foreground text-center">
              No EE accounts to generate plays for.
            </div>
          ) : (
            accounts.slice(0, 8).map((acct, idx) => {
              const liveArr = [...acct.live];
              const pipelineArr = [...acct.pipeline];
              const suggestion = suggestExpansion(acct.name, liveArr, pipelineArr, acct.white, acct.arr);

              return (
                <div
                  key={acct.name}
                  className="p-4 rounded-xl g-surface g-elevated hover-lift hover-glow reveal"
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-foreground">{acct.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">${(acct.arr / 1000).toFixed(0)}k ARR</span>
                        <span className="text-[10px] text-muted-foreground">&middot;</span>
                        <span className="text-[10px] text-muted-foreground">{acct.dealCount} deals</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {acct.white.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">
                          {acct.white.length} gaps
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Service line pills */}
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {liveArr.map(sl => (
                      <span key={sl} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-300 font-medium">{sl}</span>
                    ))}
                    {pipelineArr.map(sl => (
                      <span key={sl} className="text-[9px] px-1.5 py-0.5 rounded border border-purple-500/40 text-purple-400 font-medium">{sl}</span>
                    ))}
                  </div>

                  {/* AI suggestion */}
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <Sparkles className="h-3 w-3 text-purple-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-foreground/80 leading-relaxed">{suggestion}</p>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <button onClick={() => handleActivatePlay(acct.name, acct.white)}
                      disabled={createOppMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors disabled:opacity-50">
                      {createOppMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                      {acct.white.length > 0 ? `Expand into ${acct.white[0]}` : 'Open in Presales'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedOppId && <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />}
    </div>
  );
}

export default function GrowthPage() {
  return (
    <OpportunityProvider>
      <GrowthContent />
    </OpportunityProvider>
  );
}
