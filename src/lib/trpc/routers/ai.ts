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

      let contextPrompt = '';
      if (input.context?.opportunityId) {
        await connectDB();
        const Opportunity = getOpportunityModel();
        const opp = await Opportunity.findOne({ id: input.context.opportunityId }).lean();
        if (opp) {
          contextPrompt = `\n\nCurrent deal context: ${(opp as any).customerName} - ${(opp as any).opportunityName} (${(opp as any).status}, $${((opp as any).tcv || 0).toLocaleString()})`;
        }
      }

      const response = await client.messages.create({
        model,
        max_tokens: 500,
        system: `You are the Galent AI Deal Coach — a senior sales strategist embedded in a sales intelligence platform. You help sales reps with deal strategy, stakeholder engagement, competitive analysis, and pipeline management. Be specific, actionable, and concise. Always reference specific data points when available.${contextPrompt}`,
        messages: [{ role: 'user', content: input.message }],
      });

      return {
        response:
          response.content[0].type === 'text' ? response.content[0].text : 'Unable to respond.',
        generatedAt: new Date().toISOString(),
      };
    }),
});
