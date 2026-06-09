import mongoose, { Schema, Document } from 'mongoose';

export interface IResourceLink extends Document {
  opportunityId: string;
  title: string;
  url: string;
  type: string;
  addedBy: string;
  addedAt: Date;
}

const ResourceLinkSchema = new Schema<IResourceLink>({
  opportunityId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: {
    type: String,
    enum: ['file', 'folder', 'link'],
  },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

export const ResourceLink =
  mongoose.models.ResourceLink || mongoose.model<IResourceLink>('ResourceLink', ResourceLinkSchema);
