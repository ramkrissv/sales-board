import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
  team?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, required: true },
    firstName: { type: String },
    lastName: { type: String },
    profileImageUrl: { type: String },
    role: {
      type: String,
      enum: ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'],
      default: 'rep',
    },
    team: { type: String },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
