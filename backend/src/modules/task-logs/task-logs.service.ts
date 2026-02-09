import { ApiError } from '../../shared/utils/ApiError.js';
import { Assignment } from '../../shared/models/index.js';
import { taskLogsRepository } from './task-logs.repository.js';

export const taskLogsService = {
  async getByAssignmentId(assignmentId: string, userId: string, userRole: string) {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    if (userRole === 'agent') {
      const { Agent } = await import('../../shared/models/index.js');
      const agent = await Agent.findOne({ userId });
      if (!agent || assignment.agentId.toString() !== agent._id.toString()) {
        throw new ApiError(403, 'Access denied');
      }
    }
    return taskLogsRepository.findByAssignmentId(assignmentId);
  },
};
