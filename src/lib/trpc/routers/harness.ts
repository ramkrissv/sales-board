import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { runAgent, PLATFORM_TOOLS } from '@/lib/agents/harness';
import { DEFAULT_AGENT_CONFIGS } from '@/lib/ai/config';
import { runWorkflow, WORKFLOWS } from '@/lib/agents/coordinator';
import { getTodayMetrics } from '@/lib/ai/telemetry';
import { getActiveTasks, getCompletedTasks, getTaskSummary } from '@/lib/ai/execution';
import { getRateLimits } from '@/lib/ai/budgets';
import fs from 'fs';
import path from 'path';

export const harnessRouter = router({
  // List available tools
  getTools: protectedProcedure.query(() => {
    return PLATFORM_TOOLS;
  }),

  // List available agents
  getAgents: protectedProcedure.query(() => {
    return DEFAULT_AGENT_CONFIGS.map(a => ({
      id: a.id, name: a.name, description: a.description,
      isActive: a.isActive, tools: a.tools,
    }));
  }),

  // Run an agent with a goal
  runAgent: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      goal: z.string(),
      opportunityId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const agentConfig = DEFAULT_AGENT_CONFIGS.find(a => a.id === input.agentId);
      if (!agentConfig) throw new Error(`Agent ${input.agentId} not found`);

      let goal = input.goal;
      if (input.opportunityId) {
        goal += `\n\nFocus on opportunity ID: ${input.opportunityId}`;
      }

      const run = await runAgent(
        input.agentId,
        goal,
        agentConfig.systemPrompt + '\n\nYou have access to the full Galent SalesPilot platform through tools. Use them to observe data, then take actions. Think step by step.',
        5,
      );

      // Log the agent run as an activity
      try {
        const mongoose = await import('mongoose');
        const Activity = mongoose.default.models.Activity;
        if (Activity) {
          await Activity.create({
            type: 'agent_run',
            entityType: 'agent',
            entityId: input.agentId,
            entityName: agentConfig.name,
            description: `${agentConfig.name} executed: "${input.goal.slice(0, 100)}" — ${run.toolCalls.length} tool calls`,
            userName: 'Agent Harness',
            metadata: { toolCalls: run.toolCalls.length, reasoning: run.reasoning.length },
          });
        }
      } catch {
        // Activity logging is best-effort
      }

      return run;
    }),

  // Quick invoke — run an agent with a preset goal
  quickInvoke: protectedProcedure
    .input(z.object({
      action: z.enum([
        'analyze_pipeline',
        'find_at_risk_deals',
        'suggest_next_steps',
        'generate_weekly_report',
        'qualify_all_leads',
        'identify_stale_deals',
        'competitive_scan',
        'draft_proposals',
        'enrich_accounts',
        'process_intake',
        'whitespace_analysis',
        'coaching_tips',
        'process_signals',
        'campaign_insights',
      ]),
    }))
    .mutation(async ({ input }) => {
      const goals: Record<string, { agentId: string; goal: string }> = {
        analyze_pipeline: { agentId: 'deal-coach', goal: 'Analyze the entire pipeline. List all opportunities by stage, identify risks, and give 3 specific recommendations.' },
        find_at_risk_deals: { agentId: 'deal-coach', goal: 'Find all at-risk deals. A deal is at risk if: no decision maker, no activity in 14+ days, TCV is $0, or time in stage exceeds 14 days. For each, explain the risk and suggest a fix.' },
        suggest_next_steps: { agentId: 'deal-coach', goal: 'For each deal in Negotiation and Proposal stage, suggest the specific next step the owner should take. Create a task for each suggestion.' },
        generate_weekly_report: { agentId: 'forecast-agent', goal: 'Generate a weekly pipeline report: total pipeline, weighted forecast, deals won/lost this week, deals closing next week, at-risk deals, and top 3 recommendations.' },
        qualify_all_leads: { agentId: 'deal-coach', goal: 'Review all leads and qualify them based on ICP fit, engagement signals, and timing.' },
        identify_stale_deals: { agentId: 'hygiene-agent', goal: 'Find all deals that have been in the same stage for more than 14 days. For each, send a notification to the owner and create a follow-up task.' },
        competitive_scan: { agentId: 'deal-coach', goal: 'Scan all active deals for competitor mentions in conversation logs. For each competitor found, summarize the competitive threat and suggest counter-positioning.' },
        draft_proposals: { agentId: 'deal-coach', goal: 'For each deal in Proposal stage, check if a SOW exists. If not, list what proposal artifacts are missing based on the stage ontology.' },
        enrich_accounts: { agentId: 'deal-coach', goal: 'Review all accounts. For each, identify: missing data fields, deals without stakeholders, and opportunities for expansion.' },
        process_intake: { agentId: 'deal-coach', goal: 'Review recent activity and identify any deals that need follow-up based on meeting notes, stage transitions, or overdue tasks.' },
        whitespace_analysis: { agentId: 'growth-agent', goal: 'Analyze all accounts and identify whitespace opportunities. For each account, map which service lines are live, which are in pipeline, and where expansion plays exist. Calculate potential ARR uplift.' },
        coaching_tips: { agentId: 'enablement-agent', goal: 'Review deals in Negotiation and Proposal stages. For each, provide deal-specific coaching: objection handling tips, competitive positioning, and recommended talk tracks.' },
        process_signals: { agentId: 'signal-processor', goal: 'Process recent signals from email, Teams, and voice channels. Extract entities (contacts, companies, deal references), classify signal type, and route to appropriate deals.' },
        campaign_insights: { agentId: 'campaign-agent', goal: 'Review active outreach campaigns. Analyze open rates, response rates, and conversion. Suggest sequence optimizations and best send times.' },
      };

      const config = goals[input.action];
      if (!config) throw new Error('Unknown action');

      const agentConfig = DEFAULT_AGENT_CONFIGS.find(a => a.id === config.agentId) || DEFAULT_AGENT_CONFIGS[0];

      return runAgent(
        config.agentId,
        config.goal,
        agentConfig.systemPrompt + '\n\nYou have access to the full Galent SalesPilot platform through tools. Use them to observe data, then take actions. Think step by step. Be specific — reference deal names and dollar amounts.',
        5,
      );
    }),

  // List available workflows
  getWorkflows: protectedProcedure.query(() => {
    return WORKFLOWS.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      trigger: w.trigger,
      steps: w.steps.map(s => ({ agentId: s.agentId })),
      stepCount: w.steps.length,
    }));
  }),

  // Run a coordinated workflow
  runWorkflow: protectedProcedure
    .input(z.object({
      workflowId: z.string(),
      opportunityId: z.string().optional(),
      customerName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return runWorkflow(input.workflowId, {
        opportunityId: input.opportunityId,
        customerName: input.customerName,
      });
    }),

  // ═══════ TELEMETRY & OBSERVABILITY ═══════

  // Today's AI metrics (telemetry/metrics/YYYY-MM-DD.json)
  getMetrics: protectedProcedure.query(async () => {
    return { metrics: getTodayMetrics(), rateLimits: getRateLimits(), date: new Date().toISOString().slice(0, 10) };
  }),

  // Recent AI traces (telemetry/traces/YYYY-MM-DD.jsonl)
  getTraces: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      try {
        const date = new Date().toISOString().slice(0, 10);
        const file = path.resolve(process.cwd(), `telemetry/traces/${date}.jsonl`);
        if (!fs.existsSync(file)) return { traces: [], date, total: 0 };
        const lines = fs.readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean);
        const limit = input?.limit || 50;
        const traces = lines.slice(-limit).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();
        return { traces, date, total: lines.length };
      } catch { return { traces: [], date: new Date().toISOString().slice(0, 10), total: 0 }; }
    }),

  // ═══════ EXECUTION STATE ═══════

  // Active/completed tasks (execution/tasks.json)
  getExecutionTasks: protectedProcedure.query(async () => {
    return { active: getActiveTasks(), completed: getCompletedTasks(), summary: getTaskSummary() };
  }),

  // ═══════ SPECS & EVALS ═══════

  // Architecture + feature specs (specs/)
  getSpecs: protectedProcedure.query(async () => {
    try {
      const specsDir = path.resolve(process.cwd(), 'specs');
      const arch = fs.existsSync(path.join(specsDir, 'ARCHITECTURE.md'))
        ? fs.readFileSync(path.join(specsDir, 'ARCHITECTURE.md'), 'utf-8') : '';
      const featuresDir = path.join(specsDir, 'features');
      const features = fs.existsSync(featuresDir)
        ? fs.readdirSync(featuresDir).filter(f => f.endsWith('.md')).map(f => ({
            name: f.replace(/\.md$/, ''), content: fs.readFileSync(path.join(featuresDir, f), 'utf-8'),
          })) : [];
      const doneDir = path.join(specsDir, 'done_contracts');
      const contracts = fs.existsSync(doneDir)
        ? fs.readdirSync(doneDir).filter(f => f.endsWith('.json')).map(f => ({
            name: f.replace(/\.json$/, ''), contract: JSON.parse(fs.readFileSync(path.join(doneDir, f), 'utf-8')),
          })) : [];
      return { architecture: arch, features, contracts };
    } catch { return { architecture: '', features: [], contracts: [] }; }
  }),

  // Agent eval benchmarks (tests/agent_evals/)
  getEvals: protectedProcedure.query(async () => {
    try {
      const dir = path.resolve(process.cwd(), 'tests/agent_evals');
      if (!fs.existsSync(dir)) return { evals: [] };
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.json'));
      return { evals: files.map(f => ({ name: f.replace(/\.[^.]+$/, ''), file: f, content: fs.readFileSync(path.join(dir, f), 'utf-8') })) };
    } catch { return { evals: [] }; }
  }),

  // Sandbox config (gatekeeper/sandbox.config.json)
  getSandboxConfig: protectedProcedure.query(async () => {
    try {
      return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'gatekeeper/sandbox.config.json'), 'utf-8'));
    } catch { return null; }
  }),

  // Token budgets (config/token_budgets.json)
  getTokenBudgets: protectedProcedure.query(async () => {
    try {
      return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'config/token_budgets.json'), 'utf-8'));
    } catch { return null; }
  }),
});
