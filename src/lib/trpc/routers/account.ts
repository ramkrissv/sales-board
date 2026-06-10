import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { Account } from '@/lib/db/models/account';
import { Opportunity } from '@/lib/db/models/opportunity';

const createAccountSchema = z.object({
  companyName: z.string(),
  website: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().optional(),
  annualRevenue: z.number().optional(),
  hqLocation: z.string().optional(),
  techStack: z.array(z.string()).default([]),
  description: z.string().optional(),
  accountType: z.enum(['Strategic', 'Enterprise', 'Mid-Market', 'SMB']).optional(),
  accountHealth: z.number().min(0).max(100).optional(),
  penetration: z.number().min(0).max(100).optional(),
});

const updateAccountSchema = z.object({
  id: z.string(),
  companyName: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().optional(),
  annualRevenue: z.number().optional(),
  hqLocation: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  description: z.string().optional(),
  accountType: z.enum(['Strategic', 'Enterprise', 'Mid-Market', 'SMB']).optional(),
  accountHealth: z.number().min(0).max(100).optional(),
  penetration: z.number().min(0).max(100).optional(),
});

export const accountRouter = router({
  list: protectedProcedure.query(async () => {
    await connectDB();
    const accounts = await Account.find().sort({ createdAt: -1 }).lean();
    return accounts;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const account = await Account.findById(input.id).lean();

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        });
      }

      // Get associated opportunities
      // Match by accountId OR by customerName (for deals not yet linked)
      const opportunities = await Opportunity.find({
        $or: [
          { accountId: input.id },
          { customerName: (account as any).companyName },
        ],
      }).lean();

      return {
        ...account,
        opportunities,
      };
    }),

  create: protectedProcedure
    .input(createAccountSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const account = await Account.create(input);
      return account.toObject();
    }),

  update: protectedProcedure
    .input(updateAccountSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const { id, ...updates } = input;

      const account = await Account.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      ).lean();

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        });
      }

      return account;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const result = await Account.findByIdAndDelete(input.id);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        });
      }

      return { success: true };
    }),
});
