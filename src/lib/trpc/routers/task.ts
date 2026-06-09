import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { Task } from '@/lib/db/models/task';

const createTaskSchema = z.object({
  opportunityId: z.string(),
  name: z.string(),
  owner: z.string(),
  dueDate: z.string().or(z.date()),
  status: z.enum(['pending', 'complete']).default('pending'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  notes: z.string().optional(),
});

const updateTaskSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  owner: z.string().optional(),
  dueDate: z.string().or(z.date()).optional(),
  status: z.enum(['pending', 'complete']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  notes: z.string().optional(),
});

export const taskRouter = router({
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const task = await Task.create({
        ...input,
        dueDate: new Date(input.dueDate),
      });

      const plain = task.toObject();
      return {
        ...plain,
        dueDate: plain.dueDate.toISOString(),
      };
    }),

  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const { id, ...updates } = input;

      const updateData: any = { ...updates };
      if (updates.dueDate) {
        updateData.dueDate = new Date(updates.dueDate);
      }

      const task = await Task.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).lean();

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      return {
        ...task,
        dueDate: task.dueDate instanceof Date
          ? task.dueDate.toISOString()
          : task.dueDate,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const result = await Task.findByIdAndDelete(input.id);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      return { success: true };
    }),
});
