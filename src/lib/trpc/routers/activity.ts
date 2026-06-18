import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema } from 'mongoose';

const ActivitySchema = new Schema({
  type: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  entityName: { type: String, required: true },
  description: { type: String, required: true },
  userId: { type: String, default: 'default-user' },
  userName: { type: String, default: 'Admin User' },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

function getModel() {
  return mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
}

export const activityRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().default(30),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      entityIds: z.array(z.string()).optional(),
    }).optional())
    .query(async ({ input }) => {
      await connectDB();
      const Activity = getModel();
      const filter: any = {};
      if (input?.entityType) filter.entityType = input.entityType;
      if (input?.entityId) filter.entityId = input.entityId;
      // Support querying by multiple entity IDs (e.g. all opps for an account)
      if (input?.entityIds?.length) {
        filter.entityId = { $in: input.entityIds };
      }

      const activities = await Activity.find(filter).sort({ createdAt: -1 }).limit(input?.limit || 30).lean();

      // Auto-seed if empty
      if (activities.length === 0 && !input?.entityType) {
        await Activity.insertMany([
          { type: 'deal_created', entityType: 'opportunity', entityId: 'opp-001', entityName: 'Brightspeed', description: 'AI-Native Platform Transformation deal created', userName: 'Sreeram' },
          { type: 'stage_change', entityType: 'opportunity', entityId: 'opp-001', entityName: 'Brightspeed', description: 'Moved from Discovery to Won', userName: 'System' },
          { type: 'task_completed', entityType: 'task', entityId: 'task-1', entityName: 'Schedule workshop', description: 'Task completed for Brightspeed', userName: 'Chris Wascak' },
          { type: 'ai_analysis', entityType: 'opportunity', entityId: 'opp-015', entityName: 'Wells Fargo', description: 'AI Deal Coach analyzed: Health 65/100, 3 risks identified', userName: 'AI Agent' },
          { type: 'lead_qualified', entityType: 'lead', entityId: 'lead-1', entityName: 'FinServ Partners', description: 'Lead scored 72/100 by AI — qualified for engagement', userName: 'AI Agent' },
          { type: 'stakeholder_added', entityType: 'stakeholder', entityId: 'sh-1', entityName: 'Chintan Mehta', description: 'Added as Decision Maker for Wells Fargo', userName: 'Ashwin' },
          { type: 'contract_created', entityType: 'contract', entityId: 'c-1', entityName: 'Brightspeed MSA', description: 'Master Service Agreement created', userName: 'Admin User' },
          { type: 'sow_generated', entityType: 'opportunity', entityId: 'opp-002', entityName: 'Motion Industries', description: 'AI generated Statement of Work', userName: 'AI Agent' },
        ]);
        return Activity.find(filter).sort({ createdAt: -1 }).limit(30).lean();
      }

      return activities;
    }),

  create: protectedProcedure
    .input(z.object({
      type: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      entityName: z.string(),
      description: z.string(),
      userName: z.string().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Activity = getModel();
      return Activity.create(input);
    }),
});
