import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkflow extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  mode: string;
  createdBy?: string;
  serviceLineId?: string;
  trigger: any;
  conditions: any[];
  actions: any[];
  executionCount: number;
  lastExecutedAt?: Date;
  successRate: number;
  agentSuggested: boolean;
  agentConfidence?: number;
  agentRationale?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>(
  {
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    mode: {
      type: String,
      enum: ['manual', 'agentic'],
      default: 'manual',
    },
    createdBy: { type: String },
    serviceLineId: { type: String, required: false },
    trigger: { type: Schema.Types.Mixed, required: true },
    conditions: { type: Schema.Types.Mixed, default: [] },
    actions: { type: Schema.Types.Mixed, default: [] },
    executionCount: { type: Number, default: 0 },
    lastExecutedAt: { type: Date },
    successRate: { type: Number, default: 100 },
    agentSuggested: { type: Boolean, default: false },
    agentConfidence: { type: Number },
    agentRationale: { type: String },
  },
  { timestamps: true }
);

export const Workflow =
  mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', WorkflowSchema);
