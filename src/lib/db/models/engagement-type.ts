import mongoose, { Schema, Document } from 'mongoose';

export interface IEngagementType extends Document {
  name: string;
  code: string;
  category: 'services' | 'staffing' | 'product' | 'hybrid';
  description: string;
  pricingModels: string[];
  isActive: boolean;
}

const EngagementTypeSchema = new Schema<IEngagementType>({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  category: { type: String, enum: ['services', 'staffing', 'product', 'hybrid'], required: true },
  description: String,
  pricingModels: [String],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.EngagementType || mongoose.model<IEngagementType>('EngagementType', EngagementTypeSchema);
