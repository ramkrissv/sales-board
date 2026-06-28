/**
 * Workshop AI Assist Registry — centralized, typed, logged.
 * Every AI call routes through here with model selection, output validation, and interaction logging.
 */
import { z } from 'zod';
import type { Workshop, WorkshopDimension, WorkshopLevel } from './types';

// ── Assist definition ──

export interface AssistContext {
  workshopId: string;
  customerName: string;
  title: string;
  framework: any;
  meta?: any;
}

export interface AssistDefinition<I = any, O = any> {
  key: string;
  model: 'claude-sonnet-4-6' | 'claude-opus-4-8' | 'claude-haiku-4-5';
  stream: boolean;
  description: string;
  buildPrompt: (ctx: AssistContext, input: I) => string;
  schema?: z.ZodSchema<O>;
}

// ── Registry ──

const REGISTRY: Record<string, AssistDefinition> = {};

export function registerAssist<I, O>(assist: AssistDefinition<I, O>) {
  REGISTRY[assist.key] = assist as any;
}

export function getAssist(key: string): AssistDefinition | undefined {
  return REGISTRY[key];
}

export function listAssists(): AssistDefinition[] {
  return Object.values(REGISTRY);
}

// ── Maturity labels ──
import { MATURITY_LABELS as MATURITY } from './constants';

// ── Register all assists ──

registerAssist({
  key: 'finding.synthesize',
  model: 'claude-sonnet-4-6',
  stream: false,
  description: 'Synthesize raw room notes into a crisp finding + implication + suggested scores',
  buildPrompt: (ctx, input: { dimensionName: string; probe: string; notes: string; currentScore?: number; targetScore?: number }) =>
    `Synthesize this assessment finding for "${input.dimensionName}" at ${ctx.customerName}.

PROBE: ${input.probe}
RAW NOTES: ${input.notes}

Return JSON only: {"finding":"<crisp 2-3 sentence finding>","implication":"<the so-what>","suggestedCurrent":${input.currentScore ?? 'null'},"suggestedTarget":${input.targetScore ?? 'null'},"rationale":"<why these scores>"}`,
  schema: z.object({
    finding: z.string(),
    implication: z.string(),
    suggestedCurrent: z.number().nullable(),
    suggestedTarget: z.number().nullable(),
    rationale: z.string(),
  }),
});

registerAssist({
  key: 'dimension.detail',
  model: 'claude-sonnet-4-6',
  stream: false,
  description: 'Expand a dimension into 4-6 sub-rubric items for deeper assessment',
  buildPrompt: (ctx, input: { dimensionId: string; dimensionName: string; probe: string; finding?: string }) =>
    `Detail "${input.dimensionName}" into 4-6 sub-rubric items for ${ctx.customerName}. Each should be specific and assessable.

PROBE: ${input.probe}
${input.finding ? `FINDING: ${input.finding}` : ''}

Return JSON only: {"items":[{"label":"<label>","body":"<specific criterion>","kind":"subrubric"}]}`,
  schema: z.object({ items: z.array(z.object({ label: z.string(), body: z.string(), kind: z.string() })) }),
});

registerAssist({
  key: 'dimension.suggest',
  model: 'claude-sonnet-4-6',
  stream: false,
  description: 'Suggest additional dimensions for a level based on existing ones',
  buildPrompt: (ctx, input: { levelName: string; existingDims: string[] }) =>
    `Suggest 5 additional assessment dimensions for "${input.levelName}" at ${ctx.customerName}.
Existing: ${input.existingDims.join(', ')}
Consider cross-domain aspects (security, data, people, process, tooling).
Return JSON only: {"suggestions":[{"name":"<name>","probe":"<diagnostic question>","rationale":"<why this matters>"}]}`,
  schema: z.object({ suggestions: z.array(z.object({ name: z.string(), probe: z.string(), rationale: z.string() })) }),
});

registerAssist({
  key: 'gap.narrative',
  model: 'claude-sonnet-4-6',
  stream: false,
  description: 'Generate implication-first gap story for a scored dimension',
  buildPrompt: (ctx, input: { dimensionName: string; current: number; target: number; finding?: string }) =>
    `Write a concise implication-first gap narrative for "${input.dimensionName}" at ${ctx.customerName}.
Current: ${MATURITY[input.current]} (${input.current}) → Target: ${MATURITY[input.target]} (${input.target})
${input.finding ? `Finding: ${input.finding}` : ''}
Format: 2-3 sentences. Start with the business implication, then the gap, then what needs to change. No JSON.`,
});

registerAssist({
  key: 'usecase.enrich',
  model: 'claude-sonnet-4-6',
  stream: false,
  description: 'Expand a one-line use case into full details with value/feasibility rationale',
  buildPrompt: (ctx, input: { name: string; sponsor?: string }) =>
    `Expand this use case for ${ctx.customerName}: "${input.name}"${input.sponsor ? ` (sponsor: ${input.sponsor})` : ''}
Return JSON only: {"problem":"<problem statement>","valueRationale":"<why valuable>","feasibilityRationale":"<why feasible or not>","suggestedValue":3,"suggestedFeasibility":3}`,
  schema: z.object({ problem: z.string(), valueRationale: z.string(), feasibilityRationale: z.string(), suggestedValue: z.number(), suggestedFeasibility: z.number() }),
});

registerAssist({
  key: 'pilot.recommend',
  model: 'claude-opus-4-8',
  stream: false,
  description: 'Recommend 2-3 pilots from the use case set with reasoning',
  buildPrompt: (ctx, input: { useCases: { name: string; value: number; feasibility: number }[] }) =>
    `From these use cases for ${ctx.customerName}, recommend the top 2-3 for funded pilots with reasoning:
${input.useCases.map((uc, i) => `${i + 1}. ${uc.name} (Value:${uc.value} Feasibility:${uc.feasibility})`).join('\n')}
Return JSON only: {"pilots":[{"name":"<use case name>","reasoning":"<why this should be a pilot>","sequence":<1|2|3>}]}`,
  schema: z.object({ pilots: z.array(z.object({ name: z.string(), reasoning: z.string(), sequence: z.number() })) }),
});

registerAssist({
  key: 'scope.synthesize',
  model: 'claude-opus-4-8',
  stream: false,
  description: 'Convert gaps into scope items with effort estimates and phasing',
  buildPrompt: (ctx, input: { gaps: { dimId: string; dimName: string; wsCode: string; current: number; target: number; priority: boolean; finding?: string }[]; workstreams: { code: string; name: string }[] }) =>
    `Convert these assessment gaps into scope items for ${ctx.customerName}:
GAPS:
${input.gaps.map(g => `${g.dimId} ${g.dimName} [${g.wsCode}] ${MATURITY[g.current]}→${MATURITY[g.target]}${g.priority ? ' ★priority' : ''}${g.finding ? ': ' + g.finding.slice(0, 80) : ''}`).join('\n')}
WORKSTREAMS: ${input.workstreams.map(ws => `${ws.code}: ${ws.name}`).join(', ')}
Also recommend execution model per workstream: pod_squad|managed_capacity|outcome_based|ai_stream|hybrid
Return JSON only: {"items":[{"workstreamCode":"WS1","title":"<action title>","description":"<1 sentence>","effort":5,"phase":"P1","sourceDimensionId":"1.1","executionModel":"pod_squad"}]}`,
  schema: z.object({ items: z.array(z.object({ workstreamCode: z.string(), title: z.string(), description: z.string(), effort: z.number(), phase: z.string(), sourceDimensionId: z.string().nullable(), executionModel: z.string().optional() })) }),
});

registerAssist({
  key: 'currentstate.narrative',
  model: 'claude-opus-4-8',
  stream: true,
  description: 'Generate MECE current-state assessment section from all findings',
  buildPrompt: (ctx, input: { levels: { name: string; readiness: number; dims: { name: string; score: number; finding?: string }[] }[] }) =>
    `Write a McKinsey-grade current-state assessment for ${ctx.customerName}. MECE structure, implication-first.
${input.levels.map(l => `\n${l.name} (${l.readiness}% readiness):\n${l.dims.map(d => `  ${d.name}: ${MATURITY[d.score]}${d.finding ? ' — ' + d.finding.slice(0, 100) : ''}`).join('\n')}`).join('\n')}
Write in consulting register. 3-4 paragraphs. Reference specific dimensions and scores. Markdown.`,
});

registerAssist({
  key: 'proposal.generate',
  model: 'claude-opus-4-8',
  stream: false,
  description: 'Generate full commercial proposal from scope + workstreams',
  buildPrompt: (ctx, input: { index: number; stage: string; modules: any[]; pilots: any[] }) =>
    `Write a McKinsey-grade commercial proposal for ${ctx.customerName}.
Readiness: ${input.index}/100 (${input.stage})
SCOPE: ${JSON.stringify(input.modules, null, 2)}
PILOTS: ${input.pilots.map((p: any) => p.name).join(', ') || 'None'}
Return JSON: {"title":"<title>","execSummary":"<2-3 paragraphs>","modules":[{"workstreamCode":"WS1","workstreamName":"<name>","objective":"<obj>","currentState":"<what we found>","recommendation":"<what to do>","scopeItems":["<item>"],"executionModel":"<model>","effort":10,"phase":"P1","rationale":"<so-what>"}],"investmentSummary":"<total>","nextSteps":["<step>"]}`,
});

registerAssist({
  key: 'exec.summary',
  model: 'claude-opus-4-8',
  stream: true,
  description: 'Generate board-ready 1-page executive summary',
  buildPrompt: (ctx, input: { index: number; stage: string; topGaps: string[]; proposalTitle: string }) =>
    `Write a board-ready 1-page executive summary for ${ctx.customerName}.
Readiness: ${input.index}/100 (${input.stage})
Top gaps: ${input.topGaps.join(', ')}
Proposal: ${input.proposalTitle}
Be concise, implication-first, actionable. 3-4 paragraphs. Markdown.`,
});

registerAssist({
  key: 'consistency.check',
  model: 'claude-sonnet-4-6',
  stream: false,
  description: 'Flag contradictions between scores and findings',
  buildPrompt: (ctx, input: { dimensions: { id: string; name: string; score: number; finding?: string }[] }) =>
    `Check for contradictions between scores and findings for ${ctx.customerName}:
${input.dimensions.map(d => `${d.id} ${d.name}: Score=${MATURITY[d.score]} | Finding: ${d.finding || 'none'}`).join('\n')}
Flag any inconsistencies where the score doesn't match the finding. Return JSON: {"issues":[{"dimensionId":"1.1","issue":"<what's contradictory>","suggestion":"<how to fix>"}]}`,
  schema: z.object({ issues: z.array(z.object({ dimensionId: z.string(), issue: z.string(), suggestion: z.string() })) }),
});

registerAssist({
  key: 'deep.discovery',
  model: 'claude-opus-4-8',
  stream: false,
  description: 'Exhaustive deep-dive analysis of a dimension with sub-sections and micro-assessments',
  buildPrompt: (ctx, input: { dimensionName: string; currentScore?: number; targetScore?: number; finding?: string }) =>
    `Perform an exhaustive deep-dive on "${input.dimensionName}" for ${ctx.customerName}.
Current: ${input.currentScore != null ? MATURITY[input.currentScore] : 'Not scored'}
Target: ${input.targetScore != null ? MATURITY[input.targetScore] : 'Not set'}
${input.finding ? `Finding: ${input.finding}` : ''}
Return JSON (no markdown): {"summary":"<2 sentence>","maturityIndicators":{"strengths":["<x>"],"gaps":["<x>"],"risks":["<x>"]},"subSections":[{"id":"s1","category":"technical|organizational|process|governance|people","title":"<name>","description":"<covers>","currentState":"<where they are>","targetState":"<where to be>","microAssessments":[{"item":"<thing>","status":"green|amber|red|unknown","note":"<brief>"}],"bestPractices":["<practice>"],"recommendations":["<action>"]}],"industryBenchmark":"<comparison>","quickWins":["<win>"],"strategicMoves":["<move>"]}
Generate 4-6 sub-sections, 3-5 micro-assessments each.`,
});
