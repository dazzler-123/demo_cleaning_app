import { Lead, Assignment, Agent, User, Schedule } from '../../shared/models/index.js';
import mongoose from 'mongoose';

export const dashboardRepository = {
  async getLeadCounts(filters?: { fromDate?: Date; toDate?: Date }) {
    const match: Record<string, unknown> = { deletedAt: null };
    if (filters?.fromDate || filters?.toDate) {
      match.createdAt = {};
      if (filters.fromDate) (match.createdAt as Record<string, Date>).$gte = filters.fromDate;
      if (filters.toDate) (match.createdAt as Record<string, Date>).$lte = filters.toDate;
    }
    const total = await Lead.countDocuments(match);
    const byStatus = await Lead.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return { total, byStatus };
  },

  async getLeadsByType(filters?: { fromDate?: Date; toDate?: Date }) {
    const match: Record<string, unknown> = { deletedAt: null };
    if (filters?.fromDate || filters?.toDate) {
      match.createdAt = {};
      if (filters.fromDate) (match.createdAt as Record<string, Date>).$gte = filters.fromDate;
      if (filters.toDate) (match.createdAt as Record<string, Date>).$lte = filters.toDate;
    }
    const byType = await Lead.aggregate([
      { $match: match },
      { $group: { _id: '$leadType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return byType;
  },

  async getLeadsScheduledToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return Schedule.countDocuments({ date: { $gte: today, $lt: tomorrow }, isActive: true });
  },

  async getLeadsAssignedToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return Assignment.countDocuments({
      isActive: true,
      assignedAt: { $gte: today, $lt: tomorrow },
    });
  },

  async getAssignmentCounts(filters?: { fromDate?: Date; toDate?: Date }) {
    const match: Record<string, unknown> = {};
    if (filters?.fromDate || filters?.toDate) {
      match.assignedAt = {};
      if (filters.fromDate) (match.assignedAt as Record<string, Date>).$gte = filters.fromDate;
      if (filters.toDate) (match.assignedAt as Record<string, Date>).$lte = filters.toDate;
    }
    const total = await Assignment.countDocuments(match);
    const byStatus = await Assignment.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return { total, byStatus };
  },

  async getJobsInProgress() {
    return Assignment.countDocuments({ isActive: true, status: 'in_progress' });
  },

  async getJobsCompleted(filters?: { fromDate?: Date; toDate?: Date }) {
    const match: Record<string, unknown> = { status: 'completed' };
    if (filters?.fromDate || filters?.toDate) {
      match.completedAt = {};
      if (filters.fromDate) (match.completedAt as Record<string, Date>).$gte = filters.fromDate;
      if (filters.toDate) (match.completedAt as Record<string, Date>).$lte = filters.toDate;
    }
    return Assignment.countDocuments(match);
  },

  async getAgentWorkloadCounts() {
    return Assignment.aggregate([
      { $match: { isActive: true, status: { $in: ['pending', 'in_progress'] } } },
      { $group: { _id: '$agentId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'agents', localField: '_id', foreignField: '_id', as: 'agent' } },
      { $unwind: '$agent' },
      { $lookup: { from: 'users', localField: 'agent.userId', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { agentId: '$_id', agentName: '$user.name', agentPhone: '$agent.phone', count: 1, _id: 0 } },
    ]);
  },

  async getAgentStats() {
    const total = await Agent.countDocuments({ status: 'active' });
    const available = await Agent.countDocuments({ status: 'active', availability: 'available' });
    const busy = await Agent.countDocuments({ status: 'active', availability: 'busy' });
    return { total, available, busy };
  },

  async getLeadsByDay(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    const trends = await Lead.aggregate([
      { $match: { deletedAt: null, createdAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return trends;
  },

  async getJobTrends(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const trends = await Assignment.aggregate([
      { $match: { assignedAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$assignedAt' } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return trends;
  },

  async getSLACompliance(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const completed = await Assignment.countDocuments({
      status: 'completed',
      completedAt: { $gte: from },
    });
    const total = await Assignment.countDocuments({
      status: { $in: ['completed', 'cancelled', 'in_progress', 'pending'] },
      assignedAt: { $gte: from },
    });
    const compliance = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, compliance };
  },

  async getUserCounts() {
    const total = await User.countDocuments();
    const byRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    return { total, byRole };
  },

  // Agent-specific dashboard methods
  async getAgentAssignmentStats(agentId: mongoose.Types.ObjectId, filters?: { fromDate?: Date; toDate?: Date }) {
    const match: Record<string, unknown> = { agentId, isActive: true };
    
    if (filters?.fromDate || filters?.toDate) {
      match.assignedAt = {};
      if (filters.fromDate) (match.assignedAt as Record<string, Date>).$gte = filters.fromDate;
      if (filters.toDate) (match.assignedAt as Record<string, Date>).$lte = filters.toDate;
    }

    const total = await Assignment.countDocuments(match);
    const byStatus = await Assignment.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return { total, byStatus };
  },

  async getAgentTaskTrends(agentId: mongoose.Types.ObjectId, days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const assignedTrends = await Assignment.aggregate([
      { $match: { agentId, assignedAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$assignedAt' } },
          assigned: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const completedTrends = await Assignment.aggregate([
      { $match: { agentId, status: 'completed', completedAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          completed: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const cancelledTrends = await Assignment.aggregate([
      { $match: { agentId, status: 'cancelled', assignedAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$assignedAt' } },
          cancelled: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Merge assigned, completed, and cancelled trends by date
    const trendsMap = new Map<string, { assigned: number; completed: number; cancelled: number }>();
    
    assignedTrends.forEach((item) => {
      trendsMap.set(item._id, { assigned: item.assigned, completed: 0, cancelled: 0 });
    });

    completedTrends.forEach((item) => {
      const existing = trendsMap.get(item._id);
      if (existing) {
        existing.completed = item.completed;
      } else {
        trendsMap.set(item._id, { assigned: 0, completed: item.completed, cancelled: 0 });
      }
    });

    cancelledTrends.forEach((item) => {
      const existing = trendsMap.get(item._id);
      if (existing) {
        existing.cancelled = item.cancelled;
      } else {
        trendsMap.set(item._id, { assigned: 0, completed: 0, cancelled: item.cancelled });
      }
    });

    return Array.from(trendsMap.entries()).map(([date, counts]) => ({
      _id: date,
      assigned: counts.assigned,
      completed: counts.completed,
      cancelled: counts.cancelled,
    }));
  },

  async getAgentCompletionRate(agentId: mongoose.Types.ObjectId, filters?: { fromDate?: Date; toDate?: Date }) {
    const match: Record<string, unknown> = { agentId };
    
    if (filters?.fromDate || filters?.toDate) {
      match.assignedAt = {};
      if (filters.fromDate) (match.assignedAt as Record<string, Date>).$gte = filters.fromDate;
      if (filters.toDate) (match.assignedAt as Record<string, Date>).$lte = filters.toDate;
    }

    const total = await Assignment.countDocuments(match);
    const completed = await Assignment.countDocuments({ ...match, status: 'completed' });
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, completionRate };
  },
};
