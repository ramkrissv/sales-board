'use client';

import { Brain, TrendingUp, AlertTriangle, Rocket, RefreshCw, Loader2 } from 'lucide-react';
import type { ForecastInsight } from '@/lib/intelligence/InsightStore';

interface ForecastInsightCardProps {
  insights: ForecastInsight | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

export default function ForecastInsightCard({ insights, isLoading, onRefresh }: ForecastInsightCardProps) {
  if (isLoading && !insights) {
    return (
      <div className="g-surface g-elevated p-5 rounded-xl ai-glow animate-pulse">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-[#7c3aed] animate-pulse" />
          <div>
            <div className="h-4 bg-card rounded w-48 mb-1" />
            <div className="h-3 bg-card rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  // Parse numbered items from summary
  const lines = insights.summary.split(/\n/).filter(l => l.trim().length > 5);

  return (
    <div className="g-surface g-elevated p-5 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center">
            <Brain className="h-4 w-4 text-[#7c3aed]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Pilot Forecast Brief</div>
            <div className="text-[10px] text-muted-foreground">
              Commit confidence: {insights.commitConfidence}%
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Confidence indicator */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-2 rounded-full bg-card overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  insights.commitConfidence >= 70 ? 'bg-emerald-500' :
                  insights.commitConfidence >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${insights.commitConfidence}%` }}
              />
            </div>
            <span className={`text-[10px] font-bold ${
              insights.commitConfidence >= 70 ? 'text-emerald-400' :
              insights.commitConfidence >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>{insights.commitConfidence}%</span>
          </div>
          {onRefresh && (
            <button onClick={onRefresh} className="p-1 rounded text-muted-foreground hover:text-foreground">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* AI analysis lines */}
      <div className="space-y-2">
        {lines.map((line, i) => {
          const trimmed = line.trim().replace(/^\d+[\.\)]\s*/, '').replace(/\*\*/g, '');
          if (trimmed.length < 5) return null;

          const isRisk = /risk|slip|concern|miss|delay|stall|down/i.test(trimmed);
          const isPositive = /close|strong|accelerat|upside|momentum|ready|confident/i.test(trimmed);

          return (
            <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${
              isRisk ? 'bg-amber-500/5 border-amber-500/20' :
              isPositive ? 'bg-emerald-500/5 border-emerald-500/20' :
              'bg-card border-border'
            }`}>
              {isRisk ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" /> :
               isPositive ? <Rocket className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" /> :
               <TrendingUp className="h-3.5 w-3.5 text-[#7c3aed] flex-shrink-0 mt-0.5" />}
              <span className="text-foreground leading-relaxed">{trimmed}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
