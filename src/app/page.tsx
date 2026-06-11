'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles, TrendingUp, AlertTriangle, Target, ChevronRight,
  Zap, ArrowRight, Clock, DollarSign, Users, CheckSquare,
  Brain, Shield, Rocket, Eye, FileText, Plus, MessageCircle, Globe
} from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DealDetail } from '@/components/modals/DealDetail';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { ScopeSwitch } from '@/components/shared/ScopeSwitch';

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function HomeContent() {
  const { filteredOpportunities: opportunities, isLoading, filters, setFilters } = useOpportunities();
  const { data: session } = useSession();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const { data: activities = [] } = trpc.activity.list.useQuery();

  const pipelineMutation = trpc.ai.analyzePipeline.useMutation({
    onSuccess: (data) => setAiSummary(data.summary),
  });

  // Auto-trigger AI analysis on load
  useEffect(() => {
    if (!isLoading && opportunities.length > 0 && !aiSummary) {
      pipelineMutation.mutate();
    }
  }, [isLoading, opportunities.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 px-2 sm:px-0">
        <div className="h-10 w-64 bg-card rounded-lg animate-pulse" />
        <div className="h-24 bg-card rounded-xl animate-pulse ai-glow" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const activeDeals = opportunities.filter(o => !['Won', 'Lost'].includes(o.status));
  const totalPipeline = activeDeals.reduce((sum, o) => sum + (o.tcv || 0), 0);
  const wonDeals = opportunities.filter(o => o.status === 'Won');
  const lostDeals = opportunities.filter(o => o.status === 'Lost');
  const wonRevenue = wonDeals.reduce((sum, o) => sum + (o.tcv || 0), 0);
  const monthlyRevenue = wonRevenue / 12;
  const quarterlyRevenue = monthlyRevenue * 3;
  const winRate = wonDeals.length + lostDeals.length > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;
  const negotiationDeals = opportunities.filter(o => o.status === 'Negotiation');
  const allTasks = opportunities.flatMap(o => o.subTasks || []);
  const overdueTasks = allTasks.filter(t => t.status === 'pending' && new Date(t.dueDate) < new Date());

  // Account classification: EE (repeat engagement), EN (new service for existing), NN (new client)
  const accountDealCounts: Record<string, number> = {};
  opportunities.forEach(o => { accountDealCounts[o.customerName] = (accountDealCounts[o.customerName] || 0) + 1; });
  const eeAccounts = Object.entries(accountDealCounts).filter(([, c]) => c >= 3).length;
  const enAccounts = Object.entries(accountDealCounts).filter(([, c]) => c === 2).length;
  const nnAccounts = Object.entries(accountDealCounts).filter(([, c]) => c === 1).length;

  // AI-detected signals
  const atRiskDeals = activeDeals.filter(o => {
    const stakeholders = o.customerStakeholders || [];
    return !stakeholders.some(s => s.isDecisionMaker) || o.tcv === 0;
  });
  const highValueDeals = activeDeals.filter(o => o.tcv >= 100000).sort((a, b) => b.tcv - a.tcv);
  const closingSoonDeals = activeDeals.filter(o => {
    const days = Math.ceil((new Date(o.expectedCloseDate).getTime() - Date.now()) / (1000*60*60*24));
    return days >= 0 && days <= 30;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Scope Switcher */}
      <div className="flex items-center justify-end">
        <ScopeSwitch
          value={filters.scope || 'org'}
          onChange={(scope) => setFilters(prev => ({ ...prev, scope, scopeOwner: session?.user?.name || '' }))}
        />
      </div>

      {/* AI Insight Banner -- auto-generated, not on-demand */}
      <div className="relative overflow-hidden rounded-xl ai-glow animate-flow-in g-gradient-border g-noise" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.02), transparent)' }}>
        <div className="g-fractal-orb g-fractal-orb-teal" style={{ width: '200px', height: '200px', top: '-60px', right: '-40px' }} />
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <Brain className="w-full h-full text-[#7c3aed]" />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-[#7c3aed]" />
            </div>
            <span className="text-xs font-semibold text-[#7c3aed] uppercase tracking-wider">AI Intelligence Brief</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-live ml-1" />
          </div>
          {pipelineMutation.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-spin text-[#7c3aed]" />
              Analyzing your pipeline...
            </div>
          ) : aiSummary ? (
            <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Loading AI insights...</p>
          )}
        </div>
      </div>

      {/* Smart Action Cards -- AI-detected, one-click executable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-flow-in animate-flow-in-delay-1">
        {/* Ready to close */}
        {negotiationDeals.length > 0 && (
          <button onClick={() => setSelectedOppId(negotiationDeals[0].id)} className="group p-4 rounded-xl g-surface g-elevated text-left transition-all hover:!border-emerald-500/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center">
                <Rocket className="h-3 w-3 text-emerald-400" />
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Ready to Close</span>
            </div>
            <div className="text-sm font-medium text-foreground">{negotiationDeals.length} deal{negotiationDeals.length > 1 ? 's' : ''} in Negotiation</div>
            <div className="text-xs text-muted-foreground mt-0.5">{negotiationDeals.map(d => d.customerName).join(', ')}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-400 group-hover:gap-2 transition-all">
              <span>Review &amp; close</span><ArrowRight className="h-3 w-3" />
            </div>
          </button>
        )}

        {/* At risk */}
        {atRiskDeals.length > 0 && (
          <button onClick={() => setSelectedOppId(atRiskDeals[0].id)} className="group p-4 rounded-xl g-surface g-elevated text-left transition-all hover:!border-orange-500/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-md bg-orange-500/15 flex items-center justify-center">
                <Shield className="h-3 w-3 text-orange-400" />
              </div>
              <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">AI Risk Alert</span>
            </div>
            <div className="text-sm font-medium text-foreground">{atRiskDeals[0].customerName}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {atRiskDeals.slice(0, 2).map(d => {
                const reasons: string[] = [];
                if (!(d.customerStakeholders || []).some(s => s.isDecisionMaker)) reasons.push('no DM');
                if (d.tcv === 0) reasons.push('$0 TCV');
                return `${d.customerName}: ${reasons.join(', ')}`;
              }).join(' \u00b7 ')}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-orange-400 group-hover:gap-2 transition-all">
              <span>Fix now</span><ArrowRight className="h-3 w-3" />
            </div>
          </button>
        )}

        {/* Overdue tasks */}
        {overdueTasks.length > 0 && (
          <Link href="/tasks" className="group p-4 rounded-xl g-surface g-elevated text-left transition-all hover:!border-red-500/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-md bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="h-3 w-3 text-red-400" />
              </div>
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Overdue</span>
            </div>
            <div className="text-sm font-medium text-foreground">{overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{overdueTasks[0]?.name}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-red-400 group-hover:gap-2 transition-all">
              <span>View tasks</span><ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        )}
      </div>

      {/* Consolidated Metrics — single row with key numbers */}
      <div className="p-5 rounded-xl g-surface g-elevated g-gradient-border animate-flow-in animate-flow-in-delay-2">
        <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline</div>
            <div className="g-kpi text-foreground" style={{ fontSize: '22px', color: '#7c3aed' }}>${(totalPipeline/1e6).toFixed(1)}M</div>
            <div className="text-[10px] text-muted-foreground">{activeDeals.length} deals</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue/mo</div>
            <div className="g-kpi text-foreground" style={{ fontSize: '22px', color: '#10b981' }}>${(monthlyRevenue/1000).toFixed(0)}k</div>
            <div className="text-[10px] text-muted-foreground">~${(wonRevenue/1e6).toFixed(1)}M/yr</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Won</div>
            <div className="g-kpi text-foreground" style={{ fontSize: '22px' }}>{wonDeals.length}</div>
            <div className="text-[10px] text-muted-foreground">{winRate}% win rate</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Closing</div>
            <div className="g-kpi text-foreground" style={{ fontSize: '22px', color: '#f59e0b' }}>{closingSoonDeals.length}</div>
            <div className="text-[10px] text-muted-foreground">within 30 days</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">At Risk</div>
            <div className="g-kpi text-foreground" style={{ fontSize: '22px', color: '#ef4444' }}>{atRiskDeals.length}</div>
            <div className="text-[10px] text-muted-foreground">need attention</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Negotiation</div>
            <div className="g-kpi text-foreground" style={{ fontSize: '22px' }}>{negotiationDeals.length}</div>
            <div className="text-[10px] text-muted-foreground">${(negotiationDeals.reduce((s: number, o: any) => s + (o.tcv || 0), 0)/1000).toFixed(0)}k value</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Accounts</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--g-green)]/15 text-[var(--g-green)]">EE {eeAccounts}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#11A7A0]/15 text-[#11A7A0]">EN {enAccounts}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#7c3aed]/15 text-[#7c3aed]">NN {nnAccounts}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{eeAccounts + enAccounts + nnAccounts} total</div>
          </div>
        </div>
      </div>

      {/* Pipeline Funnel — proper funnel shape */}
      <div className="animate-flow-in animate-flow-in-delay-3 p-5 rounded-xl g-surface g-elevated">
        <div className="flex items-center justify-between mb-4">
          <span className="g-section-label flex items-center gap-1.5">
            <Eye className="h-3 w-3" /> Pipeline Funnel
          </span>
          <Link href="/pipeline" className="text-xs text-[#7c3aed] hover:underline flex items-center gap-1">
            Open Pipeline <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {(() => {
          const stageNames = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'] as const;
          const stageColors = ['#3b82f6', '#f59e0b', '#7c3aed', '#22c55e', '#10b981'];
          const stageData = stageNames.map((stage, i) => {
            const deals = opportunities.filter(o => o.status === stage);
            const tcv = deals.reduce((s, o) => s + (o.tcv || 0), 0);
            const nextStage = stageNames[i + 1];
            const nextCount = nextStage ? opportunities.filter(o => o.status === nextStage).length : 0;
            const convRate = deals.length > 0 && nextStage ? Math.round((nextCount / deals.length) * 100) : null;
            return { stage, count: deals.length, tcv, color: stageColors[i], convRate };
          });
          const maxCount = Math.max(...stageData.map(s => s.count), 1);

          return (
            <div className="space-y-1.5">
              {stageData.map((s, i) => {
                const widthPct = Math.max(25, (s.count / maxCount) * 100);
                return (
                  <div key={s.stage} className="flex items-center gap-3 reveal" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="w-24 text-right">
                      <div className="text-xs font-medium text-foreground">{s.stage}</div>
                      <div className="text-[10px] text-muted-foreground">${(s.tcv/1000).toFixed(0)}k</div>
                    </div>
                    <div className="flex-1 flex items-center">
                      <div className="relative h-10 rounded-lg transition-all duration-700 flex items-center justify-center"
                        style={{ width: `${widthPct}%`, backgroundColor: s.color + '20', borderLeft: `3px solid ${s.color}` }}>
                        <span className="text-xs font-bold text-foreground g-metric">{s.count}</span>
                      </div>
                      {s.convRate !== null && (
                        <span className="ml-2 text-[10px] text-muted-foreground whitespace-nowrap">→ {s.convRate}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
        <div className="g-gradient-line mt-4" />
      </div>

      {/* AI-Prioritized Deal Feed -- not just "recent", but AI-ranked */}
      <div className="animate-flow-in animate-flow-in-delay-4">
        <span className="g-section-label flex items-center gap-1.5 mb-3">
          <Sparkles className="h-3 w-3" /> AI-Prioritized Deals
        </span>
        <div className="space-y-2">
          {/* Sort by: negotiation first, then high-value, then at-risk, then rest */}
          {[...opportunities]
            .sort((a, b) => {
              const priority = (o: typeof a) => {
                if (o.status === 'Negotiation') return 0;
                if (o.tcv >= 100000) return 1;
                if (atRiskDeals.some(r => r.id === o.id)) return 2;
                return 3;
              };
              return priority(a) - priority(b);
            })
            .slice(0, 8)
            .map((opp, i) => {
              const isAtRisk = atRiskDeals.some(r => r.id === opp.id);
              const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
                'Discovery': { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-500' },
                'Qualification': { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
                'Proposal': { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500' },
                'Negotiation': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
                'Won': { bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-500' },
                'Lost': { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-500' },
                'On Hold': { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-500' },
              };
              const sc = statusColors[opp.status] || statusColors['Discovery'];
              const tasks = opp.subTasks || [];
              const completedTasks = tasks.filter(t => t.status === 'complete').length;

              return (
                <button
                  key={opp.id}
                  onClick={() => setSelectedOppId(opp.id)}
                  className="flex items-center gap-4 p-3 rounded-xl g-surface g-elevated w-full text-left transition-all group hover:!border-[#7c3aed]/20 reveal hover-lift"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Status dot */}
                  <div className="flex flex-col items-center gap-1 w-6 flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${sc.dot} ${opp.status === 'Negotiation' ? 'animate-pulse-live' : ''}`} />
                    {isAtRisk && <AlertTriangle className="h-3 w-3 text-orange-400" />}
                  </div>

                  {/* Deal info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground group-hover:text-[#7c3aed] transition-colors truncate">
                      {opp.customerName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{opp.opportunityName}</div>
                  </div>

                  {/* Visual metrics */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {opp.tcv > 0 && <span className="g-metric text-sm font-semibold text-foreground">${(opp.tcv/1000).toFixed(0)}k</span>}
                    <span className={`g-chip ${sc.bg} ${sc.text}`}>{opp.status}</span>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CheckSquare className="h-3 w-3" />
                      <span className="g-metric">{completedTasks}/{tasks.length}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span className="g-metric">{(opp.customerStakeholders || []).length}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-[#7c3aed] transition-colors" />
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="animate-flow-in animate-flow-in-delay-4">
        <span className="g-section-label flex items-center gap-1.5 mb-3">
          <Clock className="h-3 w-3" /> Activity Feed
        </span>
        <div className="space-y-1.5">
          {activities.slice(0, 6).map((activity: any, i: number) => {
            const icons: Record<string, { icon: any; color: string }> = {
              'deal_created': { icon: Plus, color: 'text-emerald-400' },
              'stage_change': { icon: ArrowRight, color: 'text-blue-400' },
              'task_completed': { icon: CheckSquare, color: 'text-green-400' },
              'ai_analysis': { icon: Sparkles, color: 'text-[#7c3aed]' },
              'lead_qualified': { icon: Target, color: 'text-amber-400' },
              'stakeholder_added': { icon: Users, color: 'text-cyan-400' },
              'sow_generated': { icon: FileText, color: 'text-emerald-400' },
            };
            const config = icons[activity.type] || { icon: Zap, color: 'text-muted-foreground' };
            const Icon = config.icon;
            const timeAgo = getRelativeTime(new Date(activity.createdAt));

            return (
              <div key={activity._id || i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-card/50 transition-colors">
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground">{activity.description}</span>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-flow-in animate-flow-in-delay-4">
        {[
          { label: 'Deal Room', href: '/deal-room', icon: MessageCircle, desc: 'AI-guided deal management' },
          { label: 'Ask Galent', href: '/ask', icon: Sparkles, desc: 'Natural language pipeline queries' },
          { label: 'Signal', href: '/intake', icon: Globe, desc: 'Capture from any channel' },
          { label: 'Presales', href: '/presales', icon: FileText, desc: 'RFP intake & proposal studio' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="p-3 rounded-xl g-surface g-elevated hover-lift hover-glow text-center transition-all">
            <item.icon className="h-5 w-5 mx-auto mb-1.5 text-[#7c3aed]" />
            <div className="text-xs font-semibold text-foreground">{item.label}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
          </Link>
        ))}
      </div>

      {/* Deal Detail Modal */}
      {selectedOppId && (
        <DealDetail opportunityId={selectedOppId} onClose={() => setSelectedOppId(null)} />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <OpportunityProvider>
      <FilterPanel />
      <HomeContent />
    </OpportunityProvider>
  );
}
