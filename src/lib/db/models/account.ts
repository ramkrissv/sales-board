import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  companyName: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  hqLocation?: string;
  techStack: string[];
  description?: string;
  accountType?: string;
  accountHealth?: number;
  penetration?: number;
  territory?: string;
  aiBrief?: string;
  aiBriefGeneratedAt?: Date;
  intentData?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    companyName: { type: String, required: true, unique: true },
    website: { type: String },
    industry: { type: String },
    employeeCount: { type: Number },
    annualRevenue: { type: Number },
    hqLocation: { type: String },
    techStack: { type: [String], default: [] },
    description: { type: String },
    accountType: {
      type: String,
      enum: ['Strategic', 'Enterprise', 'Mid-Market', 'SMB'],
    },
    accountHealth: { type: Number, min: 0, max: 100 },
    penetration: { type: Number, min: 0, max: 100 },
    territory: { type: String },
    aiBrief: { type: String },
    aiBriefGeneratedAt: { type: Date },
    intentData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Account =
  mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
