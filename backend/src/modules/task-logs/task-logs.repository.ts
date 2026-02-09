import { TaskLog } from '../../shared/models/index.js';

export const taskLogsRepository = {
  async findByAssignmentId(assignmentId: string) {
    return TaskLog.find({ assignmentId })
      .populate('changedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
  },
};
