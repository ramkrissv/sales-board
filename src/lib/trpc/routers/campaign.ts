import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema } from 'mongoose';

const CampaignSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Outbound', 'ABM', 'Inbound', 'Partner', 'Event'], required: true },
  status: { type: String, enum: ['Planned', 'Active', 'Paused', 'Completed'], default: 'Planned' },
  channel: { type: String, required: true },
  target: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  sent: { type: Number, default: 0 },
  opened: { type: Number, default: 0 },
  replied: { type: Number, default: 0 },
  meetings: { type: Number, default: 0 },
  deals: { type: Number, default: 0 },
  pipeline: { type: Number, default: 0 },
  budget: { type: Number, default: 0 },
  owner: { type: String, default: '' },
  description: { type: String, default: '' },
}, { timestamps: true });

function getModel() {
  return mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
}

const SEED_CAMPAIGNS = [
  { name: 'Q3 AI Platform Push', type: 'Outbound', status: 'Active', channel: 'Email + LinkedIn', startDate: new Date('2026-05-01'), target: 'Enterprise CTO/CIO', sent: 342, opened: 218, replied: 34, meetings: 12, deals: 4, pipeline: 1800000, owner: 'Sreeram', description: 'Targeted outreach to enterprise technology leaders for AI platform adoption' },
  { name: 'Healthcare Modernization', type: 'ABM', status: 'Active', channel: 'Multi-channel', startDate: new Date('2026-04-15'), target: 'Healthcare IT Leaders', sent: 156, opened: 98, replied: 22, meetings: 8, deals: 3, pipeline: 950000, owner: 'Priya', description: 'Account-based campaign targeting healthcare organizations for digital transformation' },
  { name: 'Cloud Migration Webinar Follow-up', type: 'Inbound', status: 'Completed', channel: 'Email', startDate: new Date('2026-03-10'), target: 'Webinar Attendees', sent: 89, opened: 67, replied: 18, meetings: 6, deals: 2, pipeline: 420000, owner: 'Sreeram', description: 'Follow-up sequence for cloud migration webinar registrants' },
  { name: 'Financial Services Expansion', type: 'ABM', status: 'Active', channel: 'Email + Events', startDate: new Date('2026-05-20'), target: 'FS Decision Makers', sent: 210, opened: 142, replied: 28, meetings: 10, deals: 5, pipeline: 2100000, owner: 'Priya', description: 'Strategic push into financial services vertical with targeted account engagement' },
  { name: 'Partner Channel Activation', type: 'Partner', status: 'Planned', channel: 'Partner referral', startDate: new Date('2026-06-15'), target: 'Partner network', sent: 0, opened: 0, replied: 0, meetings: 0, deals: 0, pipeline: 0, owner: 'Sreeram', description: 'Activate partner referral network for Q3 pipeline generation' },
];

export const campaignRouter = router({
  list: protectedProcedure.query(async () => {
    await connectDB();
    const Campaign = getModel();
    let campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();

    // Seed if empty
    if (campaigns.length === 0) {
      await Campaign.insertMany(SEED_CAMPAIGNS);
      campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    }

    return campaigns.map((c: any) => ({
      ...c,
      id: c._id.toString(),
      _id: undefined,
      startDate: c.startDate?.toISOString(),
      endDate: c.endDate?.toISOString(),
      createdAt: c.createdAt?.toISOString(),
      updatedAt: c.updatedAt?.toISOString(),
    }));
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(['Outbound', 'ABM', 'Inbound', 'Partner', 'Event']),
      channel: z.string().min(1),
      target: z.string().min(1),
      startDate: z.string(),
      endDate: z.string().optional(),
      budget: z.number().optional(),
      owner: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Campaign = getModel();
      const doc = await Campaign.create({
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      });
      return { id: doc._id.toString(), name: doc.name };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      type: z.enum(['Outbound', 'ABM', 'Inbound', 'Partner', 'Event']).optional(),
      status: z.enum(['Planned', 'Active', 'Paused', 'Completed']).optional(),
      channel: z.string().optional(),
      target: z.string().optional(),
      sent: z.number().optional(),
      opened: z.number().optional(),
      replied: z.number().optional(),
      meetings: z.number().optional(),
      deals: z.number().optional(),
      pipeline: z.number().optional(),
      budget: z.number().optional(),
      owner: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Campaign = getModel();
      const { id, ...data } = input;
      await Campaign.findByIdAndUpdate(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Campaign = getModel();
      await Campaign.findByIdAndDelete(input.id);
      return { success: true };
    }),
});
