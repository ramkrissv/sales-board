'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { useState } from 'react';
import { DealDetail } from '@/components/modals/DealDetail';
import Link from 'next/link';
import { Eye, ChevronRight, Users, DollarSign, Clock, AlertTriangle } from 'lucide-react';

const STAGES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'];
const STAGE_COLORS = ['#3b82f6', '#f59e0b', '#5B4FE9', '#22c55e', '#10b981'];

function GraphContent() {
  const { opportunities } = useOpportunities();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'sankey' | 'list'>('graph');

  const stageData = STAGES.map((stage, i) => {
    const deals = opportunities.filter(o => o.status === stage);
    const tcv = deals.reduce((s, o) => s + (o.tcv || 0), 0);
    const nextStage = STAGES[i + 1];
    const nextCount = nextStage ? opportunities.filter(o => o.status === nextStage).length : 0;
    const convRate = deals.length > 0 && nextStage ? Math.round((nextCount / deals.length) * 100) : null;
    const avgDaysInStage = deals.length > 0 ? Math.round(deals.reduce((s, o) => {
      const days = Math.max(1, Math.ceil((Date.now() - new Date(o.updatedAt || o.createdAt).getTime()) / (1000*60*60*24)));
      return s + days;
    }, 0) / deals.length) : 0;
    const atRisk = deals.filter(o => !(o.customerStakeholders || []).some(s => s.isDecisionMaker) || o.tcv === 0).length;
    return { stage, deals, tcv, convRate, nextCount, avgDaysInStage, atRisk, color: STAGE_COLORS[i] };
  });

  const maxDeals = Math.max(...stageData.map(s => s.deals.length), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Deal Flow Graph</h1>
          <p className="text-sm text-muted-foreground">{opportunities.filter(o => !['Won','Lost'].includes(o.status)).length} active deals flowing through pipeline</p>
        </div>
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-secondary border border-border">
          {(['graph', 'sankey', 'list'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-3 py-1 text-[10px] font-medium rounded-md capitalize transition-all ${viewMode === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Graph View — SVG-based stage flow */}
      {viewMode === 'graph' && (
        <div className="g-surface g-elevated p-6 overflow-x-auto">
          <svg width="100%" viewBox="0 0 900 400" className="min-w-[700px]">
            {/* Stage nodes */}
            {stageData.map((s, i) => {
              const x = 80 + i * 185;
              const y = 80;
              const nodeHeight = Math.max(60, (s.deals.length / maxDeals) * 200);
              const isSelected = selectedStage === s.stage;

              return (
                <g key={s.stage}>
                  {/* Connection to next stage */}
                  {i < STAGES.length - 1 && (
                    <>
                      <path
                        d={`M ${x + 70} ${y + nodeHeight/2} C ${x + 120} ${y + nodeHeight/2}, ${x + 120} ${80 + Math.max(60, (stageData[i+1].deals.length / maxDeals) * 200)/2}, ${x + 185} ${80 + Math.max(60, (stageData[i+1].deals.length / maxDeals) * 200)/2}`}
                        fill="none" stroke={s.color} strokeWidth={Math.max(2, s.convRate ? s.convRate / 15 : 2)} strokeOpacity={0.3}
                      />
                      {s.convRate !== null && (
                        <text x={x + 127} y={y - 5} textAnchor="middle" fill="var(--g-fg-3)" fontSize="10" fontWeight="600">
                          {s.convRate}%
                        </text>
                      )}
                    </>
                  )}

                  {/* Stage node */}
                  <g className="cursor-pointer" onClick={() => setSelectedStage(isSelected ? null : s.stage)}>
                    <rect x={x - 10} y={y} width={80} height={nodeHeight} rx={12}
                      fill={`${s.color}${isSelected ? '30' : '15'}`}
                      stroke={s.color} strokeWidth={isSelected ? 2 : 1} strokeOpacity={isSelected ? 0.8 : 0.4}
                    />
                    {/* Count */}
                    <text x={x + 30} y={y + 25} textAnchor="middle" fill={s.color} fontSize="20" fontWeight="700" fontFamily="var(--font-display)">
                      {s.deals.length}
                    </text>
                    {/* Stage name */}
                    <text x={x + 30} y={y + nodeHeight + 18} textAnchor="middle" fill="var(--g-fg-3)" fontSize="11" fontWeight="500">
                      {s.stage}
                    </text>
                    {/* TCV */}
                    <text x={x + 30} y={y + nodeHeight + 32} textAnchor="middle" fill="var(--g-fg-3)" fontSize="9">
                      ${(s.tcv/1000).toFixed(0)}k
                    </text>
                    {/* At risk indicator */}
                    {s.atRisk > 0 && (
                      <g>
                        <circle cx={x + 62} cy={y + 8} r={8} fill="#ef444430" />
                        <text x={x + 62} y={y + 12} textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="700">{s.atRisk}</text>
                      </g>
                    )}
                    {/* Avg days */}
                    <text x={x + 30} y={y + nodeHeight - 8} textAnchor="middle" fill="var(--g-fg-3)" fontSize="8">
                      ~{s.avgDaysInStage}d avg
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Lost / On Hold side nodes */}
            {['Lost', 'On Hold'].map((status, i) => {
              const deals = opportunities.filter(o => o.status === status);
              if (deals.length === 0) return null;
              const y = 320 + i * 50;
              return (
                <g key={status} className="cursor-pointer" onClick={() => setSelectedStage(selectedStage === status ? null : status)}>
                  <rect x={700} y={y} width={120} height={35} rx={8}
                    fill={status === 'Lost' ? '#ef444415' : '#f9731615'}
                    stroke={status === 'Lost' ? '#ef4444' : '#f97316'} strokeWidth={1} strokeOpacity={0.3} />
                  <text x={760} y={y + 22} textAnchor="middle" fill={status === 'Lost' ? '#ef4444' : '#f97316'} fontSize="11" fontWeight="600">
                    {status}: {deals.length}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Sankey-style view */}
      {viewMode === 'sankey' && (
        <div className="g-surface g-elevated p-6">
          <div className="flex items-end gap-1" style={{ height: '250px' }}>
            {stageData.map((s, i) => {
              const heightPct = Math.max(10, (s.deals.length / maxDeals) * 100);
              return (
                <div key={s.stage} className="flex-1 flex flex-col items-center justify-end gap-1 cursor-pointer group"
                  onClick={() => setSelectedStage(selectedStage === s.stage ? null : s.stage)}>
                  <span className="text-xs font-bold text-foreground g-metric">{s.deals.length}</span>
                  <div className="w-full rounded-t-lg transition-all group-hover:opacity-80 reveal"
                    style={{ height: `${heightPct}%`, backgroundColor: s.color, animationDelay: `${i * 0.1}s` }}>
                    {s.atRisk > 0 && (
                      <div className="flex items-center justify-center mt-2">
                        <span className="text-[9px] bg-red-500/80 text-white px-1.5 py-0.5 rounded-full">{s.atRisk} risk</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">{s.stage}</span>
                  <span className="text-[10px] text-muted-foreground">${(s.tcv/1000).toFixed(0)}k</span>
                  {s.convRate !== null && (
                    <span className="text-[9px] text-muted-foreground">{'\u2192'}{s.convRate}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {stageData.map(s => (
            <div key={s.stage} className="g-surface g-elevated p-4 hover-lift cursor-pointer" onClick={() => setSelectedStage(selectedStage === s.stage ? null : s.stage)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-semibold text-foreground">{s.stage}</span>
                  <span className="g-chip bg-secondary text-muted-foreground">{s.deals.length} deals</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="g-metric">${(s.tcv/1000).toFixed(0)}k</span>
                  <span>~{s.avgDaysInStage}d avg</span>
                  {s.atRisk > 0 && <span className="text-red-400">{s.atRisk} at risk</span>}
                  {s.convRate !== null && <span>{'\u2192'}{s.convRate}% conv</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected stage drill-down */}
      {selectedStage && (
        <div className="g-surface g-elevated p-4 space-y-3 animate-flow-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STAGE_COLORS[STAGES.indexOf(selectedStage)] || '#71717a' }} />
              <span className="text-sm font-semibold text-foreground">{selectedStage}</span>
              <span className="text-xs text-muted-foreground">{opportunities.filter(o => o.status === selectedStage).length} deals</span>
            </div>
            <div className="flex gap-2">
              <Link href={`/pipeline/${encodeURIComponent(selectedStage)}`} className="text-xs text-[#5B4FE9] hover:underline">
                Open Stage View {'\u2192'}
              </Link>
              <button onClick={() => setSelectedStage(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
          </div>
          <div className="space-y-1.5">
            {opportunities.filter(o => o.status === selectedStage).map(opp => (
              <button key={opp.id} onClick={() => setSelectedOppId(opp.id)}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-card border border-border hover:border-[#5B4FE9]/20 text-left transition-all text-xs">
                <span className="font-medium text-foreground flex-1">{opp.customerName}</span>
                <span className="text-muted-foreground truncate max-w-[200px]">{opp.opportunityName}</span>
                <span className="g-metric text-foreground">{opp.tcv > 0 ? `$${(opp.tcv/1000).toFixed(0)}k` : '$0'}</span>
                <span className="text-muted-foreground">{opp.primaryOwner}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedOppId && <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />}
    </div>
  );
}

export default function GraphPage() {
  return (
    <OpportunityProvider>
      <GraphContent />
    </OpportunityProvider>
  );
}
