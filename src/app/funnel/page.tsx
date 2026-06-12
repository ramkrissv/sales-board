'use client';

import { useState, useEffect } from 'react';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { DealDetail } from '@/components/modals/DealDetail';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Kanban, Table as TableIcon, CalendarDays, TrendingUp, Eye,
  Sparkles, Loader2, ChevronRight, DollarSign, Users, ArrowDown
} from 'lucide-react';

const VIEW_MODES = [
  { id: 'kanban', label: 'Board', icon: Kanban, href: '/pipeline' },
  { id: 'funnel', label: 'Funnel', icon: TrendingUp, href: '/funnel' },
  { id: 'table', label: 'Table', icon: TableIcon, href: '/table' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, href: '/calendar' },
  { id: 'graph', label: 'Graph', icon: Eye, href: '/graph' },
];

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'] as const;
const STAGE_COLORS = ['#3b82f6', '#f59e0b', '#7c3aed', '#22c55e', '#10b981'];
const STAGE_GRADIENTS = [
  ['#60a5fa', '#3b82f6'], // blue
  ['#fbbf24', '#f59e0b'], // amber
  ['#a78bfa', '#7c3aed'], // purple
  ['#4ade80', '#22c55e'], // green
  ['#34d399', '#10b981'], // emerald
];

function FunnelContent() {
  const { opportunities } = useOpportunities();
  const pathname = usePathname();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [aiRead, setAiRead] = useState('');
  const chatMutation = trpc.ai.chat.useMutation();

  const stageData = STAGES.map((stage, i) => {
    const deals = opportunities.filter(o => o.status === stage);
    const tcv = deals.reduce((s, o) => s + (o.tcv || 0), 0);
    const weighted = deals.reduce((s, o) => s + (o.tcv || 0) * ([0.1, 0.3, 0.5, 0.7, 1.0][i] || 0.5), 0);
    const nextStage = STAGES[i + 1];
    const nextCount = nextStage ? opportunities.filter(o => o.status === nextStage).length : 0;
    const convRate = deals.length > 0 && nextStage ? Math.round((nextCount / deals.length) * 100) : null;
    return { stage, count: deals.length, tcv, weighted, color: STAGE_COLORS[i], gradient: STAGE_GRADIENTS[i], convRate, deals };
  });

  useEffect(() => {
    if (opportunities.length > 0 && !aiRead && !chatMutation.isPending) {
      const ctx = stageData.map(s => `${s.stage}: ${s.count} deals $${(s.tcv/1000).toFixed(0)}k`).join(', ');
      chatMutation.mutate({
        message: `Brief funnel analysis (3 sentences max). Focus on biggest bottleneck and one action. ${ctx}`,
        context: { page: 'funnel' },
      }, { onSuccess: (d) => setAiRead(d.response.replace(/\*\*/g, '').replace(/#{1,3}\s/g, '')) });
    }
  }, [opportunities.length]); // eslint-disable-line

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      <h1 className="text-xl font-semibold text-foreground font-display">Pipeline Funnel</h1>

      {/* Main layout: funnel center with side info panels */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">

        {/* LEFT info panels */}
        <div className="lg:col-span-2 space-y-3 flex flex-col justify-center">
          {stageData.filter((_, i) => i % 2 === 0).map((s, idx) => {
            const i = idx * 2;
            return (
              <button key={s.stage} onClick={() => s.deals[0] && setSelectedOppId(s.deals[0].id)}
                onMouseEnter={() => setHoveredStage(i)} onMouseLeave={() => setHoveredStage(null)}
                className={`p-4 rounded-xl text-left transition-all ${hoveredStage === i ? 'g-surface g-elevated scale-[1.02]' : 'bg-card/50 border border-border/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">{s.stage}</span>
                </div>
                <div className="g-metric text-lg font-bold text-foreground">${(s.tcv/1000).toFixed(0)}k</div>
                <div className="text-[10px] text-muted-foreground">{s.count} deals · ${(s.weighted/1000).toFixed(0)}k weighted</div>
                {s.deals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.deals.slice(0, 3).map(d => (
                      <span key={d.id} onClick={(e) => { e.stopPropagation(); setSelectedOppId(d.id); }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[100px]">
                        {d.customerName}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* CENTER: 3D Funnel SVG */}
        <div className="lg:col-span-3 flex items-center justify-center">
          <svg viewBox="0 0 400 480" width="100%" style={{ maxWidth: '380px' }}>
            <defs>
              {STAGE_GRADIENTS.map((g, i) => (
                <linearGradient key={i} id={`funnel-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={g[0]} />
                  <stop offset="100%" stopColor={g[1]} />
                </linearGradient>
              ))}
              {/* 3D shadow */}
              <filter id="funnel-shadow">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.15" />
              </filter>
            </defs>

            {stageData.map((s, i) => {
              const totalStages = stageData.length;
              const stageH = 70;
              const gapH = 12;
              const y = i * (stageH + gapH) + 20;

              // Funnel widths: 360 → 100 (narrowing)
              const topW = 360 - (i * (260 / (totalStages - 1)));
              const botW = 360 - ((i + 1) * (260 / (totalStages - 1)));
              const topX = (400 - topW) / 2;
              const botX = (400 - botW) / 2;

              // Curved trapezoid using quadratic bezier for 3D effect
              const curveY = y + 8; // slight curve at top
              const path = `
                M${topX},${curveY}
                Q${200},${y - 5} ${topX + topW},${curveY}
                L${botX + botW},${y + stageH}
                Q${200},${y + stageH + 5} ${botX},${y + stageH}
                Z
              `;

              // Ellipse at top for 3D rim
              const rimRx = topW / 2;
              const rimRy = 10;

              const isHovered = hoveredStage === i;

              return (
                <g key={s.stage}
                  className="cursor-pointer transition-all"
                  style={{ transform: isHovered ? 'scale(1.03)' : 'scale(1)', transformOrigin: '200px ' + (y + stageH / 2) + 'px' }}
                  onMouseEnter={() => setHoveredStage(i)}
                  onMouseLeave={() => setHoveredStage(null)}
                  onClick={() => s.deals[0] && setSelectedOppId(s.deals[0].id)}
                  filter="url(#funnel-shadow)"
                >
                  {/* Main trapezoid body */}
                  <path d={path} fill={`url(#funnel-grad-${i})`} opacity={isHovered ? 1 : 0.85} />

                  {/* Top rim ellipse for 3D depth */}
                  <ellipse cx={200} cy={curveY} rx={rimRx} ry={rimRy} fill={s.gradient[0]} opacity={0.6} />

                  {/* Stage number circle */}
                  <circle cx={200} cy={y + stageH / 2 + 2} r={16} fill="rgba(0,0,0,0.25)" />
                  <text x={200} y={y + stageH / 2 + 7} fontSize="13" fontWeight="700" fill="white" textAnchor="middle">
                    {String(i + 1).padStart(2, '0')}
                  </text>
                </g>
              );
            })}

            {/* Conversion arrows between stages */}
            {stageData.map((s, i) => {
              if (s.convRate === null) return null;
              const y = (i + 1) * (70 + 12) + 12;
              return (
                <text key={`conv-${i}`} x={200} y={y} fontSize="9" fill="var(--g-fg-3)" textAnchor="middle" fontWeight="500">
                  ↓ {s.convRate}%
                </text>
              );
            })}
          </svg>
        </div>

        {/* RIGHT info panels */}
        <div className="lg:col-span-2 space-y-3 flex flex-col justify-center">
          {stageData.filter((_, i) => i % 2 === 1).map((s, idx) => {
            const i = idx * 2 + 1;
            return (
              <button key={s.stage} onClick={() => s.deals[0] && setSelectedOppId(s.deals[0].id)}
                onMouseEnter={() => setHoveredStage(i)} onMouseLeave={() => setHoveredStage(null)}
                className={`p-4 rounded-xl text-left transition-all ${hoveredStage === i ? 'g-surface g-elevated scale-[1.02]' : 'bg-card/50 border border-border/50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">{s.stage}</span>
                </div>
                <div className="g-metric text-lg font-bold text-foreground">${(s.tcv/1000).toFixed(0)}k</div>
                <div className="text-[10px] text-muted-foreground">{s.count} deals · ${(s.weighted/1000).toFixed(0)}k weighted</div>
                {s.deals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.deals.slice(0, 3).map(d => (
                      <span key={d.id} onClick={(e) => { e.stopPropagation(); setSelectedOppId(d.id); }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[100px]">
                        {d.customerName}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}

          {/* AI Funnel Read */}
          <div className="p-4 rounded-xl border border-[#7c3aed]/20 bg-[#7c3aed]/5">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
              <span className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-wider">AI Funnel Read</span>
            </div>
            {chatMutation.isPending ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Analyzing...
              </div>
            ) : aiRead ? (
              <p className="text-xs text-foreground leading-relaxed">{aiRead}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Loading analysis...</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-center justify-center gap-6 py-3 border-t border-border">
        {stageData.map(s => (
          <div key={s.stage} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.stage}</span>
            <span className="font-semibold text-foreground g-metric">{s.count}</span>
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
