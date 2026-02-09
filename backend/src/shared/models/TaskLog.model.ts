import mongoose, { Schema, Document, Model } from 'mongoose';
import type { TaskStatus } from '../../shared/types/index.js';

export interface ITaskLog extends Document {
  _id: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

const taskLogSchema = new Schema<ITaskLog>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    fromStatus: { type: String, required: true, enum: ['pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold'] },
    toStatus: { type: String, required: true, enum: ['pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold'] },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

taskLogSchema.index({ assignmentId: 1 });
taskLogSchema.index({ createdAt: -1 });

export const TaskLog: Model<ITaskLog> = mongoose.model<ITaskLog>('TaskLog', taskLogSchema);
