import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { Task } from '@/lib/db/models/task';
import mongoose from 'mongoose';

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

      // Auto activity logging
      try {
        const Activity = mongoose.models.Activity;
        if (Activity) {
          await Activity.create({
            type: 'task_created', entityType: 'task', entityId: plain._id.toString(),
            entityName: plain.name, description: `Task created: ${plain.name}`,
            userName: 'Admin User',
          });
        }
      } catch {}

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

      // Auto activity logging
      try {
        const Activity = mongoose.models.Activity;
        if (Activity) {
          await Activity.create({
            type: input.status === 'complete' ? 'task_completed' : 'task_updated',
            entityType: 'task', entityId: input.id,
            entityName: (task as any).name || input.id,
            description: input.status === 'complete' ? `Task completed: ${(task as any).name}` : `Task updated: ${(task as any).name}`,
            userName: 'Admin User',
          });
        }
      } catch {}

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

      // Auto activity logging
      try {
        const Activity = mongoose.models.Activity;
        if (Activity) {
          await Activity.create({
            type: 'task_deleted', entityType: 'task', entityId: input.id,
            entityName: input.id, description: `Task deleted`,
            userName: 'Admin User',
          });
        }
      } catch {}

      return { success: true };
    }),
});
