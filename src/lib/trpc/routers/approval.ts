import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema } from 'mongoose';

const ApprovalSchema = new Schema({
  entityType: String, entityId: String, entityName: String,
  requestedBy: String, reason: String,
  approvalChain: [{ role: String, name: String, status: { type: String, default: 'pending' }, comment: String, decidedAt: Date }],
  status: { type: String, default: 'pending' },
  threshold: { field: String, value: Number, condition: String },
}, { timestamps: true });

function getModel() {
  return mongoose.models.Approval || mongoose.model('Approval', ApprovalSchema);
}

export const approvalRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional(), entityType: z.string().optional() }).optional())
    .query(async ({ input }) => {
      await connectDB();
      const Approval = getModel();
      const filter: any = {};
      if (input?.status) filter.status = input.status;
      if (input?.entityType) filter.entityType = input.entityType;
      return Approval.find(filter).sort({ createdAt: -1 }).lean();
    }),

  getForEntity: protectedProcedure
    .input(z.object({ entityType: z.string(), entityId: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const Approval = getModel();
      return Approval.find({ entityType: input.entityType, entityId: input.entityId }).sort({ createdAt: -1 }).lean();
    }),

  requestApproval: protectedProcedure
    .input(z.object({
      entityType: z.enum(['opportunity', 'contract', 'pricing']),
      entityId: z.string(),
      entityName: z.string(),
      requestedBy: z.string().default('Admin User'),
      reason: z.string(),
      roles: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Approval = getModel();

      const roleNames: Record<string, string> = {
        'CSO': 'Chief Sales Officer',
        'CFO': 'Chief Financial Officer',
        'CTO': 'Chief Technology Officer',
        'CEO': 'Chief Executive Officer',
        'COO': 'Chief Operating Officer',
        'VP Sales': 'VP of Sales',
        'Sales Manager': 'Sales Manager',
      };

      const approval = await Approval.create({
        ...input,
        approvalChain: input.roles.map(role => ({
          role,
          name: roleNames[role] || role,
          status: 'pending',
        })),
      });

      // Create notification
      try {
        const Notif = mongoose.models.Notification;
        if (Notif) {
          await Notif.create({
            userId: 'default-user',
            type: 'system',
            title: `Approval Requested: ${input.entityName}`,
            message: `${input.requestedBy} requested ${input.roles.join(' → ')} approval for ${input.entityName}. Reason: ${input.reason}`,
          });
        }
      } catch { /* notification creation is best-effort */ }

      return approval.toObject();
    }),

  approve: protectedProcedure
    .input(z.object({
      approvalId: z.string(),
      role: z.string(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Approval = getModel();
      const approval = await Approval.findById(input.approvalId);
      if (!approval) throw new Error('Approval not found');

      const chainItem = approval.approvalChain.find((c: any) => c.role === input.role && c.status === 'pending');
      if (chainItem) {
        chainItem.status = 'approved';
        chainItem.comment = input.comment;
        chainItem.decidedAt = new Date();
      }

      // Check if all approved
      const allApproved = approval.approvalChain.every((c: any) => c.status === 'approved');
      if (allApproved) approval.status = 'approved';

      await approval.save();
      return approval.toObject();
    }),

  reject: protectedProcedure
    .input(z.object({
      approvalId: z.string(),
      role: z.string(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const Approval = getModel();
      const approval = await Approval.findById(input.approvalId);
      if (!approval) throw new Error('Approval not found');

      const chainItem = approval.approvalChain.find((c: any) => c.role === input.role);
      if (chainItem) {
        chainItem.status = 'rejected';
        chainItem.comment = input.comment;
        chainItem.decidedAt = new Date();
      }

      approval.status = 'rejected';
      await approval.save();
      return approval.toObject();
    }),
});
