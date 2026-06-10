import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { Stakeholder } from '@/lib/db/models/stakeholder';
import mongoose from 'mongoose';

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
      const plain = stakeholder.toObject();

      // Auto activity logging
      try {
        const Activity = mongoose.models.Activity;
        if (Activity) {
          await Activity.create({
            type: 'stakeholder_added', entityType: 'stakeholder', entityId: plain._id.toString(),
            entityName: plain.name, description: `Stakeholder added: ${plain.name} (${plain.title})`,
            userName: 'Admin User',
          });
        }
      } catch {}

      return plain;
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

      // Auto activity logging
      try {
        const Activity = mongoose.models.Activity;
        if (Activity) {
          await Activity.create({
            type: 'stakeholder_updated', entityType: 'stakeholder', entityId: input.id,
            entityName: (stakeholder as any).name || input.id,
            description: `Stakeholder updated: ${(stakeholder as any).name}`,
            userName: 'Admin User',
          });
        }
      } catch {}

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

      // Auto activity logging
      try {
        const Activity = mongoose.models.Activity;
        if (Activity) {
          await Activity.create({
            type: 'stakeholder_deleted', entityType: 'stakeholder', entityId: input.id,
            entityName: input.id, description: `Stakeholder removed`,
            userName: 'Admin User',
          });
        }
      } catch {}

      return { success: true };
    }),
});
