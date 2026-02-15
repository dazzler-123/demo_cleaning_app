import { ApiError } from '../../shared/utils/ApiError.js';
import { prisma } from '../../config/database.js';
import { taskLogsRepository } from './task-logs.repository.js';

export const taskLogsService = {
  async getByAssignmentId(assignmentId: string, userId: string, userRole: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    
    if (userRole === 'agent') {
      const agent = await prisma.agent.findUnique({ where: { userId } });
      if (!agent || assignment.agentId !== agent.id) {
        throw new ApiError(403, 'Access denied');
      }
    }
    
    return taskLogsRepository.findByAssignmentId(assignmentId);
  },
};
