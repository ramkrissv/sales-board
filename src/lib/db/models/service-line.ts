import mongoose, { Schema, Document } from 'mongoose';

export interface IPipelineStage {
  id: string;
  name: string;
  order: number;
  color?: string;
  requiredFields: string[];
  maxDaysAllowed?: number;
}

export interface IServiceLine extends Document {
  name: string;
  code: string;
  color?: string;
  description?: string;
  leads: string[];
  isActive: boolean;
  pipelineStages: IPipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

const PipelineStageSchema = new Schema<IPipelineStage>(
  {
    id: { type: String },
    name: { type: String },
    order: { type: Number },
    color: { type: String },
    requiredFields: { type: [String], default: [] },
    maxDaysAllowed: { type: Number },
  },
  { _id: false }
);

const ServiceLineSchema = new Schema<IServiceLine>(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    color: { type: String },
    description: { type: String },
    leads: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    pipelineStages: { type: [PipelineStageSchema], default: [] },
  },
  { timestamps: true }
);

export const ServiceLine =
  mongoose.models.ServiceLine || mongoose.model<IServiceLine>('ServiceLine', ServiceLineSchema);
