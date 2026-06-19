'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Shield, Sparkles, Loader2, Target, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Zap, ChevronDown, ChevronUp,
  Award, Eye, BarChart3, RefreshCw,
} from 'lucide-react';

interface CompetitiveBattleStationProps {
  opportunityId: string;
  customerName: string;
  competitors?: string[];
}

interface BattleCard {
  competitor: string;
  overallThreat: 'high' | 'medium' | 'low';
  strengths: string[];
  weaknesses: string[];
  ourAdvantages: string[];
  winRate: number;
  talkingPoints: string[];
  objectionHandlers: { objection: string; response: string }[];
  pricing: string;
  recentIntel: string[];
}

export default function CompetitiveBattleStation({ opportunityId, customerName, competitors = [] }: CompetitiveBattleStationProps) {
  const [battleCards, setBattleCards] = useState<BattleCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [customCompetitor, setCustomCompetitor] = useState('');

  const chatMutation = trpc.ai.chat.useMutation();

  const analyze = (competitorList: string[]) => {
    if (competitorList.length === 0) return;
    setLoading(true);

    const prompt = `Generate competitive battle cards for a deal with ${customerName}.

Competitors: ${competitorList.join(', ')}

For EACH competitor, return a structured battle card. Return ONLY valid JSON array:
[
  {
    "competitor": "<name>",
    "overallThreat": "high|medium|low",
    "strengths": ["<their strength>"],
    "weaknesses": ["<their weakness>"],
    "ourAdvantages": ["<why we win against them>"],
    "winRate": <estimated win rate 0-100 against this competitor>,
    "talkingPoints": ["<key differentiator to highlight>"],
    "objectionHandlers": [
      {"objection": "<what customer might say about competitor>", "response": "<how to respond>"}
    ],
    "pricing": "<their typical pricing model/range>",
    "recentIntel": ["<recent market intelligence about this competitor>"]
  }
]

Be specific to the IT Services / staffing / consulting space. Make it actionable for a sales rep.`;

    chatMutation.mutate(
      { message: prompt, context: { opportunityId, page: 'competitive-battle' } },
      {
        onSuccess: (data) => {
          try {
            const jsonMatch = data.response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              setBattleCards(parsed);
              if (parsed.length > 0) setExpandedCard(parsed[0].competitor);
            }
          } catch {
            setBattleCards([{
              competitor: competitorList[0] || 'Unknown',
              overallThreat: 'medium',
              strengths: ['Analysis pending'],
              weaknesses: ['Analysis pending'],
              ourAdvantages: [data.response.slice(0, 200)],
              winRate: 50,
              talkingPoints: [],
              objectionHandlers: [],
              pricing: 'Unknown',
              recentIntel: [],
            }]);
          }
          setLoading(false);
        },
        onError: () => setLoading(false),
      }
    );
  };

  const handleAddCompetitor = () => {
    if (!customCompetitor.trim()) return;
    const newList = [...new Set([...competitors, ...battleCards.map(b => b.competitor), customCompetitor.trim()])];
    setCustomCompetitor('');
    analyze(newList);
  };

  const threatColors = {
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-red-400" />
          </div>
          <span className="text-xs font-semibold text-foreground">Competitive Battle Station</span>
        </div>
        {battleCards.length > 0 && (
          <button onClick={() => analyze(battleCards.map(b => b.competitor))}
            className="flex items-center gap-1 text-[10px] text-[#7c3aed] hover:underline">
            <RefreshCw className="h-3 w-3" /> Refresh Intel
          </button>
        )}
      </div>

      {/* Add competitor + analyze */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customCompetitor}
          onChange={e => setCustomCompetitor(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddCompetitor()}
          placeholder="Add competitor name..."
          className="flex-1 px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40"
        />
        <button onClick={handleAddCompetitor} disabled={!customCompetitor.trim()}
          className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#7c3aed]/30 transition-all disabled:opacity-40">
          Add
        </button>
        {battleCards.length === 0 && (
          <button
            onClick={() => analyze(competitors.length > 0 ? competitors : ['Accenture', 'Infosys', 'TCS'])}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Analyze
          </button>
        )}
      </div>

      {/* Known competitors chips */}
      {competitors.length > 0 && battleCards.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-muted-foreground">Known:</span>
          {competitors.map(c => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-8 gap-3">
          <Sparkles className="h-8 w-8 text-[#7c3aed] animate-pulse" />
          <div className="text-xs text-muted-foreground">Generating battle cards...</div>
        </div>
      )}

      {/* Battle cards */}
      {battleCards.length > 0 && (
        <div className="space-y-3">
          {battleCards.map(card => {
            const isExpanded = expandedCard === card.competitor;
            return (
              <div key={card.competitor} className="rounded-xl bg-card border border-border overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => setExpandedCard(isExpanded ? null : card.competitor)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground">{card.competitor}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Win rate vs them: <span className={card.winRate >= 60 ? 'text-emerald-400' : card.winRate >= 40 ? 'text-amber-400' : 'text-red-400'}>{card.winRate}%</span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${threatColors[card.overallThreat]}`}>
                    {card.overallThreat} threat
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'var(--g-line)' }}>
                    {/* Win rate bar */}
                    <div className="pt-3">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">Our Win Rate vs {card.competitor}</span>
                        <span className="font-bold text-foreground">{card.winRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${card.winRate}%`, backgroundColor: card.winRate >= 60 ? '#22c55e' : card.winRate >= 40 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Their strengths */}
                      <div>
                        <div className="text-[9px] font-semibold text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> Their Strengths
                        </div>
                        <div className="space-y-1">
                          {card.strengths.map((s, i) => (
                            <div key={i} className="text-[10px] text-foreground flex items-start gap-1.5">
                              <TrendingUp className="h-2.5 w-2.5 text-red-400 shrink-0 mt-0.5" /> {s}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Our advantages */}
                      <div>
                        <div className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Award className="h-2.5 w-2.5" /> Our Advantages
                        </div>
                        <div className="space-y-1">
                          {card.ourAdvantages.map((a, i) => (
                            <div key={i} className="text-[10px] text-foreground flex items-start gap-1.5">
                              <CheckCircle className="h-2.5 w-2.5 text-emerald-400 shrink-0 mt-0.5" /> {a}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Talking points */}
                    {card.talkingPoints.length > 0 && (
                      <div className="p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
                        <div className="text-[9px] font-semibold text-[#7c3aed] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5" /> Key Talking Points
                        </div>
                        <div className="space-y-1">
                          {card.talkingPoints.map((tp, i) => (
                            <div key={i} className="text-[10px] text-foreground flex items-start gap-1.5">
                              <span className="w-3 h-3 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[8px] font-bold text-[#7c3aed] shrink-0">{i + 1}</span>
                              {tp}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Objection handlers */}
                    {card.objectionHandlers.length > 0 && (
                      <div>
                        <div className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5" /> Objection Handlers
                        </div>
                        <div className="space-y-2">
                          {card.objectionHandlers.map((oh, i) => (
                            <div key={i} className="p-2 rounded-lg bg-secondary/20">
                              <div className="text-[10px] text-amber-400 font-medium mb-0.5">"{oh.objection}"</div>
                              <div className="text-[10px] text-foreground">→ {oh.response}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pricing intel */}
                    {card.pricing && (
                      <div className="flex items-center gap-2 text-[10px]">
                        <BarChart3 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Their pricing:</span>
                        <span className="text-foreground">{card.pricing}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {battleCards.length === 0 && !loading && (
        <div className="text-center py-6">
          <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-xs text-muted-foreground">Add competitors and analyze to generate battle cards</p>
        </div>
      )}
    </div>
  );
}
