'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { OpportunityProvider, useOpportunities } from '@/lib/store';
import {
  Sparkles, BookOpen, Globe2, Share2, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, Tag, MessageSquare,
  Brain, Lightbulb, TrendingUp,
} from 'lucide-react';

const TABS = [
  { id: 'lessons', label: 'Lessons Learnt', icon: BookOpen },
  { id: 'market', label: 'Market Insights', icon: Globe2 },
  { id: 'graph', label: 'Knowledge Graph', icon: Share2 },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ── Generate a two-line insight from conversation log text ── */
function extractInsight(conversationLog: string, status: string): string {
  const log = conversationLog.trim();
  // Take first meaningful chunk (first ~200 chars, break at sentence)
  const snippet = log.substring(0, 300);
  const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 15);
  if (sentences.length >= 2) {
    return sentences.slice(0, 2).map(s => s.trim()).join('. ') + '.';
  }
  if (sentences.length === 1) {
    return sentences[0].trim() + '.';
  }
  // Fallback based on status
  if (status === 'Won') return 'Deal closed successfully. Review conversation log for winning patterns.';
  if (status === 'Lost') return 'Deal did not convert. Analyze competitor positioning and pricing feedback.';
  return 'Active negotiation in progress. Monitor stakeholder sentiment closely.';
}

/* ── Derive tags from opportunity metadata ── */
function deriveTags(opp: { industry: string; serviceLine?: string; opportunityType?: string; customTags: string[] }): string[] {
  const tags: string[] = [];
  if (opp.industry) tags.push(opp.industry);
  if (opp.serviceLine) tags.push(opp.serviceLine);
  if (opp.opportunityType) tags.push(opp.opportunityType);
  if (opp.customTags?.length) tags.push(...opp.customTags.slice(0, 2));
  return tags.slice(0, 4);
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  Won: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Won' },
  Lost: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', label: 'Lost' },
  Negotiation: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Negotiation' },
};

function InsightsContent() {
  const { opportunities, isLoading } = useOpportunities();
  const [activeTab, setActiveTab] = useState<TabId>('lessons');

  /* ── Compute lesson cards: only deals with non-empty conversation logs ── */
  const { lessonCards, patternSummary } = useMemo(() => {
    const closedStatuses = ['Won', 'Lost', 'Negotiation'];
    const withLogs = opportunities
      .filter(o => closedStatuses.includes(o.status) && o.conversationLog && o.conversationLog.trim().length > 10)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const wonWithLogs = withLogs.filter(o => o.status === 'Won');
    const lostWithLogs = withLogs.filter(o => o.status === 'Lost');
    const totalClosed = wonWithLogs.length + lostWithLogs.length;
    const winRate = totalClosed > 0 ? Math.round((wonWithLogs.length / totalClosed) * 100) : 0;

    // AI pattern banner text
    const avgDealSize = wonWithLogs.length > 0
      ? Math.round(wonWithLogs.reduce((s, o) => s + (o.tcv || 0), 0) / wonWithLogs.length / 1000)
      : 0;

    // Identify most common industry among wins
    const indCount: Record<string, number> = {};
    wonWithLogs.forEach(o => { indCount[o.industry] = (indCount[o.industry] || 0) + 1; });
    const topIndustry = Object.entries(indCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const summary = totalClosed > 0
      ? `Across ${totalClosed} closed deals, your win rate is ${winRate}%. Average won deal size: $${avgDealSize}k. Strongest vertical: ${topIndustry}.`
      : 'Not enough closed deals with conversation data to generate patterns yet.';

    return {
      lessonCards: withLogs.slice(0, 12),
      patternSummary: summary,
    };
  }, [opportunities]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading insights...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">Lessons, patterns, and knowledge from your pipeline</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 w-fit">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#7c3aed]' : ''}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── LESSONS LEARNT TAB ─── */}
      {activeTab === 'lessons' && (
        <div className="space-y-5">
          {/* AI Pattern Banner */}
          <div className="p-4 rounded-xl g-surface g-elevated border border-purple-500/20 hover-glow">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">AI Pattern Analysis</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-medium">Auto-generated</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{patternSummary}</p>
              </div>
            </div>
          </div>

          {/* Lesson Cards */}
          {lessonCards.length === 0 ? (
            <div className="p-8 rounded-xl g-surface g-elevated text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No deals with conversation logs found.</p>
              <p className="text-xs text-muted-foreground mt-1">Add notes to your Won, Lost, or Negotiation deals to generate lessons.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonCards.map((opp, idx) => {
                const cfg = statusConfig[opp.status] || statusConfig.Negotiation;
                const StatusIcon = cfg.icon;
                const insight = extractInsight(opp.conversationLog, opp.status);
                const tags = deriveTags(opp);

                return (
                  <div
                    key={opp.id}
                    className="p-4 rounded-xl g-surface g-elevated hover-lift hover-glow reveal"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Status badge + customer */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ${(opp.tcv / 1000).toFixed(0)}k
                      </span>
                    </div>

                    {/* Customer + opp name */}
                    <div className="mb-2">
                      <div className="text-sm font-medium text-foreground">{opp.customerName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{opp.opportunityName}</div>
                    </div>

                    {/* Insight from conversation log */}
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-card/60 border border-border/50 mb-2.5">
                      <Lightbulb className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-foreground/75 leading-relaxed line-clamp-3">{insight}</p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          <Tag className="h-2 w-2" />
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action */}
                    <button className="flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 transition-colors">
                      Apply as nudge <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MARKET INSIGHTS TAB ─── */}
      {activeTab === 'market' && (
        <div className="p-12 rounded-xl g-surface g-elevated text-center">
          <div className="p-3 rounded-xl bg-blue-500/10 w-fit mx-auto mb-4">
            <Globe2 className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2">AI Market Research Agent</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Automated market research, competitor tracking, and industry trend analysis — coming soon.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
            <TrendingUp className="h-3 w-3" /> In development
          </div>
        </div>
      )}

      {/* ─── KNOWLEDGE GRAPH TAB ─── */}
      {activeTab === 'graph' && (
        <div className="p-12 rounded-xl g-surface g-elevated text-center">
          <div className="p-3 rounded-xl bg-purple-500/10 w-fit mx-auto mb-4">
            <Share2 className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Knowledge Graph</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Explore the relationship graph between accounts, stakeholders, deals, and service lines.
          </p>
          <Link
            href="/graph"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" /> Open Knowledge Graph
          </Link>
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <OpportunityProvider>
      <InsightsContent />
    </OpportunityProvider>
  );
}
