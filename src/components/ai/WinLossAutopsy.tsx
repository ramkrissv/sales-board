'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Sparkles, Loader2, Trophy, XCircle, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Users, Clock, DollarSign, Target,
  ChevronRight, X, BarChart3,
} from 'lucide-react';

interface WinLossAutopsyProps {
  opportunity: any;
  isOpen: boolean;
  onClose: () => void;
}

interface AutopsyResult {
  outcome: 'won' | 'lost';
  summary: string;
  keyFactors: { factor: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }[];
  timeline: { phase: string; duration: string; verdict: string }[];
  stakeholderAnalysis: { name: string; influence: string; sentiment: string }[];
  competitiveInsights: string[];
  lessonsLearned: string[];
  recommendations: string[];
  score: number; // 0-100 overall execution score
}

export default function WinLossAutopsy({ opportunity, isOpen, onClose }: WinLossAutopsyProps) {
  const [result, setResult] = useState<AutopsyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const chatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    if (!isOpen || !opportunity || result) return;

    setLoading(true);

    const prompt = `Perform a comprehensive ${opportunity.status === 'Won' ? 'WIN' : 'LOSS'} autopsy for this deal:

Customer: ${opportunity.customerName}
Opportunity: ${opportunity.opportunityName}
Stage: ${opportunity.status}
TCV: $${(opportunity.tcv || 0).toLocaleString()}
Duration: ${opportunity.dealDuration || 'Unknown'}
Industry: ${opportunity.industry}
Owner: ${opportunity.primaryOwner}
Service Line: ${opportunity.serviceLine || 'IT Services'}
Stakeholders: ${(opportunity.customerStakeholders || []).map((s: any) => `${s.name} (${s.title})${s.isDecisionMaker ? ' [DM]' : ''}`).join(', ') || 'None mapped'}
Tasks: ${(opportunity.subTasks || []).length} total, ${(opportunity.subTasks || []).filter((t: any) => t.status === 'complete').length} completed
Loss Reason: ${opportunity.lossReason || 'Not specified'}
Competitors: ${(opportunity.competitorNames || []).join(', ') || 'None identified'}
Notes: ${(opportunity.conversationLog || '').slice(0, 800)}

Return ONLY valid JSON:
{
  "outcome": "${opportunity.status === 'Won' ? 'won' : 'lost'}",
  "summary": "<2-3 sentence executive summary of why this deal was ${opportunity.status === 'Won' ? 'won' : 'lost'}>",
  "keyFactors": [
    {"factor": "<what helped or hurt>", "impact": "positive|negative|neutral", "weight": <1-10>}
  ],
  "timeline": [
    {"phase": "<Discovery|Qualification|Proposal|Negotiation>", "duration": "<estimated time>", "verdict": "<how this phase went>"}
  ],
  "stakeholderAnalysis": [
    {"name": "<person>", "influence": "<high|medium|low>", "sentiment": "<champion|supporter|neutral|blocker>"}
  ],
  "competitiveInsights": ["<what we learned about competition>"],
  "lessonsLearned": ["<key takeaway for future deals>"],
  "recommendations": ["<specific action to improve future similar deals>"],
  "score": <0-100 execution quality score>
}`;

    chatMutation.mutate(
      { message: prompt, context: { opportunityId: opportunity.id, page: 'autopsy' } },
      {
        onSuccess: (data) => {
          try {
            // Extract JSON from the response
            const text = data.response;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              setResult(parsed);
            } else {
              setResult({
                outcome: opportunity.status === 'Won' ? 'won' : 'lost',
                summary: text.slice(0, 300),
                keyFactors: [],
                timeline: [],
                stakeholderAnalysis: [],
                competitiveInsights: [],
                lessonsLearned: [text.slice(0, 200)],
                recommendations: [],
                score: 50,
              });
            }
          } catch {
            setResult({
              outcome: opportunity.status === 'Won' ? 'won' : 'lost',
              summary: data.response.slice(0, 300),
              keyFactors: [],
              timeline: [],
              stakeholderAnalysis: [],
              competitiveInsights: [],
              lessonsLearned: [],
              recommendations: [],
              score: 50,
            });
          }
          setLoading(false);
        },
        onError: () => setLoading(false),
      }
    );
  }, [isOpen, opportunity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const isWon = opportunity?.status === 'Won';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl mx-4"
        style={{ boxShadow: isWon ? '0 0 60px rgba(34,197,94,0.1)' : '0 0 60px rgba(239,68,68,0.1)' }}>

        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center gap-3 px-6 py-4 border-b backdrop-blur-sm ${
          isWon ? 'bg-emerald-500/5' : 'bg-red-500/5'
        }`} style={{ borderColor: 'var(--g-line)' }}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isWon ? 'bg-emerald-500/20' : 'bg-red-500/20'
          }`}>
            {isWon ? <Trophy className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">
              {isWon ? 'Win' : 'Loss'} Autopsy — {opportunity?.customerName}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {opportunity?.opportunityName} · ${((opportunity?.tcv || 0) / 1000).toFixed(0)}k
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isWon ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <Sparkles className={`h-8 w-8 animate-pulse ${isWon ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div className="text-sm text-muted-foreground">Analyzing deal execution...</div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="p-6 space-y-6">
            {/* Execution score */}
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20">
                <svg width="80" height="80" className="transform -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="var(--g-line)" strokeWidth="6" fill="none" />
                  <circle cx="40" cy="40" r="34" stroke={result.score >= 70 ? '#22c55e' : result.score >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="6" fill="none" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - result.score / 100)}
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-foreground">{result.score}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-foreground mb-1">Execution Score</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* Key factors */}
            {result.keyFactors.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Target className="h-3 w-3" /> Key Factors
                </div>
                <div className="space-y-1.5">
                  {result.keyFactors.sort((a, b) => b.weight - a.weight).map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30">
                      {f.impact === 'positive' ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : f.impact === 'negative' ? (
                        <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      ) : (
                        <BarChart3 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="flex-1 text-xs text-foreground">{f.factor}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <div key={j} className={`w-1.5 h-3 rounded-sm ${
                            j < Math.ceil(f.weight / 2)
                              ? f.impact === 'positive' ? 'bg-emerald-400' : f.impact === 'negative' ? 'bg-red-400' : 'bg-slate-400'
                              : 'bg-secondary'
                          }`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deal timeline */}
            {result.timeline.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Deal Timeline
                </div>
                <div className="relative ml-3">
                  <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
                  <div className="space-y-3">
                    {result.timeline.map((phase, i) => (
                      <div key={i} className="relative pl-6">
                        <div className={`absolute left-0 top-1 w-[11px] h-[11px] rounded-full ring-2 ring-background ${
                          phase.verdict.toLowerCase().includes('good') || phase.verdict.toLowerCase().includes('strong')
                            ? 'bg-emerald-500'
                            : phase.verdict.toLowerCase().includes('weak') || phase.verdict.toLowerCase().includes('slow')
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                        }`} />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{phase.phase}</span>
                          <span className="text-[10px] text-muted-foreground">{phase.duration}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{phase.verdict}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stakeholder analysis */}
            {result.stakeholderAnalysis.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Stakeholder Map
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.stakeholderAnalysis.map((sh, i) => {
                    const sentimentColors: Record<string, string> = {
                      champion: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                      supporter: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                      neutral: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
                      blocker: 'bg-red-500/10 border-red-500/30 text-red-400',
                    };
                    return (
                      <div key={i} className={`px-3 py-2 rounded-lg border text-xs ${sentimentColors[sh.sentiment] || sentimentColors.neutral}`}>
                        <div className="font-medium">{sh.name}</div>
                        <div className="text-[10px] opacity-70">{sh.influence} influence · {sh.sentiment}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lessons learned */}
            {result.lessonsLearned.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-[#7c3aed]" /> Lessons Learned
                </div>
                <div className="space-y-1.5">
                  {result.lessonsLearned.map((lesson, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-[#7c3aed] shrink-0 mt-0.5" />
                      {lesson}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                <div className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" /> Recommendations
                </div>
                <div className="space-y-1.5">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="w-4 h-4 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[9px] font-bold text-[#7c3aed] shrink-0">{i + 1}</span>
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
