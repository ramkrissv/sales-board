'use client';

import { OpportunityProvider, useOpportunities } from '@/lib/store';
import { trpc } from '@/lib/trpc/client';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import {
  Sparkles, TrendingUp, AlertTriangle, Target, ChevronRight,
  Zap, ArrowRight, Clock, DollarSign, Users, CheckSquare,
  Brain, Shield, Rocket, Eye, FileText, Plus, MessageCircle, Globe,
  Sun, Calendar, BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DealDetail } from '@/components/modals/DealDetail';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { ScopeSwitch } from '@/components/shared/ScopeSwitch';
import PilotNudges from '@/components/ai/PilotNudges';
import { usePipelineInsight } from '@/lib/intelligence/useInsight';

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type StoryCategory = 'READY TO CLOSE' | 'NEEDS ATTENTION' | 'AT RISK' | 'MOMENTUM' | 'NEW SIGNAL' | 'THE SWING';

interface DealStory {
  category: StoryCategory;
  deal: any;
  context: string;
  action: string;
  actionHref?: string;
  color: string;
  dotColor: string;
}

function HomeContent() {
  const { filteredOpportunities: opportunities, isLoading, filters, setFilters } = useOpportunities();
  const { data: session } = useSession();
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [homeView, setHomeView] = useState<'myday' | 'dashboard'>('myday');
  const { data: activities = [] } = trpc.activity.list.useQuery();

  // Pilot Intelligence — cached insights
  const { insights: pilotInsights, isLoading: pilotLoading, refresh: refreshPilot } = usePipelineInsight(opportunities);

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

  // Build deal stories for My Day view
  const dealStories: DealStory[] = (() => {
    const stories: DealStory[] = [];

    // READY TO CLOSE stories — deals in Negotiation
    negotiationDeals.forEach(deal => {
      const stakeholders = deal.customerStakeholders || [];
      const dmName = stakeholders.find(s => s.isDecisionMaker)?.name;
      const tasks = deal.subTasks || [];
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const daysToClose = Math.ceil((new Date(deal.expectedCloseDate).getTime() - Date.now()) / (1000*60*60*24));

      let context = `${deal.opportunityName} is in negotiation stage`;
      if (deal.tcv > 0) context += ` with a TCV of $${(deal.tcv/1000).toFixed(0)}k`;
      context += '.';
      if (dmName) context += ` ${dmName} is the decision-maker.`;
      if (daysToClose > 0) context += ` Expected close in ${daysToClose} days.`;
      if (pendingTasks > 0) context += ` ${pendingTasks} task${pendingTasks > 1 ? 's' : ''} still pending.`;

      stories.push({
        category: 'READY TO CLOSE',
        deal,
        context,
        action: 'Chase the sign-off',
        color: 'text-emerald-400',
        dotColor: 'bg-emerald-500',
      });
    });

    // NEEDS ATTENTION stories — deals with $0 TCV
    activeDeals.filter(o => o.tcv === 0 && o.status !== 'Negotiation').forEach(deal => {
      const stakeholders = deal.customerStakeholders || [];
      const stakeholderCount = stakeholders.length;
      const daysInPipeline = Math.ceil((Date.now() - new Date(deal.createdAt || deal.expectedCloseDate).getTime()) / (1000*60*60*24));

      let context = `${deal.opportunityName} has no value set yet.`;
      if (stakeholderCount > 0) context += ` ${stakeholderCount} stakeholder${stakeholderCount > 1 ? 's' : ''} mapped.`;
      else context += ` No stakeholders mapped yet.`;
      context += ` Currently in ${deal.status}.`;

      stories.push({
        category: 'NEEDS ATTENTION',
        deal,
        context,
        action: 'Set the value',
        color: 'text-amber-400',
        dotColor: 'bg-amber-500',
      });
    });

    // AT RISK stories — no DM mapped
    activeDeals.filter(o => {
      const stakeholders = o.customerStakeholders || [];
      return !stakeholders.some(s => s.isDecisionMaker) && o.tcv > 0 && o.status !== 'Negotiation';
    }).forEach(deal => {
      const stakeholders = deal.customerStakeholders || [];
      const daysToClose = Math.ceil((new Date(deal.expectedCloseDate).getTime() - Date.now()) / (1000*60*60*24));

      let context = `${deal.opportunityName} worth $${(deal.tcv/1000).toFixed(0)}k has no decision-maker identified.`;
      if (stakeholders.length > 0) context += ` ${stakeholders.length} contacts mapped but none flagged as DM.`;
      else context += ` No stakeholders mapped at all.`;
      if (daysToClose <= 30) context += ` Closing in ${daysToClose} days — this is urgent.`;

      stories.push({
        category: 'AT RISK',
        deal,
        context,
        action: 'Map the decision-maker',
        color: 'text-red-400',
        dotColor: 'bg-red-500',
      });
    });

    // MOMENTUM stories — high-value deals in active stages with stakeholders
    activeDeals.filter(o => {
      const stakeholders = o.customerStakeholders || [];
      return o.tcv >= 100000 && stakeholders.some(s => s.isDecisionMaker) && o.status !== 'Negotiation';
    }).forEach(deal => {
      const stakeholders = deal.customerStakeholders || [];
      const dmName = stakeholders.find(s => s.isDecisionMaker)?.name;
      const tasks = deal.subTasks || [];
      const completedTasks = tasks.filter(t => t.status === 'complete').length;

      let context = `${deal.opportunityName} is a $${(deal.tcv/1000).toFixed(0)}k opportunity in ${deal.status}.`;
      if (dmName) context += ` ${dmName} is engaged as decision-maker.`;
      if (tasks.length > 0) context += ` ${completedTasks}/${tasks.length} tasks completed.`;

      stories.push({
        category: 'MOMENTUM',
        deal,
        context,
        action: 'Review progress',
        color: 'text-blue-400',
        dotColor: 'bg-blue-500',
      });
    });

    // THE SWING stories — closing soon deals (not already in negotiation)
    closingSoonDeals.filter(o => o.status !== 'Negotiation').forEach(deal => {
      const daysToClose = Math.ceil((new Date(deal.expectedCloseDate).getTime() - Date.now()) / (1000*60*60*24));

      let context = `${deal.opportunityName} has an expected close date in ${daysToClose} day${daysToClose !== 1 ? 's' : ''}.`;
      context += ` Currently in ${deal.status}`;
      if (deal.tcv > 0) context += ` with $${(deal.tcv/1000).toFixed(0)}k at stake`;
      context += '.';
      if (deal.status === 'Discovery' || deal.status === 'Qualification') context += ` Needs to move faster to hit the close date.`;

      stories.push({
        category: 'THE SWING',
        deal,
        context,
        action: 'Accelerate this deal',
        color: 'text-purple-400',
        dotColor: 'bg-purple-500',
      });
    });

    // Deduplicate by deal id — keep the first (highest priority) story per deal
    const seen = new Set<string>();
    const deduped: DealStory[] = [];
    for (const story of stories) {
      if (!seen.has(story.deal.id)) {
        seen.add(story.deal.id);
        deduped.push(story);
      }
    }

    return deduped.slice(0, 6);
  })();

  const userName = session?.user?.name || 'there';
  const todayFormatted = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Top Bar: View Tabs + Scope Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-card/60 border border-border/50">
          <button
            onClick={() => setHomeView('myday')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              homeView === 'myday'
                ? 'bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/25'
                : 'text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            My Day
          </button>
          <button
            onClick={() => setHomeView('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              homeView === 'dashboard'
                ? 'bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/25'
                : 'text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Dashboard
          </button>
        </div>
        <ScopeSwitch
          value={filters.scope || 'org'}
          onChange={(scope) => setFilters(prev => ({ ...prev, scope, scopeOwner: session?.user?.name || '' }))}
        />
      </div>

      {/* ===================== TAB 1: MY DAY ===================== */}
      {homeView === 'myday' && (
        <div className="space-y-8 animate-flow-in">
          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {getGreeting()}, {userName.split(' ')[0]}.
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {todayFormatted} — Here&apos;s what needs your attention today.
            </p>
          </div>

          {/* Scope indicator */}
          {filters.scope === 'org' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--g-amber-soft)] border border-[var(--g-amber)]/20 text-xs text-[var(--g-amber)]">
              Showing <strong>all org</strong> data. Switch to <button onClick={() => setFilters(prev => ({ ...prev, scope: 'my', scopeOwner: session?.user?.name || '' }))} className="underline font-semibold hover:text-foreground">"My"</button> scope (top right) to see only your deals.
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl g-surface g-elevated">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{filters.scope === 'my' ? 'My Pipeline' : 'Pipeline (Org)'}</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-[#7c3aed] g-kpi">${(totalPipeline/1e6).toFixed(1)}M</span>
                <span className="text-xs text-muted-foreground">{activeDeals.length} deals</span>
              </div>
            </div>
            <div className="p-4 rounded-xl g-surface g-elevated">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Revenue</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-emerald-500 g-kpi">${(monthlyRevenue/1000).toFixed(0)}k</span>
                <span className="text-xs text-muted-foreground">from won deals</span>
              </div>
            </div>
            <div className="p-4 rounded-xl g-surface g-elevated">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Waiting on You</div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-bold g-kpi ${overdueTasks.length > 0 ? 'text-red-400' : 'text-foreground'}`}>{overdueTasks.length}</span>
                <span className="text-xs text-muted-foreground">overdue tasks</span>
              </div>
            </div>
            <div className="p-4 rounded-xl g-surface g-elevated">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Closing This Month</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-amber-500 g-kpi">{closingSoonDeals.length}</span>
                <span className="text-xs text-muted-foreground">within 30 days</span>
              </div>
            </div>
          </div>

          {/* Pilot Nudges — AI-detected insights */}
          {pilotInsights && pilotInsights.nudges.length > 0 && (
            <PilotNudges
              nudges={pilotInsights.nudges}
              isLoading={pilotLoading}
              onNudgeClick={(nudge) => {
                if (nudge.dealIds?.[0]) setSelectedOppId(nudge.dealIds[0]);
              }}
              onRefresh={refreshPilot}
            />
          )}

          {/* AI Daily Brief — Timeline of deal stories */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-lg bg-[#7c3aed]/15 flex items-center justify-center">
                <Brain className="h-3.5 w-3.5 text-[#7c3aed]" />
              </div>
              <span className="text-sm font-semibold text-foreground">Daily Brief</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-live ml-1" />
            </div>

            {dealStories.length > 0 ? (
              <div className="relative ml-3">
                {/* Timeline line */}
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/60" />

                <div className="space-y-6">
                  {dealStories.map((story, i) => (
                    <div key={story.deal.id} className="relative pl-8 reveal" style={{ animationDelay: `${i * 0.1}s` }}>
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ${story.dotColor} ring-2 ring-background`} />

                      {/* Category label */}
                      <div className={`text-[10px] font-bold uppercase tracking-widest ${story.color} mb-1`}>
                        {story.category}
                      </div>

                      {/* Deal name */}
                      <button
                        onClick={() => setSelectedOppId(story.deal.id)}
                        className="text-sm font-semibold text-foreground hover:text-[#7c3aed] transition-colors text-left"
                      >
                        {story.deal.customerName}
                      </button>

                      {/* Context */}
                      <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                        {story.context}
                      </p>

                      {/* Action link */}
                      <button
                        onClick={() => setSelectedOppId(story.deal.id)}
                        className={`inline-flex items-center gap-1.5 mt-2 text-xs font-medium ${story.color} hover:underline transition-all group`}
                      >
                        <span>{story.action}</span>
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {/* Show general pipeline summary when no specific stories */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                    <span className="text-sm font-semibold text-foreground">Pipeline Overview</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {opportunities.length} total opportunities across {[...new Set(opportunities.map(o => o.customerName))].length} accounts.
                    {wonDeals.length > 0 && ` ${wonDeals.length} won ($${(wonRevenue/1e6).toFixed(1)}M revenue).`}
                    {activeDeals.length > 0 && ` ${activeDeals.length} active ($${(totalPipeline/1e6).toFixed(1)}M pipeline).`}
                    {overdueTasks.length > 0 && ` ${overdueTasks.length} overdue tasks need attention.`}
                  </p>
                </div>
                {/* Quick actions */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Link href="/pipeline" className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-[#7c3aed]/30 transition-all text-sm text-foreground">
                    <Target className="h-4 w-4 text-[#7c3aed]" /> View Pipeline
                  </Link>
                  <Link href="/presales" className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-[#7c3aed]/30 transition-all text-sm text-foreground">
                    <FileText className="h-4 w-4 text-[#7c3aed]" /> Open Presales
                  </Link>
                  <Link href="/leads" className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-[#7c3aed]/30 transition-all text-sm text-foreground">
                    <Zap className="h-4 w-4 text-[#7c3aed]" /> Capture a Lead
                  </Link>
                </div>
                {/* Show scope hint */}
                {filters.scope === 'my' && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    Showing "My" view — switch to "Org" scope (top right) to see all deals.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

          {/* AI Assistant — floating card at the bottom */}
          <div className="relative overflow-hidden rounded-xl g-gradient-border g-noise" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.01), transparent)' }}>
            <div className="g-fractal-orb g-fractal-orb-teal" style={{ width: '150px', height: '150px', top: '-40px', right: '-30px' }} />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-[#7c3aed]" />
                </div>
                <span className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">AI Assistant</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-live ml-1" />
              </div>
              {pipelineMutation.isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-spin text-[#7c3aed]" />
                  Analyzing your pipeline...
                </div>
              ) : aiSummary ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Loading AI insights...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: DASHBOARD ===================== */}
      {homeView === 'dashboard' && (
        <div className="space-y-6 animate-flow-in">
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

          {/* Pipeline by Stage — opportunity cards in columns */}
          <div className="animate-flow-in animate-flow-in-delay-4">
            <div className="flex items-center justify-between mb-3">
              <span className="g-section-label flex items-center gap-1.5">
                <Eye className="h-3 w-3" /> Opportunities by Stage
              </span>
              <div className="text-xs text-muted-foreground g-metric">
                {opportunities.length} total · ${(opportunities.reduce((s, o) => s + (o.tcv || 0), 0) / 1e6).toFixed(1)}M
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {(['Qualification', 'Proposal', 'Negotiation', 'Won'] as const).map(stage => {
                const stageDeals = opportunities.filter(o => o.status === stage);
                const stageTcv = stageDeals.reduce((s, o) => s + (o.tcv || 0), 0);
                const stageColors: Record<string, string> = { Qualification: '#f59e0b', Proposal: '#7c3aed', Negotiation: '#22c55e', Won: '#10b981' };
                const color = stageColors[stage] || '#7c3aed';

                return (
                  <div key={stage} className="min-w-[220px] flex-1">
                    {/* Column header */}
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs font-semibold text-foreground">{stage}</span>
                        <span className="text-[10px] text-muted-foreground">({stageDeals.length})</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground g-metric">${(stageTcv / 1000).toFixed(0)}k</span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      {stageDeals.slice(0, 5).map(opp => {
                        const ageDays = Math.max(0, Math.ceil((Date.now() - new Date(opp.createdAt || opp.startDate).getTime()) / 86400000));
                        const daysToClose = Math.ceil((new Date(opp.expectedCloseDate).getTime() - Date.now()) / 86400000);

                        return (
                          <button key={opp.id} onClick={() => setSelectedOppId(opp.id)}
                            className="w-full p-3 rounded-xl bg-card border border-border hover:border-[#7c3aed]/30 text-left transition-all hover-lift group"
                            style={{ borderTopColor: color, borderTopWidth: '2px' }}>
                            <div className="text-xs font-semibold text-foreground group-hover:text-[#7c3aed] truncate">{opp.customerName}</div>
                            <div className="text-[10px] text-muted-foreground truncate mt-0.5">{opp.opportunityName}</div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs font-bold text-foreground g-metric">${((opp.tcv || 0) / 1000).toFixed(0)}k</span>
                              <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                <span>{ageDays}d age</span>
                                <span className={daysToClose < 14 ? 'text-[var(--g-amber)]' : daysToClose < 0 ? 'text-[var(--g-red)]' : ''}>
                                  {daysToClose > 0 ? `${daysToClose}d to close` : 'Overdue'}
                                </span>
                              </div>
                            </div>
                            <div className="text-[9px] text-muted-foreground mt-1">{opp.primaryOwner}</div>
                          </button>
                        );
                      })}
                      {stageDeals.length > 5 && (
                        <Link href="/pipeline" className="block text-center text-[10px] text-[#7c3aed] hover:underline py-1">
                          +{stageDeals.length - 5} more →
                        </Link>
                      )}
                      {stageDeals.length === 0 && (
                        <div className="text-[10px] text-muted-foreground text-center py-4 italic">No deals</div>
                      )}
                    </div>
                  </div>
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
        </div>
      )}

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
