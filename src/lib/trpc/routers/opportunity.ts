import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { Opportunity } from '@/lib/db/models/opportunity';
import { Stakeholder } from '@/lib/db/models/stakeholder';
import { Task } from '@/lib/db/models/task';
import { ResourceLink } from '@/lib/db/models/resource-link';
import mongoose from 'mongoose';

async function enrichOpportunity(opp: any) {
  const [customerStakeholders, subTasks, resourceLinks] = await Promise.all([
    Stakeholder.find({ opportunityId: opp.id || opp._id.toString() }).lean(),
    Task.find({ opportunityId: opp.id || opp._id.toString() }).lean(),
    ResourceLink.find({ opportunityId: opp.id || opp._id.toString() }).lean(),
  ]);

  const plain = opp.toObject ? opp.toObject() : opp;
  return {
    ...plain,
    customerStakeholders,
    subTasks,
    resourceLinks,
    expectedCloseDate: plain.expectedCloseDate instanceof Date
      ? plain.expectedCloseDate.toISOString()
      : plain.expectedCloseDate,
    startDate: plain.startDate instanceof Date
      ? plain.startDate.toISOString()
      : plain.startDate,
    createdAt: plain.createdAt instanceof Date
      ? plain.createdAt.toISOString()
      : plain.createdAt,
    updatedAt: plain.updatedAt instanceof Date
      ? plain.updatedAt.toISOString()
      : plain.updatedAt,
  };
}

const createOpportunitySchema = z.object({
  id: z.string(),
  customerName: z.string(),
  opportunityName: z.string(),
  status: z.enum(['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold']),
  tcv: z.number().min(0).default(0),
  dealDuration: z.string(),
  expectedCloseDate: z.string().or(z.date()),
  startDate: z.string().or(z.date()),
  primaryOwner: z.string(),
  salesPOCs: z.array(z.string()).default([]),
  presalesPOCs: z.array(z.string()).default([]),
  conversationLog: z.string().default(''),
  industry: z.enum([
    'Healthcare', 'Financial Services', 'Hospitality', 'Professional Services',
    'Manufacturing', 'Retail', 'Technology', 'Other',
  ]),
  region: z.enum(['North America', 'Europe', 'APAC', 'Latin America', 'Middle East']),
  serviceLine: z.enum(['IT Services', 'Staffing']).optional(),
  clientType: z.enum(['New', 'Existing']).optional(),
  opportunityType: z.enum(['New Deal', 'Upsell', 'Cross-sell', 'Renewal', 'Enhancement']).optional(),
  billingModel: z.enum(['Time & Material', 'Fixed Price', 'Retainer', 'Milestone-based']).optional(),
  margin: z.number().min(0).max(100).optional(),
  source: z.string(),
  customTags: z.array(z.string()).default([]),
  activityLog: z.any().default([]),
  // AI fields
  dealHealthScore: z.number().min(0).max(100).optional(),
  winProbability: z.number().min(0).max(100).optional(),
  aiStatus: z.enum(['on_track', 'at_risk', 'stale', 'closing']).optional(),
  competitorNames: z.array(z.string()).optional(),
  lossReason: z.string().optional(),
  nextStep: z.string().optional(),
  nextStepDueDate: z.string().or(z.date()).optional(),
  lastActivityDate: z.string().or(z.date()).optional(),
  stageEnteredDate: z.string().or(z.date()).optional(),
  sentimentScore: z.number().optional(),
  accountId: z.string().optional(),
  forecastCategory: z.enum(['commit', 'best_case', 'pipeline', 'omitted']).optional(),
});

const updateOpportunitySchema = createOpportunitySchema.partial().extend({
  id: z.string(),
});

export const opportunityRouter = router({
  list: protectedProcedure.query(async () => {
    await connectDB();
    const opportunities = await Opportunity.find().sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all(
      opportunities.map((opp) => enrichOpportunity(opp))
    );

    return enriched;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const opportunity = await Opportunity.findOne({ id: input.id }).lean()
        || await Opportunity.findById(input.id).lean();

      if (!opportunity) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Opportunity not found',
        });
      }

      return enrichOpportunity(opportunity);
    }),

  create: protectedProcedure
    .input(createOpportunitySchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const now = new Date();
      const opportunity = await Opportunity.create({
        ...input,
        expectedCloseDate: new Date(input.expectedCloseDate),
        startDate: new Date(input.startDate),
        createdBy: 'admin@galent.com',
        updatedBy: 'admin@galent.com',
      });

      const plain = opportunity.toObject();

      // Fire workflows for deal creation
      try {
        const { executeWorkflows } = await import('@/lib/workflow/engine');
        await executeWorkflows({
          type: 'deal_created',
          opportunityId: plain.id,
          opportunityName: plain.opportunityName,
          customerName: plain.customerName,
          toStage: plain.status,
        });
      } catch (e) { console.error('Workflow execution error:', e); }

      // Auto activity logging
      try {
        const Activity = mongoose.models.Activity;
        if (Activity) {
          await Activity.create({
            type: 'deal_created', entityType: 'opportunity', entityId: plain.id,
            entityName: plain.customerName, description: `New deal created: ${plain.opportunityName}`,
            userName: 'Admin User',
          });
        }
      } catch {}

      return {
        ...plain,
        customerStakeholders: [],
        subTasks: [],
        resourceLinks: [],
        expectedCloseDate: plain.expectedCloseDate.toISOString(),
        startDate: plain.startDate.toISOString(),
        createdAt: plain.createdAt.toISOString(),
        updatedAt: plain.updatedAt.toISOString(),
      };
    }),

  update: protectedProcedure
    .input(updateOpportunitySchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const { id, ...updates } = input;

      // Fetch old opportunity before update to detect stage changes
      const oldOpp = await Opportunity.findOne({ id }).lean() || await Opportunity.findById(id).lean();

      const updateData: any = {
        ...updates,
        updatedBy: 'admin@galent.com',
        updatedAt: new Date(),
      };

      if (updates.expectedCloseDate) {
        updateData.expectedCloseDate = new Date(updates.expectedCloseDate);
      }
      if (updates.startDate) {
        updateData.startDate = new Date(updates.startDate);
      }

      const opportunity = await Opportunity.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true }
      ).lean();

      if (!opportunity) {
        // Try by _id
        const oppById = await Opportunity.findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true }
        ).lean();

        if (!oppById) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Opportunity not found',
          });
        }

        // Fire workflows on stage change
        if (input.status && oldOpp && (oldOpp as any).status !== input.status) {
          try {
            const { executeWorkflows } = await import('@/lib/workflow/engine');
            await executeWorkflows({
              type: 'deal_stage_change',
              opportunityId: id,
              opportunityName: (oldOpp as any).opportunityName,
              customerName: (oldOpp as any).customerName,
              fromStage: (oldOpp as any).status,
              toStage: input.status,
            });
          } catch (e) { console.error('Workflow execution error:', e); }
        }

        // Auto activity logging
        try {
          const Activity = mongoose.models.Activity;
          if (Activity) {
            const changes = Object.keys(input).filter(k => k !== 'id').join(', ');
            await Activity.create({
              type: input.status ? 'stage_change' : 'deal_updated', entityType: 'opportunity',
              entityId: input.id, entityName: (oppById as any)?.customerName || input.id,
              description: input.status ? `Stage changed to ${input.status}` : `Updated: ${changes}`,
              userName: 'Admin User',
            });
          }
        } catch {}

        return enrichOpportunity(oppById);
      }

      // Fire workflows on stage change
      if (input.status && oldOpp && (oldOpp as any).status !== input.status) {
        try {
          const { executeWorkflows } = await import('@/lib/workflow/engine');
          await executeWorkflows({
            type: 'deal_stage_change',
            opportunityId: id,
            opportunityName: (oldOpp as any).opportunityName,
            customerName: (oldOpp as any).customerName,
            fromStage: (oldOpp as any).status,
            toStage: input.status,
          });
        } catch (e) { console.error('Workflow execution error:', e); }
      }

      // Auto activity logging
      try {
        const Activity = mongoose.models.Activity;
        if (Activity) {
          const changes = Object.keys(input).filter(k => k !== 'id').join(', ');
          await Activity.create({
            type: input.status ? 'stage_change' : 'deal_updated', entityType: 'opportunity',
            entityId: input.id, entityName: (opportunity as any)?.customerName || input.id,
            description: input.status ? `Stage changed to ${input.status}` : `Updated: ${changes}`,
            userName: 'Admin User',
          });
        }
      } catch {}

      return enrichOpportunity(opportunity);
    }),

  bulkImport: protectedProcedure
    .input(z.object({
      opportunities: z.array(z.object({
        customerName: z.string(),
        opportunityName: z.string(),
        status: z.string().default('Discovery'),
        tcv: z.number().default(0),
        dealDuration: z.string().default('12 months'),
        expectedCloseDate: z.string(),
        startDate: z.string(),
        primaryOwner: z.string(),
        industry: z.string().default('Technology'),
        region: z.string().default('North America'),
        source: z.string().default('Import'),
        serviceLine: z.string().optional(),
        billingModel: z.string().optional(),
        margin: z.number().optional(),
      }))
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const year = new Date().getFullYear();

      const toInsert = input.opportunities.map((opp) => ({
        id: `OPP-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        ...opp,
        expectedCloseDate: new Date(opp.expectedCloseDate),
        startDate: new Date(opp.startDate),
        salesPOCs: [],
        presalesPOCs: [],
        customTags: ['imported'],
        conversationLog: '',
        activityLog: [],
      }));

      const result = await Opportunity.insertMany(toInsert);
      return { imported: result.length };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const oppId = input.id;

      const opportunity = await Opportunity.findOneAndDelete({ id: oppId })
        || await Opportunity.findByIdAndDelete(oppId);

      if (!opportunity) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Opportunity not found',
        });
      }

      // Cascade delete related records
      await Promise.all([
        Stakeholder.deleteMany({ opportunityId: oppId }),
        Task.deleteMany({ opportunityId: oppId }),
        ResourceLink.deleteMany({ opportunityId: oppId }),
      ]);

      // Auto activity logging
      try {
        const Activity = mongoose.models.Activity;
        if (Activity) {
          await Activity.create({
            type: 'deal_deleted', entityType: 'opportunity', entityId: input.id,
            entityName: input.id, description: `Deal deleted`,
            userName: 'Admin User',
          });
        }
      } catch {}

      return { success: true };
    }),
});
