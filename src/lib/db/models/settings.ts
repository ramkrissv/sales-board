import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  userId: string;
  aiModel: string;
  guardrails: {
    requireApproval: boolean;
    logActions: boolean;
    autoInvoke: boolean;
  };
  notifications: {
    dealStageChanges: boolean;
    overdueTasks: boolean;
    aiSignals: boolean;
    contractExpiry: boolean;
    dealAssignments: boolean;
  };
}

const SettingsSchema = new Schema<ISettings>({
  userId: { type: String, required: true, unique: true },
  aiModel: { type: String, default: 'claude-sonnet-4-6-20250610' },
  guardrails: {
    requireApproval: { type: Boolean, default: true },
    logActions: { type: Boolean, default: true },
    autoInvoke: { type: Boolean, default: true },
  },
  notifications: {
    dealStageChanges: { type: Boolean, default: true },
    overdueTasks: { type: Boolean, default: true },
    aiSignals: { type: Boolean, default: true },
    contractExpiry: { type: Boolean, default: true },
    dealAssignments: { type: Boolean, default: true },
  },
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
