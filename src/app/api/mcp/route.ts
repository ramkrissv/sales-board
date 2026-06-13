/**
 * MCP (Model Context Protocol) Server Endpoint
 *
 * Exposes Galent SalesPilot platform tools as MCP-compatible tools.
 * Any MCP client (Claude Desktop, Cursor, VS Code, etc.) can connect
 * and invoke these tools to interact with the sales pipeline.
 *
 * Endpoint: POST /api/mcp
 * Protocol: JSON-RPC 2.0 (MCP standard)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';

// MCP Tool definitions with full JSON Schema
const MCP_TOOLS = [
  {
    name: 'list_opportunities',
    description: 'List all opportunities in the pipeline with their current stage, TCV, owner, and status',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'], description: 'Filter by stage' },
        owner: { type: 'string', description: 'Filter by deal owner name' },
        limit: { type: 'number', description: 'Max results to return (default 50)' },
      },
    },
  },
  {
    name: 'get_opportunity',
    description: 'Get detailed information about a specific opportunity including stakeholders, tasks, and conversation log',
    inputSchema: {
      type: 'object' as const,
      properties: {
        opportunityId: { type: 'string', description: 'The opportunity ID' },
      },
      required: ['opportunityId'],
    },
  },
  {
    name: 'update_opportunity',
    description: 'Update fields on an opportunity (status, TCV, margin, notes, etc)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        opportunityId: { type: 'string', description: 'The opportunity ID' },
        updates: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            status: { type: 'string' },
            tcv: { type: 'number' },
            margin: { type: 'number' },
            probability: { type: 'number' },
            expectedCloseDate: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
      required: ['opportunityId', 'updates'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a task linked to an opportunity',
    inputSchema: {
      type: 'object' as const,
      properties: {
        opportunityId: { type: 'string', description: 'The opportunity ID' },
        name: { type: 'string', description: 'Task name' },
        owner: { type: 'string', description: 'Assigned to' },
        dueDate: { type: 'string', description: 'Due date (ISO format)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
      },
      required: ['opportunityId', 'name'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'list_stakeholders',
    description: 'List all stakeholders for an opportunity',
    inputSchema: {
      type: 'object' as const,
      properties: {
        opportunityId: { type: 'string', description: 'The opportunity ID' },
      },
      required: ['opportunityId'],
    },
  },
  {
    name: 'add_stakeholder',
    description: 'Add a stakeholder/contact to an opportunity',
    inputSchema: {
      type: 'object' as const,
      properties: {
        opportunityId: { type: 'string', description: 'The opportunity ID' },
        name: { type: 'string', description: 'Stakeholder name' },
        title: { type: 'string', description: 'Job title' },
        email: { type: 'string', description: 'Email address' },
        role: { type: 'string', enum: ['decision_maker', 'champion', 'influencer', 'end_user', 'gatekeeper'] },
        isDecisionMaker: { type: 'boolean' },
      },
      required: ['opportunityId', 'name'],
    },
  },
  {
    name: 'list_accounts',
    description: 'List all accounts with deal counts and total revenue',
    inputSchema: {
      type: 'object' as const,
      properties: {
        industry: { type: 'string', description: 'Filter by industry' },
        limit: { type: 'number', description: 'Max results' },
      },
    },
  },
  {
    name: 'get_account_360',
    description: 'Get full 360-degree view of an account: deals, contacts, activity history, AI summary',
    inputSchema: {
      type: 'object' as const,
      properties: {
        accountId: { type: 'string', description: 'The account ID' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'query_knowledge_graph',
    description: 'Query the knowledge graph for relationship data between accounts, stakeholders, and deals',
    inputSchema: {
      type: 'object' as const,
      properties: {
        nodeId: { type: 'string', description: 'Starting node ID' },
        maxDepth: { type: 'number', description: 'Max traversal depth (default 2)' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'get_forecast',
    description: 'Get pipeline forecast with weighted values by stage, commit/upside/pipeline categories',
    inputSchema: {
      type: 'object' as const,
      properties: {
        quarter: { type: 'string', description: 'Fiscal quarter (e.g. Q1, Q2)' },
        owner: { type: 'string', description: 'Filter by rep name' },
      },
    },
  },
  {
    name: 'search_deals',
    description: 'Search deals by customer name, deal name, or keyword in conversation logs',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'log_activity',
    description: 'Log an activity entry to a deal conversation log',
    inputSchema: {
      type: 'object' as const,
      properties: {
        opportunityId: { type: 'string', description: 'The opportunity ID' },
        type: { type: 'string', enum: ['note', 'call', 'email', 'meeting', 'ai_signal'] },
        description: { type: 'string', description: 'Activity description' },
      },
      required: ['opportunityId', 'type', 'description'],
    },
  },
  {
    name: 'send_notification',
    description: 'Send a notification to a user or channel',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification body' },
        type: { type: 'string', enum: ['info', 'warning', 'success', 'error'] },
        userId: { type: 'string', description: 'Target user ID (optional)' },
      },
      required: ['title', 'message'],
    },
  },
  {
    name: 'invoke_agent',
    description: 'Invoke a Galent AI agent with a specific goal',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: {
          type: 'string',
          enum: [
            'deal-coach', 'research-agent', 'outreach-agent', 'hygiene-agent',
            'forecast-agent', 'intake-processor', 'proposal-drafter',
            'account-intelligence', 'competitive-intel', 'growth-agent',
            'enablement-agent', 'signal-processor', 'campaign-agent',
          ],
          description: 'Which agent to invoke',
        },
        goal: { type: 'string', description: 'What the agent should accomplish' },
      },
      required: ['agentId', 'goal'],
    },
  },
];

// Tool executor
async function executeMCPTool(name: string, args: Record<string, any>): Promise<any> {
  await connectDB();

  switch (name) {
    case 'list_opportunities': {
      const Opp = mongoose.models.Opportunity;
      if (!Opp) return { error: 'Model not available' };
      const filter: any = {};
      if (args.status) filter.status = args.status;
      if (args.owner) filter.owner = { $regex: args.owner, $options: 'i' };
      const docs = await Opp.find(filter).sort({ createdAt: -1 }).limit(args.limit || 50).lean();
      return docs.map((d: any) => ({
        id: d.id, name: d.name, customer: d.customer, status: d.status,
        tcv: d.tcv, owner: d.owner, probability: d.probability,
        expectedCloseDate: d.expectedCloseDate,
      }));
    }
    case 'get_opportunity': {
      const Opp = mongoose.models.Opportunity;
      const Stk = mongoose.models.Stakeholder;
      const Task = mongoose.models.Task;
      const opp = await Opp?.findOne({ id: args.opportunityId }).lean();
      if (!opp) return { error: 'Opportunity not found' };
      const stakeholders = Stk ? await Stk.find({ opportunityId: args.opportunityId }).lean() : [];
      const tasks = Task ? await Task.find({ opportunityId: args.opportunityId }).lean() : [];
      return { ...(opp as any), stakeholders, tasks };
    }
    case 'update_opportunity': {
      const Opp = mongoose.models.Opportunity;
      const updated = await Opp?.findOneAndUpdate(
        { id: args.opportunityId },
        { $set: args.updates },
        { new: true }
      ).lean();
      return updated || { error: 'Not found' };
    }
    case 'create_task': {
      const Task = mongoose.models.Task;
      if (!Task) return { error: 'Task model not available' };
      const task = await Task.create({
        opportunityId: args.opportunityId,
        name: args.name,
        owner: args.owner || 'Unassigned',
        dueDate: args.dueDate ? new Date(args.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: args.priority || 'medium',
        status: 'pending',
      });
      return { id: task._id, name: task.name, status: 'created' };
    }
    case 'complete_task': {
      const Task = mongoose.models.Task;
      const task = await Task?.findByIdAndUpdate(args.taskId, { status: 'completed', completedAt: new Date() }, { new: true }).lean();
      return task || { error: 'Task not found' };
    }
    case 'list_stakeholders': {
      const Stk = mongoose.models.Stakeholder;
      if (!Stk) return [];
      return Stk.find({ opportunityId: args.opportunityId }).lean();
    }
    case 'add_stakeholder': {
      const Stk = mongoose.models.Stakeholder;
      if (!Stk) return { error: 'Stakeholder model not available' };
      const stk = await Stk.create({
        opportunityId: args.opportunityId,
        name: args.name,
        title: args.title || '',
        email: args.email || '',
        role: args.role || 'influencer',
        isDecisionMaker: args.isDecisionMaker || false,
      });
      return { id: stk._id, name: stk.name, status: 'created' };
    }
    case 'list_accounts': {
      const Acc = mongoose.models.Account;
      if (!Acc) return [];
      const filter: any = {};
      if (args.industry) filter.industry = { $regex: args.industry, $options: 'i' };
      return Acc.find(filter).sort({ name: 1 }).limit(args.limit || 50).lean();
    }
    case 'get_account_360': {
      const Acc = mongoose.models.Account;
      const Opp = mongoose.models.Opportunity;
      const account = await Acc?.findById(args.accountId).lean();
      if (!account) return { error: 'Account not found' };
      const deals = Opp ? await Opp.find({ customer: (account as any).name }).lean() : [];
      return { ...(account as any), deals };
    }
    case 'query_knowledge_graph': {
      const KG = mongoose.models.KnowledgeGraphNode;
      if (!KG) return { nodes: [], edges: [] };
      const node = await KG.findById(args.nodeId).lean();
      if (!node) return { error: 'Node not found' };
      const edges = (node as any).edges || [];
      const connectedIds = edges.map((e: any) => e.targetId);
      const connected = await KG.find({ _id: { $in: connectedIds } }).lean();
      return { root: node, connected, depth: args.maxDepth || 2 };
    }
    case 'get_forecast': {
      const Opp = mongoose.models.Opportunity;
      if (!Opp) return { error: 'Model not available' };
      const filter: any = { status: { $nin: ['Closed Lost'] } };
      if (args.owner) filter.owner = { $regex: args.owner, $options: 'i' };
      const deals = await Opp.find(filter).lean();
      const stages: Record<string, { count: number; total: number; weighted: number }> = {};
      const weights: Record<string, number> = { 'Qualification': 0.2, 'Proposal': 0.5, 'Negotiation': 0.75, 'Closed Won': 1.0 };
      for (const d of deals as any[]) {
        const s = d.status || 'Qualification';
        if (!stages[s]) stages[s] = { count: 0, total: 0, weighted: 0 };
        stages[s].count++;
        stages[s].total += d.tcv || 0;
        stages[s].weighted += (d.tcv || 0) * (weights[s] || 0.3);
      }
      return { stages, totalPipeline: deals.reduce((s: number, d: any) => s + (d.tcv || 0), 0) };
    }
    case 'search_deals': {
      const Opp = mongoose.models.Opportunity;
      if (!Opp) return [];
      const docs = await Opp.find({
        $or: [
          { name: { $regex: args.query, $options: 'i' } },
          { customer: { $regex: args.query, $options: 'i' } },
          { description: { $regex: args.query, $options: 'i' } },
        ],
      }).limit(args.limit || 20).lean();
      return docs.map((d: any) => ({ id: d.id, name: d.name, customer: d.customer, status: d.status, tcv: d.tcv }));
    }
    case 'log_activity': {
      const Opp = mongoose.models.Opportunity;
      if (!Opp) return { error: 'Model not available' };
      const opp = await Opp.findOneAndUpdate(
        { id: args.opportunityId },
        { $push: { conversationLog: { date: new Date(), type: args.type, text: args.description, source: 'mcp' } } },
        { new: true }
      ).lean();
      return opp ? { status: 'logged' } : { error: 'Opportunity not found' };
    }
    case 'send_notification': {
      const Notif = mongoose.models.Notification;
      if (Notif) {
        await Notif.create({
          title: args.title,
          message: args.message,
          type: args.type || 'info',
          userId: args.userId,
          read: false,
        });
      }
      return { status: 'sent', title: args.title };
    }
    case 'invoke_agent': {
      // Defer to the harness for full agent execution
      const { runAgent } = await import('@/lib/agents/harness');
      const { DEFAULT_AGENT_CONFIGS } = await import('@/lib/ai/config');
      const agentConfig = DEFAULT_AGENT_CONFIGS.find(a => a.id === args.agentId);
      if (!agentConfig) return { error: `Agent '${args.agentId}' not found` };
      const result = await runAgent(args.agentId, args.goal, agentConfig.systemPrompt, 5);
      return result;
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// MCP JSON-RPC handler
export async function POST(req: NextRequest) {
  // Check API key auth
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.MCP_API_KEY || process.env.NEXTAUTH_SECRET;
  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { method, params, id } = body;

  // MCP protocol methods
  switch (method) {
    case 'initialize': {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: 'galent-salespilot',
            version: '1.0.0',
            description: 'Galent SalesPilot — AI-native sales intelligence platform. 13 agents, 15 tools, knowledge graph.',
          },
        },
      });
    }

    case 'tools/list': {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS },
      });
    }

    case 'tools/call': {
      const { name, arguments: args } = params || {};
      if (!name) {
        return NextResponse.json({
          jsonrpc: '2.0', id,
          error: { code: -32602, message: 'Missing tool name' },
        });
      }
      try {
        const result = await executeMCPTool(name, args || {});
        return NextResponse.json({
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: false,
          },
        });
      } catch (err: any) {
        return NextResponse.json({
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
          },
        });
      }
    }

    default: {
      return NextResponse.json({
        jsonrpc: '2.0', id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
    }
  }
}

// GET — returns server info for discovery
export async function GET() {
  return NextResponse.json({
    name: 'galent-salespilot',
    version: '1.0.0',
    protocol: 'mcp',
    description: 'Galent SalesPilot MCP Server — 13 AI agents, 15 tools',
    tools: MCP_TOOLS.map(t => ({ name: t.name, description: t.description })),
    agents: [
      'deal-coach', 'research-agent', 'outreach-agent', 'hygiene-agent',
      'forecast-agent', 'intake-processor', 'proposal-drafter',
      'account-intelligence', 'competitive-intel', 'growth-agent',
      'enablement-agent', 'signal-processor', 'campaign-agent',
    ],
    endpoint: '/api/mcp',
    auth: 'Bearer token (MCP_API_KEY or NEXTAUTH_SECRET)',
  });
}
