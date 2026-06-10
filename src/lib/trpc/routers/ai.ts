import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { analyzeDeal, analyzePipeline } from '@/lib/ai/deal-coach';
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

      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 2048,
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

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
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
      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();
      const model = process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-20250514';

      const response = await client.messages.create({
        model,
        max_tokens: 1500,
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

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        const result = JSON.parse(cleaned);

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
      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();
      const model = process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-20250514';

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

      let pipelineContext = `\n\nYOU HAVE FULL ACCESS TO THE PIPELINE DATA. Here is the current state:\n`;
      pipelineContext += `Total: ${allOpps.length} deals ($${(totalTcv/1000).toFixed(0)}k pipeline)\n`;
      pipelineContext += `By Stage: ${Object.entries(byStatus).map(([s, deals]) => `${s}: ${deals.length} ($${(deals.reduce((sum: number, d: any) => sum + (d.tcv || 0), 0)/1000).toFixed(0)}k)`).join(', ')}\n`;
      pipelineContext += `Closing soon (Negotiation): ${negotiation.map((d: any) => `${d.customerName} $${((d.tcv||0)/1000).toFixed(0)}k`).join(', ') || 'None'}\n`;
      pipelineContext += `Overdue tasks: ${overdueTasks.length}\n`;
      pipelineContext += `\nTop deals by value:\n`;
      [...allOpps].sort((a: any, b: any) => (b.tcv || 0) - (a.tcv || 0)).slice(0, 10).forEach((o: any) => {
        pipelineContext += `- ${o.customerName}: ${o.opportunityName} | ${o.status} | $${((o.tcv||0)/1000).toFixed(0)}k | Owner: ${o.primaryOwner} | Close: ${o.expectedCloseDate}\n`;
      });

      // Add specific deal context if provided
      let dealContext = '';
      if (input.context?.opportunityId) {
        const opp = allOpps.find((o: any) => o.id === input.context?.opportunityId);
        if (opp) {
          const stakeholders = await Stakeholder.find({ opportunityId: input.context.opportunityId }).lean();
          const tasks = await Task.find({ opportunityId: input.context.opportunityId }).lean();
          dealContext = `\n\nCURRENT DEAL FOCUS: ${(opp as any).customerName} - ${(opp as any).opportunityName}
Status: ${(opp as any).status} | TCV: $${((opp as any).tcv || 0).toLocaleString()} | Margin: ${(opp as any).margin || 'N/A'}%
Owner: ${(opp as any).primaryOwner} | Close: ${(opp as any).expectedCloseDate} | Duration: ${(opp as any).dealDuration}
Stakeholders: ${stakeholders.map((s: any) => `${s.name} (${s.title})${s.isDecisionMaker ? ' [DM]' : ''}`).join(', ') || 'None'}
Tasks: ${tasks.length} total, ${tasks.filter((t: any) => t.status === 'complete').length} complete, ${tasks.filter((t: any) => t.status === 'pending' && new Date(t.dueDate) < new Date()).length} overdue
Conversation: ${((opp as any).conversationLog || '').slice(0, 500)}`;
        }
      }

      const response = await client.messages.create({
        model,
        max_tokens: 600,
        system: `You are the Galent AI Deal Coach with FULL ACCESS to the sales pipeline. RULES:
1. NEVER say you don't have data — you DO. Use it.
2. ALWAYS be specific: name deals, dollar amounts, owners, dates.
3. Keep responses SHORT — max 200 words.
4. Format as NUMBERED ACTION STEPS, not paragraphs.
5. Each action must be specific: "Call [person] about [deal] by [date]"
6. Start with the #1 priority, not a summary.
7. NO markdown headers, NO bullet points with **, just clean numbered steps.
8. Include dollar amounts and dates for every deal mentioned.
9. If mentioning a person, include their role and which deal.
10. End with ONE key metric the user should track today.${pipelineContext}${dealContext}`,
        messages: [{ role: 'user', content: input.message }],
      });

      return {
        response:
          response.content[0].type === 'text' ? response.content[0].text : 'Unable to respond.',
        generatedAt: new Date().toISOString(),
      };
    }),
});
