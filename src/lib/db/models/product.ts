import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  serviceLineId?: mongoose.Types.ObjectId;
  category?: string;
  description?: string;
  defaultMargin?: number;
  defaultBillingModel?: string;
  techStack: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    serviceLineId: { type: Schema.Types.ObjectId, ref: 'ServiceLine' },
    category: {
      type: String,
      enum: ['Platform', 'Service', 'Accelerator', 'IP'],
    },
    description: { type: String },
    defaultMargin: { type: Number },
    defaultBillingModel: { type: String },
    techStack: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Product =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
