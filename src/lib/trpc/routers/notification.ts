import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema } from 'mongoose';

const NotifSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

function getModel() {
  return mongoose.models.Notification || mongoose.model('Notification', NotifSchema);
}

export const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      await connectDB();
      const Notification = getModel();
      let notifications = await Notification.find({ userId: 'default-user' })
        .sort({ createdAt: -1 })
        .limit(input?.limit || 20)
        .lean();

      // Seed initial notifications if empty
      if (notifications.length === 0) {
        await Notification.insertMany([
          { userId: 'default-user', type: 'system', title: 'Welcome to Galent SalesPilot', message: 'Your AI-powered sales intelligence platform is ready.', read: false },
          { userId: 'default-user', type: 'ai_signal', title: 'Pipeline Analysis Complete', message: 'Deal Coach has analyzed 31 opportunities and identified 3 at-risk deals.', read: false },
          { userId: 'default-user', type: 'deal_stage_change', title: 'Brightspeed moved to Won', message: 'AI-Native Platform Transformation deal has been marked as Won.', read: true },
        ]);
        notifications = await Notification.find({ userId: 'default-user' })
          .sort({ createdAt: -1 })
          .limit(input?.limit || 20)
          .lean();
      }

      return notifications;
    }),

  getUnreadCount: protectedProcedure.query(async () => {
    await connectDB();
    const Notification = getModel();
    return Notification.countDocuments({ userId: 'default-user', read: false });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Notification = getModel();
      await Notification.findByIdAndUpdate(input.id, { read: true });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async () => {
    await connectDB();
    const Notification = getModel();
    await Notification.updateMany({ userId: 'default-user', read: false }, { read: true });
    return { success: true };
  }),

  create: protectedProcedure
    .input(z.object({
      userId: z.string().default('default-user'),
      type: z.string(),
      title: z.string(),
      message: z.string(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Notification = getModel();
      return Notification.create(input);
    }),
});
