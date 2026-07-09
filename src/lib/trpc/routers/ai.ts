import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { analyzeDeal, analyzePipeline } from '@/lib/ai/deal-coach';
import { parseAIJson } from '@/lib/ai/parse-json';
import { checkRateLimit } from '@/lib/ai/budgets';
import { validatePrompt } from '@/lib/ai/sandbox';
import { logTrace, updateMetrics } from '@/lib/ai/telemetry';
import mongoose from 'mongoose';

function getOpportunityModel() {
  return mongoose.models.Opportunity || require('@/lib/db/models/opportunity').Opportunity;
}
function getStakeholderModel() {
  return mongoose.models.Stakeholder || require('@/lib/db/models/stakeholder').Stakeholder;
}
function getTaskModel() {
  return mongoose.models.Task || require('@/lib/db/models/task').Task;
}

export const aiRouter = router({
  // Analyze a single deal
  analyzeDeal: protectedProcedure
    .input(z.object({ opportunityId: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Opportunity = getOpportunityModel();
      const Stakeholder = getStakeholderModel();
      const Task = getTaskModel();

      const opp = await Opportunity.findOne({ id: input.opportunityId }).lean();
      if (!opp) throw new Error('Opportunity not found');

      const stakeholders = await Stakeholder.find({ opportunityId: input.opportunityId }).lean();
      const tasks = await Task.find({ opportunityId: input.opportunityId }).lean();

      const enriched = { ...opp, customerStakeholders: stakeholders, subTasks: tasks };
      const analysis = await analyzeDeal(enriched);

      // Save scores back to the opportunity
      await Opportunity.updateOne(
        { id: input.opportunityId },
        {
          dealHealthScore: analysis.healthScore,
          winProbability: analysis.winProbability,
          aiStatus:
            analysis.healthScore >= 70
              ? 'on_track'
              : analysis.healthScore >= 40
                ? 'at_risk'
                : 'stale',
        }
      );

      return analysis;
    }),

  // Analyze entire pipeline
  analyzePipeline: protectedProcedure.mutation(async () => {
    await connectDB();
    const Opportunity = getOpportunityModel();
    const opps = await Opportunity.find().lean();
    const summary = await analyzePipeline(opps);
    return { summary, generatedAt: new Date().toISOString() };
  }),

  // Generate SOW document
  generateSOW: protectedProcedure
    .input(z.object({ opportunityId: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Opportunity = getOpportunityModel();
      const Stakeholder = getStakeholderModel();

      const opp = await Opportunity.findOne({ id: input.opportunityId }).lean();
      if (!opp) throw new Error('Opportunity not found');

      const stakeholders = await Stakeholder.find({ opportunityId: input.opportunityId }).lean();

      const { aiGateway } = await import('@/lib/ai/gateway');
      const gwResponse = await aiGateway({
        source: 'ai.generateSOW',
        max_tokens: 2048,
        entityId: input.opportunityId,
        messages: [{ role: 'user', content: `Generate a professional Statement of Work (SOW) document for this engagement:

Customer: ${(opp as any).customerName}
Project: ${(opp as any).opportunityName}
TCV: $${((opp as any).tcv || 0).toLocaleString()}
Duration: ${(opp as any).dealDuration}
Service Line: ${(opp as any).serviceLine || 'IT Services'}
Billing Model: ${(opp as any).billingModel || 'Time & Material'}
Engagement Type: ${(opp as any).engagementType || (opp as any).billingModel || 'Time & Material'}
Industry: ${(opp as any).industry}
Start Date: ${(opp as any).startDate}
Key Stakeholders: ${stakeholders.map((s: any) => `${s.name} (${s.title})`).join(', ')}
Context: ${(opp as any).conversationLog || 'No additional context'}

Generate a complete SOW with these sections:
1. Executive Summary
2. Scope of Work
3. Deliverables
4. Timeline & Milestones
5. Team & Resources
6. Pricing & Payment Terms
7. Assumptions & Dependencies
8. Acceptance Criteria
9. Change Management

Format as clean markdown. Be specific to the project, not generic.` }],
      });

      const content = gwResponse.text;
      return { content, generatedAt: new Date().toISOString(), opportunityId: input.opportunityId };
    }),

  // Process meeting transcript
  processTranscript: protectedProcedure
    .input(z.object({
      opportunityId: z.string().optional(),
      source: z.enum(['teams', 'zoom', 'google_meet', 'notes', 'email']),
      title: z.string(),
      content: z.string().min(10),
      date: z.string().optional(),
      participants: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { aiGateway } = await import('@/lib/ai/gateway');
      const gwTranscript = await aiGateway({
        source: 'ai.processTranscript',
        max_tokens: 1500,
        entityId: input.opportunityId,
        messages: [{ role: 'user', content: `Analyze this sales meeting transcript/notes and extract structured intelligence.

Source: ${input.source}
Title: ${input.title}
Date: ${input.date || 'Not specified'}
Participants: ${input.participants?.join(', ') || 'Not specified'}

TRANSCRIPT:
${input.content}

Return ONLY valid JSON:
{
  "summary": "<3-4 sentence summary of key discussion points>",
  "actionItems": [
    {"task": "<action>", "owner": "<who>", "dueDate": "<when, or 'TBD'>", "priority": "<High|Medium|Low>"}
  ],
  "stakeholderInsights": [
    {"name": "<person name>", "title": "<role if mentioned>", "sentiment": "<positive|neutral|negative|cautious>", "keyQuote": "<notable quote or stance>", "isDecisionMaker": <true|false>}
  ],
  "dealSignals": {
    "buyingIntent": "<strong|moderate|weak|unclear>",
    "budgetMentioned": <true|false>,
    "timelineMentioned": <true|false>,
    "competitorsMentioned": ["<names>"],
    "objections": ["<any concerns raised>"],
    "nextSteps": ["<agreed next steps>"]
  },
  "suggestedUpdates": {
    "updateConversationLog": true,
    "createTasks": true,
    "addStakeholders": true,
    "updateDealStage": "<suggested stage or null>"
  }
}` }],
      });

      const text = gwTranscript.text;

      try {
        const result = parseAIJson(text);

        // If linked to an opportunity, auto-update the conversation log
        if (input.opportunityId) {
          await connectDB();
          const Opportunity = getOpportunityModel();
          const opp = await Opportunity.findOne({ id: input.opportunityId });
          if (opp) {
            const timestamp = new Date().toISOString().split('T')[0];
            const logEntry = `\n\n--- ${input.source.toUpperCase()} NOTES (${timestamp}) ---\n${input.title}\n${result.summary}\n\nAction Items:\n${result.actionItems.map((a: any) => `- ${a.task} (${a.owner}, ${a.priority})`).join('\n')}\n\nNext Steps:\n${result.dealSignals.nextSteps.map((s: any) => `- ${s}`).join('\n')}`;
            opp.conversationLog = (opp.conversationLog || '') + logEntry;
            await opp.save();
          }
        }

        return { ...result, processedAt: new Date().toISOString() };
      } catch {
        return { summary: text.slice(0, 500), error: 'Could not parse structured output', processedAt: new Date().toISOString() };
      }
    }),

  // Omni-channel intake processor
  processIntake: protectedProcedure
    .input(z.object({
      channel: z.enum(['voice', 'teams_transcript', 'teams_chat', 'outlook_email', 'desktop_notes', 'whatsapp']),
      content: z.string().min(5),
      subject: z.string().optional(),
      sender: z.string().optional(),
      participants: z.array(z.string()).optional(),
      existingDealId: z.string().optional(),
      draftId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Opportunity = getOpportunityModel();
      const existingOpps = await Opportunity.find().select('id customerName opportunityName status').lean();
      const dealList = existingOpps.map((o: any) => `${o.id}: ${o.customerName} — ${o.opportunityName} (${o.status})`).join('\n');

      const { aiGateway } = await import('@/lib/ai/gateway');
      const gwIntake = await aiGateway({
        source: 'ai.processIntake',
        max_tokens: 1024,
        messages: [{ role: 'user', content: `You are an AI intake processor for a sales intelligence platform. Analyze this ${input.channel.replace('_', ' ')} input and extract structured deal intelligence.

CHANNEL: ${input.channel}
${input.subject ? `SUBJECT: ${input.subject}` : ''}
${input.sender ? `FROM: ${input.sender}` : ''}
${input.participants ? `PARTICIPANTS: ${input.participants.join(', ')}` : ''}

CONTENT:
${input.content}

EXISTING DEALS IN PIPELINE:
${dealList}

Return ONLY valid JSON:
{
  "intent": "new_deal|update_deal|add_stakeholder|log_activity|schedule_task|general_note",
  "confidence": <0-100>,
  "matchedDealId": "<existing deal ID if this relates to an existing deal, or null>",
  "matchedDealName": "<deal name if matched>",
  "extractedData": {
    "customerName": "<company name if mentioned>",
    "opportunityName": "<deal/project name if mentioned>",
    "contactName": "<person name if mentioned>",
    "contactTitle": "<title if mentioned>",
    "contactEmail": "<email if found>",
    "tcv": <dollar amount if mentioned, or null>,
    "status": "<deal stage if mentioned>",
    "nextSteps": ["<action items>"],
    "keyInsights": ["<important points>"],
    "sentiment": "<positive|neutral|negative|urgent>",
    "competitors": ["<competitor names if mentioned>"],
    "timeline": "<any dates or timeline mentioned>"
  },
  "suggestedActions": [
    {"type": "create_deal|update_deal|add_task|add_stakeholder|log_notes", "description": "<what to do>", "data": {}}
  ],
  "summary": "<2-3 sentence summary of the intake>"
}` }],
      });

      const text = gwIntake.text;

      try {
        const result = parseAIJson(text);

        if (result.confidence >= 80 && result.matchedDealId && result.intent === 'update_deal') {
          const opp = await Opportunity.findOne({ id: result.matchedDealId });
          if (opp) {
            const timestamp = new Date().toISOString().split('T')[0];
            const channelLabel = input.channel.replace('_', ' ').toUpperCase();
            opp.conversationLog = (opp.conversationLog || '') + `\n\n--- ${channelLabel} INTAKE (${timestamp}) ---\n${result.summary}\n\nKey Insights:\n${result.extractedData.keyInsights?.map((k: string) => `• ${k}`).join('\n') || 'None'}\n\nNext Steps:\n${result.extractedData.nextSteps?.map((s: string) => `• ${s}`).join('\n') || 'None'}`;
            await opp.save();
          }
        }

        return { ...result, processedAt: new Date().toISOString(), channel: input.channel };
      } catch {
        return { intent: 'general_note', confidence: 50, summary: text.slice(0, 500), error: 'Parse failed', processedAt: new Date().toISOString(), channel: input.channel };
      }
    }),

  // Chat with Deal Coach (conversational)
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        context: z
          .object({
            opportunityId: z.string().optional(),
            page: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Rate limit enforcement (config/token_budgets.json)
      const rateCheck = checkRateLimit();
      if (!rateCheck.allowed) throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}s.`);

      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();
      const model = process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6';

      // ALWAYS load full pipeline context
      await connectDB();
      const Opportunity = getOpportunityModel();
      const Stakeholder = getStakeholderModel();
      const Task = getTaskModel();
      const allOpps = await Opportunity.find().lean();

      const active = allOpps.filter((o: any) => !['Won', 'Lost'].includes(o.status));
      const byStatus: Record<string, any[]> = {};
      allOpps.forEach((o: any) => { if (!byStatus[o.status]) byStatus[o.status] = []; byStatus[o.status].push(o); });

      const totalTcv = active.reduce((s: number, o: any) => s + (o.tcv || 0), 0);
      const negotiation = byStatus['Negotiation'] || [];
      const overdueTasks = await Task.find({ status: 'pending', dueDate: { $lt: new Date() } }).lean();

      // Revenue metrics
      const wonDeals = byStatus['Won'] || [];
      const wonRevenue = wonDeals.reduce((s: number, d: any) => s + (d.tcv || 0), 0);
      const monthlyRevenue = Math.round(wonRevenue / 12);

      // Account classification (EE/EN/NN)
      const acctCounts: Record<string, { total: number; won: number; tcv: number }> = {};
      allOpps.forEach((o: any) => {
        if (!acctCounts[o.customerName]) acctCounts[o.customerName] = { total: 0, won: 0, tcv: 0 };
        acctCounts[o.customerName].total++;
        acctCounts[o.customerName].tcv += o.tcv || 0;
        if (o.status === 'Won') acctCounts[o.customerName].won++;
      });
      const eeAccounts = Object.entries(acctCounts).filter(([, c]) => c.won >= 2).map(([n, c]) => `${n} ($${(c.tcv/1000).toFixed(0)}k)`);
      const enAccounts = Object.entries(acctCounts).filter(([, c]) => c.total >= 2 && c.won < 2).map(([n]) => n);

      let pipelineContext = `\n\nYOU HAVE FULL ACCESS TO THE PIPELINE DATA:\n`;
      pipelineContext += `Total: ${allOpps.length} deals, $${(totalTcv/1000).toFixed(0)}k active pipeline\n`;
      pipelineContext += `ONGOING REVENUE: $${(wonRevenue/1000).toFixed(0)}k total won, ~$${(monthlyRevenue/1000).toFixed(0)}k/month, ~$${(monthlyRevenue*3/1000).toFixed(0)}k/quarter from ${wonDeals.length} engagements\n`;
      pipelineContext += `By Stage: ${Object.entries(byStatus).map(([s, deals]) => `${s}: ${deals.length} ($${(deals.reduce((sum: number, d: any) => sum + (d.tcv || 0), 0)/1000).toFixed(0)}k)`).join(', ')}\n`;
      pipelineContext += `EE accounts (repeat business): ${eeAccounts.join(', ') || 'None'}\n`;
      pipelineContext += `EN accounts (expanding): ${enAccounts.join(', ') || 'None'}\n`;
      pipelineContext += `Closing soon (Negotiation): ${negotiation.map((d: any) => `${d.customerName} $${((d.tcv||0)/1000).toFixed(0)}k`).join(', ') || 'None'}\n`;
      pipelineContext += `Overdue tasks: ${overdueTasks.length}\n`;
      pipelineContext += `\nTop deals by value:\n`;
      [...allOpps].sort((a: any, b: any) => (b.tcv || 0) - (a.tcv || 0)).slice(0, 10).forEach((o: any) => {
        pipelineContext += `- ${o.customerName}: ${o.opportunityName} | ${o.status} | $${((o.tcv||0)/1000).toFixed(0)}k | Owner: ${o.primaryOwner}\n`;
      });

      // Add specific deal context if provided
      let dealContext = '';
      if (input.context?.opportunityId) {
        const opp = allOpps.find((o: any) => o.id === input.context?.opportunityId);
        if (opp) {
          const stakeholders = await Stakeholder.find({ opportunityId: input.context.opportunityId }).lean();
          const tasks = await Task.find({ opportunityId: input.context.opportunityId }).lean();
          // Include workshop assessment data if deal has a linked workshop
          let workshopContext = '';
          if ((opp as any).workshopId) {
            try {
              const WS = mongoose.models.Workshop || (await import('@/lib/db/models/workshop')).Workshop;
              const ws = await WS.findOne({ id: (opp as any).workshopId }).lean();
              if (ws) {
                const levels = (ws as any).framework?.levels || [];
                const allDims = levels.flatMap((l: any) => l.dimensions || []);
                const scored = allDims.filter((d: any) => d.currentScore != null);
                const gaps = allDims.filter((d: any) => d.currentScore != null && d.targetScore != null && d.targetScore > d.currentScore);
                workshopContext = `\nWORKSHOP ASSESSMENT: ${(ws as any).title}
Readiness: ${scored.length > 0 ? Math.round(scored.reduce((s: number, d: any) => s + d.currentScore, 0) / scored.length / 4 * 100) : 0}%
Scored: ${scored.length}/${allDims.length} dimensions | Gaps: ${gaps.length}
Top gaps: ${gaps.sort((a: any, b: any) => (b.targetScore - b.currentScore) - (a.targetScore - a.currentScore)).slice(0, 5).map((d: any) => d.name).join(', ') || 'None'}
Use cases: ${(ws as any).useCases?.length || 0} | Scope items: ${(ws as any).scopeItems?.length || 0}`;
              }
            } catch {} // Workshop model may not be available
          }

          dealContext = `\n\nCURRENT DEAL FOCUS: ${(opp as any).customerName} - ${(opp as any).opportunityName}
Status: ${(opp as any).status} | TCV: $${((opp as any).tcv || 0).toLocaleString()} | Margin: ${(opp as any).margin || 'N/A'}%
Owner: ${(opp as any).primaryOwner} | Close: ${(opp as any).expectedCloseDate} | Duration: ${(opp as any).dealDuration}
Stakeholders: ${stakeholders.map((s: any) => `${s.name} (${s.title})${s.isDecisionMaker ? ' [DM]' : ''}`).join(', ') || 'None'}
Tasks: ${tasks.length} total, ${tasks.filter((t: any) => t.status === 'complete').length} complete, ${tasks.filter((t: any) => t.status === 'pending' && new Date(t.dueDate) < new Date()).length} overdue${workshopContext}
Conversation: ${((opp as any).conversationLog || '').slice(0, 500)}`;
        }
      }

      // ── Page-contextual system prompt routing ──
      const isDealFocused = input.context?.opportunityId && dealContext;
      const page = input.context?.page || '';

      // Load page-specific context
      let pageSpecificContext = '';
      let pageSpecificPrompt = '';
      let maxTokens = 600;

      if (isDealFocused) {
        // ═══ DEAL-FOCUSED: one specific deal ═══
        pageSpecificPrompt = `You are the Galent AI Deal Coach focused on ONE specific deal.

CONTEXT — this is the ONLY deal you should talk about:
${dealContext}

STRICT RULES:
- Talk ONLY about this specific deal — do NOT mention other deals
- Be specific: use the customer name, stakeholder names, dollar amounts, dates
- NEVER use markdown: no ##, no **, no *, no ---, no emoji, no bullet points with -
- Use plain text only. For emphasis use CAPS not bold.
- Keep responses SHORT — max 100 words
- Structure as: 1-2 sentences of analysis, then numbered action steps
- Each action step starts with a verb: Call, Schedule, Update, Draft, Send, Add
- End with 2-3 actions formatted as: [ACTION: label | type | details]
- Types: create_task, add_stakeholder, change_stage, generate_sow, schedule_meeting, send_followup, update_tcv`;
        maxTokens = 800;

      } else if (page.startsWith('/accounts') || page === '/accounts') {
        // ═══ ACCOUNTS PAGE: account intelligence ═══
        const Account = mongoose.models.Account || (await import('@/lib/db/models/account')).Account;
        const accounts = await Account.find().lean();
        const acctSummary = Object.entries(acctCounts)
          .sort(([,a], [,b]) => b.tcv - a.tcv)
          .slice(0, 15)
          .map(([name, c]) => `${name}: ${c.total} opps, ${c.won} won, $${(c.tcv/1000).toFixed(0)}k`)
          .join('\n');

        pageSpecificPrompt = `You are the Galent AI Account Intelligence assistant. The user is on the ACCOUNTS page.

YOUR FOCUS: Account strategy, penetration, expansion opportunities, relationship mapping.

ACCOUNT PORTFOLIO:
Total accounts: ${accounts.length}
EE (repeat business): ${eeAccounts.join(', ') || 'None'}
EN (expanding): ${enAccounts.join(', ') || 'None'}

TOP ACCOUNTS BY VALUE:
${acctSummary}

RULES:
- Focus on account-level insights: penetration, whitespace, expansion plays
- Identify cross-sell/upsell patterns across accounts
- Compare account health and revenue concentration
- Suggest account plans and stakeholder mapping strategies
- Use plain text, no markdown. Be concise and actionable.
${pipelineContext}`;
        maxTokens = 1000;

      } else if (page.startsWith('/presales') || page === '/presales') {
        // ═══ PRESALES PAGE: presales intelligence ═══
        const qualifying = byStatus['Qualification'] || [];
        const proposals = byStatus['Proposal'] || [];
        const discovery = byStatus['Discovery'] || [];

        pageSpecificPrompt = `You are the Galent AI Presales Coach. The user is on the PRESALES page.

YOUR FOCUS: Qualifying deals, proposals, discovery calls, workshop planning, solution design.

PRESALES PIPELINE:
Discovery: ${discovery.length} deals
Qualifying: ${qualifying.length} deals — ${qualifying.map((d: any) => `${d.customerName} $${((d.tcv||0)/1000).toFixed(0)}k`).join(', ') || 'None'}
Proposal: ${proposals.length} deals — ${proposals.map((d: any) => `${d.customerName} $${((d.tcv||0)/1000).toFixed(0)}k`).join(', ') || 'None'}

RULES:
- Focus on presales activities: discovery planning, qualification criteria, proposal strategy
- Suggest workshop topics and assessment approaches for qualifying deals
- Identify deals that need POCs, demos, or technical deep-dives
- Recommend next presales actions for each deal
- Use plain text, no markdown. Be concise and actionable.
${pipelineContext}`;
        maxTokens = 1000;

      } else if (page.startsWith('/forecasting') || page === '/forecasting') {
        // ═══ FORECASTING: revenue prediction and commit/best-case analysis ═══
        const commitDeals = allOpps.filter((o: any) => o.forecastCategory === 'commit');
        const bestCase = allOpps.filter((o: any) => o.forecastCategory === 'best_case');
        const commitRev = commitDeals.reduce((s: number, o: any) => s + (o.tcv || 0), 0);
        const bestRev = bestCase.reduce((s: number, o: any) => s + (o.tcv || 0), 0);

        pageSpecificPrompt = `You are the Galent AI Forecast Analyst. The user is on the FORECASTING page.

YOUR FOCUS: Revenue forecasting, commit vs best-case analysis, pipeline coverage, deal velocity.

FORECAST DATA:
Commit: ${commitDeals.length} deals, $${(commitRev/1000).toFixed(0)}k — ${commitDeals.map((d: any) => `${d.customerName} $${((d.tcv||0)/1000).toFixed(0)}k`).join(', ') || 'None'}
Best Case: ${bestCase.length} deals, $${(bestRev/1000).toFixed(0)}k — ${bestCase.map((d: any) => `${d.customerName} $${((d.tcv||0)/1000).toFixed(0)}k`).join(', ') || 'None'}
Pipeline: ${allOpps.filter((o: any) => o.forecastCategory === 'pipeline').length} deals
Won (revenue base): ${wonDeals.length} deals, $${(wonRevenue/1000).toFixed(0)}k
Monthly run rate: ~$${(monthlyRevenue/1000).toFixed(0)}k

RULES:
- Focus on forecast accuracy, pipeline coverage ratios, deal velocity
- Identify deals likely to slip or pull-in based on stage duration and close dates
- Analyze commit vs best-case probability
- Suggest forecast adjustments based on deal patterns
- Use plain text, no markdown. Be concise with numbers.
${pipelineContext}`;
        maxTokens = 1000;

      } else if (page.startsWith('/workshop') || page.startsWith('workshop')) {
        // ═══ WORKSHOP PAGES: assessment, scoring, facilitation ═══
        pageSpecificPrompt = `You are the Galent AI Workshop Facilitator. The user is working on a client workshop.

YOUR FOCUS: Workshop facilitation, assessment scoring, gap analysis, use case identification, scope building, proposal drafting.

RULES:
- Focus on workshop-specific tasks: scoring dimensions, identifying gaps, synthesizing findings
- Help with facilitation: suggest discussion prompts, sticky note content, section arrangements
- Draft findings, implications, and recommendations in McKinsey consulting register
- When asked about slides, help with content analysis and talking points
- Be thorough and detailed — workshop outputs should be exhaustive, not simplified
- Use plain text, no markdown. Be substantive.
${pipelineContext}`;
        maxTokens = page === 'workshop-create' ? 3000 : 1500;

      } else if (page.startsWith('/dashboard') || page === '/dashboard' || page === '/') {
        // ═══ DASHBOARD: executive overview ═══
        pageSpecificPrompt = `You are the Galent AI Executive Assistant. The user is on the DASHBOARD.

YOUR FOCUS: Executive summary, key metrics, urgent items, portfolio health.

PORTFOLIO SNAPSHOT:
${pipelineContext}

RULES:
- Provide executive-level insights: what needs attention today, this week
- Highlight revenue at risk, deals slipping, overdue actions
- Compare performance metrics (won vs target, pipeline coverage)
- Suggest 3-5 priority actions for the day
- Use plain text, no markdown. Lead with the most important insight.`;
        maxTokens = 800;

      } else if (page.startsWith('/pipeline') || page === '/pipeline') {
        // ═══ PIPELINE: deal flow and stage management ═══
        pageSpecificPrompt = `You are the Galent AI Pipeline Manager. The user is on the PIPELINE page.

YOUR FOCUS: Pipeline health, deal flow, stage transitions, velocity, bottlenecks.

PIPELINE:
${Object.entries(byStatus).map(([s, deals]) => `${s}: ${deals.length} deals ($${(deals.reduce((sum: number, d: any) => sum + (d.tcv || 0), 0)/1000).toFixed(0)}k)`).join('\n')}
Overdue tasks: ${overdueTasks.length}

RULES:
- Focus on pipeline movement: what should advance, what's stuck, what's at risk
- Identify bottlenecks by stage (deals sitting too long)
- Suggest stage transitions for deals ready to move
- Prioritize by value and urgency
- Use numbered action steps. No markdown. Be specific with deal names and values.
${pipelineContext}`;
        maxTokens = 800;

      } else if (page.startsWith('/insights') || page.startsWith('/graph')) {
        // ═══ INSIGHTS / GRAPH: analytics and patterns ═══
        pageSpecificPrompt = `You are the Galent AI Analytics Advisor. The user is on the INSIGHTS page.

YOUR FOCUS: Pattern analysis, win/loss trends, performance metrics, competitive intelligence.

DATA:
${pipelineContext}

RULES:
- Focus on analytical insights: trends, patterns, correlations
- Identify winning patterns (what do won deals have in common?)
- Analyze loss reasons and suggest improvements
- Compare performance across owners, regions, service lines
- Use plain text, no markdown. Lead with data-driven insights.`;
        maxTokens = 1000;

      } else {
        // ═══ DEFAULT: general pipeline assistant ═══
        pageSpecificPrompt = `You are the Galent AI Sales Assistant. Help with whatever the user needs.

STRICT FORMAT RULES:
- NEVER use markdown (no ##, no **, no ---, no emoji)
- Write numbered action steps when suggesting actions
- Include deal names and dollar amounts when referencing deals
- Be concise and actionable
- Think of it as a to-do list, not a report
${pipelineContext}${dealContext}`;
        maxTokens = 600;
      }

      const systemPrompt = pageSpecificPrompt;

      const startMs = Date.now();
      const tracePage = input.context?.page || 'chat';
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: input.message }],
      });
      const latencyMs = Date.now() - startMs;

      // Telemetry: log trace + update metrics (telemetry/traces/ + telemetry/metrics/)
      logTrace({
        id: `chat-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        assist: `chat.${tracePage}`,
        model,
        latencyMs,
        status: 'success',
      });
      updateMetrics(`chat.${tracePage}`, model, latencyMs, true);

      return {
        response:
          response.content[0].type === 'text' ? response.content[0].text : 'Unable to respond.',
        generatedAt: new Date().toISOString(),
      };
    }),
});
