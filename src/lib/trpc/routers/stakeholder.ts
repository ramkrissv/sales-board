import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { Stakeholder } from '@/lib/db/models/stakeholder';

const createStakeholderSchema = z.object({
  opportunityId: z.string(),
  name: z.string(),
  title: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedInUrl: z.string().optional(),
  isPrimaryContact: z.boolean().default(false),
  isDecisionMaker: z.boolean().default(false),
  notes: z.string().optional(),
});

const updateStakeholderSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedInUrl: z.string().optional(),
  isPrimaryContact: z.boolean().optional(),
  isDecisionMaker: z.boolean().optional(),
  notes: z.string().optional(),
});

export const stakeholderRouter = router({
  create: protectedProcedure
    .input(createStakeholderSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const stakeholder = await Stakeholder.create(input);
      return stakeholder.toObject();
    }),

  update: protectedProcedure
    .input(updateStakeholderSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const { id, ...updates } = input;

      const stakeholder = await Stakeholder.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      ).lean();

      if (!stakeholder) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Stakeholder not found',
        });
      }

      return stakeholder;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const result = await Stakeholder.findByIdAndDelete(input.id);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Stakeholder not found',
        });
      }

      return { success: true };
    }),
});
