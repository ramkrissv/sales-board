import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema } from 'mongoose';

const WorkflowSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  isActive: { type: Boolean, default: true },
  mode: { type: String, enum: ['manual', 'agentic'], default: 'manual' },
  createdBy: String,
  serviceLineId: String,
  trigger: { type: Schema.Types.Mixed, required: true },
  conditions: [Schema.Types.Mixed],
  actions: [Schema.Types.Mixed],
  executionCount: { type: Number, default: 0 },
  lastExecutedAt: Date,
  successRate: { type: Number, default: 100 },
  agentSuggested: { type: Boolean, default: false },
  agentConfidence: Number,
  agentRationale: String,
}, { timestamps: true });

function getModel() {
  return mongoose.models.Workflow || mongoose.model('Workflow', WorkflowSchema);
}

const triggerSchema = z.object({
  type: z.enum(['deal_stage_change', 'deal_created', 'task_overdue', 'schedule', 'manual']),
  config: z.record(z.string(), z.any()).optional(),
});

const actionSchema = z.object({
  type: z.enum(['create_task', 'send_notification', 'change_stage', 'invoke_agent', 'assign_owner']),
  config: z.record(z.string(), z.any()).optional(),
});

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  mode: z.enum(['manual', 'agentic']).default('manual'),
  trigger: triggerSchema,
  conditions: z.array(z.record(z.string(), z.any())).default([]),
  actions: z.array(actionSchema).min(1),
  serviceLineId: z.string().optional(),
});

const updateWorkflowSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  mode: z.enum(['manual', 'agentic']).optional(),
  trigger: triggerSchema.optional(),
  conditions: z.array(z.record(z.string(), z.any())).optional(),
  actions: z.array(actionSchema).optional(),
  serviceLineId: z.string().optional(),
});

export const workflowRouter = router({
  list: protectedProcedure.query(async () => {
    await connectDB();
    const Workflow = getModel();
    const workflows = await Workflow.find().sort({ createdAt: -1 }).lean();
    return workflows;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const Workflow = getModel();
      const workflow = await Workflow.findById(input.id).lean();
      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
      }
      return workflow;
    }),

  create: protectedProcedure
    .input(createWorkflowSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const Workflow = getModel();
      const workflow = await Workflow.create(input);
      return workflow.toObject();
    }),

  update: protectedProcedure
    .input(updateWorkflowSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const Workflow = getModel();
      const { id, ...updates } = input;
      const workflow = await Workflow.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      ).lean();
      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
      }
      return workflow;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Workflow = getModel();
      const result = await Workflow.findByIdAndDelete(input.id);
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
      }
      return { success: true };
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Workflow = getModel();
      const workflow = await Workflow.findById(input.id);
      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found' });
      }
      workflow.isActive = !workflow.isActive;
      await workflow.save();
      return workflow.toObject();
    }),
});
