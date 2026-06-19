import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { connectDB } from '@/lib/db/connection';
import { sendMail, isSmtpConfigured } from '@/lib/email/mailer';
import mongoose from 'mongoose';

function getUserModel() {
  return mongoose.models.User || require('@/lib/db/models/user').default;
}

export const userRouter = router({
  list: protectedProcedure.query(async () => {
    await connectDB();
    const User = getUserModel();
    return User.find().sort({ createdAt: -1 }).lean();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const User = getUserModel();
      const user = await User.findById(input.id).lean();
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      return user;
    }),

  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      role: z.enum(['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer']).default('rep'),
      team: z.string().optional(),
      profileImageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const User = getUserModel();
      const existing = await User.findOne({ email: input.email });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'User with this email already exists' });
      const user = await User.create(input);

      // Auto-send invite email
      const platformUrl = process.env.NEXTAUTH_URL || 'https://salespilot.galent.ai';
      const loginUrl = `${platformUrl}/login?email=${encodeURIComponent(input.email)}`;
      const name = input.firstName || input.email.split('@')[0];
      await sendMail(
        input.email,
        'You\'re invited to Galent SalesPilot',
        `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f3f8;font-family:'Inter','Segoe UI',system-ui,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f8;padding:32px 0;">
        <tr><td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr><td style="background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:24px 32px;">
            <p style="font-size:20px;font-weight:700;color:#fff;margin:0;">Galent SalesPilot</p>
          </td></tr>
          <tr><td style="padding:28px 32px;">
            <p style="font-size:16px;color:#1a1a2e;margin:0 0 12px;">Hi ${name},</p>
            <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 20px;">You've been invited to <strong>Galent SalesPilot</strong> as a <strong>${input.role || 'rep'}</strong>. SalesPilot is your AI-powered sales intelligence platform.</p>
            <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Sign In to SalesPilot</a>
            <p style="font-size:12px;color:#888;margin:20px 0 0;">Use "Sign in with Microsoft" with your O365 account, or enter your email directly.</p>
          </td></tr>
          <tr><td style="padding:12px 32px;background:#fafafa;border-top:1px solid #e5e7eb;">
            <p style="font-size:10px;color:#999;margin:0;text-align:center;">Galent SalesPilot &middot; <a href="${platformUrl}" style="color:#7c3aed;">salespilot.galent.ai</a></p>
          </td></tr>
        </table>
        </td></tr></table></body></html>`,
        `You're invited to Galent SalesPilot! Sign in at: ${loginUrl}`
      ).catch(() => {}); // Best effort — don't fail user creation if email fails

      return user;
    }),

  sendInvite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const User = getUserModel();
      const user = await User.findById(input.id).lean();
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

      if (!isSmtpConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS.' });
      }

      const platformUrl = process.env.NEXTAUTH_URL || 'https://salespilot.galent.ai';
      const loginUrl = `${platformUrl}/login?email=${encodeURIComponent((user as any).email)}`;
      const name = (user as any).firstName || (user as any).email?.split('@')[0] || 'there';

      const result = await sendMail(
        (user as any).email,
        'You\'re invited to Galent SalesPilot',
        `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f3f8;font-family:'Inter','Segoe UI',system-ui,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f8;padding:32px 0;">
        <tr><td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:24px 32px;">
            <p style="font-size:20px;font-weight:700;color:#fff;margin:0;">Galent SalesPilot</p>
          </td></tr>
          <tr><td style="padding:28px 32px;">
            <p style="font-size:16px;color:#1a1a2e;margin:0 0 12px;">Hi ${name},</p>
            <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 20px;">You've been invited to <strong>Galent SalesPilot</strong>. Click below to sign in.</p>
            <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Sign In to SalesPilot</a>
          </td></tr>
          <tr><td style="padding:12px 32px;background:#fafafa;border-top:1px solid #e5e7eb;">
            <p style="font-size:10px;color:#999;margin:0;text-align:center;">Galent SalesPilot &middot; <a href="${platformUrl}" style="color:#7c3aed;">salespilot.galent.ai</a></p>
          </td></tr>
        </table>
        </td></tr></table></body></html>`,
        `You're invited to Galent SalesPilot! Sign in at: ${loginUrl}`
      );

      if (!result.success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'Failed to send invite email' });
      }

      return { success: true, messageId: result.messageId };
    }),

  updateRole: protectedProcedure
    .input(z.object({
      id: z.string(),
      role: z.enum(['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer']),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const User = getUserModel();
      const user = await User.findByIdAndUpdate(input.id, { role: input.role }, { new: true });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      return user;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      team: z.string().optional(),
      profileImageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const User = getUserModel();
      const { id, ...updates } = input;
      const user = await User.findByIdAndUpdate(id, updates, { new: true });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      return user;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const User = getUserModel();
      await User.findByIdAndDelete(input.id);
      return { success: true };
    }),
});
