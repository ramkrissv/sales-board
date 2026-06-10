import mongoose, { Schema, Document } from 'mongoose';

export interface ISalesStageTemplate extends Document {
  stage: string;
  engagementType?: string;
  serviceLine?: string;
  templates: {
    name: string;
    type: 'checklist' | 'document' | 'artifact' | 'gate_criteria';
    description: string;
    required: boolean;
    aiGenerable: boolean;
  }[];
  gateCriteria: {
    field: string;
    condition: string;
    description: string;
  }[];
  roles: {
    role: string;
    responsibility: string;
  }[];
}

const StageTemplateSchema = new Schema<ISalesStageTemplate>({
  stage: { type: String, required: true },
  engagementType: String,
  serviceLine: String,
  templates: [{
    name: String,
    type: { type: String, enum: ['checklist', 'document', 'artifact', 'gate_criteria'] },
    description: String,
    required: { type: Boolean, default: false },
    aiGenerable: { type: Boolean, default: false },
  }],
  gateCriteria: [{
    field: String,
    condition: String,
    description: String,
  }],
  roles: [{
    role: String,
    responsibility: String,
  }],
}, { timestamps: true });

StageTemplateSchema.index({ stage: 1, engagementType: 1, serviceLine: 1 });

export default mongoose.models.SalesStageTemplate || mongoose.model<ISalesStageTemplate>('SalesStageTemplate', StageTemplateSchema);
