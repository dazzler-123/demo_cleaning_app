import mongoose, { Schema, Document, Model } from 'mongoose';
import type { UserRole, UserStatus } from '../../shared/types/index.js';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ['super_admin', 'admin', 'agent'],
    },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'inactive', 'suspended'],
    },
  },
  { timestamps: true }
);

// userSchema.index({ email: 1 });
userSchema.index({ role: 1, status: 1 });

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
