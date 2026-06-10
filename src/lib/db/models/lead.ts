import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  // Core
  company: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  website?: string;

  // Classification
  source: 'inbound' | 'outbound' | 'referral' | 'event' | 'ai_detected' | 'partner';
  type: 'product' | 'services' | 'combined';
  stage: 'signal' | 'qualify' | 'enrich' | 'engage' | 'convert' | 'disqualified' | 'converted';

  // AI Scoring
  score: number; // 0-100
  aiQualification?: {
    icpFit: number;
    budgetSignal: number;
    timing: number;
    overallScore: number;
    reasoning: string;
  };

  // Interest
  productInterest: string[];
  serviceInterest: string[];
  engagementType?: string;
  estimatedValue?: number;

  // Enrichment
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  techStack?: string[];
  enrichedAt?: Date;

  // Outreach
  outreachStatus?: 'not_started' | 'draft_ready' | 'sent' | 'opened' | 'replied' | 'bounced';
  outreachDraft?: string;
  outreachSentAt?: Date;
  outreachOpenedAt?: Date;
  outreachRepliedAt?: Date;

  // Conversion
  convertedToOpportunityId?: string;
  convertedAt?: Date;
  disqualifyReason?: string;

  // Meta
  assignedTo?: string;
  notes?: string;
  tags: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>({
  company: { type: String, required: true },
  contactName: { type: String, required: true },
  contactTitle: String,
  contactEmail: { type: String, required: true },
  contactPhone: String,
  contactLinkedIn: String,
  website: String,

  source: { type: String, enum: ['inbound', 'outbound', 'referral', 'event', 'ai_detected', 'partner'], required: true },
  type: { type: String, enum: ['product', 'services', 'combined'], required: true },
  stage: { type: String, enum: ['signal', 'qualify', 'enrich', 'engage', 'convert', 'disqualified', 'converted'], default: 'signal' },

  score: { type: Number, default: 0, min: 0, max: 100 },
  aiQualification: {
    icpFit: Number,
    budgetSignal: Number,
    timing: Number,
    overallScore: Number,
    reasoning: String,
  },

  productInterest: [String],
  serviceInterest: [String],
  engagementType: String,
  estimatedValue: Number,

  industry: String,
  employeeCount: Number,
  annualRevenue: Number,
  techStack: [String],
  enrichedAt: Date,

  outreachStatus: { type: String, enum: ['not_started', 'draft_ready', 'sent', 'opened', 'replied', 'bounced'], default: 'not_started' },
  outreachDraft: String,
  outreachSentAt: Date,
  outreachOpenedAt: Date,
  outreachRepliedAt: Date,

  convertedToOpportunityId: String,
  convertedAt: Date,
  disqualifyReason: String,

  assignedTo: String,
  notes: String,
  tags: [String],
  createdBy: String,
}, { timestamps: true });

LeadSchema.index({ stage: 1, score: -1 });
LeadSchema.index({ type: 1, stage: 1 });

export default mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);
