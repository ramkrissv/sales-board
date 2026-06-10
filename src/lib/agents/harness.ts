import { getAnthropicClient } from '@/lib/ai/anthropic';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';

/**
 * Agent Harness — the platform's agent orchestration runtime.
 *
 * Every platform capability is exposed as a tool that agents can invoke.
 * Agents observe, plan, and execute using these tools.
 * The knowledge graph serves as shared memory between agents.
 */

// Tool definitions — every platform action agents can take
export const PLATFORM_TOOLS = [
  // Pipeline tools
  { name: 'list_opportunities', description: 'Get all opportunities with stakeholders and tasks', category: 'pipeline' },
  { name: 'get_opportunity', description: 'Get a specific opportunity by ID', category: 'pipeline', params: ['opportunityId'] },
  { name: 'update_opportunity', description: 'Update opportunity fields (status, tcv, margin, etc)', category: 'pipeline', params: ['opportunityId', 'updates'] },
  { name: 'create_task', description: 'Create a task for an opportunity', category: 'pipeline', params: ['opportunityId', 'name', 'owner', 'dueDate', 'priority'] },
  { name: 'complete_task', description: 'Mark a task as complete', category: 'pipeline', params: ['taskId'] },

  // People tools
  { name: 'list_stakeholders', description: 'Get all stakeholders for an opportunity', category: 'people', params: ['opportunityId'] },
  { name: 'add_stakeholder', description: 'Add a stakeholder to an opportunity', category: 'people', params: ['opportunityId', 'name', 'title', 'isDecisionMaker'] },

  // Account tools
  { name: 'list_accounts', description: 'Get all accounts', category: 'accounts' },
  { name: 'get_account_360', description: 'Get full account view with deals, contacts, history', category: 'accounts', params: ['accountId'] },

  // Knowledge graph tools
  { name: 'query_graph', description: 'Query the knowledge graph for relationships', category: 'intelligence', params: ['nodeId', 'maxDepth'] },
  { name: 'get_similar_accounts', description: 'Find accounts similar to a given account', category: 'intelligence', params: ['accountNodeId'] },

  // Document tools
  { name: 'generate_sow', description: 'Generate a Statement of Work from deal context', category: 'documents', params: ['opportunityId'] },
  { name: 'draft_outreach', description: 'Draft an outreach email for a lead or deal', category: 'documents', params: ['targetName', 'targetTitle', 'context'] },

  // Notification tools
  { name: 'send_notification', description: 'Send a notification to a user', category: 'system', params: ['title', 'message', 'type'] },
  { name: 'log_activity', description: 'Log an activity to the activity feed', category: 'system', params: ['type', 'entityName', 'description'] },

  // Forecast tools
  { name: 'get_forecast', description: 'Get pipeline forecast with weighted values', category: 'intelligence' },

  // Lead tools
  { name: 'qualify_lead', description: 'AI-qualify a lead with scoring', category: 'leads', params: ['leadId'] },
  { name: 'convert_lead', description: 'Convert a lead to an opportunity', category: 'leads', params: ['leadId'] },
];

// Tool executor — runs a tool and returns the result
async function executeTool(toolName: string, params: Record<string, any>): Promise<any> {
  await connectDB();

  switch (toolName) {
    case 'list_opportunities': {
      const Opp = mongoose.models.Opportunity;
      return Opp.find().sort({ createdAt: -1 }).lean();
    }
    case 'get_opportunity': {
      const Opp = mongoose.models.Opportunity;
      const Stk = mongoose.models.Stakeholder;
      const Task = mongoose.models.Task;
      const opp = await Opp.findOne({ id: params.opportunityId }).lean();
      if (!opp) return { error: 'Not found' };
      const stakeholders = Stk ? await Stk.find({ opportunityId: params.opportunityId }).lean() : [];
      const tasks = Task ? await Task.find({ opportunityId: params.opportunityId }).lean() : [];
      return { ...opp, stakeholders, tasks };
    }
    case 'update_opportunity': {
      const Opp = mongoose.models.Opportunity;
      const updated = await Opp.findOneAndUpdate({ id: params.opportunityId }, { $set: params.updates }, { new: true }).lean();
      return updated;
    }
    case 'create_task': {
      const Task = mongoose.models.Task;
      if (!Task) return { error: 'Task model not available' };
      const task = await Task.create({
        opportunityId: params.opportunityId,
        name: params.name,
        owner: params.owner || 'Unassigned',
        dueDate: new Date(params.dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: params.priority || 'Medium',
        notes: 'Created by Agent Harness',
      });
      return task.toObject();
    }
    case 'complete_task': {
      const Task = mongoose.models.Task;
      if (!Task) return { error: 'Task model not available' };
      return Task.findByIdAndUpdate(params.taskId, { status: 'complete' }, { new: true }).lean();
    }
    case 'list_stakeholders': {
      const Stk = mongoose.models.Stakeholder;
      return Stk ? await Stk.find({ opportunityId: params.opportunityId }).lean() : [];
    }
    case 'add_stakeholder': {
      const Stk = mongoose.models.Stakeholder;
      if (!Stk) return { error: 'Stakeholder model not available' };
      return (await Stk.create(params)).toObject();
    }
    case 'list_accounts': {
      const Acc = mongoose.models.Account;
      return Acc ? await Acc.find().lean() : [];
    }
    case 'get_forecast': {
      const Opp = mongoose.models.Opportunity;
      const opps = await Opp.find().lean();
      const active = opps.filter((o: any) => !['Won', 'Lost'].includes(o.status));
      const weights: Record<string, number> = { Discovery: 0.1, Qualification: 0.25, Proposal: 0.5, Negotiation: 0.75, Won: 1, Lost: 0, 'On Hold': 0.05 };
      return {
        totalPipeline: active.reduce((s: number, o: any) => s + (o.tcv || 0), 0),
        weightedForecast: active.reduce((s: number, o: any) => s + (o.tcv || 0) * (weights[o.status] || 0), 0),
        activeDeals: active.length,
        byStage: Object.entries(weights).map(([stage, w]) => {
          const deals = opps.filter((o: any) => o.status === stage);
          return { stage, count: deals.length, tcv: deals.reduce((s: number, o: any) => s + (o.tcv || 0), 0) };
        }),
      };
    }
    case 'send_notification': {
      const Notif = mongoose.models.Notification;
      if (!Notif) return { error: 'Notification model not available' };
      return (await Notif.create({ userId: 'default-user', type: params.type || 'system', title: params.title, message: params.message })).toObject();
    }
    case 'log_activity': {
      const Activity = mongoose.models.Activity;
      if (!Activity) return { error: 'Activity model not available' };
      return (await Activity.create({ type: params.type, entityType: 'system', entityId: 'harness', entityName: params.entityName, description: params.description, userName: 'Agent Harness' })).toObject();
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Agent execution — runs an agent with tool access
 * The agent can observe the platform state, reason about it, and take actions
 */
export interface AgentRun {
  agentId: string;
  goal: string;
  reasoning: string[];
  toolCalls: { tool: string; params: any; result: any }[];
  finalAnswer: string;
  startedAt: string;
  completedAt: string;
}

export async function runAgent(
  agentId: string,
  goal: string,
  systemPrompt: string,
  maxSteps: number = 5
): Promise<AgentRun> {
  const client = getAnthropicClient();
  const model = process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-20250514';
  const startedAt = new Date().toISOString();

  const run: AgentRun = {
    agentId, goal, reasoning: [], toolCalls: [], finalAnswer: '', startedAt, completedAt: '',
  };

  // Convert platform tools to Claude tool format
  const claudeTools = PLATFORM_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: 'object' as const,
      properties: Object.fromEntries((t.params || []).map(p => [p, { type: 'string', description: p }])),
      required: (t.params || []).filter(p => !['owner', 'priority', 'dueDate', 'maxDepth', 'type'].includes(p)),
    },
  }));

  const messages: any[] = [{ role: 'user', content: goal }];

  for (let step = 0; step < maxSteps; step++) {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      tools: claudeTools,
      messages,
    });

    // Process response
    let hasToolUse = false;
    const assistantContent: any[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        run.reasoning.push(block.text);
        assistantContent.push(block);
      } else if (block.type === 'tool_use') {
        hasToolUse = true;
        assistantContent.push(block);

        // Execute the tool
        const toolResult = await executeTool(block.name, block.input as any);
        run.toolCalls.push({ tool: block.name, params: block.input, result: toolResult });

        // Add tool result to conversation
        messages.push({ role: 'assistant', content: assistantContent });
        messages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(toolResult).slice(0, 4000), // Limit size
          }],
        });
      }
    }

    if (!hasToolUse) {
      // Agent is done — extract final answer
      run.finalAnswer = run.reasoning[run.reasoning.length - 1] || '';
      break;
    }
  }

  run.completedAt = new Date().toISOString();
  return run;
}
