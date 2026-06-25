'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Sparkles, Loader2, ChevronDown, ChevronUp, Plus, X, Zap,
  Target, Layers, Shield, BarChart3, Users, Code2,
  ArrowRight, Lightbulb, CheckCircle, AlertTriangle,
} from 'lucide-react';

interface DeepDiscoveryProps {
  workshop: any;
  levelId: string;
  dimensionId: string;
  dimensionName: string;
  currentScore: number | null;
  targetScore: number | null;
  finding: string;
  customerName: string;
  onRefresh: () => void;
}

const MATURITY = ['Absent', 'Ad hoc', 'Repeatable', 'Governed', 'Optimized'];

/**
 * DeepDiscovery — the exhaustive drill-down component.
 * For each dimension, AI generates:
 * 1. Sub-sections (technical + non-technical)
 * 2. Micro-assessments within each sub-section
 * 3. Best practices and recommendations
 * 4. Risk indicators
 * 5. Industry benchmarks
 */
export default function DeepDiscovery({ workshop, levelId, dimensionId, dimensionName, currentScore, targetScore, finding, customerName, onRefresh }: DeepDiscoveryProps) {
  const [discovery, setDiscovery] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const chatMutation = trpc.ai.chat.useMutation();

  const handleDeepDive = () => {
    setLoading(true);
    chatMutation.mutate({
      message: `Perform an exhaustive deep-dive analysis on "${dimensionName}" for ${customerName}.
Current maturity: ${currentScore != null ? MATURITY[currentScore] : 'Not scored'}
Target: ${targetScore != null ? MATURITY[targetScore] : 'Not set'}
${finding ? `Finding: ${finding}` : ''}

Generate a comprehensive breakdown with BOTH technical AND non-technical sub-sections. Think like a McKinsey analyst + Google architect working together.

Return JSON only (no markdown fences):
{
  "summary": "<2 sentence executive summary of this dimension's state>",
  "maturityIndicators": {
    "strengths": ["<what's working>"],
    "gaps": ["<what's missing>"],
    "risks": ["<what could go wrong>"]
  },
  "subSections": [
    {
      "id": "tech-1",
      "category": "technical|organizational|process|governance|people",
      "title": "<sub-section name>",
      "description": "<what this covers>",
      "currentState": "<assessment of where they are>",
      "targetState": "<where they need to be>",
      "microAssessments": [
        {"item": "<specific thing to evaluate>", "status": "green|amber|red|unknown", "note": "<brief assessment>"}
      ],
      "bestPractices": ["<industry best practice>"],
      "recommendations": ["<specific action to take>"]
    }
  ],
  "industryBenchmark": "<how does this compare to industry standards>",
  "quickWins": ["<immediate improvements possible>"],
  "strategicMoves": ["<longer-term strategic actions>"]
}

Generate 4-6 sub-sections covering technical architecture, organizational readiness, process maturity, governance, and people/skills. Each with 3-5 micro-assessments. Be specific to ${customerName} and the ${dimensionName} dimension.`,
      context: { page: 'workshop-deep-discovery' },
    }, {
      onSuccess: (data) => {
        try {
          const cleaned = data.response.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) setDiscovery(JSON.parse(match[0]));
        } catch {
          setDiscovery({ summary: data.response.slice(0, 300), subSections: [] });
        }
        setLoading(false);
      },
      onError: () => setLoading(false),
    });
  };

  const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
    green: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertTriangle },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertTriangle },
    unknown: { bg: 'bg-secondary/50', text: 'text-muted-foreground', icon: Sparkles },
  };

  const CATEGORY_ICONS: Record<string, any> = {
    technical: Code2, organizational: Users, process: BarChart3,
    governance: Shield, people: Users,
  };

  if (!discovery && !loading) {
    return (
      <button onClick={handleDeepDive}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#7c3aed]/30 text-[#7c3aed] text-xs font-medium hover:bg-[#7c3aed]/5 transition-colors">
        <Layers className="h-4 w-4" /> Deep Discovery — Exhaustive Analysis
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-[#7c3aed] animate-pulse" />
        </div>
        <div className="text-xs text-muted-foreground">Running deep discovery analysis...</div>
        <div className="text-[10px] text-muted-foreground">McKinsey analysis + architecture review + best practices</div>
      </div>
    );
  }

  if (!discovery) return null;

  return (
    <div className="space-y-4 animate-flow-in">
      {/* Executive Summary */}
      <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Deep Discovery — {dimensionName}
          </div>
          <button onClick={() => setDiscovery(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
        </div>
        <p className="text-xs text-foreground leading-relaxed">{discovery.summary}</p>
      </div>

      {/* Maturity Indicators */}
      {discovery.maturityIndicators && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'strengths', label: 'Strengths', icon: CheckCircle, color: 'emerald' },
            { key: 'gaps', label: 'Gaps', icon: AlertTriangle, color: 'amber' },
            { key: 'risks', label: 'Risks', icon: AlertTriangle, color: 'red' },
          ].map(cat => {
            const items = discovery.maturityIndicators[cat.key] || [];
            return (
              <div key={cat.key} className={`p-3 rounded-lg bg-${cat.color}-500/5 border border-${cat.color}-500/15`}>
                <div className={`text-[9px] font-semibold text-${cat.color}-400 uppercase tracking-wider mb-1.5 flex items-center gap-1`}>
                  <cat.icon className="h-2.5 w-2.5" /> {cat.label}
                </div>
                {items.map((item: string, i: number) => (
                  <div key={i} className="text-[10px] text-foreground mt-1">• {item}</div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-Sections — expandable */}
      {(discovery.subSections || []).map((section: any, i: number) => {
        const isExpanded = expandedSection === section.id;
        const CatIcon = CATEGORY_ICONS[section.category] || Layers;
        return (
          <div key={section.id || i} className="rounded-xl bg-card border border-border overflow-hidden">
            <button onClick={() => setExpandedSection(isExpanded ? null : (section.id || `s${i}`))}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors">
              <CatIcon className="h-4 w-4 text-[#7c3aed] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground">{section.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{section.description}</div>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize shrink-0">{section.category}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--g-line)' }}>
                {/* Current → Target */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="text-[8px] font-mono uppercase text-amber-500 mb-1">Current State</div>
                    <div className="text-[10px] text-foreground">{section.currentState}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0A867F]/5 border border-[#0A867F]/10">
                    <div className="text-[8px] font-mono uppercase text-[#0A867F] mb-1">Target State</div>
                    <div className="text-[10px] text-foreground">{section.targetState}</div>
                  </div>
                </div>

                {/* Micro-Assessments */}
                {(section.microAssessments || []).length > 0 && (
                  <div>
                    <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Micro-Assessments</div>
                    <div className="space-y-1">
                      {section.microAssessments.map((ma: any, j: number) => {
                        const status = STATUS_COLORS[ma.status] || STATUS_COLORS.unknown;
                        const StatusIcon = status.icon;
                        return (
                          <div key={j} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg ${status.bg}`}>
                            <StatusIcon className={`h-3 w-3 mt-0.5 shrink-0 ${status.text}`} />
                            <div className="flex-1">
                              <div className="text-[10px] font-medium text-foreground">{ma.item}</div>
                              {ma.note && <div className="text-[9px] text-muted-foreground mt-0.5">{ma.note}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Best Practices */}
                {(section.bestPractices || []).length > 0 && (
                  <div>
                    <div className="text-[9px] font-semibold text-[#0A867F] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Lightbulb className="h-2.5 w-2.5" /> Best Practices
                    </div>
                    {section.bestPractices.map((bp: string, j: number) => (
                      <div key={j} className="text-[10px] text-foreground mt-0.5 flex items-start gap-1.5">
                        <span className="text-[#0A867F] shrink-0">→</span> {bp}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {(section.recommendations || []).length > 0 && (
                  <div>
                    <div className="text-[9px] font-semibold text-[#7c3aed] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5" /> Recommendations
                    </div>
                    {section.recommendations.map((rec: string, j: number) => (
                      <div key={j} className="text-[10px] text-foreground mt-0.5 flex items-start gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#7c3aed]/10 flex items-center justify-center text-[7px] font-bold text-[#7c3aed] shrink-0">{j + 1}</span>
                        {rec}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Quick Wins + Strategic Moves */}
      <div className="grid grid-cols-2 gap-3">
        {(discovery.quickWins || []).length > 0 && (
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <div className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" /> Quick Wins
            </div>
            {discovery.quickWins.map((qw: string, i: number) => (
              <div key={i} className="text-[10px] text-foreground mt-1">• {qw}</div>
            ))}
          </div>
        )}
        {(discovery.strategicMoves || []).length > 0 && (
          <div className="p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/15">
            <div className="text-[9px] font-semibold text-[#7c3aed] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Target className="h-2.5 w-2.5" /> Strategic Moves
            </div>
            {discovery.strategicMoves.map((sm: string, i: number) => (
              <div key={i} className="text-[10px] text-foreground mt-1">• {sm}</div>
            ))}
          </div>
        )}
      </div>

      {/* Industry Benchmark */}
      {discovery.industryBenchmark && (
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
          <div className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <BarChart3 className="h-2.5 w-2.5" /> Industry Benchmark
          </div>
          <div className="text-[10px] text-foreground">{discovery.industryBenchmark}</div>
        </div>
      )}

      {/* Re-run button */}
      <button onClick={handleDeepDive} className="text-[10px] text-[#7c3aed] hover:underline flex items-center gap-1 mx-auto">
        <Sparkles className="h-3 w-3" /> Re-run Deep Discovery
      </button>
    </div>
  );
}
