'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';

// ── Types ──

export interface PipelineNudge {
  id: string;
  type: 'risk' | 'opportunity' | 'action' | 'info';
  title: string;
  detail: string;
  dealIds?: string[];
  color: string; // tailwind color class
  icon: 'alert' | 'rocket' | 'clock' | 'user' | 'dollar' | 'check';
}

export interface StageFlag {
  stage: string;
  flagCount: number;
  totalDeals: number;
  issues: string[];
}

export interface PipelineInsights {
  summary: string;
  nudges: PipelineNudge[];
  stageFlags: Record<string, StageFlag>;
  generatedAt: number;
}

export interface DealInsight {
  healthScore: number;
  winProbability: number;
  summary: string;
  risks: { type: string; message: string; severity: string }[];
  actions: { action: string; reason: string; priority: string }[];
  nextAction?: string;
  generatedAt: number;
}

export interface ForecastInsight {
  summary: string;
  commitConfidence: number;
  slipRisks: string[];
  accelerators: string[];
  categoryNotes: Record<string, string>;
  generatedAt: number;
}

interface InsightState {
  pipelineInsights: PipelineInsights | null;
  dealInsights: Record<string, DealInsight>;
  forecastInsights: ForecastInsight | null;
  isRunning: Record<string, boolean>;
  lastRefreshed: Record<string, number>;
}

interface InsightActions {
  refreshPipeline: (opportunities: any[]) => void;
  refreshDeal: (oppId: string) => void;
  refreshForecast: () => void;
  invalidate: (key: string) => void;
  invalidateAll: () => void;
  getDealInsight: (oppId: string) => DealInsight | null;
  isFresh: (key: string) => boolean;
}

type InsightContextType = InsightState & InsightActions;

// ── TTLs (milliseconds) ──
const TTL = {
  pipeline: 5 * 60 * 1000,   // 5 minutes
  deal: 3 * 60 * 1000,       // 3 minutes
  forecast: 10 * 60 * 1000,  // 10 minutes
};

// ── Context ──
const InsightContext = createContext<InsightContextType | undefined>(undefined);

// ── Nudge Generator (client-side, from opportunity data) ──
function generateNudges(opportunities: any[]): PipelineNudge[] {
  const nudges: PipelineNudge[] = [];
  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  // Stale deals (no recent activity, active stage)
  const activeDeals = opportunities.filter(o =>
    !['Closed Won', 'Closed Lost', 'Won', 'Lost'].includes(o.status)
  );

  // Deals missing decision maker
  const noDM = activeDeals.filter(o => {
    const stks = o.customerStakeholders || [];
    return stks.length === 0 || !stks.some((s: any) => s.isDecisionMaker);
  });
  if (noDM.length > 0) {
    const totalTcv = noDM.reduce((s: number, d: any) => s + (d.tcv || 0), 0);
    nudges.push({
      id: 'no-dm',
      type: 'risk',
      title: `${noDM.length} deal${noDM.length > 1 ? 's' : ''} missing decision maker`,
      detail: `$${(totalTcv / 1000).toFixed(0)}k pipeline without identified DM`,
      dealIds: noDM.map((d: any) => d.id),
      color: 'red',
      icon: 'user',
    });
  }

  // Zero TCV deals
  const zeroTcv = activeDeals.filter(o => !o.tcv || o.tcv === 0);
  if (zeroTcv.length > 0) {
    nudges.push({
      id: 'zero-tcv',
      type: 'risk',
      title: `${zeroTcv.length} deal${zeroTcv.length > 1 ? 's' : ''} with $0 TCV`,
      detail: 'Set deal values to improve forecast accuracy',
      dealIds: zeroTcv.map((d: any) => d.id),
      color: 'amber',
      icon: 'dollar',
    });
  }

  // Ready to close (Negotiation stage)
  const negotiation = activeDeals.filter(o => o.status === 'Negotiation');
  if (negotiation.length > 0) {
    const totalTcv = negotiation.reduce((s: number, d: any) => s + (d.tcv || 0), 0);
    const topDeal = negotiation.sort((a: any, b: any) => (b.tcv || 0) - (a.tcv || 0))[0];
    nudges.push({
      id: 'ready-close',
      type: 'opportunity',
      title: `${negotiation.length} deal${negotiation.length > 1 ? 's' : ''} ready to close`,
      detail: `$${(totalTcv / 1000).toFixed(0)}k in Negotiation — ${topDeal?.customerName || topDeal?.customer || 'Top deal'} is highest`,
      dealIds: negotiation.map((d: any) => d.id),
      color: 'emerald',
      icon: 'rocket',
    });
  }

  // Stale deals (in same stage > 14 days based on updatedAt)
  const stale = activeDeals.filter(o => {
    const updated = o.updatedAt ? new Date(o.updatedAt).getTime() : 0;
    return updated > 0 && (now - updated) > fourteenDays;
  });
  if (stale.length > 0) {
    const totalTcv = stale.reduce((s: number, d: any) => s + (d.tcv || 0), 0);
    nudges.push({
      id: 'stale',
      type: 'action',
      title: `${stale.length} deal${stale.length > 1 ? 's' : ''} stale >14 days`,
      detail: `$${(totalTcv / 1000).toFixed(0)}k at risk — needs follow-up`,
      dealIds: stale.map((d: any) => d.id),
      color: 'amber',
      icon: 'clock',
    });
  }

  // Overdue tasks
  const overdueTasks = activeDeals.filter(o => {
    const tasks = o.subTasks || [];
    return tasks.some((t: any) => t.status === 'pending' && new Date(t.dueDate) < new Date());
  });
  if (overdueTasks.length > 0) {
    nudges.push({
      id: 'overdue-tasks',
      type: 'action',
      title: `${overdueTasks.length} deal${overdueTasks.length > 1 ? 's' : ''} with overdue tasks`,
      detail: 'Tasks past due date need attention',
      dealIds: overdueTasks.map((d: any) => d.id),
      color: 'red',
      icon: 'alert',
    });
  }

  // Closing this month
  const thisMonth = new Date();
  const monthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);
  const closingSoon = activeDeals.filter(o => {
    const close = o.expectedCloseDate ? new Date(o.expectedCloseDate) : null;
    return close && close <= monthEnd && close >= new Date();
  });
  if (closingSoon.length > 0) {
    const totalTcv = closingSoon.reduce((s: number, d: any) => s + (d.tcv || 0), 0);
    nudges.push({
      id: 'closing-soon',
      type: 'info',
      title: `${closingSoon.length} deal${closingSoon.length > 1 ? 's' : ''} closing this month`,
      detail: `$${(totalTcv / 1000).toFixed(0)}k expected revenue`,
      dealIds: closingSoon.map((d: any) => d.id),
      color: 'blue',
      icon: 'check',
    });
  }

  return nudges.slice(0, 5); // Max 5 nudges
}

function generateStageFlags(opportunities: any[]): Record<string, StageFlag> {
  const flags: Record<string, StageFlag> = {};
  const stages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation'];

  for (const stage of stages) {
    const deals = opportunities.filter((o: any) => o.status === stage);
    const issues: string[] = [];
    let flagCount = 0;

    for (const d of deals) {
      const stks = d.customerStakeholders || [];
      const hasDM = stks.some((s: any) => s.isDecisionMaker);
      if (!hasDM && stks.length > 0) { issues.push(`${d.customerName || d.customer}: no DM`); flagCount++; }
      if (!d.tcv || d.tcv === 0) { issues.push(`${d.customerName || d.customer}: $0 TCV`); flagCount++; }
    }

    flags[stage] = { stage, flagCount, totalDeals: deals.length, issues: issues.slice(0, 3) };
  }

  return flags;
}

// ── Provider ──
export function InsightProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InsightState>({
    pipelineInsights: null,
    dealInsights: {},
    forecastInsights: null,
    isRunning: {},
    lastRefreshed: {},
  });

  const runningRef = useRef<Record<string, boolean>>({});

  const analyzeDealMutation = trpc.ai.analyzeDeal.useMutation();
  const chatMutation = trpc.ai.chat.useMutation();

  const isFresh = useCallback((key: string): boolean => {
    const last = state.lastRefreshed[key];
    if (!last) return false;
    const ttlKey = key.startsWith('deal:') ? 'deal' : key as keyof typeof TTL;
    const ttl = TTL[ttlKey] || TTL.pipeline;
    return Date.now() - last < ttl;
  }, [state.lastRefreshed]);

  const refreshPipeline = useCallback((opportunities: any[]) => {
    if (runningRef.current['pipeline']) return;
    if (isFresh('pipeline') && state.pipelineInsights) return;

    // Generate nudges client-side (instant, no API call)
    const nudges = generateNudges(opportunities);
    const stageFlags = generateStageFlags(opportunities);

    const activeDeals = opportunities.filter(o =>
      !['Closed Won', 'Closed Lost', 'Won', 'Lost'].includes(o.status)
    );
    const totalPipeline = activeDeals.reduce((s, d: any) => s + (d.tcv || 0), 0);
    const summary = `${activeDeals.length} active deals · $${(totalPipeline / 1000).toFixed(0)}k pipeline · ${nudges.filter(n => n.type === 'risk').length} risks detected`;

    setState(prev => ({
      ...prev,
      pipelineInsights: { summary, nudges, stageFlags, generatedAt: Date.now() },
      lastRefreshed: { ...prev.lastRefreshed, pipeline: Date.now() },
    }));
  }, [isFresh, state.pipelineInsights]);

  const refreshDeal = useCallback((oppId: string) => {
    const key = `deal:${oppId}`;
    if (runningRef.current[key]) return;
    if (isFresh(key) && state.dealInsights[oppId]) return;

    runningRef.current[key] = true;
    setState(prev => ({ ...prev, isRunning: { ...prev.isRunning, [key]: true } }));

    analyzeDealMutation.mutate(
      { opportunityId: oppId },
      {
        onSuccess: (data) => {
          const insight: DealInsight = {
            healthScore: data.healthScore,
            winProbability: data.winProbability,
            summary: data.summary,
            risks: data.risks,
            actions: data.actions,
            nextAction: data.actions?.[0]?.action,
            generatedAt: Date.now(),
          };
          setState(prev => ({
            ...prev,
            dealInsights: { ...prev.dealInsights, [oppId]: insight },
            isRunning: { ...prev.isRunning, [key]: false },
            lastRefreshed: { ...prev.lastRefreshed, [key]: Date.now() },
          }));
          runningRef.current[key] = false;
        },
        onError: () => {
          setState(prev => ({ ...prev, isRunning: { ...prev.isRunning, [key]: false } }));
          runningRef.current[key] = false;
        },
      }
    );
  }, [analyzeDealMutation, isFresh, state.dealInsights]);

  const refreshForecast = useCallback(() => {
    if (runningRef.current['forecast']) return;
    if (isFresh('forecast') && state.forecastInsights) return;

    runningRef.current['forecast'] = true;
    setState(prev => ({ ...prev, isRunning: { ...prev.isRunning, forecast: true } }));

    chatMutation.mutate(
      {
        message: 'Analyze the pipeline forecast. For each category (Commit, Best Case, Pipeline), give 1 sentence on confidence and name specific deals at risk of slipping. End with "COMMIT_CONFIDENCE: XX%" where XX is your confidence number.',
      },
      {
        onSuccess: (data) => {
          const text = data.response || '';
          const confMatch = text.match(/COMMIT_CONFIDENCE:\s*(\d+)/);
          const insight: ForecastInsight = {
            summary: text.replace(/COMMIT_CONFIDENCE:\s*\d+%?/g, '').trim(),
            commitConfidence: confMatch ? parseInt(confMatch[1]) : 70,
            slipRisks: [],
            accelerators: [],
            categoryNotes: {},
            generatedAt: Date.now(),
          };
          setState(prev => ({
            ...prev,
            forecastInsights: insight,
            isRunning: { ...prev.isRunning, forecast: false },
            lastRefreshed: { ...prev.lastRefreshed, forecast: Date.now() },
          }));
          runningRef.current['forecast'] = false;
        },
        onError: () => {
          setState(prev => ({ ...prev, isRunning: { ...prev.isRunning, forecast: false } }));
          runningRef.current['forecast'] = false;
        },
      }
    );
  }, [chatMutation, isFresh, state.forecastInsights]);

  const invalidate = useCallback((key: string) => {
    setState(prev => {
      const newRefreshed = { ...prev.lastRefreshed };
      delete newRefreshed[key];
      return { ...prev, lastRefreshed: newRefreshed };
    });
  }, []);

  const invalidateAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastRefreshed: {},
      pipelineInsights: null,
      forecastInsights: null,
    }));
  }, []);

  const getDealInsight = useCallback((oppId: string): DealInsight | null => {
    return state.dealInsights[oppId] || null;
  }, [state.dealInsights]);

  const value: InsightContextType = {
    ...state,
    refreshPipeline,
    refreshDeal,
    refreshForecast,
    invalidate,
    invalidateAll,
    getDealInsight,
    isFresh,
  };

  return <InsightContext.Provider value={value}>{children}</InsightContext.Provider>;
}

export function useInsightStore(): InsightContextType {
  const ctx = useContext(InsightContext);
  if (!ctx) throw new Error('useInsightStore must be used within InsightProvider');
  return ctx;
}
