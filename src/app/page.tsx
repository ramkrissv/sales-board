'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { format } from 'date-fns';
import { useState } from 'react';
import {
  AlertTriangle, ArrowRight, TrendingUp, DollarSign,
  Target, Clock, Sparkles, Zap, ChevronRight,
  Users, CheckSquare, Kanban
} from 'lucide-react';
import Link from 'next/link';
import { DealDetail } from '@/components/modals/DealDetail';

function HomeContent() {
  const { opportunities, isLoading } = useOpportunities();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Sparkles className="h-5 w-5 animate-pulse text-purple-400" />
          <span>Loading your pipeline intelligence...</span>
        </div>
      </div>
    );
  }

  const activeDeals = opportunities.filter(o => !['Won', 'Lost'].includes(o.status));
  const totalPipeline = activeDeals.reduce((sum, o) => sum + (o.tcv || 0), 0);
  const wonDeals = opportunities.filter(o => o.status === 'Won');
  const lostDeals = opportunities.filter(o => o.status === 'Lost');
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;
  const negotiationDeals = opportunities.filter(o => o.status === 'Negotiation');
  const overdueTasks = opportunities.flatMap(o => o.subTasks || []).filter(t =>
    t.status === 'pending' && new Date(t.dueDate) < new Date()
  );
  const atRiskDeals = activeDeals.filter(o => {
    const stakeholders = o.customerStakeholders || [];
    const hasDecisionMaker = stakeholders.some(s => s.isDecisionMaker);
    return !hasDecisionMaker || o.tcv === 0;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Greeting */}
      <div className="animate-flow-in">
        <h1 className="text-2xl font-semibold text-foreground">
          Good morning. <span className="text-purple-400">Here&apos;s your pipeline.</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeDeals.length} active deals &middot; {atRiskDeals.length > 0 ? `${atRiskDeals.length} need attention` : 'All on track'} &middot; {negotiationDeals.length} ready to close
        </p>
      </div>

      {/* Critical Actions — flowing cards */}
      {(atRiskDeals.length > 0 || negotiationDeals.length > 0 || overdueTasks.length > 0) && (
        <div className="space-y-3 animate-flow-in animate-flow-in-delay-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Zap className="h-3 w-3 text-purple-400" />
            Critical Actions
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {negotiationDeals.length > 0 && (
              <Link href="/pipeline" className="group p-4 rounded-xl bg-card border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">Ready to Close</div>
                <div className="text-sm text-foreground font-medium">{negotiationDeals.length} deals in Negotiation</div>
                <div className="text-xs text-muted-foreground mt-1">{negotiationDeals.map(d => d.customerName).join(', ')}</div>
                <div className="flex items-center gap-1 mt-3 text-xs text-emerald-400 group-hover:gap-2 transition-all">
                  <span>Review deals</span><ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            )}
            {atRiskDeals.length > 0 && (
              <Link href="/pipeline" className="group p-4 rounded-xl bg-card border border-orange-500/20 hover:border-orange-500/40 transition-all">
                <div className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider mb-2">Needs Attention</div>
                <div className="text-sm text-foreground font-medium">{atRiskDeals.length} deals at risk</div>
                <div className="text-xs text-muted-foreground mt-1">Missing decision makers or TCV not set</div>
                <div className="flex items-center gap-1 mt-3 text-xs text-orange-400 group-hover:gap-2 transition-all">
                  <span>Fix now</span><ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            )}
            {overdueTasks.length > 0 && (
              <Link href="/tasks" className="group p-4 rounded-xl bg-card border border-red-500/20 hover:border-red-500/40 transition-all">
                <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Overdue</div>
                <div className="text-sm text-foreground font-medium">{overdueTasks.length} overdue tasks</div>
                <div className="text-xs text-muted-foreground mt-1">Across {new Set(overdueTasks.map(t => t.owner)).size} owners</div>
                <div className="flex items-center gap-1 mt-3 text-xs text-red-400 group-hover:gap-2 transition-all">
                  <span>View tasks</span><ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* KPIs — clean flowing row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-flow-in animate-flow-in-delay-2">
        {[
          { label: 'Pipeline Value', value: `$${(totalPipeline / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-purple-400' },
          { label: 'Win Rate', value: `${winRate}%`, icon: Target, color: 'text-emerald-400' },
          { label: 'Active Deals', value: `${activeDeals.length}`, icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Closing This Month', value: `${negotiationDeals.length}`, icon: Clock, color: 'text-amber-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="p-4 rounded-xl g-surface g-elevated">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
              <span className="g-section-label">{kpi.label}</span>
            </div>
            <div className="g-kpi text-foreground">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline flow — mini kanban preview */}
      <div className="animate-flow-in animate-flow-in-delay-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Kanban className="h-3 w-3 text-purple-400" />
            Pipeline Flow
          </div>
          <Link href="/pipeline" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
            Open Pipeline <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'].map((stage) => {
            const stageDeals = opportunities.filter(o => o.status === stage);
            const stageTcv = stageDeals.reduce((sum, o) => sum + (o.tcv || 0), 0);
            const colors: Record<string, string> = {
              'Discovery': 'border-blue-500/30 text-blue-400',
              'Qualification': 'border-amber-500/30 text-amber-400',
              'Proposal': 'border-purple-500/30 text-purple-400',
              'Negotiation': 'border-emerald-500/30 text-emerald-400',
              'Won': 'border-green-500/30 text-green-400',
            };
            return (
              <div key={stage} className={`flex-1 min-w-[140px] p-3 rounded-xl bg-card border ${colors[stage]?.split(' ')[0] || 'border-border'}`}>
                <div className={`text-[10px] font-semibold uppercase tracking-wider ${colors[stage]?.split(' ')[1] || 'text-muted-foreground'}`}>
                  {stage}
                </div>
                <div className="text-lg font-semibold text-foreground mt-1">{stageDeals.length}</div>
                <div className="text-[11px] text-muted-foreground">${(stageTcv / 1000).toFixed(0)}k</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent deals — flowing list */}
      <div className="animate-flow-in animate-flow-in-delay-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          <Clock className="h-3 w-3 text-purple-400" />
          Recent Opportunities
        </div>
        <div className="space-y-2">
          {opportunities.slice(0, 8).map((opp) => {
            const statusColors: Record<string, string> = {
              'Discovery': 'bg-blue-500/20 text-blue-400',
              'Qualification': 'bg-amber-500/20 text-amber-400',
              'Proposal': 'bg-purple-500/20 text-purple-400',
              'Negotiation': 'bg-emerald-500/20 text-emerald-400',
              'Won': 'bg-green-500/20 text-green-400',
              'Lost': 'bg-slate-500/20 text-muted-foreground',
              'On Hold': 'bg-orange-500/20 text-orange-400',
            };
            return (
              <button
                key={opp.id}
                onClick={() => setSelectedOppId(opp.id)}
                className="flex items-center gap-4 p-3 rounded-xl g-surface g-elevated hover:border-purple-500/30 transition-all group w-full text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground group-hover:text-purple-300 transition-colors truncate">
                    {opp.customerName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{opp.opportunityName}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {opp.tcv > 0 && (
                    <span className="text-sm font-medium text-foreground">${(opp.tcv / 1000).toFixed(0)}k</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[opp.status] || 'bg-slate-500/20 text-muted-foreground'}`}>
                    {opp.status}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {(opp.customerStakeholders || []).length}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CheckSquare className="h-3 w-3" />
                    {(opp.subTasks || []).filter(t => t.status === 'complete').length}/{(opp.subTasks || []).length}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
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
      <HomeContent />
    </OpportunityProvider>
  );
}
