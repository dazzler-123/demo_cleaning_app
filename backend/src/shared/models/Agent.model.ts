import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgent extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  phone?: string;
  skills: string[];
  availability: 'available' | 'busy' | 'off_duty';
  dailyCapacity: number;
  experience?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const agentSchema = new Schema<IAgent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    phone: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    availability: {
      type: String,
      default: 'available',
      enum: ['available', 'busy', 'off_duty'],
    },
    dailyCapacity: { type: Number, default: 5 },
    experience: { type: String, trim: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },
  },
  { timestamps: true }
);

// agentSchema.index({ userId: 1 });
agentSchema.index({ availability: 1, status: 1 });

export const Agent: Model<IAgent> = mongoose.model<IAgent>('Agent', agentSchema);
