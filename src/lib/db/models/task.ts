import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  opportunityId: string;
  name: string;
  owner: string;
  dueDate: Date;
  status: string;
  priority: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    opportunityId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    owner: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'complete'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    notes: { type: String, required: false },
  },
  { timestamps: true }
);

export const Task =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
