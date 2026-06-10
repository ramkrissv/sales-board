import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import Contract from '@/lib/db/models/contract';

const signatorySchema = z.object({
  name: z.string(),
  title: z.string(),
  signedAt: z.string().optional(),
  status: z.enum(['pending', 'signed']).default('pending'),
});

const approvalSchema = z.object({
  userId: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  date: z.string().optional(),
  notes: z.string().optional(),
});

const createContractSchema = z.object({
  opportunityId: z.string(),
  accountId: z.string().optional(),
  type: z.enum(['MSA', 'SOW', 'NDA', 'Amendment', 'Renewal']),
  title: z.string(),
  status: z.enum(['draft', 'review', 'approved', 'active', 'expired', 'terminated']).default('draft'),
  value: z.number().default(0),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  autoRenew: z.boolean().default(false),
  renewalReminderDays: z.number().default(60),
  signatories: z.array(signatorySchema).default([]),
  engagementType: z.string(),
  pricingModel: z.string().optional(),
  terms: z.string().optional(),
  fileUrl: z.string().optional(),
  templateId: z.string().optional(),
  approvals: z.array(approvalSchema).default([]),
  createdBy: z.string().optional(),
});

const updateContractSchema = createContractSchema.partial().extend({
  id: z.string(),
});

function serializeContract(c: any) {
  const plain = c.toObject ? c.toObject() : c;
  return {
    ...plain,
    _id: plain._id?.toString(),
    startDate: plain.startDate instanceof Date ? plain.startDate.toISOString() : plain.startDate,
    endDate: plain.endDate instanceof Date ? plain.endDate.toISOString() : plain.endDate,
    createdAt: plain.createdAt instanceof Date ? plain.createdAt.toISOString() : plain.createdAt,
    updatedAt: plain.updatedAt instanceof Date ? plain.updatedAt.toISOString() : plain.updatedAt,
  };
}

export const contractRouter = router({
  list: protectedProcedure
    .input(z.object({
      opportunityId: z.string().optional(),
      accountId: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      await connectDB();
      const filter: any = {};
      if (input?.opportunityId) filter.opportunityId = input.opportunityId;
      if (input?.accountId) filter.accountId = input.accountId;
      const contracts = await Contract.find(filter).sort({ createdAt: -1 }).lean();
      return contracts.map(serializeContract);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const contract = await Contract.findById(input.id).lean();
      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }
      return serializeContract(contract);
    }),

  create: protectedProcedure
    .input(createContractSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const contract = await Contract.create({
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        createdBy: input.createdBy || 'admin@galent.com',
      });
      return serializeContract(contract);
    }),

  update: protectedProcedure
    .input(updateContractSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const { id, ...updates } = input;
      const updateData: any = { ...updates };
      if (updates.startDate) updateData.startDate = new Date(updates.startDate);
      if (updates.endDate) updateData.endDate = new Date(updates.endDate);

      const contract = await Contract.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }
      return serializeContract(contract);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const contract = await Contract.findByIdAndDelete(input.id);
      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }
      return { success: true };
    }),

  getExpiring: protectedProcedure
    .input(z.object({ days: z.number().default(60) }))
    .query(async ({ input }) => {
      await connectDB();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + input.days);
      const contracts = await Contract.find({
        endDate: { $lte: cutoff, $gte: new Date() },
        status: { $in: ['active', 'approved'] },
      }).sort({ endDate: 1 }).lean();
      return contracts.map(serializeContract);
    }),

  requestApproval: protectedProcedure
    .input(z.object({
      contractId: z.string(),
      userId: z.string(),
      name: z.string(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const contract = await Contract.findByIdAndUpdate(
        input.contractId,
        {
          $push: { approvals: { userId: input.userId, name: input.name, status: 'pending' } },
          $set: { status: 'review' },
        },
        { new: true }
      ).lean();
      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }
      return serializeContract(contract);
    }),

  approve: protectedProcedure
    .input(z.object({
      contractId: z.string(),
      userId: z.string(),
      status: z.enum(['approved', 'rejected']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDB();
      const contract = await Contract.findOneAndUpdate(
        { _id: input.contractId, 'approvals.userId': input.userId },
        {
          $set: {
            'approvals.$.status': input.status,
            'approvals.$.date': new Date(),
            'approvals.$.notes': input.notes || '',
          },
        },
        { new: true }
      ).lean();
      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract or approval entry not found' });
      }
      // If all approvals are approved, set contract status to approved
      const allApproved = (contract as any).approvals?.every((a: any) => a.status === 'approved');
      if (allApproved) {
        await Contract.findByIdAndUpdate(input.contractId, { $set: { status: 'approved' } });
        (contract as any).status = 'approved';
      }
      const anyRejected = (contract as any).approvals?.some((a: any) => a.status === 'rejected');
      if (anyRejected) {
        await Contract.findByIdAndUpdate(input.contractId, { $set: { status: 'draft' } });
        (contract as any).status = 'draft';
      }
      return serializeContract(contract);
    }),
});
