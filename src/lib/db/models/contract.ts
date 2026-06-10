import mongoose, { Schema, Document } from 'mongoose';

export interface IContract extends Document {
  opportunityId: string;
  accountId?: string;
  type: 'MSA' | 'SOW' | 'NDA' | 'Amendment' | 'Renewal';
  title: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'expired' | 'terminated';
  value: number;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  renewalReminderDays: number;
  signatories: { name: string; title: string; signedAt?: Date; status: 'pending' | 'signed' }[];
  engagementType: string;
  pricingModel: string;
  terms: string;
  fileUrl?: string;
  templateId?: string;
  approvals: { userId: string; name: string; status: 'pending' | 'approved' | 'rejected'; date?: Date; notes?: string }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema = new Schema<IContract>({
  opportunityId: { type: String, required: true, index: true },
  accountId: String,
  type: { type: String, enum: ['MSA', 'SOW', 'NDA', 'Amendment', 'Renewal'], required: true },
  title: { type: String, required: true },
  status: { type: String, enum: ['draft', 'review', 'approved', 'active', 'expired', 'terminated'], default: 'draft' },
  value: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  autoRenew: { type: Boolean, default: false },
  renewalReminderDays: { type: Number, default: 60 },
  signatories: [{
    name: String,
    title: String,
    signedAt: Date,
    status: { type: String, enum: ['pending', 'signed'], default: 'pending' },
  }],
  engagementType: { type: String, required: true },
  pricingModel: String,
  terms: String,
  fileUrl: String,
  templateId: String,
  approvals: [{
    userId: String,
    name: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    date: Date,
    notes: String,
  }],
  createdBy: String,
}, { timestamps: true });

// Index for expiry reminders
ContractSchema.index({ endDate: 1, status: 1 });

export default mongoose.models.Contract || mongoose.model<IContract>('Contract', ContractSchema);
