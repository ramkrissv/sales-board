/**
 * Agent Coordinator — Orchestration layer for composable agent workflows
 *
 * Architecture:
 * - Workflows: predefined chains of agents with context passing
 * - Events: agent outputs trigger downstream agents automatically
 * - Context: shared memory between agents in a workflow
 * - Composability: any agent output can feed into any other agent
 *
 * Example flow:
 *   deal-coach analyzes deal → detects competitor → competitive-intel runs →
 *   finds positioning → enablement-agent generates talk track →
 *   outreach-agent drafts email with positioning
 */

import { runAgent, type AgentRun } from './harness';
import { DEFAULT_AGENT_CONFIGS } from '@/lib/ai/config';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';

// ── Types ──

export interface WorkflowStep {
  agentId: string;
  goalTemplate: string; // Supports {{context.xxx}} interpolation
  condition?: (context: WorkflowContext) => boolean; // Skip step if false
  extractContext?: (result: AgentRun) => Record<string, any>; // Pull data from result for next step
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: string; // What triggers this workflow
  steps: WorkflowStep[];
}

export interface WorkflowContext {
  opportunityId?: string;
  customerName?: string;
  dealStage?: string;
  previousResults: AgentRun[];
  extractedData: Record<string, any>;
  [key: string]: any;
}

export interface WorkflowRun {
  workflowId: string;
  workflowName: string;
  context: WorkflowContext;
  steps: {
    agentId: string;
    status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
    result?: AgentRun;
    error?: string;
    startedAt?: string;
    completedAt?: string;
  }[];
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

// ── Template interpolation ──
function interpolate(template: string, context: WorkflowContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const keys = key.trim().split('.');
    let val: any = context;
    for (const k of keys) {
      val = val?.[k];
    }
    if (val === undefined || val === null) return key;
    if (typeof val === 'object') return JSON.stringify(val).slice(0, 500);
    return String(val);
  });
}

// ── Extract key signals from agent output ──
function extractSignals(result: AgentRun): Record<string, any> {
  const answer = result.finalAnswer || '';
  const signals: Record<string, any> = {};

  // Extract competitor names
  const compMatch = answer.match(/competitor[s]?[:\s]+([^.]+)/i);
  if (compMatch) signals.competitors = compMatch[1].trim();

  // Extract risk level
  if (/critical|urgent|high.risk/i.test(answer)) signals.riskLevel = 'high';
  else if (/medium.risk|concern|attention/i.test(answer)) signals.riskLevel = 'medium';
  else signals.riskLevel = 'low';

  // Extract deal names mentioned
  const dealMentions: string[] = [];
  for (const call of result.toolCalls) {
    if (call.tool === 'get_opportunity' && call.result?.customerName) {
      dealMentions.push(call.result.customerName);
    }
  }
  if (dealMentions.length > 0) signals.dealsAnalyzed = dealMentions;

  // Extract action items
  const actions: string[] = [];
  const lines = answer.split('\n');
  for (const line of lines) {
    if (/^\d+[\.\)]\s/.test(line.trim())) {
      actions.push(line.trim().replace(/^\d+[\.\)]\s*/, ''));
    }
  }
  if (actions.length > 0) signals.actionItems = actions;

  // Extract summary (first substantial line)
  const summaryLine = lines.find(l => l.trim().length > 20 && !/^\d/.test(l.trim()));
  if (summaryLine) signals.summary = summaryLine.trim().slice(0, 200);

  return signals;
}

// ── Predefined Workflows ──

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'deal-deep-dive',
    name: 'Deal Deep Dive',
    description: 'Full analysis: health check → account research → competitive scan → coaching tips',
    trigger: 'manual',
    steps: [
      {
        agentId: 'deal-coach',
        goalTemplate: 'Analyze the deal for {{customerName}}. Check health score, stakeholder engagement, activity recency, and stage readiness. List top 3 risks and actions.',
        extractContext: (r) => extractSignals(r),
      },
      {
        agentId: 'account-intelligence',
        goalTemplate: 'Research {{customerName}}. Find company info, recent news, tech stack, key decision makers. Previous analysis found: {{extractedData.summary}}',
        extractContext: (r) => ({ accountIntel: extractSignals(r).summary }),
      },
      {
        agentId: 'competitive-intel',
        goalTemplate: 'Scan for competitors on the {{customerName}} deal. Context: {{extractedData.accountIntel}}. Check conversation logs for competitor mentions.',
        condition: (ctx) => ctx.extractedData.riskLevel !== 'low',
        extractContext: (r) => ({ competitiveIntel: extractSignals(r).summary }),
      },
      {
        agentId: 'enablement-agent',
        goalTemplate: 'Based on analysis of {{customerName}}: {{extractedData.summary}}. Competitive context: {{extractedData.competitiveIntel}}. Provide coaching: objection handling, positioning, talk track for the next meeting.',
      },
    ],
  },
  {
    id: 'proposal-accelerator',
    name: 'Proposal Accelerator',
    description: 'Research → proposal draft → pricing suggestion → follow-up email',
    trigger: 'manual',
    steps: [
      {
        agentId: 'account-intelligence',
        goalTemplate: 'Research {{customerName}} for proposal preparation. Find their pain points, tech stack, budget signals, and key stakeholders.',
        extractContext: (r) => extractSignals(r),
      },
      {
        agentId: 'proposal-drafter',
        goalTemplate: 'Draft a proposal for {{customerName}}. Account context: {{extractedData.summary}}. Include exec summary, scope, team, timeline, and pricing structure.',
        extractContext: (r) => ({ proposalDraft: extractSignals(r).summary }),
      },
      {
        agentId: 'outreach-agent',
        goalTemplate: 'Draft a proposal cover email for {{customerName}}. The proposal covers: {{extractedData.proposalDraft}}. Make it executive-level, reference their specific needs.',
      },
    ],
  },
  {
    id: 'pipeline-health',
    name: 'Pipeline Health Check',
    description: 'Hygiene scan → at-risk identification → forecast update → action plan',
    trigger: 'scheduled',
    steps: [
      {
        agentId: 'hygiene-agent',
        goalTemplate: 'Scan the full pipeline. Find stale deals (>14 days no activity), missing decision makers, $0 TCV deals, and data quality issues.',
        extractContext: (r) => extractSignals(r),
      },
      {
        agentId: 'deal-coach',
        goalTemplate: 'Based on hygiene scan: {{extractedData.summary}}. For each at-risk deal, suggest specific recovery actions. Create tasks for the top 3 most urgent.',
        extractContext: (r) => ({ recoveryPlan: extractSignals(r).actionItems }),
      },
      {
        agentId: 'forecast-agent',
        goalTemplate: 'Generate an updated forecast. Factor in the risks found: {{extractedData.summary}}. Categorize deals as Commit, Best Case, Pipeline, or Omitted.',
      },
    ],
  },
  {
    id: 'new-lead-enrichment',
    name: 'New Lead Enrichment',
    description: 'Research company → find contacts → qualify fit → suggest outreach',
    trigger: 'on_lead_create',
    steps: [
      {
        agentId: 'account-intelligence',
        goalTemplate: 'Research {{customerName}} as a new lead. Find company size, industry, tech stack, recent funding/news, and potential decision makers.',
        extractContext: (r) => extractSignals(r),
      },
      {
        agentId: 'deal-coach',
        goalTemplate: 'Qualify this lead: {{customerName}}. Account intel: {{extractedData.summary}}. Score ICP fit, assess timing, and recommend engagement strategy.',
        extractContext: (r) => ({ qualification: extractSignals(r).summary }),
      },
      {
        agentId: 'outreach-agent',
        goalTemplate: 'Draft an initial outreach email to {{customerName}}. They are a {{extractedData.riskLevel}} priority lead. Context: {{extractedData.qualification}}. Use a warm, consultative tone.',
      },
    ],
  },
  {
    id: 'deal-rescue',
    name: 'Deal Rescue',
    description: 'Diagnose stall → competitive check → coaching → recovery email',
    trigger: 'on_deal_stale',
    steps: [
      {
        agentId: 'deal-coach',
        goalTemplate: 'This deal with {{customerName}} has been stuck in {{dealStage}} for too long. Diagnose why. Check stakeholder engagement, missing info, and blockers.',
        extractContext: (r) => extractSignals(r),
      },
      {
        agentId: 'competitive-intel',
        goalTemplate: 'Check if {{customerName}} is evaluating competitors. Scan conversation logs for any competitive mentions or comparison signals.',
        condition: (ctx) => ctx.extractedData.riskLevel === 'high',
        extractContext: (r) => ({ competitorInfo: extractSignals(r).summary }),
      },
      {
        agentId: 'enablement-agent',
        goalTemplate: 'This stalled deal with {{customerName}} needs rescue. Diagnosis: {{extractedData.summary}}. Competitive context: {{extractedData.competitorInfo}}. Suggest recovery strategy and talking points.',
        extractContext: (r) => ({ recoveryStrategy: extractSignals(r).summary }),
      },
      {
        agentId: 'outreach-agent',
        goalTemplate: 'Draft a re-engagement email for {{customerName}}. The deal is stalled in {{dealStage}}. Recovery strategy: {{extractedData.recoveryStrategy}}. Tone: helpful, not pushy.',
      },
    ],
  },
  {
    id: 'growth-play',
    name: 'Growth & Expansion Play',
    description: 'Whitespace analysis → service mapping → expansion proposal → outreach',
    trigger: 'manual',
    steps: [
      {
        agentId: 'growth-agent',
        goalTemplate: 'Analyze {{customerName}} for expansion opportunities. Map current services vs potential whitespace. Calculate ARR uplift potential.',
        extractContext: (r) => extractSignals(r),
      },
      {
        agentId: 'account-intelligence',
        goalTemplate: 'Deep dive on {{customerName}} expansion potential. Growth analysis found: {{extractedData.summary}}. Research their roadmap, hiring, and tech investments.',
        extractContext: (r) => ({ expansionIntel: extractSignals(r).summary }),
      },
      {
        agentId: 'proposal-drafter',
        goalTemplate: 'Draft an expansion proposal for {{customerName}}. Whitespace: {{extractedData.summary}}. Intel: {{extractedData.expansionIntel}}. Focus on cross-sell services.',
      },
    ],
  },
];

// ── Coordinator: Execute a workflow ──

export async function runWorkflow(
  workflowId: string,
  initialContext: Partial<WorkflowContext>
): Promise<WorkflowRun> {
  const workflow = WORKFLOWS.find(w => w.id === workflowId);
  if (!workflow) throw new Error(`Workflow '${workflowId}' not found`);

  const context: WorkflowContext = {
    opportunityId: initialContext.opportunityId,
    customerName: initialContext.customerName || '',
    dealStage: initialContext.dealStage,
    previousResults: [],
    extractedData: {},
    ...initialContext,
  };

  // If we have an opportunity ID, enrich context from DB
  if (context.opportunityId) {
    await connectDB();
    const Opp = mongoose.models.Opportunity;
    if (Opp) {
      const opp = await Opp.findOne({ id: context.opportunityId }).lean();
      if (opp) {
        context.customerName = (opp as any).customerName || context.customerName;
        context.dealStage = (opp as any).status || context.dealStage;
      }
    }
  }

  const run: WorkflowRun = {
    workflowId: workflow.id,
    workflowName: workflow.name,
    context,
    steps: workflow.steps.map(s => ({ agentId: s.agentId, status: 'pending' as const })),
    status: 'running',
    startedAt: new Date().toISOString(),
  };

  // Execute steps sequentially
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const runStep = run.steps[i];

    // Check condition
    if (step.condition && !step.condition(context)) {
      runStep.status = 'skipped';
      continue;
    }

    runStep.status = 'running';
    runStep.startedAt = new Date().toISOString();

    try {
      const agentConfig = DEFAULT_AGENT_CONFIGS.find(a => a.id === step.agentId);
      if (!agentConfig) throw new Error(`Agent '${step.agentId}' not found`);

      // Interpolate goal with context
      const goal = interpolate(step.goalTemplate, context);

      // Add opportunity focus if available
      const fullGoal = context.opportunityId
        ? `${goal}\n\nFocus on opportunity ID: ${context.opportunityId}`
        : goal;

      // Run agent
      const result = await runAgent(
        step.agentId,
        fullGoal,
        agentConfig.systemPrompt + '\n\nYou are part of a multi-agent workflow. Be specific and actionable. Reference deal names and dollar amounts.',
        5,
      );

      runStep.result = result;
      runStep.status = 'completed';
      runStep.completedAt = new Date().toISOString();

      // Extract context for next step
      context.previousResults.push(result);
      if (step.extractContext) {
        const extracted = step.extractContext(result);
        context.extractedData = { ...context.extractedData, ...extracted };
      }
    } catch (error: any) {
      runStep.status = 'failed';
      runStep.error = error.message;
      // Continue to next step on failure (graceful degradation)
    }
  }

  run.status = run.steps.some(s => s.status === 'failed') && run.steps.every(s => s.status === 'failed')
    ? 'failed'
    : 'completed';
  run.completedAt = new Date().toISOString();

  // Log the workflow run as activity
  try {
    await connectDB();
    const Activity = mongoose.models.Activity;
    if (Activity) {
      await Activity.create({
        type: 'ai_analysis',
        entityType: context.opportunityId ? 'opportunity' : 'system',
        entityId: context.opportunityId || 'coordinator',
        entityName: context.customerName || workflow.name,
        description: `Workflow: ${workflow.name} — ${run.steps.filter(s => s.status === 'completed').length}/${run.steps.length} agents completed`,
        userName: 'Agent Coordinator',
      });
    }
  } catch { /* best effort */ }

  return run;
}
