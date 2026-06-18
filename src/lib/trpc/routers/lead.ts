import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import mongoose from 'mongoose';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { parseAIJson } from '@/lib/ai/parse-json';

function getModel() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@/lib/db/models/lead') as { default: mongoose.Model<any> }).default;
}

// No dummy seed data — leads are created by users through the UI
const DEFAULT_LEADS: any[] = [];

export const leadRouter = router({
  list: protectedProcedure
    .input(z.object({
      stage: z.string().optional(),
      type: z.string().optional(),
      source: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      let leads = await Lead.find().sort({ score: -1, createdAt: -1 }).lean();

      // Seed defaults if empty
      if (leads.length === 0) {
        await Lead.insertMany(DEFAULT_LEADS.map(l => ({ ...l, createdBy: 'system' })));
        leads = await Lead.find().sort({ score: -1, createdAt: -1 }).lean();
      }

      // Apply filters
      if (input?.stage) {
        leads = leads.filter((l: any) => l.stage === input.stage);
      }
      if (input?.type) {
        leads = leads.filter((l: any) => l.type === input.type);
      }
      if (input?.source) {
        leads = leads.filter((l: any) => l.source === input.source);
      }

      return leads;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const lead = await Lead.findById(input.id).lean();
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      return lead;
    }),

  create: protectedProcedure
    .input(z.object({
      company: z.string(),
      contactName: z.string(),
      contactTitle: z.string().optional().default(''),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      contactLinkedIn: z.string().optional(),
      website: z.string().optional(),
      source: z.enum(['inbound', 'outbound', 'referral', 'event', 'ai_detected', 'partner']),
      type: z.enum(['product', 'services', 'combined']),
      productInterest: z.array(z.string()).default([]),
      serviceInterest: z.array(z.string()).default([]),
      estimatedValue: z.number().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).default([]),
      industry: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const lead = await Lead.create({
        ...input,
        stage: 'signal',
        score: 0,
        outreachStatus: 'not_started',
        createdBy: 'admin@galent.com',
      });
      return lead.toObject();
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      company: z.string().optional(),
      contactName: z.string().optional(),
      contactTitle: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      contactLinkedIn: z.string().optional(),
      website: z.string().optional(),
      source: z.enum(['inbound', 'outbound', 'referral', 'event', 'ai_detected', 'partner']).optional(),
      type: z.enum(['product', 'services', 'combined']).optional(),
      productInterest: z.array(z.string()).optional(),
      serviceInterest: z.array(z.string()).optional(),
      estimatedValue: z.number().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      industry: z.string().optional(),
      assignedTo: z.string().optional(),
      stage: z.enum(['signal', 'qualify', 'enrich', 'engage', 'convert', 'disqualified', 'converted']).optional(),
      score: z.number().min(0).max(100).optional(),
      outreachStatus: z.enum(['not_started', 'draft_ready', 'sent', 'replied']).optional(),
      outreachDraft: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const { id, ...updates } = input;
      const lead = await Lead.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      return lead;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const lead = await Lead.findByIdAndDelete(input.id);
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      return { success: true };
    }),

  qualify: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const lead = await Lead.findById(input.id);
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });

      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: `Score this sales lead for qualification. Company: ${lead.company}, Contact: ${lead.contactName} (${lead.contactTitle}), Industry: ${lead.industry || 'Unknown'}, Product Interest: ${lead.productInterest.join(', ') || 'None'}, Service Interest: ${lead.serviceInterest.join(', ') || 'None'}, Source: ${lead.source}, Type: ${lead.type}. Respond with ONLY JSON: {"icpFit": <0-100>, "budgetSignal": <0-100>, "timing": <0-100>, "overallScore": <0-100>, "reasoning": "<2 sentences>"}` }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const qual = parseAIJson(text);

      lead.aiQualification = qual;
      lead.score = qual.overallScore;
      if (qual.overallScore >= 60) lead.stage = 'qualify';
      await lead.save();

      // Fire workflow for qualified leads
      if (qual.overallScore >= 60) {
        try {
          const { executeWorkflows } = await import('@/lib/workflow/engine');
          await executeWorkflows({ type: 'lead_qualified', metadata: { leadId: input.id, score: qual.overallScore } });
        } catch (e) { console.error('Workflow error:', e); }
      }

      return lead.toObject();
    }),

  enrich: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const lead = await Lead.findById(input.id);
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });

      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: `Enrich this company profile for sales purposes. Company: ${lead.company}, Contact: ${lead.contactName} (${lead.contactTitle}), Industry: ${lead.industry || 'Unknown'}, Website: ${lead.website || 'Unknown'}. Generate realistic enrichment data. Respond with ONLY JSON: {"industry": "<industry>", "employeeCount": <number>, "annualRevenue": <number in USD>, "techStack": ["<tech1>", "<tech2>", "<tech3>"]}` }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const enrichment = parseAIJson(text);

      lead.industry = enrichment.industry;
      lead.employeeCount = enrichment.employeeCount;
      lead.annualRevenue = enrichment.annualRevenue;
      lead.techStack = enrichment.techStack;
      lead.enrichedAt = new Date();
      if (lead.stage === 'qualify') lead.stage = 'enrich';
      await lead.save();
      return lead.toObject();
    }),

  draftOutreach: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const lead = await Lead.findById(input.id);
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });

      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: `Draft a personalized sales outreach email for: Company: ${lead.company}, Contact: ${lead.contactName} (${lead.contactTitle}), Email: ${lead.contactEmail}, Interest: ${[...lead.productInterest, ...lead.serviceInterest].join(', ')}, Industry: ${lead.industry || 'their industry'}. The email should be from Galent, a sales intelligence and IT services company. Be professional, concise (under 150 words), and include a specific value proposition. Don't use generic templates. Return ONLY the email body text, no subject line.` }],
      });

      const draft = response.content[0].type === 'text' ? response.content[0].text : '';
      lead.outreachDraft = draft;
      lead.outreachStatus = 'draft_ready';
      if (lead.stage === 'qualify' || lead.stage === 'enrich') lead.stage = 'engage';
      await lead.save();
      return lead.toObject();
    }),

  convertToOpportunity: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const lead = await Lead.findById(input.id);
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });

      const { Opportunity } = await import('@/lib/db/models');

      const year = new Date().getFullYear();
      const oppId = `OPP-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      await Opportunity.create({
        id: oppId,
        customerName: lead.company,
        opportunityName: `${lead.type === 'product' ? 'Product' : lead.type === 'services' ? 'Services' : 'Combined'} — ${lead.productInterest.concat(lead.serviceInterest).join(' + ') || 'New Opportunity'}`,
        status: 'Discovery',
        tcv: lead.estimatedValue || 0,
        dealDuration: '12 months',
        expectedCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        startDate: new Date(),
        primaryOwner: lead.assignedTo || 'Unassigned',
        industry: lead.industry || 'Technology',
        region: 'North America',
        source: `Lead: ${lead.source}`,
        engagementType: lead.engagementType,
        salesPOCs: [],
        presalesPOCs: [],
        customTags: [...lead.tags, 'from-lead'],
        conversationLog: `Converted from lead. Contact: ${lead.contactName} (${lead.contactTitle}), ${lead.contactEmail}. AI Score: ${lead.score}/100. ${lead.aiQualification?.reasoning || ''}`,
        activityLog: [],
      });

      lead.convertedToOpportunityId = oppId;
      lead.convertedAt = new Date();
      lead.stage = 'converted';
      await lead.save();

      // Fire workflow for deal creation from lead conversion
      try {
        const { executeWorkflows } = await import('@/lib/workflow/engine');
        await executeWorkflows({
          type: 'deal_created',
          opportunityId: oppId,
          opportunityName: `${lead.type === 'product' ? 'Product' : lead.type === 'services' ? 'Services' : 'Combined'} — ${lead.productInterest.concat(lead.serviceInterest).join(' + ') || 'New Opportunity'}`,
          customerName: lead.company,
          toStage: 'Discovery',
        });
      } catch (e) { console.error('Workflow error:', e); }

      return { lead: lead.toObject(), opportunityId: oppId };
    }),

  disqualify: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const lead = await Lead.findById(input.id);
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });

      lead.stage = 'disqualified';
      lead.disqualifyReason = input.reason;
      await lead.save();
      return lead.toObject();
    }),

  bulkQualify: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Lead = getModel();
      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();

      const results = [];
      for (const id of input.ids) {
        const lead = await Lead.findById(id);
        if (!lead) continue;

        try {
          const response = await client.messages.create({
            model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6',
            max_tokens: 512,
            messages: [{ role: 'user', content: `Score this sales lead for qualification. Company: ${lead.company}, Contact: ${lead.contactName} (${lead.contactTitle}), Industry: ${lead.industry || 'Unknown'}, Product Interest: ${lead.productInterest.join(', ') || 'None'}, Service Interest: ${lead.serviceInterest.join(', ') || 'None'}, Source: ${lead.source}, Type: ${lead.type}. Respond with ONLY JSON: {"icpFit": <0-100>, "budgetSignal": <0-100>, "timing": <0-100>, "overallScore": <0-100>, "reasoning": "<2 sentences>"}` }],
          });

          const text = response.content[0].type === 'text' ? response.content[0].text : '';
          const qual = parseAIJson(text);

          lead.aiQualification = qual;
          lead.score = qual.overallScore;
          if (qual.overallScore >= 60) lead.stage = 'qualify';
          await lead.save();
          results.push(lead.toObject());
        } catch {
          results.push(lead.toObject());
        }
      }

      return results;
    }),
});
