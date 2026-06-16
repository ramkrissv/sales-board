import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';

// Inline schema to avoid import issues
const SettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  aiModel: { type: String, default: 'claude-sonnet-4-6-20250610' },
  guardrails: {
    requireApproval: { type: Boolean, default: true },
    logActions: { type: Boolean, default: true },
    autoInvoke: { type: Boolean, default: true },
  },
  notifications: {
    dealStageChanges: { type: Boolean, default: true },
    overdueTasks: { type: Boolean, default: true },
    aiSignals: { type: Boolean, default: true },
    contractExpiry: { type: Boolean, default: true },
    dealAssignments: { type: Boolean, default: true },
  },
}, { timestamps: true });

function getModel() {
  return mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
}

export const settingsRouter = router({
  get: protectedProcedure.query(async () => {
    await connectDB();
    const Settings = getModel();
    let settings = await Settings.findOne({ userId: 'default-user' }).lean();
    if (!settings) {
      const created = await Settings.create({ userId: 'default-user' });
      settings = created.toObject();
    }
    return settings;
  }),

  update: protectedProcedure
    .input(z.object({
      aiModel: z.string().optional(),
      guardrails: z.object({
        requireApproval: z.boolean(),
        logActions: z.boolean(),
        autoInvoke: z.boolean(),
      }).optional(),
      notifications: z.object({
        dealStageChanges: z.boolean(),
        overdueTasks: z.boolean(),
        aiSignals: z.boolean(),
        contractExpiry: z.boolean(),
        dealAssignments: z.boolean(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Settings = getModel();
      const update: Record<string, unknown> = {};
      if (input.aiModel) update.aiModel = input.aiModel;
      if (input.guardrails) update.guardrails = input.guardrails;
      if (input.notifications) update.notifications = input.notifications;

      const settings = await Settings.findOneAndUpdate(
        { userId: 'default-user' },
        { $set: update },
        { upsert: true, new: true }
      ).lean();
      return settings;
    }),
});
