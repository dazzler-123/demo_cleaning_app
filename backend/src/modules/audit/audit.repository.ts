import { AuditLog } from '../../shared/models/index.js';

export const auditRepository = {
  async findMany(filters: {
    userId?: string;
    resource?: string;
    resourceId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.resource) query.resource = filters.resource;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.action) query.action = filters.action;
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);
    return { items, total, page, limit };
  },
};
