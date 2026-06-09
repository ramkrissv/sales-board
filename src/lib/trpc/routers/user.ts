import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { connectDB } from '@/lib/db/connection';
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
      return User.create(input);
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
