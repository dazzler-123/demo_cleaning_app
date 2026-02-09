import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISchedule extends Document {
  _id: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  date: Date;
  timeSlot: string;
  duration: number; // minutes
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

scheduleSchema.index({ leadId: 1 });
scheduleSchema.index({ date: 1, timeSlot: 1 });

export const Schedule: Model<ISchedule> = mongoose.model<ISchedule>('Schedule', scheduleSchema);
