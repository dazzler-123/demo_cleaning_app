import mongoose, { Schema, Document, Model } from 'mongoose';
import type { TaskStatus } from '../../shared/types/index.js';

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  scheduleId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  status: TaskStatus;
  isActive: boolean;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  completionImages?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold'],
    },
    isActive: { type: Boolean, default: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String },
    completionImages: [{ type: String }],
  },
  { timestamps: true }
);

assignmentSchema.index({ leadId: 1 });
assignmentSchema.index({ agentId: 1, status: 1 });
assignmentSchema.index({ scheduleId: 1 });

export const Assignment: Model<IAssignment> = mongoose.model<IAssignment>('Assignment', assignmentSchema);
