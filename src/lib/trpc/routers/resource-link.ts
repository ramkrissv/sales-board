import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { ResourceLink } from '@/lib/db/models/resource-link';

const createResourceLinkSchema = z.object({
  opportunityId: z.string(),
  title: z.string(),
  url: z.string(),
  type: z.enum(['file', 'folder', 'link']),
  addedBy: z.string(),
});

export const resourceLinkRouter = router({
  create: protectedProcedure
    .input(createResourceLinkSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const link = await ResourceLink.create(input);

      const plain = link.toObject();
      return {
        ...plain,
        addedAt: plain.addedAt instanceof Date
          ? plain.addedAt.toISOString()
          : plain.addedAt,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const result = await ResourceLink.findByIdAndDelete(input.id);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Resource link not found',
        });
      }

      return { success: true };
    }),
});
