import { prisma } from '../../config/database.js';

export const auditRepository = {
  async findMany(filters: {
    userId?: string;
    resource?: string;
    resourceId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.resource) where.resource = filters.resource;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.action) where.action = filters.action;
    
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    
    return { items, total, page, limit };
  },
};
