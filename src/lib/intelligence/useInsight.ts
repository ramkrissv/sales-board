'use client';

import { useEffect } from 'react';
import { useInsightStore } from './InsightStore';
import type { PipelineInsights, DealInsight, ForecastInsight } from './InsightStore';

/**
 * Hook for pipeline-level insights (nudges, stage flags, summary).
 * Pass opportunities array to generate client-side insights.
 * Auto-refreshes on first call if stale.
 */
export function usePipelineInsight(opportunities: any[]): {
  insights: PipelineInsights | null;
  isLoading: boolean;
  refresh: () => void;
} {
  const store = useInsightStore();

  useEffect(() => {
    if (opportunities.length > 0) {
      store.refreshPipeline(opportunities);
    }
  }, [opportunities.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    insights: store.pipelineInsights,
    isLoading: !!store.isRunning['pipeline'],
    refresh: () => {
      store.invalidate('pipeline');
      store.refreshPipeline(opportunities);
    },
  };
}

/**
 * Hook for deal-level insights (health score, risks, actions).
 * Auto-fetches from AI on first call if stale.
 */
export function useDealInsight(oppId: string | null, opts?: { autoFetch?: boolean }): {
  insight: DealInsight | null;
  isLoading: boolean;
  refresh: () => void;
} {
  const store = useInsightStore();
  const autoFetch = opts?.autoFetch ?? true;

  useEffect(() => {
    if (oppId && autoFetch) {
      store.refreshDeal(oppId);
    }
  }, [oppId, autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    insight: oppId ? store.getDealInsight(oppId) : null,
    isLoading: oppId ? !!store.isRunning[`deal:${oppId}`] : false,
    refresh: () => {
      if (oppId) {
        store.invalidate(`deal:${oppId}`);
        store.refreshDeal(oppId);
      }
    },
  };
}

/**
 * Hook for forecast insights.
 * Auto-fetches from forecast agent on first call if stale.
 */
export function useForecastInsight(opts?: { autoFetch?: boolean }): {
  insights: ForecastInsight | null;
  isLoading: boolean;
  refresh: () => void;
} {
  const store = useInsightStore();
  const autoFetch = opts?.autoFetch ?? true;

  useEffect(() => {
    if (autoFetch) {
      store.refreshForecast();
    }
  }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    insights: store.forecastInsights,
    isLoading: !!store.isRunning['forecast'],
    refresh: () => {
      store.invalidate('forecast');
      store.refreshForecast();
    },
  };
}
