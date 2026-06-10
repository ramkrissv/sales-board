import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegration extends Document {
  name: string;
  type: 'crm' | 'marketing' | 'email' | 'calendar' | 'messaging' | 'storage' | 'project_management' | 'analytics' | 'finance' | 'hr' | 'devtools' | 'other';
  status: 'connected' | 'disconnected' | 'error';
  icon: string;
  description: string;
  config: Record<string, any>;
  lastSyncAt?: Date;
  syncHealth: number;
  createdBy: string;
}

const IntegrationSchema = new Schema<IIntegration>({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['crm', 'marketing', 'email', 'calendar', 'messaging', 'storage', 'project_management', 'analytics', 'finance', 'hr', 'devtools', 'other'], required: true },
  status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
  icon: String,
  description: String,
  config: { type: Schema.Types.Mixed, default: {} },
  lastSyncAt: Date,
  syncHealth: { type: Number, default: 0 },
  createdBy: String,
}, { timestamps: true });

export default mongoose.models.Integration || mongoose.model<IIntegration>('Integration', IntegrationSchema);
