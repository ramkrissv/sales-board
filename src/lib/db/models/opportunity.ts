import mongoose, { Schema, Document } from 'mongoose';

export interface IOpportunity extends Document {
  id: string;
  customerName: string;
  opportunityName: string;
  status: string;
  tcv: number;
  dealDuration: string;
  expectedCloseDate: Date;
  startDate: Date;
  primaryOwner: string;
  salesPOCs: string[];
  presalesPOCs: string[];
  conversationLog: string;
  industry: string;
  region: string;
  serviceLine?: string;
  clientType?: string;
  opportunityType?: string;
  billingModel?: string;
  margin?: number;
  source: string;
  customTags: string[];
  activityLog: any;
  createdBy?: string;
  updatedBy?: string;
  // AI fields
  dealHealthScore?: number;
  winProbability?: number;
  aiStatus?: string;
  competitorNames?: string[];
  lossReason?: string;
  nextStep?: string;
  nextStepDueDate?: Date;
  lastActivityDate?: Date;
  stageEnteredDate?: Date;
  sentimentScore?: number;
  accountId?: mongoose.Types.ObjectId;
  engagementType?: string;
  engagementTypes?: string[];
  forecastCategory?: string;
  // Lifecycle tracking
  lifecyclePhase?: string;
  parentOpportunityId?: string;
  childOpportunityIds?: string[];
  contractIds?: string[];
  convertedFromLeadId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    id: { type: String, unique: true, required: true },
    customerName: { type: String, required: true },
    opportunityName: { type: String, required: true },
    status: {
      type: String,
      enum: ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'],
    },
    tcv: { type: Number, default: 0 },
    dealDuration: { type: String, required: true },
    expectedCloseDate: { type: Date, required: true },
    startDate: { type: Date, required: true },
    primaryOwner: { type: String, required: true },
    salesPOCs: { type: [String], default: [] },
    presalesPOCs: { type: [String], default: [] },
    conversationLog: { type: String, default: '' },
    industry: {
      type: String,
    },
    region: {
      type: String,
      enum: ['North America', 'Europe', 'APAC', 'Latin America', 'Middle East'],
    },
    serviceLine: {
      type: String,
      enum: ['Legacy Modernization', 'Data & AI', 'Testing & QA', 'Managed Services / SRE', 'Cloud & Infrastructure', 'Staffing'],
      required: false,
    },
    clientType: {
      type: String,
      enum: ['New', 'Existing'],
      required: false,
    },
    opportunityType: {
      type: String,
      enum: ['New Deal', 'Upsell', 'Cross-sell', 'Renewal', 'Enhancement'],
      required: false,
    },
    billingModel: {
      type: String,
      enum: ['Fixed Price', 'T&M', 'Product Licensing', 'Outcome-Based', 'Time & Material', 'Retainer', 'Milestone-based'],
      required: false,
    },
    margin: { type: Number, min: 0, max: 100, required: false },
    source: { type: String, required: true },
    customTags: { type: [String], default: [] },
    activityLog: { type: Schema.Types.Mixed, default: [] },
    createdBy: { type: String, required: false },
    updatedBy: { type: String, required: false },
    // AI fields
    dealHealthScore: { type: Number, min: 0, max: 100, required: false },
    winProbability: { type: Number, min: 0, max: 100, required: false },
    aiStatus: {
      type: String,
      enum: ['on_track', 'at_risk', 'stale', 'closing'],
      required: false,
    },
    competitorNames: { type: [String], required: false },
    lossReason: { type: String, required: false },
    nextStep: { type: String, required: false },
    nextStepDueDate: { type: Date, required: false },
    lastActivityDate: { type: Date, required: false },
    stageEnteredDate: { type: Date, required: false },
    sentimentScore: { type: Number, required: false },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: false },
    engagementType: { type: String, required: false },
    engagementTypes: { type: [String], default: [] },
    forecastCategory: { type: String, enum: ['commit', 'best_case', 'pipeline', 'omitted'], default: 'pipeline' },
    // Lifecycle tracking
    lifecyclePhase: { type: String, enum: ['opportunity', 'deal', 'engagement', 'delivery', 'closed'], default: 'opportunity' },
    parentOpportunityId: { type: String, required: false },
    childOpportunityIds: { type: [String], default: [] },
    contractIds: { type: [String], default: [] },
    convertedFromLeadId: { type: String, required: false },
  },
  { timestamps: true }
);

OpportunitySchema.index({ status: 1 });
OpportunitySchema.index({ primaryOwner: 1 });
OpportunitySchema.index({ createdAt: -1 });
OpportunitySchema.index({ industry: 1 });
OpportunitySchema.index({ region: 1 });
OpportunitySchema.index({ accountId: 1 });

export const Opportunity =
  mongoose.models.Opportunity || mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
