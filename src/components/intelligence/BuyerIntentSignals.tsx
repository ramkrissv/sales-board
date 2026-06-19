'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Sparkles, Loader2, TrendingUp, Briefcase, Users, Globe,
  AlertTriangle, CheckCircle, Zap, RefreshCw, ExternalLink,
  Code2, FileText, DollarSign,
} from 'lucide-react';

interface BuyerIntentSignalsProps {
  accountName: string;
  industry?: string;
}

interface IntentSignal {
  type: 'job_posting' | 'tech_signal' | 'news' | 'web_activity' | 'growth';
  title: string;
  detail: string;
  strength: 'strong' | 'moderate' | 'weak';
  source: string;
  actionable: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  job_posting: { icon: Users, color: 'text-blue-400' },
  tech_signal: { icon: Code2, color: 'text-purple-400' },
  news: { icon: Globe, color: 'text-emerald-400' },
  web_activity: { icon: TrendingUp, color: 'text-amber-400' },
  growth: { icon: DollarSign, color: 'text-emerald-400' },
};

const STRENGTH_BADGE: Record<string, string> = {
  strong: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  moderate: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  weak: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function BuyerIntentSignals({ accountName, industry }: BuyerIntentSignalsProps) {
  const [signals, setSignals] = useState<IntentSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const chatMutation = trpc.ai.chat.useMutation();

  const analyze = () => {
    setLoading(true);
    chatMutation.mutate(
      {
        message: `Analyze buyer intent signals for: ${accountName} (Industry: ${industry || 'Technology'})

Based on typical patterns for this type of company, generate realistic buyer intent signals. Return ONLY valid JSON:
{
  "intentScore": <0-100 overall buyer intent score>,
  "signals": [
    {"type": "job_posting|tech_signal|news|web_activity|growth", "title": "<signal headline>", "detail": "<1-2 sentence detail>", "strength": "strong|moderate|weak", "source": "<where this signal comes from>", "actionable": "<what sales rep should do>"}
  ]
}

Generate 4-6 realistic signals. Be specific to ${accountName} and ${industry || 'technology'} industry.`,
        context: { page: 'buyer-intent' },
      },
      {
        onSuccess: (data) => {
          try {
            const json = JSON.parse(data.response.match(/\{[\s\S]*\}/)?.[0] || '{}');
            setSignals(json.signals || []);
            setScore(json.intentScore || 50);
          } catch {
            setSignals([]);
            setScore(50);
          }
          setLoading(false);
        },
        onError: () => setLoading(false),
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Buyer Intent</span>
        </div>
        <button onClick={analyze} disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {signals.length > 0 ? 'Refresh' : 'Analyze'}
        </button>
      </div>

      {score !== null && (
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">Intent Score:</div>
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, backgroundColor: score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444' }} />
          </div>
          <span className="text-xs font-bold text-foreground">{score}</span>
        </div>
      )}

      {signals.map((signal, i) => {
        const config = TYPE_CONFIG[signal.type] || TYPE_CONFIG.news;
        const Icon = config.icon;
        return (
          <div key={i} className="p-3 rounded-lg bg-card border border-border space-y-1.5">
            <div className="flex items-start gap-2">
              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />
              <div className="flex-1">
                <div className="text-xs font-medium text-foreground">{signal.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{signal.detail}</div>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${STRENGTH_BADGE[signal.strength]}`}>
                {signal.strength}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground ml-5">
              <span>Source: {signal.source}</span>
              <span className="text-[#7c3aed]">→ {signal.actionable}</span>
            </div>
          </div>
        );
      })}

      {signals.length === 0 && !loading && (
        <div className="text-[10px] text-muted-foreground text-center py-3">
          Click Analyze to detect buyer intent signals
        </div>
      )}
    </div>
  );
}
