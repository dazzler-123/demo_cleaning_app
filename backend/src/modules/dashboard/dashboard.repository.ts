import { prisma } from '../../config/database.js';

export const dashboardRepository = {
  async getLeadCounts(filters?: { fromDate?: Date; toDate?: Date }) {
    const where: any = { deletedAt: null };
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }
    
    const total = await prisma.lead.count({ where });
    
    // Get counts by status
    const byStatusRaw = await prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });
    
    const byStatus = byStatusRaw.map(item => ({
      _id: item.status,
      count: item._count.status,
    }));
    
    return { total, byStatus };
  },

  async getLeadsByType(filters?: { fromDate?: Date; toDate?: Date }) {
    const where: any = { deletedAt: null };
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }
    
    const byTypeRaw = await prisma.lead.groupBy({
      by: ['leadType'],
      where,
      _count: { leadType: true },
      orderBy: { _count: { leadType: 'desc' } },
    });
    
    const byType = byTypeRaw.map(item => ({
      _id: item.leadType,
      count: item._count.leadType,
    }));
    
    return byType;
  },

  async getLeadsScheduledToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return prisma.schedule.count({
      where: {
        date: { gte: today, lt: tomorrow },
        isActive: true,
      },
    });
  },

  async getLeadsAssignedToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return prisma.assignment.count({
      where: {
        isActive: true,
        assignedAt: { gte: today, lt: tomorrow },
      },
    });
  },

  async getAssignmentCounts(filters?: { fromDate?: Date; toDate?: Date }) {
    const where: any = {};
    if (filters?.fromDate || filters?.toDate) {
      where.assignedAt = {};
      if (filters.fromDate) where.assignedAt.gte = filters.fromDate;
      if (filters.toDate) where.assignedAt.lte = filters.toDate;
    }
    
    const total = await prisma.assignment.count({ where });
    
    const byStatusRaw = await prisma.assignment.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });
    
    const byStatus = byStatusRaw.map(item => ({
      _id: item.status,
      count: item._count.status,
    }));
    
    return { total, byStatus };
  },

  async getJobsInProgress() {
    return prisma.assignment.count({
      where: { isActive: true, status: 'in_progress' },
    });
  },

  async getJobsCompleted(filters?: { fromDate?: Date; toDate?: Date }) {
    const where: any = { status: 'completed' };
    if (filters?.fromDate || filters?.toDate) {
      where.completedAt = {};
      if (filters.fromDate) where.completedAt.gte = filters.fromDate;
      if (filters.toDate) where.completedAt.lte = filters.toDate;
    }
    
    return prisma.assignment.count({ where });
  },

  async getAgentWorkloadCounts() {
    // Get assignments grouped by agent
    const workloadRaw = await prisma.assignment.groupBy({
      by: ['agentId'],
      where: {
        isActive: true,
        status: { in: ['pending', 'in_progress'] },
      },
      _count: { agentId: true },
      orderBy: { _count: { agentId: 'desc' } },
      take: 5,
    });
    
    // Get agent and user details
    const agentIds = workloadRaw.map(w => w.agentId);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    const agentMap = new Map(agents.map(a => [a.id, a]));
    
    return workloadRaw.map(item => ({
      agentId: item.agentId,
      agentName: agentMap.get(item.agentId)?.user?.name || '',
      agentPhone: agentMap.get(item.agentId)?.phone || null,
      count: item._count.agentId,
    }));
  },

  async getAgentStats() {
    const total = await prisma.agent.count({ where: { status: 'active' } });
    const available = await prisma.agent.count({
      where: { status: 'active', availability: 'available' },
    });
    const busy = await prisma.agent.count({
      where: { status: 'active', availability: 'busy' },
    });
    
    return { total, available, busy };
  },

  async getLeadsByDay(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    
    // Use raw SQL for date grouping as Prisma doesn't support date formatting in groupBy
    const trends = await prisma.$queryRaw<Array<{ _id: string; count: bigint; cancelled: bigint }>>`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') as _id,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM leads
      WHERE deleted_at IS NULL 
        AND created_at >= ${from}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY _id ASC
    `;
    
    return trends.map(t => ({
      _id: t._id,
      count: Number(t.count),
      cancelled: Number(t.cancelled),
    }));
  },

  async getJobTrends(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    
    const trends = await prisma.$queryRaw<Array<{ _id: string; total: bigint; completed: bigint }>>`
      SELECT 
        DATE_FORMAT(assigned_at, '%Y-%m-%d') as _id,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM assignments
      WHERE assigned_at >= ${from}
      GROUP BY DATE_FORMAT(assigned_at, '%Y-%m-%d')
      ORDER BY _id ASC
    `;
    
    return trends.map(t => ({
      _id: t._id,
      total: Number(t.total),
      completed: Number(t.completed),
    }));
  },

  async getSLACompliance(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    
    const completed = await prisma.assignment.count({
      where: {
        status: 'completed',
        completedAt: { gte: from },
      },
    });
    
    const total = await prisma.assignment.count({
      where: {
        status: { in: ['completed', 'cancelled', 'in_progress', 'pending'] },
        assignedAt: { gte: from },
      },
    });
    
    const compliance = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, compliance };
  },

  async getUserCounts() {
    const total = await prisma.user.count();
    
    const byRoleRaw = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });
    
    const byRole = byRoleRaw.map(item => ({
      _id: item.role,
      count: item._count.role,
    }));
    
    return { total, byRole };
  },

  // Agent-specific dashboard methods
  async getAgentAssignmentStats(agentId: string, filters?: { fromDate?: Date; toDate?: Date }) {
    const where: any = { agentId, isActive: true };
    
    if (filters?.fromDate || filters?.toDate) {
      where.assignedAt = {};
      if (filters.fromDate) where.assignedAt.gte = filters.fromDate;
      if (filters.toDate) where.assignedAt.lte = filters.toDate;
    }

    const total = await prisma.assignment.count({ where });
    
    const byStatusRaw = await prisma.assignment.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const byStatus = byStatusRaw.map(item => ({
      _id: item.status,
      count: item._count.status,
    }));

    return { total, byStatus };
  },

  async getAgentTaskTrends(agentId: string, days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const assignedTrends = await prisma.$queryRaw<Array<{ _id: string; assigned: bigint }>>`
      SELECT 
        DATE_FORMAT(assigned_at, '%Y-%m-%d') as _id,
        COUNT(*) as assigned
      FROM assignments
      WHERE agent_id = ${agentId}
        AND assigned_at >= ${from}
      GROUP BY DATE_FORMAT(assigned_at, '%Y-%m-%d')
      ORDER BY _id ASC
    `;

    const completedTrends = await prisma.$queryRaw<Array<{ _id: string; completed: bigint }>>`
      SELECT 
        DATE_FORMAT(completed_at, '%Y-%m-%d') as _id,
        COUNT(*) as completed
      FROM assignments
      WHERE agent_id = ${agentId}
        AND status = 'completed'
        AND completed_at >= ${from}
      GROUP BY DATE_FORMAT(completed_at, '%Y-%m-%d')
      ORDER BY _id ASC
    `;

    const cancelledTrends = await prisma.$queryRaw<Array<{ _id: string; cancelled: bigint }>>`
      SELECT 
        DATE_FORMAT(assigned_at, '%Y-%m-%d') as _id,
        COUNT(*) as cancelled
      FROM assignments
      WHERE agent_id = ${agentId}
        AND status = 'cancelled'
        AND assigned_at >= ${from}
      GROUP BY DATE_FORMAT(assigned_at, '%Y-%m-%d')
      ORDER BY _id ASC
    `;

    // Merge trends by date
    const trendsMap = new Map<string, { assigned: number; completed: number; cancelled: number }>();
    
    assignedTrends.forEach((item) => {
      trendsMap.set(item._id, { assigned: Number(item.assigned), completed: 0, cancelled: 0 });
    });

    completedTrends.forEach((item) => {
      const existing = trendsMap.get(item._id);
      if (existing) {
        existing.completed = Number(item.completed);
      } else {
        trendsMap.set(item._id, { assigned: 0, completed: Number(item.completed), cancelled: 0 });
      }
    });

    cancelledTrends.forEach((item) => {
      const existing = trendsMap.get(item._id);
      if (existing) {
        existing.cancelled = Number(item.cancelled);
      } else {
        trendsMap.set(item._id, { assigned: 0, completed: 0, cancelled: Number(item.cancelled) });
      }
    });

    return Array.from(trendsMap.entries()).map(([date, counts]) => ({
      _id: date,
      assigned: counts.assigned,
      completed: counts.completed,
      cancelled: counts.cancelled,
    }));
  },

  async getAgentCompletionRate(agentId: string, filters?: { fromDate?: Date; toDate?: Date }) {
    const where: any = { agentId };
    
    if (filters?.fromDate || filters?.toDate) {
      where.assignedAt = {};
      if (filters.fromDate) where.assignedAt.gte = filters.fromDate;
      if (filters.toDate) where.assignedAt.lte = filters.toDate;
    }

    const total = await prisma.assignment.count({ where });
    const completed = await prisma.assignment.count({ 
      where: {
        ...where,
        status: 'completed'
      }
    });
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, completionRate };
  },
};
