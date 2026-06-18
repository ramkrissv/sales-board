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
    .query(async ({ input, ctx }) => {
      await connectDB();
      const Notification = getModel();
      const uid = ctx.userId || 'default-user';
      // Include both user-specific AND broadcast notifications (from webhooks using 'default-user')
      let notifications = await Notification.find({
        $or: [{ userId: uid }, { userId: 'default-user' }]
      })
        .sort({ createdAt: -1 })
        .limit(input?.limit || 20)
        .lean();

      // Seed initial notifications if empty
      if (notifications.length === 0) {
        await Notification.insertMany([
          { userId: uid, type: 'system', title: 'Welcome to Galent SalesPilot', message: 'Your AI-powered sales intelligence platform is ready.', read: false },
          { userId: uid, type: 'ai_signal', title: 'Pipeline Analysis Complete', message: 'Deal Coach has analyzed your opportunities and identified at-risk deals.', read: false },
        ]);
        notifications = await Notification.find({ userId: uid })
          .sort({ createdAt: -1 })
          .limit(input?.limit || 20)
          .lean();
      }

      return notifications;
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    await connectDB();
    const Notification = getModel();
    const uid = ctx.userId || 'default-user';
    return Notification.countDocuments({
      $or: [{ userId: uid }, { userId: 'default-user' }],
      read: false,
    });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Notification = getModel();
      await Notification.findByIdAndUpdate(input.id, { read: true });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await connectDB();
    const Notification = getModel();
    await Notification.updateMany({ userId: ctx.userId || 'default-user', read: false }, { read: true });
    return { success: true };
  }),

  create: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
      type: z.string(),
      title: z.string(),
      message: z.string(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await connectDB();
      const Notification = getModel();
      return Notification.create({ ...input, userId: input.userId || ctx.userId || 'default-user' });
    }),

  createIntentAlert: protectedProcedure
    .input(z.object({
      accountName: z.string(),
      signal: z.string(),
      strength: z.enum(['strong', 'moderate', 'weak']),
    }))
    .mutation(async ({ input, ctx }) => {
      await connectDB();
      const Notification = getModel();
      return Notification.create({
        userId: ctx.userId || 'default-user',
        type: 'ai_signal',
        title: `Intent Signal: ${input.accountName}`,
        message: `${input.strength.toUpperCase()} signal detected: ${input.signal}`,
        metadata: { accountName: input.accountName, strength: input.strength },
      });
    }),
});
