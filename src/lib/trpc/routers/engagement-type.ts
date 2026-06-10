import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import EngagementType from '@/lib/db/models/engagement-type';

const createEngagementTypeSchema = z.object({
  name: z.string(),
  code: z.string(),
  category: z.enum(['services', 'staffing', 'product', 'hybrid']),
  description: z.string().optional(),
  pricingModels: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const updateEngagementTypeSchema = createEngagementTypeSchema.partial().extend({
  id: z.string(),
});

function serialize(doc: any) {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    ...plain,
    _id: plain._id?.toString(),
    createdAt: plain.createdAt instanceof Date ? plain.createdAt.toISOString() : plain.createdAt,
    updatedAt: plain.updatedAt instanceof Date ? plain.updatedAt.toISOString() : plain.updatedAt,
  };
}

export const engagementTypeRouter = router({
  list: protectedProcedure.query(async () => {
    await connectDB();
    const types = await EngagementType.find().sort({ name: 1 }).lean();
    return types.map(serialize);
  }),

  create: protectedProcedure
    .input(createEngagementTypeSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const engType = await EngagementType.create(input);
      return serialize(engType);
    }),

  update: protectedProcedure
    .input(updateEngagementTypeSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const { id, ...updates } = input;
      const engType = await EngagementType.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
      if (!engType) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Engagement type not found' });
      }
      return serialize(engType);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const engType = await EngagementType.findByIdAndDelete(input.id);
      if (!engType) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Engagement type not found' });
      }
      return { success: true };
    }),
});
