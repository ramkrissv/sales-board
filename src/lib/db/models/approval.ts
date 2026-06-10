import mongoose, { Schema, Document } from 'mongoose';

export interface IApproval extends Document {
  entityType: 'opportunity' | 'contract' | 'pricing';
  entityId: string;
  entityName: string;
  requestedBy: string;
  reason: string;
  approvalChain: {
    role: string;
    name: string;
    status: 'pending' | 'approved' | 'rejected';
    comment?: string;
    decidedAt?: Date;
  }[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  threshold?: { field: string; value: number; condition: string };
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalSchema = new Schema<IApproval>({
  entityType: { type: String, required: true, enum: ['opportunity', 'contract', 'pricing'] },
  entityId: { type: String, required: true },
  entityName: { type: String, required: true },
  requestedBy: { type: String, required: true },
  reason: { type: String, required: true },
  approvalChain: [{
    role: { type: String, required: true },
    name: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    comment: String,
    decidedAt: Date,
  }],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending' },
  threshold: {
    field: String,
    value: Number,
    condition: String,
  },
}, { timestamps: true });

ApprovalSchema.index({ entityType: 1, entityId: 1 });
ApprovalSchema.index({ status: 1, 'approvalChain.role': 1 });

export default mongoose.models.Approval || mongoose.model<IApproval>('Approval', ApprovalSchema);
