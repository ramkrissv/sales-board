import mongoose, { Schema, Document } from 'mongoose';

export interface IStakeholder extends Document {
  opportunityId: string;
  name: string;
  title: string;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
  isPrimaryContact: boolean;
  isDecisionMaker: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StakeholderSchema = new Schema<IStakeholder>(
  {
    opportunityId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    title: { type: String, required: true },
    email: { type: String, required: false },
    phone: { type: String, required: false },
    linkedInUrl: { type: String, required: false },
    isPrimaryContact: { type: Boolean, default: false },
    isDecisionMaker: { type: Boolean, default: false },
    notes: { type: String, required: false },
  },
  { timestamps: true }
);

export const Stakeholder =
  mongoose.models.Stakeholder || mongoose.model<IStakeholder>('Stakeholder', StakeholderSchema);
