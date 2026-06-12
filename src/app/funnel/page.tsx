'use client';

import { useState } from 'react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { DealDetail } from '@/components/modals/DealDetail';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Kanban, Table as TableIcon, CalendarDays, TrendingUp, Clock, Eye,
  Sparkles, Loader2, ChevronRight, DollarSign, Users, ArrowRight
} from 'lucide-react';

const VIEW_MODES = [
  { id: 'kanban', label: 'Board', icon: Kanban, href: '/pipeline' },
  { id: 'table', label: 'Table', icon: TableIcon, href: '/table' },
  { id: 'funnel', label: 'Funnel', icon: TrendingUp, href: '/funnel' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '/calendar' },
  { id: 'graph', label: 'Graph', icon: Eye, href: '/graph' },
];

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'] as const;
const STAGE_COLORS = ['#3b82f6', '#f59e0b', '#7c3aed', '#22c55e', '#10b981'];

function FunnelContent() {
  const { opportunities } = useOpportunities();
  const pathname = usePathname();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
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

  const maxTcv = Math.max(...stageData.map(s => s.tcv), 1);

  // Generate AI funnel read
  const generateFunnelRead = () => {
    const context = stageData.map(s => `${s.stage}: ${s.count} deals, $${(s.tcv/1000).toFixed(0)}k, ${s.convRate !== null ? s.convRate + '% conv' : 'terminal'}`).join('. ');
    chatMutation.mutate({
      message: `Analyze this sales funnel and give a brief (3-4 sentences) strategic read. Focus on conversion bottlenecks, stage velocity, and one specific action. ${context}. Total pipeline: $${(stageData.reduce((s, d) => s + d.tcv, 0)/1000).toFixed(0)}k.`,
      context: { page: 'funnel' },
    }, {
      onSuccess: (data) => setAiRead(data.response.replace(/\*\*/g, '').replace(/#{1,3}\s/g, '')),
    });
  };

  // Auto-generate on load
  useState(() => { if (!aiRead && opportunities.length > 0) generateFunnelRead(); });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* View mode tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 w-fit">
        {VIEW_MODES.map(mode => {
          const isActive = pathname === mode.href;
          return (
            <Link key={mode.id} href={mode.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <mode.icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#7c3aed]' : ''}`} />
              {mode.label}
            </Link>
          );
        })}
      </div>

      <h1 className="text-xl font-semibold text-foreground font-display">Stage Funnel — Live Pipeline</h1>

      {/* Split layout: funnel left, AI read right */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* LEFT: SVG Trapezoid Funnel */}
        <div className="md:col-span-3 g-surface g-elevated rounded-xl p-6">
          {(() => {
            const W = 560, stageH = 72, gap = 4, padding = 40;
            const totalH = stageData.length * (stageH + gap) + padding;
            const maxW = W - 80; // max width for widest stage
            const minW = 120; // min width for narrowest

            return (
              <svg viewBox={`0 0 ${W} ${totalH}`} width="100%" className="overflow-visible">
                {stageData.map((s, i) => {
                  // Funnel narrows: top is widest, bottom narrowest
                  const topW = maxW - (i * (maxW - minW) / (stageData.length - 1 || 1));
                  const botW = maxW - ((i + 1) * (maxW - minW) / (stageData.length - 1 || 1));
                  const y = i * (stageH + gap) + 10;
                  const topX = (W - topW) / 2;
                  const botX = (W - botW) / 2;

                  // Trapezoid path
                  const path = `M${topX},${y} L${topX + topW},${y} L${botX + botW},${y + stageH} L${botX},${y + stageH} Z`;

                  return (
                    <g key={s.stage} className="cursor-pointer" onClick={() => s.deals.length > 0 && setSelectedOppId(s.deals[0].id)}>
                      {/* Trapezoid shape */}
                      <path d={path} fill={s.color + '25'} stroke={s.color} strokeWidth="1.5" rx="8"
                        className="transition-all hover:fill-opacity-40" style={{ filter: `drop-shadow(0 2px 4px ${s.color}20)` }} />

                      {/* Stage label — left */}
                      <text x={topX + 16} y={y + 28} fontSize="13" fontWeight="600" fill="var(--g-fg)" fontFamily="var(--font-display)">
                        {s.stage}
                      </text>
                      <text x={topX + 16} y={y + 46} fontSize="10" fill="var(--g-fg-3)">
                        {s.count} deal{s.count !== 1 ? 's' : ''}
                      </text>

                      {/* Values — right */}
                      <text x={topX + topW - 16} y={y + 28} fontSize="14" fontWeight="700" fill="var(--g-fg)" textAnchor="end" fontFamily="var(--font-mono)">
                        ${(s.tcv / 1000).toFixed(0)}k
                      </text>
                      <text x={topX + topW - 16} y={y + 46} fontSize="10" fill="var(--g-fg-3)" textAnchor="end">
                        ${(s.weighted / 1000).toFixed(0)}k weighted
                      </text>

                      {/* Deal name chips inside the trapezoid */}
                      {s.deals.slice(0, 3).map((d, j) => (
                        <g key={d.id} onClick={(e) => { e.stopPropagation(); setSelectedOppId(d.id); }}>
                          <rect x={topX + 16 + j * 100} y={y + 52} width={92} height={14} rx="7" fill="var(--g-card)" stroke="var(--g-line)" strokeWidth="0.5" />
                          <text x={topX + 62 + j * 100} y={y + 62} fontSize="8" fill="var(--g-fg-2)" textAnchor="middle" className="pointer-events-none">
                            {d.customerName.length > 14 ? d.customerName.slice(0, 14) + '…' : d.customerName}
                          </text>
                        </g>
                      ))}

                      {/* Conversion arrow between stages */}
                      {s.convRate !== null && (
                        <text x={W / 2} y={y + stageH + gap / 2 + 3} fontSize="9" fill="var(--g-fg-3)" textAnchor="middle">
                          → {s.convRate}% conversion
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </div>

        {/* RIGHT: AI Funnel Read */}
        <div className="md:col-span-2">
          <div className="g-surface g-elevated p-5 rounded-xl sticky top-20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[#7c3aed]" />
              <span className="text-sm font-semibold text-foreground">AI Funnel Read</span>
            </div>
            {chatMutation.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-[#7c3aed]" /> Analyzing funnel...
              </div>
            ) : aiRead ? (
              <p className="text-sm text-foreground leading-relaxed">{aiRead}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Click to generate AI analysis of your funnel.</p>
            )}

            {/* Quick stats */}
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {stageData.filter(s => s.count > 0).map(s => (
                <div key={s.stage} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-foreground">{s.stage}</span>
                  </div>
                  <span className="text-muted-foreground g-metric">{s.count} · ${(s.tcv/1000).toFixed(0)}k</span>
                </div>
              ))}
            </div>

            {/* Flow links */}
            <div className="mt-4 pt-4 border-t border-border space-y-1.5">
              <span className="g-section-label">Navigate</span>
              {[
                { label: 'Open Presales Studio', href: '/presales', color: '#7c3aed' },
                { label: 'View Growth Whitespace', href: '/growth', color: '#22c55e' },
                { label: 'Check Insights', href: '/insights', color: '#3b82f6' },
              ].map(link => (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="h-3 w-3" style={{ color: link.color }} /> {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
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
