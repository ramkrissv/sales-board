'use client';

import { useState, useEffect } from 'react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { DealDetail } from '@/components/modals/DealDetail';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Kanban, Table as TableIcon, CalendarDays, TrendingUp, Eye, Sparkles, Loader2, ArrowDown } from 'lucide-react';

const VIEW_MODES = [
  { id: 'kanban', label: 'Board', icon: Kanban, href: '/pipeline' },
  { id: 'funnel', label: 'Funnel', icon: TrendingUp, href: '/funnel' },
  { id: 'table', label: 'Table', icon: TableIcon, href: '/table' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '/calendar' },
  { id: 'graph', label: 'Graph', icon: Eye, href: '/graph' },
];

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'] as const;
const STAGE_COLORS = ['#3b82f6', '#f59e0b', '#7c3aed', '#22c55e', '#10b981'];

function FunnelContent() {
  const { opportunities } = useOpportunities();
  const pathname = usePathname();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [aiRead, setAiRead] = useState('');
  const chatMutation = trpc.ai.chat.useMutation();

  const stageData = STAGES.map((stage, i) => {
    const deals = opportunities.filter(o => o.status === stage);
    const tcv = deals.reduce((s, o) => s + (o.tcv || 0), 0);
    const weighted = deals.reduce((s, o) => s + (o.tcv || 0) * ([0.1, 0.3, 0.5, 0.7, 1.0][i] || 0.5), 0);
    const nextStage = STAGES[i + 1];
    const nextCount = nextStage ? opportunities.filter(o => o.status === nextStage).length : 0;
    const convRate = deals.length > 0 && nextStage ? Math.round((nextCount / deals.length) * 100) : null;
    return { stage, count: deals.length, tcv, weighted, color: STAGE_COLORS[i], convRate, deals };
  });

  const maxCount = Math.max(...stageData.map(s => s.count), 1);

  useEffect(() => {
    if (opportunities.length > 0 && !aiRead && !chatMutation.isPending) {
      const ctx = stageData.map(s => `${s.stage}: ${s.count} deals $${(s.tcv / 1000).toFixed(0)}k`).join(', ');
      chatMutation.mutate({
        message: `Two sentences only. Biggest funnel issue and one fix. No markdown. ${ctx}`,
        context: { page: 'funnel' },
      }, { onSuccess: (d) => setAiRead(d.response.replace(/\*\*/g, '').replace(/#{1,3}\s/g, '').slice(0, 200)) });
    }
  }, [opportunities.length]); // eslint-disable-line

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* View mode tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 w-fit">
        {VIEW_MODES.map(mode => (
          <Link key={mode.id} href={mode.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === mode.href ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <mode.icon className={`h-3.5 w-3.5 ${pathname === mode.href ? 'text-[#7c3aed]' : ''}`} />
            {mode.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground font-display">Pipeline Funnel</h1>
        <div className="text-xs text-muted-foreground">
          {opportunities.filter(o => !['Won', 'Lost'].includes(o.status)).length} active · ${(stageData.reduce((s, d) => s + d.tcv, 0) / 1e6).toFixed(1)}M total
        </div>
      </div>

      {/* Funnel — each stage is a full-width row with narrowing colored block + deals */}
      <div className="space-y-0">
        {stageData.map((s, i) => {
          // Block width narrows: 100% → 30%
          const widthPct = Math.max(30, 100 - (i * 70 / (stageData.length - 1)));

          return (
            <div key={s.stage}>
              {/* Stage row */}
              <div className="flex items-stretch gap-0">
                {/* Stage label — fixed width left */}
                <div className="w-28 shrink-0 flex flex-col justify-center text-right pr-4 py-3">
                  <div className="text-sm font-semibold text-foreground">{s.stage}</div>
                  <div className="text-[10px] text-muted-foreground g-metric">${(s.tcv / 1000).toFixed(0)}k</div>
                </div>

                {/* Colored funnel block — centered, width narrows */}
                <div className="flex-1 flex items-center" style={{ paddingLeft: `${(100 - widthPct) / 2}%`, paddingRight: `${(100 - widthPct) / 2}%` }}>
                  <div
                    className="w-full rounded-lg py-3 px-4 flex items-center justify-between cursor-pointer transition-all hover:brightness-110"
                    style={{ backgroundColor: s.color, minHeight: '48px' }}
                    onClick={() => setExpandedStage(expandedStage === s.stage ? null : s.stage)}
                  >
                    <span className="text-white font-bold text-lg g-metric">{s.count}</span>
                    <span className="text-white/70 text-xs">${(s.weighted / 1000).toFixed(0)}k wtd</span>
                  </div>
                </div>

                {/* Arrow connector → deal cards */}
                <div className="w-8 shrink-0 flex items-center justify-center">
                  {s.deals.length > 0 && (
                    <svg width="32" height="2" className="overflow-visible">
                      <line x1="0" y1="1" x2="28" y2="1" stroke={s.color} strokeWidth="1.5" opacity="0.5" />
                      <polygon points="26,-3 32,1 26,5" fill={s.color} opacity="0.5" />
                    </svg>
                  )}
                </div>

                {/* Deal cards — right side */}
                <div className="w-60 shrink-0 flex flex-col justify-center py-1">
                  {s.deals.length > 0 ? (
                    <div className="space-y-1">
                      {s.deals.slice(0, 3).map(d => (
                        <button key={d.id} onClick={() => setSelectedOppId(d.id)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-card border border-border hover:border-[#7c3aed]/30 transition-all text-left group">
                          <span className="text-[11px] font-medium text-foreground group-hover:text-[#7c3aed] truncate max-w-[140px]">{d.customerName}</span>
                          <span className="text-[10px] text-muted-foreground g-metric shrink-0 ml-2">${((d.tcv || 0) / 1000).toFixed(0)}k</span>
                        </button>
                      ))}
                      {s.deals.length > 3 && (
                        <span className="text-[10px] text-muted-foreground pl-3">+{s.deals.length - 3} more deals</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic pl-3">No deals</span>
                  )}
                </div>
              </div>

              {/* Expanded stage detail */}
              {expandedStage === s.stage && s.deals.length > 0 && (
                <div className="ml-28 mr-8 mt-2 mb-2 p-4 rounded-xl g-surface g-elevated animate-flow-in" style={{ borderLeft: `3px solid ${s.color}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground">{s.stage} — {s.count} deals · ${(s.tcv/1000).toFixed(0)}k</span>
                    <button onClick={() => setExpandedStage(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {s.deals.map(d => (
                      <button key={d.id} onClick={() => setSelectedOppId(d.id)}
                        className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-[#7c3aed]/30 transition-all text-left">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-foreground truncate">{d.customerName}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{d.opportunityName}</div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <div className="text-xs font-bold text-foreground g-metric">${((d.tcv || 0)/1000).toFixed(0)}k</div>
                          <div className="text-[10px] text-muted-foreground">{d.primaryOwner}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion arrow */}
              {s.convRate !== null && (
                <div className="flex items-center py-1">
                  <div className="w-28 shrink-0" />
                  <div className="flex-1 flex items-center justify-center">
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground ml-1">{s.convRate}% conversion</span>
                  </div>
                  <div className="w-68 shrink-0" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Funnel Read */}
      {aiRead && (
        <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
            <span className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-wider">AI Insight</span>
          </div>
          <p className="text-xs text-foreground leading-relaxed">{aiRead}</p>
        </div>
      )}
      {chatMutation.isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin text-[#7c3aed]" /> Analyzing funnel...
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-2">
        {stageData.map(s => (
          <div key={s.stage} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.stage}</span>
            <span className="font-semibold text-foreground">{s.count}</span>
          </div>
        ))}
      </div>

      {selectedOppId && <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />}
    </div>
  );
}

export default function FunnelPage() {
  return (
    <OpportunityProvider>
      <FunnelContent />
    </OpportunityProvider>
  );
}
