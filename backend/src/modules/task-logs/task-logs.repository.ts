import { prisma } from '../../config/database.js';

export const taskLogsRepository = {
  async findByAssignmentId(assignmentId: string) {
    return prisma.taskLog.findMany({
      where: { assignmentId },
      include: {
        changer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
