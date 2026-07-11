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
  // Hierarchy
  parentAccountId?: mongoose.Types.ObjectId;
  hierarchyLevel?: number;     // 0 = top-level, 1 = subsidiary, 2 = division
  // Ownership & Permissions
  accountOwner?: string;
  teamMembers?: { userId: string; name: string; role: 'owner' | 'contributor' | 'viewer' }[];
  // Enrichment
  region?: string;
  country?: string;
  segment?: string;
  linkedinUrl?: string;
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
    // Hierarchy
    parentAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    hierarchyLevel: { type: Number, default: 0 },
    // Ownership
    accountOwner: { type: String },
    teamMembers: [{
      userId: String,
      name: String,
      role: { type: String, enum: ['owner', 'contributor', 'viewer'], default: 'viewer' },
    }],
    // Enrichment
    region: String,
    country: String,
    segment: { type: String, enum: ['Enterprise', 'Mid-Market', 'SMB', 'Strategic'] },
    linkedinUrl: String,
  },
  { timestamps: true }
);

AccountSchema.index({ parentAccountId: 1 });

export const Account =
  mongoose.models.Account || mongoose.model<IAccount>('Account', AccountSchema);
