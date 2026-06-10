import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  type: 'deal_created' | 'deal_updated' | 'stage_change' | 'task_completed' | 'stakeholder_added' | 'contract_created' | 'lead_qualified' | 'lead_converted' | 'ai_analysis' | 'sow_generated' | 'outreach_sent';
  entityType: 'opportunity' | 'task' | 'stakeholder' | 'contract' | 'lead' | 'account';
  entityId: string;
  entityName: string;
  description: string;
  userId: string;
  userName: string;
  metadata?: Record<string, any>;
  revenueImpact?: number;
  attributedTo?: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>({
  type: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  entityName: { type: String, required: true },
  description: { type: String, required: true },
  userId: { type: String, default: 'default-user' },
  userName: { type: String, default: 'Admin User' },
  metadata: Schema.Types.Mixed,
  revenueImpact: { type: Number, default: 0 },
  attributedTo: String,
}, { timestamps: true });

ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ entityType: 1, entityId: 1 });

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);
