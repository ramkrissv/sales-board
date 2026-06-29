'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { workshopStats, gapsForWorkshop, levelReadiness, priorityRank, rollupByWorkstream } from '@/lib/workshop/scoring';
import ReadinessSpine from './exhibits/ReadinessSpine';
import GapHeatmap from './exhibits/GapHeatmap';
import {
  Sparkles, Loader2, Download, Copy, Check, FileText,
  Target, BarChart3, AlertTriangle, CheckCircle, Zap,
  ArrowRight, Users, Shield, Lightbulb, X, Plus,
  TrendingUp, TrendingDown, Activity, Brain, Lock,
  Clock, DollarSign, Layers, ChevronDown, ChevronUp,
  Award, Gauge, CircleDot, ArrowUpRight, Eye,
  Flag, BookOpen, Compass, Radio, Flame,
} from 'lucide-react';

import { MATURITY_LABELS as MATURITY, MATURITY_COLORS } from '@/lib/workshop/constants';
const RISK_LEVELS = [
  { label: 'Critical', color: '#C8472E', bg: 'bg-red-500/10', text: 'text-red-400', threshold: 3 },
  { label: 'High', color: '#D97A2B', bg: 'bg-amber-500/10', text: 'text-amber-400', threshold: 2 },
  { label: 'Medium', color: '#f59e0b', bg: 'bg-yellow-500/10', text: 'text-yellow-400', threshold: 1 },
  { label: 'Low', color: '#22c55e', bg: 'bg-emerald-500/10', text: 'text-emerald-400', threshold: 0 },
];

const REC_CATEGORIES = [
  { id: 'quick_wins', label: 'Quick Wins', sublabel: '0-30 days', icon: Zap, color: '#22c55e', desc: 'Low effort, immediate impact' },
  { id: 'foundation', label: 'Foundation', sublabel: '1-3 months', icon: Layers, color: '#3b82f6', desc: 'Build capabilities & infrastructure' },
  { id: 'strategic', label: 'Strategic', sublabel: '3-6 months', icon: Target, color: '#7c3aed', desc: 'Transform operating model & scale' },
  { id: 'governance', label: 'Governance', sublabel: 'Ongoing', icon: Shield, color: '#0A867F', desc: 'Institutionalize practices & compliance' },
];

interface WorkshopFindingsProps {
  workshop: any;
  onRefresh: () => void;
}

export default function WorkshopFindings({ workshop, onRefresh }: WorkshopFindingsProps) {
  const [generating, setGenerating] = useState(false);
  const [generatingRecs, setGeneratingRecs] = useState(false);
  const [generatingAsset, setGeneratingAsset] = useState<string | null>(null);
  const [findings, setFindings] = useState<any>(null);
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [customRecs, setCustomRecs] = useState<{ text: string; category: string }[]>([]);
  const [newRec, setNewRec] = useState('');
  const [newRecCat, setNewRecCat] = useState('quick_wins');
  const [copied, setCopied] = useState(false);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('executive');
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const [assets, setAssets] = useState<Record<string, string>>({});

  const runAssist = trpc.workshop.runAssist.useMutation();
  const chatMutation = trpc.ai.chat.useMutation();
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const useCases = workshop.useCases || [];
  const scopeItems = workshop.scopeItems || [];

  // Derived analytics
  const topGaps = useMemo(() =>
    [...gaps].sort((a, b) => b.gap - a.gap || (b.priority ? 1 : 0) - (a.priority ? 1 : 0)).slice(0, 10),
    [gaps]
  );

  const criticalGaps = gaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority));
  const highGaps = gaps.filter(g => g.gap === 2 && !g.priority);
  const mediumGaps = gaps.filter(g => g.gap === 1 && g.priority);
  const lowGaps = gaps.filter(g => g.gap === 1 && !g.priority);

  const rollups = useMemo(() => rollupByWorkstream(gaps, workstreams, scopeItems), [gaps, workstreams, scopeItems]);

  const avgMaturity = useMemo(() => {
    const allDims = levels.flatMap((l: any) => l.dimensions || []);
    const scored = allDims.filter((d: any) => d.currentScore != null);
    return scored.length > 0 ? (scored.reduce((s: number, d: any) => s + d.currentScore, 0) / scored.length).toFixed(1) : '0.0';
  }, [levels]);

  const maturityDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]; // counts for 0-4
    levels.forEach((l: any) => {
      (l.dimensions || []).forEach((d: any) => {
        if (d.currentScore != null) dist[d.currentScore]++;
      });
    });
    return dist;
  }, [levels]);

  const strengthDims = useMemo(() => {
    const all = levels.flatMap((l: any) =>
      (l.dimensions || []).filter((d: any) => d.currentScore != null && d.currentScore >= 3)
        .map((d: any) => ({ ...d, levelName: l.name }))
    );
    return all.sort((a: any, b: any) => b.currentScore - a.currentScore);
  }, [levels]);

  const weaknessDims = useMemo(() => {
    const all = levels.flatMap((l: any) =>
      (l.dimensions || []).filter((d: any) => d.currentScore != null && d.currentScore <= 1)
        .map((d: any) => ({ ...d, levelName: l.name }))
    );
    return all.sort((a: any, b: any) => a.currentScore - b.currentScore);
  }, [levels]);

  const allRecs = useMemo(() => [...aiRecs, ...customRecs], [aiRecs, customRecs]);
  const recsByCategory = REC_CATEGORIES.map(cat => ({
    ...cat,
    recs: allRecs.filter(r => r.category === cat.id),
  }));

  // Generate comprehensive findings
  const handleGenerateFindings = () => {
    setGenerating(true);
    const levelData = levels.map((l: any) => {
      const r = levelReadiness(l);
      const dims = (l.dimensions || []).filter((d: any) => d.currentScore != null);
      return {
        name: l.name, code: l.code || l.id,
        readiness: r.currentPct, target: r.targetPct,
        weight: l.weight || 1,
        dims: dims.map((d: any) => ({
          name: d.name, code: d.code || d.id,
          current: d.currentScore, target: d.targetScore,
          finding: d.finding?.body, priority: !!d.priority,
          probe: d.probe,
        })),
      };
    });

    runAssist.mutate({
      workshopId: workshop.id,
      assistKey: 'currentstate.narrative',
      input: { levels: levelData },
    }, {
      onSuccess: (data) => {
        const narrative = typeof data.output === 'string' ? data.output : data.raw || '';
        setFindings({
          narrative: narrative.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim(),
          generatedAt: new Date().toISOString(),
        });
        setGenerating(false);
      },
      onError: () => setGenerating(false),
    });
  };

  // Build assessment context string (shared across generators)
  const assessmentContext = useMemo(() => {
    const levelInfo = levels.map((l: any) => {
      const r = levelReadiness(l);
      const dims = (l.dimensions || []).filter((d: any) => d.currentScore != null);
      return `${l.name} (${r.currentPct}% readiness, ${r.scored}/${r.total} scored):\n${dims.map((d: any) => `  - ${d.name}: ${MATURITY[d.currentScore]}${d.targetScore != null ? ` → target ${MATURITY[d.targetScore]}` : ''}${d.finding?.body ? ` | Finding: ${d.finding.body.slice(0, 150)}` : ''}`).join('\n')}`;
    }).join('\n\n');
    return `Client: ${workshop.customerName}
Assessment: ${workshop.title}
Readiness Index: ${stats.index}/100 (${stats.stage})
Average Maturity: ${avgMaturity}/4
Dimensions: ${stats.dimensionsScored}/${stats.totalDimensions} scored
Gaps: ${stats.gapCount} (${stats.priorityGapCount} priority, ${criticalGaps.length} critical)
Use Cases: ${useCases.length} (${useCases.filter((u: any) => u.isPilot).length} pilots)
Scope Items: ${scopeItems.length}

LEVEL ANALYSIS:
${levelInfo}

CRITICAL GAPS:
${criticalGaps.map(g => `- ${g.dimensionName}: ${MATURITY[g.current]} → ${MATURITY[g.target]} (Δ${g.gap})${g.finding ? ` — ${g.finding.slice(0, 120)}` : ''}`).join('\n')}

STRENGTHS:
${strengthDims.slice(0, 8).map((d: any) => `- ${d.name} (${d.levelName}): ${MATURITY[d.currentScore]}`).join('\n')}`;
  }, [workshop, stats, levels, criticalGaps, strengthDims, avgMaturity, useCases, scopeItems]);

  // Generate deep AI recommendations via runAssist
  const handleGenerateRecs = async () => {
    setGeneratingRecs(true);
    try {
      const result = await runAssist.mutateAsync({
        workshopId: workshop.id,
        assistKey: 'gap.narrative',
        input: {
          dimensionName: 'FULL_RECOMMENDATIONS',
          current: Math.round(Number(avgMaturity)),
          target: 4,
          finding: assessmentContext,
          _customPrompt: `You are a McKinsey senior partner + Google distinguished engineer. Generate 12-16 detailed, deeply specific recommendations as a JSON object.

${assessmentContext}

Return JSON: {"items":[{"text":"detailed recommendation with specific actions","category":"quick_wins|foundation|strategic|governance","priority":"critical|high|medium","impact":"business impact description","effort":"low|medium|high","dependencies":"prerequisites","kpis":"measurable outcomes"}]}

Requirements: deeply specific to ${workshop.customerName}'s gaps and findings, actionable with clear next steps, connected to business value, sequenced logically, include governance guardrails throughout.`,
        },
      });
      const raw = typeof result.output === 'string' ? result.output : result.raw || '';
      const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      const objMatch = cleaned.match(/\{[\s\S]*\}/);
      const items = arrayMatch ? JSON.parse(arrayMatch[0]) : objMatch ? (JSON.parse(objMatch[0]).items || []) : [];
      setAiRecs(items.map((r: any) => ({
        text: r.text || '',
        category: ['quick_wins', 'foundation', 'strategic', 'governance'].includes(r.category) ? r.category : 'strategic',
        priority: r.priority || 'medium',
        impact: r.impact || '',
        effort: r.effort || 'medium',
        dependencies: r.dependencies || '',
        kpis: r.kpis || '',
        aiGenerated: true,
      })));
    } catch (e) { console.error('Rec generation failed:', e); }
    setGeneratingRecs(false);
  };

  // Generate a deliverable asset (opens in new tab as rich HTML)
  const generateAsset = async (assetType: string) => {
    setGeneratingAsset(assetType);
    const prompts: Record<string, string> = {
      assessment_report: `Write a comprehensive 8-10 page Assessment Report for ${workshop.customerName}. Use Markdown with ## headers.

${assessmentContext}

Include these sections:
1. Executive Summary (2 paragraphs)
2. Methodology & Approach
3. Current State by Domain (${levels.map((l: any) => l.name).join(', ')}) — for each domain: overview, key findings per dimension, maturity level, implications
4. Gap Analysis — every gap with current→target, implication, recommended action
5. Strengths & Assets — what to build on
6. Risk Assessment — systemic risks, technical debt, organizational gaps
7. Use Case Portfolio — ${useCases.length} use cases analyzed
8. Recommendations Summary — prioritized by Quick Wins, Foundation, Strategic, Governance

Write in McKinsey consulting register. Specific to ${workshop.customerName}. Reference actual findings. No filler.`,

      roadmap: `Create a detailed Transformation Roadmap for ${workshop.customerName}. Use Markdown with ## headers.

${assessmentContext}

Include:
1. Vision Statement — where ${workshop.customerName} should be in 12 months
2. Phase 1: Foundation (0-3 months) — immediate actions, quick wins, critical gap closure
3. Phase 2: Build (3-6 months) — platform hardening, capability development, governance setup
4. Phase 3: Scale (6-12 months) — operating model maturity, advanced use cases, optimization
5. Workstream Tracks — a dedicated track for each impacted workstream with milestones, owners, dependencies
6. Resource Requirements — team shape, skill gaps, augmentation needs
7. Investment Model — effort by phase, delivery model recommendations (Pod Squad, Managed Capacity, Outcome-Based)
8. Risk Mitigation — what could go wrong and how to prevent it
9. Success Metrics — KPIs per phase and per workstream
10. Governance Model — decision rights, review cadence, escalation

Be deeply specific. Reference actual assessment data.`,

      architecture_review: `Write a detailed Architecture Deep Dive document for ${workshop.customerName}. Use Markdown with ## headers.

${assessmentContext}

Include:
1. Architecture Landscape — current state assessment of technical architecture
2. Platform & Tooling Analysis — what's in place, what's missing, maturity of each
3. Integration Architecture — current interoperability, gaps, recommended patterns
4. Data Architecture — data strategy, knowledge foundation, AI/ML pipeline readiness
5. Security Architecture — current posture, gaps in agentic security, compliance status
6. Target Architecture — recommended future state with rationale
7. Technology Recommendations — specific tools, platforms, frameworks
8. Architecture Decision Records — key decisions with pros/cons/rationale
9. Migration Strategy — how to get from current to target state
10. Architecture Governance — standards, review processes, technology radar

Reference actual dimension scores and findings. Be specific to ${workshop.customerName}'s context.`,

      exec_briefing: `Write a 2-page Executive Briefing for ${workshop.customerName} board/leadership. Use Markdown with ## headers.

${assessmentContext}

Include:
1. Assessment Summary — one paragraph, readiness index, stage, headline finding
2. Key Findings (3-5 bullets) — the most critical insights leadership needs to know
3. Strategic Implications — what this means for the business
4. Critical Risks — what happens if gaps aren't addressed
5. Recommended Actions — top 5 prioritized actions with timeline
6. Investment Ask — high-level effort and resource requirements
7. Expected Outcomes — what success looks like at 6 and 12 months

Board-ready prose. Implication-first. No jargon unless unavoidable. Every statement backed by assessment data.`,

      gap_analysis: `Write a comprehensive Gap Analysis document for ${workshop.customerName}. Use Markdown with ## headers and tables.

${assessmentContext}

Include:
1. Gap Summary — total gaps, severity distribution, priority analysis
2. Per-Domain Gap Tables — for each level, a table with: Dimension | Current | Target | Gap | Severity | Finding | Recommended Action
3. Cross-Cutting Themes — patterns that span multiple domains
4. Dependency Map — which gaps must be closed before others
5. Quick Wins — gaps that can be closed immediately with low effort
6. Strategic Gaps — gaps that require organizational change
7. Technical Debt Inventory — gaps related to platform/tooling immaturity
8. People & Process Gaps — gaps related to skills, operating model, governance
9. Prioritized Closure Plan — sequenced actions to close top 10 gaps
10. Measurement Framework — how to track gap closure progress

Use tables extensively. Reference actual scores and findings.`,
    };

    try {
      const result = await runAssist.mutateAsync({
        workshopId: workshop.id,
        assistKey: 'currentstate.narrative',
        input: { levels: levels.map((l: any) => ({ name: l.name, readiness: levelReadiness(l).currentPct, dims: [] })), _customPrompt: prompts[assetType] },
      });
      const content = typeof result.output === 'string' ? result.output : result.raw || '';
      const clean = content.replace(/```[a-z]*\n?/gi, '').replace(/```\n?/g, '').trim();
      setAssets(prev => ({ ...prev, [assetType]: clean }));

      // Open as rich HTML in new tab
      const html = assetToHTML(assetType, clean);
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    } catch (e) { console.error(`Asset ${assetType} failed:`, e); }
    setGeneratingAsset(null);
  };

  const assetToHTML = (type: string, markdown: string) => {
    const titles: Record<string, string> = {
      assessment_report: 'Assessment Report',
      roadmap: 'Transformation Roadmap',
      architecture_review: 'Architecture Deep Dive',
      exec_briefing: 'Executive Briefing',
      gap_analysis: 'Gap Analysis Document',
    };
    // Simple markdown → HTML conversion
    let html = markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
      .replace(/(<li>[^]*?<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(Boolean).map(c => c.trim());
        if (cells.every(c => c.match(/^[-:]+$/))) return '';
        return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
      })
      .replace(/(<tr>[^]*?<\/tr>\n?)+/g, '<table>$&</table>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>${titles[type] || type} — ${workshop.customerName}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;max-width:900px;margin:0 auto;padding:60px 40px;color:#1a1a2e;line-height:1.7;background:#fff}
h1{font-family:'Space Grotesk',sans-serif;color:#0A867F;font-size:28px;border-bottom:3px solid #0A867F;padding-bottom:12px;margin:40px 0 20px}
h2{font-family:'Space Grotesk',sans-serif;color:#1a1a2e;font-size:20px;margin:32px 0 12px;border-bottom:1px solid #e4e7ee;padding-bottom:8px}
h3{font-family:'Space Grotesk',sans-serif;color:#7c3aed;font-size:16px;margin:24px 0 8px}
p{margin:8px 0}
ul{padding-left:24px;margin:8px 0}
li{margin:4px 0}
strong{color:#0A867F}
table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
td{padding:8px 12px;border:1px solid #e4e7ee;vertical-align:top}
tr:first-child td{background:#f5f3ff;font-weight:600;color:#7c3aed}
.header{background:linear-gradient(135deg,#0B1120,#1a1a3e);color:#fff;padding:40px;margin:-60px -40px 40px;border-radius:0}
.header h1{color:#0FB5AD;border:none;margin:0 0 8px}
.header p{color:rgba(255,255,255,0.6);font-size:14px}
.meta{display:flex;gap:24px;margin-top:16px;font-size:12px;color:rgba(255,255,255,0.4)}
.meta span{padding:4px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px}
.footer{text-align:center;color:#888;font-size:11px;margin-top:60px;padding-top:20px;border-top:1px solid #e4e7ee}
@media print{body{padding:20px}.header{margin:-20px -20px 20px;padding:20px}h1{font-size:22px}h2{font-size:16px}}
</style></head><body>
<div class="header">
  <h1>${titles[type] || type}</h1>
  <p>${workshop.customerName} — ${workshop.title}</p>
  <div class="meta">
    <span>Readiness: ${stats.index}/100 (${stats.stage})</span>
    <span>Maturity: ${avgMaturity}/4</span>
    <span>${stats.gapCount} gaps (${criticalGaps.length} critical)</span>
    <span>${new Date().toLocaleDateString()}</span>
  </div>
</div>
<p>${html}</p>
<div class="footer">Generated by Galent SalesPilot · ${workshop.customerName} · Confidential</div>
</body></html>`;
  };

  const handleCopyAll = () => {
    const text = [
      `# ${workshop.customerName}: Assessment Findings & Recommendations`,
      `## ${workshop.title}`,
      `Generated: ${new Date().toLocaleDateString()} | Readiness Index: ${stats.index}/100 (${stats.stage})`,
      '',
      '---',
      '',
      '## Executive Summary',
      `Average Maturity: ${avgMaturity}/4 | Dimensions: ${stats.dimensionsScored}/${stats.totalDimensions} | Gaps: ${stats.gapCount} (${stats.priorityGapCount} priority)`,
      '',
      findings?.narrative || '',
      '',
      '## Critical Gaps',
      ...criticalGaps.map(g => `- **${g.dimensionName}**: ${MATURITY[g.current]} → ${MATURITY[g.target]} (Δ${g.gap})${g.finding ? `\n  ${g.finding.slice(0, 200)}` : ''}`),
      '',
      '## Strengths',
      ...strengthDims.map((d: any) => `- **${d.name}** (${d.levelName}): ${MATURITY[d.currentScore]}`),
      '',
      '## Recommendations',
      ...REC_CATEGORIES.map(cat => {
        const catRecs = allRecs.filter(r => r.category === cat.id);
        if (catRecs.length === 0) return '';
        return `\n### ${cat.label} (${cat.sublabel})\n${catRecs.map((r, i) => `${i + 1}. ${r.text}${(r as any).impact ? `\n   Impact: ${(r as any).impact}` : ''}`).join('\n')}`;
      }).filter(Boolean),
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (id: string) => setExpandedSection(expandedSection === id ? null : id);

  return (
    <div className="space-y-4">
      {/* ═══════ HEADER BAR ═══════ */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#0A867F]" />
            Assessment Findings Dashboard
          </h3>
          <p className="text-[10px] text-muted-foreground">Comprehensive analysis, gap intelligence, strategic recommendations & investment roadmap</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {findings && (
            <>
              <button onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
              <button onClick={() => {
                import('@/lib/workshop/export').then(({ generateFindingsHTML }) => {
                  const html = generateFindingsHTML(workshop, { recommendations: allRecs.map(r => r.text), narrative: findings?.narrative });
                  const w = window.open('', '_blank');
                  if (w) { w.document.write(html); w.document.close(); }
                });
              }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <Download className="h-3 w-3" /> HTML
              </button>
              <button onClick={() => {
                import('@/lib/workshop/export').then(({ generateFindingsHTML }) => {
                  const html = generateFindingsHTML(workshop, { recommendations: allRecs.map(r => r.text), narrative: findings?.narrative });
                  const w = window.open('', '_blank');
                  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
                });
              }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <FileText className="h-3 w-3" /> PDF
              </button>
            </>
          )}
          <button onClick={handleGenerateFindings} disabled={generating || stats.dimensionsScored === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A867F] text-white text-xs font-medium disabled:opacity-40 transition-colors hover:bg-[#0A867F]/90">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {findings ? 'Regenerate Analysis' : 'Generate Full Analysis'}
          </button>
        </div>
      </div>

      {/* ═══════ DELIVERABLE ASSETS ═══════ */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#7c3aed]" />
          <span className="text-sm font-semibold text-foreground">Deliverable Assets</span>
          <span className="text-[10px] text-muted-foreground ml-2">Generate comprehensive documents — each opens as a rich HTML report</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {[
            { id: 'assessment_report', label: 'Assessment Report', desc: '8-10 page full assessment with per-domain analysis', icon: BookOpen, color: '#0A867F' },
            { id: 'roadmap', label: 'Transformation Roadmap', desc: 'Phased roadmap with tracks, milestones, investment', icon: Compass, color: '#7c3aed' },
            { id: 'architecture_review', label: 'Architecture Deep Dive', desc: 'Technical architecture review with target state', icon: Layers, color: '#3b82f6' },
            { id: 'exec_briefing', label: 'Executive Briefing', desc: '2-page board-ready summary with investment ask', icon: Award, color: '#D97A2B' },
            { id: 'gap_analysis', label: 'Gap Analysis', desc: 'Per-dimension gap tables with closure plan', icon: AlertTriangle, color: '#C8472E' },
          ].map(asset => (
            <button key={asset.id} onClick={() => generateAsset(asset.id)}
              disabled={generatingAsset !== null || stats.dimensionsScored < 3}
              className="p-3 rounded-lg border border-border hover:border-opacity-60 text-left transition-all hover:bg-muted/10 disabled:opacity-40 group"
              style={{ borderColor: `${asset.color}20` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ backgroundColor: `${asset.color}15` }}>
                  {generatingAsset === asset.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: asset.color }} />
                  ) : (
                    <asset.icon className="h-3.5 w-3.5" style={{ color: asset.color }} />
                  )}
                </div>
                <span className="text-[10px] font-semibold text-foreground">{asset.label}</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-tight">{asset.desc}</p>
              {assets[asset.id] && (
                <div className="mt-1.5 flex items-center gap-1 text-[9px] text-emerald-400">
                  <CheckCircle className="h-2.5 w-2.5" /> Generated
                  <button onClick={(e) => {
                    e.stopPropagation();
                    const html = assetToHTML(asset.id, assets[asset.id]);
                    const w = window.open('', '_blank');
                    if (w) { w.document.write(html); w.document.close(); }
                  }} className="ml-auto text-[#7c3aed] hover:underline">View</button>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ EXECUTIVE HERO BANNER ═══════ */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0B1120 0%, #1a1a3e 50%, #0B1120 100%)' }}>
        <div className="p-6" style={{ backgroundImage: 'radial-gradient(80% 120% at 88% -20%, rgba(15,181,173,0.18), transparent 55%), radial-gradient(40% 80% at 10% 120%, rgba(124,58,237,0.1), transparent 50%)' }}>
          <div className="flex items-start gap-6 flex-wrap">
            {/* Readiness Score Dial */}
            <div className="text-center shrink-0">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#0FB5AD" strokeWidth="8"
                    strokeDasharray={`${stats.index * 2.64} ${264 - stats.index * 2.64}`}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold font-display text-[#0FB5AD]">{stats.index}</div>
                  <div className="text-[7px] font-mono uppercase tracking-wider text-[#0FB5AD]/60">INDEX</div>
                </div>
              </div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mt-1">{stats.stage}</div>
            </div>

            {/* Client Info + Key Metrics */}
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold font-display text-white">{workshop.customerName}</div>
              <div className="text-xs text-white/50 mt-0.5">{workshop.title}</div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Avg Maturity', value: `${avgMaturity}/4`, sub: MATURITY[Math.round(Number(avgMaturity))], icon: Gauge, color: '#0FB5AD' },
                  { label: 'Critical Gaps', value: criticalGaps.length.toString(), sub: `of ${gaps.length} total`, icon: Flame, color: '#C8472E' },
                  { label: 'Dimensions', value: `${stats.dimensionsScored}/${stats.totalDimensions}`, sub: `${Math.round(stats.dimensionsScored / Math.max(1, stats.totalDimensions) * 100)}% assessed`, icon: CircleDot, color: '#3b82f6' },
                  { label: 'Use Cases', value: stats.useCaseCount.toString(), sub: `${stats.pilotCount} pilots selected`, icon: Brain, color: '#7c3aed' },
                ].map(kpi => (
                  <div key={kpi.label} className="rounded-lg bg-white/5 px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <kpi.icon className="h-3 w-3" style={{ color: kpi.color }} />
                      <span className="text-[8px] font-mono uppercase tracking-wider text-white/40">{kpi.label}</span>
                    </div>
                    <div className="text-sm font-bold text-white font-display">{kpi.value}</div>
                    <div className="text-[9px] text-white/30">{kpi.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Severity Distribution */}
            <div className="shrink-0 w-36">
              <div className="text-[8px] font-mono uppercase tracking-wider text-white/40 mb-2">Gap Severity</div>
              {[
                { label: 'Critical', count: criticalGaps.length, color: '#C8472E', pct: gaps.length > 0 ? (criticalGaps.length / gaps.length) * 100 : 0 },
                { label: 'High', count: highGaps.length, color: '#D97A2B', pct: gaps.length > 0 ? (highGaps.length / gaps.length) * 100 : 0 },
                { label: 'Medium', count: mediumGaps.length, color: '#f59e0b', pct: gaps.length > 0 ? (mediumGaps.length / gaps.length) * 100 : 0 },
                { label: 'Low', count: lowGaps.length, color: '#22c55e', pct: gaps.length > 0 ? (lowGaps.length / gaps.length) * 100 : 0 },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] text-white/50 w-12">{s.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                  </div>
                  <span className="text-[9px] font-mono text-white/60 w-4 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ MATURITY DISTRIBUTION + STRENGTHS/WEAKNESSES ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Maturity Distribution */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3" /> Maturity Distribution
          </div>
          <div className="flex items-end justify-between h-28 px-2">
            {maturityDistribution.map((count, i) => {
              const maxCount = Math.max(...maturityDistribution, 1);
              const height = (count / maxCount) * 100;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-[9px] font-mono font-bold text-foreground">{count}</span>
                  <div className="w-full max-w-[28px] rounded-t-md transition-all duration-700"
                    style={{ height: `${Math.max(height, 4)}%`, backgroundColor: MATURITY_COLORS[i] }} />
                  <span className="text-[7px] font-mono text-muted-foreground text-center leading-tight">{MATURITY[i].slice(0, 6)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> Strengths ({strengthDims.length})
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {strengthDims.length === 0 ? (
              <div className="text-[10px] text-muted-foreground italic">No dimensions at Governed or above</div>
            ) : strengthDims.slice(0, 6).map((d: any) => (
              <div key={d.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MATURITY_COLORS[d.currentScore] }} />
                <span className="text-[10px] text-foreground flex-1 truncate">{d.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${MATURITY_COLORS[d.currentScore]}20`, color: MATURITY_COLORS[d.currentScore] }}>
                  {MATURITY[d.currentScore]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3" /> Attention Areas ({weaknessDims.length})
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {weaknessDims.length === 0 ? (
              <div className="text-[10px] text-muted-foreground italic">No dimensions at Ad hoc or below</div>
            ) : weaknessDims.slice(0, 6).map((d: any) => (
              <div key={d.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MATURITY_COLORS[d.currentScore] }} />
                <span className="text-[10px] text-foreground flex-1 truncate">{d.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${MATURITY_COLORS[d.currentScore]}20`, color: MATURITY_COLORS[d.currentScore] }}>
                  {MATURITY[d.currentScore]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ INFOGRAPHICS — Spine + Heatmap ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Readiness Spine
          </div>
          <ReadinessSpine levels={levels} />
        </div>
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Gap Heatmap
          </div>
          <GapHeatmap workshop={workshop} maxGaps={10} />
        </div>
      </div>

      {/* ═══════ DEEP LEVEL-BY-LEVEL ANALYSIS ═══════ */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <button onClick={() => toggleSection('levels')}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#3b82f6]" />
            <span className="text-sm font-semibold text-foreground">Deep Level Analysis</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6]">{levels.length} levels · {stats.totalDimensions} dimensions</span>
          </div>
          {expandedSection === 'levels' ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {expandedSection === 'levels' && (
          <div className="border-t border-border">
            {levels.map((level: any, li: number) => {
              const r = levelReadiness(level);
              const dims = level.dimensions || [];
              const scoredDims = dims.filter((d: any) => d.currentScore != null);
              const levelGaps = gaps.filter(g => g.levelId === level.id);
              const levelCritical = levelGaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority));
              const isExpanded = expandedLevel === level.id;

              return (
                <div key={level.id} className="border-b border-border last:border-b-0">
                  <button onClick={() => setExpandedLevel(isExpanded ? null : level.id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0B1120] flex items-center justify-center">
                        <span className="text-xs font-bold text-[#0FB5AD] font-display">{level.code || `L${li + 1}`}</span>
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-semibold text-foreground">{level.name}</div>
                        <div className="text-[10px] text-muted-foreground">{r.scored}/{r.total} scored · {levelGaps.length} gaps · Weight: {Math.round((level.weight || 1) / levels.reduce((s: number, l: any) => s + (l.weight || 1), 0) * 100)}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {levelCritical.length > 0 && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                          {levelCritical.length} critical
                        </span>
                      )}
                      {/* Mini bar chart */}
                      <div className="flex items-center gap-2 w-32">
                        <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden relative">
                          <div className="h-full rounded-full bg-[#0A867F] transition-all duration-700" style={{ width: `${r.currentPct}%` }} />
                          {r.targetPct > 0 && (
                            <div className="absolute top-0 h-full w-0.5 bg-[#D97A2B]" style={{ left: `${r.targetPct}%` }} />
                          )}
                        </div>
                        <span className="text-sm font-bold font-display text-[#0A867F] w-10 text-right">{r.currentPct}%</span>
                      </div>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-1">
                      {/* Dimension grid */}
                      <div className="grid gap-1.5">
                        {dims.map((dim: any) => {
                          const hasGap = dim.currentScore != null && dim.targetScore != null && dim.targetScore > dim.currentScore;
                          const gapSize = hasGap ? dim.targetScore - dim.currentScore : 0;
                          const riskLevel = gapSize >= 3 ? RISK_LEVELS[0] : gapSize >= 2 ? RISK_LEVELS[1] : gapSize >= 1 ? RISK_LEVELS[2] : RISK_LEVELS[3];

                          return (
                            <div key={dim.id}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${activeInsight === dim.id ? 'bg-muted/30 border border-border' : 'hover:bg-muted/10'}`}
                              onClick={() => setActiveInsight(activeInsight === dim.id ? null : dim.id)}>
                              {/* Score chips */}
                              <div className="flex items-center gap-1 shrink-0">
                                {[0, 1, 2, 3, 4].map(v => (
                                  <div key={v} className="w-4 h-4 rounded-sm text-[7px] font-bold flex items-center justify-center transition-all"
                                    style={{
                                      backgroundColor: dim.currentScore === v ? MATURITY_COLORS[v] : 'transparent',
                                      color: dim.currentScore === v ? '#fff' : '#666',
                                      border: dim.targetScore === v ? `2px solid ${MATURITY_COLORS[v]}` : '1px solid transparent',
                                    }}>
                                    {v}
                                  </div>
                                ))}
                              </div>
                              {/* Name */}
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-medium text-foreground">{dim.name}</span>
                                {dim.priority && <Flag className="inline h-2.5 w-2.5 text-[#D97A2B] ml-1" />}
                              </div>
                              {/* Gap indicator */}
                              {hasGap && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${riskLevel.bg} ${riskLevel.text}`}>
                                  Δ{gapSize} {riskLevel.label}
                                </span>
                              )}
                              {dim.currentScore != null && !hasGap && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">On target</span>
                              )}
                              {dim.currentScore == null && (
                                <span className="text-[9px] text-muted-foreground">Not scored</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Expanded insight for selected dimension */}
                      {activeInsight && dims.find((d: any) => d.id === activeInsight) && (() => {
                        const dim = dims.find((d: any) => d.id === activeInsight);
                        return (
                          <div className="mt-2 p-4 rounded-lg bg-muted/20 border border-border/50 animate-in slide-in-from-top-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Diagnostic Probe</div>
                                <div className="text-[10px] text-foreground italic">{dim.probe || 'No probe defined'}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Assessment Finding</div>
                                <div className="text-[10px] text-foreground">{dim.finding?.body || 'No finding recorded'}</div>
                              </div>
                              {dim.currentScore != null && dim.targetScore != null && dim.targetScore > dim.currentScore && (
                                <div className="md:col-span-2">
                                  <div className="text-[9px] font-mono uppercase tracking-wider text-[#D97A2B] mb-1">Gap Implication</div>
                                  <div className="text-[10px] text-foreground">
                                    Moving from <strong>{MATURITY[dim.currentScore]}</strong> to <strong>{MATURITY[dim.targetScore]}</strong> requires
                                    closing a {dim.targetScore - dim.currentScore}-step gap.
                                    {dim.finding?.implication || ''}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════ WORKSTREAM IMPACT ANALYSIS ═══════ */}
      {rollups.length > 0 && (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <button onClick={() => toggleSection('workstreams')}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-[#7c3aed]" />
              <span className="text-sm font-semibold text-foreground">Workstream Impact Analysis</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed]">{rollups.length} impacted</span>
            </div>
            {expandedSection === 'workstreams' ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {expandedSection === 'workstreams' && (
            <div className="border-t border-border p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rollups.map(ws => (
                  <div key={ws.code} className="p-4 rounded-lg border border-border hover:border-[#7c3aed]/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-xs font-semibold text-foreground">{ws.name}</div>
                        <div className="text-[9px] text-muted-foreground">{ws.code} · {ws.gaps.length} gaps · {ws.totalEffort} effort pts</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {ws.phases.map(p => (
                          <span key={p} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed]">{p}</span>
                        ))}
                      </div>
                    </div>
                    {/* Mini gap list */}
                    {ws.gaps.slice(0, 4).map(g => (
                      <div key={g.dimensionId} className="flex items-center gap-2 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.gap >= 3 ? '#C8472E' : g.gap >= 2 ? '#D97A2B' : '#f59e0b' }} />
                        <span className="text-[10px] text-foreground flex-1 truncate">{g.dimensionName}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{MATURITY[g.current].slice(0, 3)} → {MATURITY[g.target].slice(0, 3)}</span>
                      </div>
                    ))}
                    {ws.gaps.length > 4 && (
                      <div className="text-[9px] text-muted-foreground mt-1 pl-3.5">+{ws.gaps.length - 4} more</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ AI CURRENT STATE NARRATIVE ═══════ */}
      {findings && (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <button onClick={() => toggleSection('narrative')}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0A867F]" />
              <span className="text-sm font-semibold text-foreground">AI Current-State Assessment</span>
              <span className="text-[9px] text-muted-foreground">Generated {new Date(findings.generatedAt).toLocaleString()}</span>
            </div>
            {expandedSection === 'narrative' ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {expandedSection === 'narrative' && (
            <div className="border-t border-border p-5">
              <div className="text-xs text-foreground leading-relaxed whitespace-pre-line max-w-none prose prose-sm"
                style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {findings.narrative}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ STRATEGIC RECOMMENDATIONS ENGINE ═══════ */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[#7c3aed]" />
            <span className="text-sm font-semibold text-foreground">Strategic Recommendations</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed]">{allRecs.length} recommendations</span>
          </div>
          <button onClick={handleGenerateRecs} disabled={generatingRecs || stats.dimensionsScored === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium disabled:opacity-40 transition-colors hover:bg-[#6d28d9]">
            {generatingRecs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
            {aiRecs.length > 0 ? 'Regenerate' : 'AI Generate Deep Recommendations'}
          </button>
        </div>

        <div className="p-5">
          {/* Category cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {recsByCategory.map(cat => (
              <div key={cat.id} className="p-3 rounded-lg border border-border hover:border-opacity-50 transition-colors"
                style={{ borderColor: `${cat.color}30` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                    <cat.icon className="h-3.5 w-3.5" style={{ color: cat.color }} />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-foreground">{cat.label}</div>
                    <div className="text-[8px] text-muted-foreground">{cat.sublabel}</div>
                  </div>
                  <span className="ml-auto text-[10px] font-mono font-bold" style={{ color: cat.color }}>{cat.recs.length}</span>
                </div>
                <div className="text-[9px] text-muted-foreground">{cat.desc}</div>
              </div>
            ))}
          </div>

          {/* Recommendation list by category */}
          {recsByCategory.map(cat => cat.recs.length > 0 && (
            <div key={cat.id} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[10px] font-mono uppercase tracking-wider font-medium" style={{ color: cat.color }}>{cat.label}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: `${cat.color}20` }} />
              </div>
              <div className="space-y-2 pl-5">
                {cat.recs.map((rec: any, i: number) => (
                  <div key={i} className="group relative p-3 rounded-lg hover:bg-muted/20 transition-colors border border-transparent hover:border-border">
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-foreground leading-relaxed">{rec.text}</div>
                        {/* Rich metadata for AI recs */}
                        {rec.impact && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {rec.impact && (
                              <div className="text-[9px]">
                                <span className="text-muted-foreground">Impact: </span>
                                <span className="text-foreground">{rec.impact}</span>
                              </div>
                            )}
                            {rec.effort && (
                              <div className="text-[9px]">
                                <span className="text-muted-foreground">Effort: </span>
                                <span className={`font-medium ${rec.effort === 'low' ? 'text-emerald-400' : rec.effort === 'high' ? 'text-red-400' : 'text-amber-400'}`}>
                                  {rec.effort.charAt(0).toUpperCase() + rec.effort.slice(1)}
                                </span>
                              </div>
                            )}
                            {rec.kpis && (
                              <div className="text-[9px]">
                                <span className="text-muted-foreground">KPIs: </span>
                                <span className="text-foreground">{rec.kpis}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {rec.dependencies && (
                          <div className="mt-1 text-[9px]">
                            <span className="text-muted-foreground">Dependencies: </span>
                            <span className="text-foreground">{rec.dependencies}</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => {
                        if (rec.aiGenerated) {
                          setAiRecs(prev => prev.filter((_, j) => j !== i));
                        } else {
                          setCustomRecs(prev => prev.filter((_, j) => j !== (i - aiRecs.filter(r => r.category === cat.id).length)));
                        }
                      }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 transition-all shrink-0">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Manual add */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <select value={newRecCat} onChange={e => setNewRecCat(e.target.value)}
              className="px-2 py-2 text-[10px] bg-card border border-border rounded-lg text-foreground">
              {REC_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input value={newRec} onChange={e => setNewRec(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newRec.trim()) { setCustomRecs(prev => [...prev, { text: newRec.trim(), category: newRecCat }]); setNewRec(''); } }}
              placeholder="Add a recommendation..."
              className="flex-1 px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            <button onClick={() => {
              if (!newRec.trim()) return;
              setCustomRecs(prev => [...prev, { text: newRec.trim(), category: newRecCat }]);
              setNewRec('');
            }} disabled={!newRec.trim()}
              className="px-3 py-2 text-[10px] rounded-lg bg-[#7c3aed] text-white font-medium disabled:opacity-40">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ INVESTMENT ROADMAP ═══════ */}
      {(scopeItems.length > 0 || rollups.length > 0) && (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <button onClick={() => toggleSection('roadmap')}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#f59e0b]" />
              <span className="text-sm font-semibold text-foreground">Investment & Phasing Roadmap</span>
            </div>
            {expandedSection === 'roadmap' ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {expandedSection === 'roadmap' && (
            <div className="border-t border-border p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['P1', 'P2', 'P3'].map((phase, pi) => {
                  const phaseScope = scopeItems.filter((s: any) => (s.phase || 'P1') === phase);
                  const phaseGaps = pi === 0 ? criticalGaps : pi === 1 ? highGaps : [...mediumGaps, ...lowGaps];
                  const phaseEffort = phaseScope.reduce((s: number, i: any) => s + (i.effort || 0), 0);
                  const phaseLabels = ['Immediate (0-3 months)', 'Near-term (3-6 months)', 'Strategic (6-12 months)'];
                  const phaseColors = ['#C8472E', '#D97A2B', '#3b82f6'];

                  return (
                    <div key={phase} className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: phaseColors[pi] }}>
                          {phase}
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold text-foreground">{phaseLabels[pi]}</div>
                          <div className="text-[9px] text-muted-foreground">
                            {phaseScope.length > 0 ? `${phaseScope.length} scope items · ${phaseEffort} pts` : `${phaseGaps.length} gaps to address`}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {(phaseScope.length > 0 ? phaseScope : phaseGaps).slice(0, 5).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-[10px]">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phaseColors[pi] }} />
                            <span className="text-foreground truncate">{item.title || item.dimensionName}</span>
                          </div>
                        ))}
                        {(phaseScope.length > 0 ? phaseScope : phaseGaps).length > 5 && (
                          <div className="text-[9px] text-muted-foreground pl-3.5">+{(phaseScope.length > 0 ? phaseScope : phaseGaps).length - 5} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ READINESS CHECKLIST ═══════ */}
      <div className="p-4 rounded-xl bg-secondary/20 border border-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Findings Completeness</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: 'Assessment Coverage', done: stats.dimensionsScored >= stats.totalDimensions * 0.7, value: `${Math.round(stats.dimensionsScored / Math.max(1, stats.totalDimensions) * 100)}%` },
            { label: 'Findings Documented', done: levels.flatMap((l: any) => l.dimensions || []).filter((d: any) => d.finding?.body).length > 3, value: `${levels.flatMap((l: any) => l.dimensions || []).filter((d: any) => d.finding?.body).length} captured` },
            { label: 'AI Analysis', done: !!findings, value: findings ? 'Complete' : 'Pending' },
            { label: 'Recommendations', done: allRecs.length >= 5, value: `${allRecs.length} recs` },
            { label: 'Export Ready', done: !!findings && allRecs.length >= 3 && stats.dimensionsScored >= stats.totalDimensions * 0.5, value: (!!findings && allRecs.length >= 3) ? 'Ready' : 'Not yet' },
          ].map(gate => (
            <div key={gate.label} className="flex items-center gap-2 text-xs">
              {gate.done ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-border shrink-0" />}
              <div>
                <div className={gate.done ? 'text-foreground' : 'text-muted-foreground'}>{gate.label}</div>
                <div className="text-[9px] text-muted-foreground">{gate.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
