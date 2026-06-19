'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Heart, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Calendar, DollarSign, Users, Sparkles, Loader2, RefreshCw,
  Clock, BarChart3, ArrowRight, Shield,
} from 'lucide-react';

interface ClientHealthScoreProps {
  opportunity: any;
}

interface HealthData {
  overallScore: number;
  engagementScore: number;
  deliveryScore: number;
  renewalRisk: 'low' | 'medium' | 'high';
  churnProbability: number;
  upsellSignals: string[];
  renewalDate: string;
  healthTrend: 'improving' | 'stable' | 'declining';
  engagementMetrics: { metric: string; value: string; trend: 'up' | 'down' | 'flat' }[];
  recommendations: string[];
}

function ScoreRing({ score, size = 64, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="text-center">
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--g-line)" strokeWidth="4" fill="none" />
          <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="4" fill="none"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{score}</span>
        </div>
      </div>
      <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function ClientHealthScore({ opportunity }: ClientHealthScoreProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  const chatMutation = trpc.ai.chat.useMutation();

  const analyzeHealth = () => {
    setLoading(true);

    const monthlyRevenue = ((opportunity.tcv || 0) / 12).toFixed(0);
    const daysSinceWon = Math.floor((Date.now() - new Date(opportunity.updatedAt || opportunity.createdAt).getTime()) / 86400000);
    const stakeholderCount = (opportunity.customerStakeholders || []).length;
    const completedTasks = (opportunity.subTasks || []).filter((t: any) => t.status === 'complete').length;
    const totalTasks = (opportunity.subTasks || []).length;

    const prompt = `Analyze the post-sale health of this WON engagement:

Customer: ${opportunity.customerName}
Project: ${opportunity.opportunityName}
TCV: $${(opportunity.tcv || 0).toLocaleString()} (~$${monthlyRevenue}/mo)
Duration: ${opportunity.dealDuration || 'Ongoing'}
Industry: ${opportunity.industry}
Service Line: ${opportunity.serviceLine || 'IT Services'}
Days since won: ${daysSinceWon}
Stakeholders mapped: ${stakeholderCount}
Tasks: ${completedTasks}/${totalTasks} complete
Owner: ${opportunity.primaryOwner}
Notes: ${(opportunity.conversationLog || '').slice(0, 500)}

Return ONLY valid JSON:
{
  "overallScore": <0-100>,
  "engagementScore": <0-100>,
  "deliveryScore": <0-100>,
  "renewalRisk": "low|medium|high",
  "churnProbability": <0-100>,
  "upsellSignals": ["<expansion opportunity>"],
  "renewalDate": "<estimated renewal date or 'Ongoing'>",
  "healthTrend": "improving|stable|declining",
  "engagementMetrics": [
    {"metric": "<name>", "value": "<value>", "trend": "up|down|flat"}
  ],
  "recommendations": ["<specific action to improve health>"]
}`;

    chatMutation.mutate(
      { message: prompt, context: { opportunityId: opportunity.id, page: 'client-health' } },
      {
        onSuccess: (data) => {
          try {
            const jsonMatch = data.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              setHealth(JSON.parse(jsonMatch[0]));
            }
          } catch {
            setHealth({
              overallScore: 65,
              engagementScore: 60,
              deliveryScore: 70,
              renewalRisk: 'medium',
              churnProbability: 25,
              upsellSignals: ['Data not available — re-analyze with more context'],
              renewalDate: 'Unknown',
              healthTrend: 'stable',
              engagementMetrics: [],
              recommendations: [data.response.slice(0, 200)],
            });
          }
          setLoading(false);
        },
        onError: () => setLoading(false),
      }
    );
  };

  // Auto-analyze on mount for Won deals
  useEffect(() => {
    if (opportunity.status === 'Won' && !health) {
      analyzeHealth();
    }
  }, [opportunity.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (opportunity.status !== 'Won') {
    return (
      <div className="text-center py-8">
        <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-30" />
        <p className="text-xs text-muted-foreground">Client Health is available for Won deals only</p>
        <p className="text-[10px] text-muted-foreground mt-1">Move this deal to Won to track post-sale health</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-emerald-400 animate-pulse" />
        </div>
        <div className="text-xs text-muted-foreground">Analyzing client health...</div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-8">
        <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-30" />
        <p className="text-xs text-muted-foreground mb-3">Analyze post-sale health for this engagement</p>
        <button onClick={analyzeHealth}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] transition-colors mx-auto">
          <Sparkles className="h-3.5 w-3.5" /> Analyze Health
        </button>
      </div>
    );
  }

  const riskColors = { low: 'text-emerald-400 bg-emerald-500/10', medium: 'text-amber-400 bg-amber-500/10', high: 'text-red-400 bg-red-500/10' };
  const trendIcons = { improving: TrendingUp, stable: BarChart3, declining: TrendingDown };
  const TrendIcon = trendIcons[health.healthTrend] || BarChart3;

  return (
    <div className="space-y-5">
      {/* Score overview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ScoreRing score={health.overallScore} size={72} label="Overall" />
          <ScoreRing score={health.engagementScore} size={56} label="Engagement" />
          <ScoreRing score={health.deliveryScore} size={56} label="Delivery" />
        </div>
        <div className="text-right space-y-1">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${riskColors[health.renewalRisk]}`}>
            <Shield className="h-3 w-3" /> Renewal Risk: {health.renewalRisk}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
            <TrendIcon className={`h-3 w-3 ${health.healthTrend === 'improving' ? 'text-emerald-400' : health.healthTrend === 'declining' ? 'text-red-400' : 'text-slate-400'}`} />
            Trend: {health.healthTrend}
          </div>
          <button onClick={analyzeHealth} className="text-[10px] text-[#7c3aed] hover:underline flex items-center gap-1 ml-auto">
            <RefreshCw className="h-2.5 w-2.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Churn Risk</div>
          <div className={`text-lg font-bold ${health.churnProbability > 40 ? 'text-red-400' : health.churnProbability > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {health.churnProbability}%
          </div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Revenue/mo</div>
          <div className="text-lg font-bold text-foreground">${((opportunity.tcv || 0) / 12 / 1000).toFixed(0)}k</div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Renewal</div>
          <div className="text-xs font-medium text-foreground mt-1">{health.renewalDate}</div>
        </div>
      </div>

      {/* Engagement metrics */}
      {health.engagementMetrics.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Engagement Metrics</div>
          <div className="space-y-1.5">
            {health.engagementMetrics.map((m, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30 text-xs">
                <span className="flex-1 text-foreground">{m.metric}</span>
                <span className="font-medium text-foreground">{m.value}</span>
                {m.trend === 'up' ? <TrendingUp className="h-3 w-3 text-emerald-400" /> :
                 m.trend === 'down' ? <TrendingDown className="h-3 w-3 text-red-400" /> :
                 <BarChart3 className="h-3 w-3 text-slate-400" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upsell signals */}
      {health.upsellSignals.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> Upsell Signals
          </div>
          <div className="space-y-1.5">
            {health.upsellSignals.map((signal, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <DollarSign className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                {signal}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {health.recommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20">
          <div className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Recommended Actions
          </div>
          <div className="space-y-1.5">
            {health.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="w-4 h-4 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[9px] font-bold text-[#7c3aed] shrink-0">{i + 1}</span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
