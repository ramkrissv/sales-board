import mongoose, { Schema } from 'mongoose';

const WorkshopTemplateSchema = new Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  description: String,
  version: { type: Number, default: 1 },
  isDefault: { type: Boolean, default: false },
  framework: Schema.Types.Mixed, // Same structure as Workshop.framework
  createdBy: String,
}, { timestamps: true });

export const WorkshopTemplate =
  mongoose.models.WorkshopTemplate || mongoose.model('WorkshopTemplate', WorkshopTemplateSchema);
