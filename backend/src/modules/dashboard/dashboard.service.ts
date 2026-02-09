import { dashboardRepository } from './dashboard.repository.js';
import mongoose from 'mongoose';

export const dashboardService = {
  async getOverview(filters?: { fromDate?: Date; toDate?: Date; days?: number }) {
    const from = filters?.fromDate;
    const to = filters?.toDate;
    const days = filters?.days ?? 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [
      leads,
      assignments,
      agents,
      trends,
      leadsByDay,
      sla,
      users,
      leadsScheduledToday,
      leadsAssignedToday,
      jobsInProgress,
      jobsCompleted,
      agentWorkload,
      leadsByType,
    ] = await Promise.all([
      dashboardRepository.getLeadCounts({ fromDate: from, toDate: to }),
      dashboardRepository.getAssignmentCounts({ fromDate: from, toDate: to }),
      dashboardRepository.getAgentStats(),
      dashboardRepository.getJobTrends(days),
      dashboardRepository.getLeadsByDay(days),
      dashboardRepository.getSLACompliance(days),
      dashboardRepository.getUserCounts(),
      dashboardRepository.getLeadsScheduledToday(),
      dashboardRepository.getLeadsAssignedToday(),
      dashboardRepository.getJobsInProgress(),
      dashboardRepository.getJobsCompleted({ fromDate: from, toDate: to }),
      dashboardRepository.getAgentWorkloadCounts(),
      dashboardRepository.getLeadsByType({ fromDate: from, toDate: to }),
    ]);
    return {
      leads,
      assignments,
      agents,
      jobTrends: trends,
      leadsByDay,
      slaCompliance: sla,
      users,
      leadsScheduledToday,
      leadsAssignedToday,
      jobsInProgress,
      jobsCompleted,
      agentWorkload,
      leadsByType,
    };
  },

  async getAgentOverview(agentId: mongoose.Types.ObjectId, filters?: { fromDate?: Date; toDate?: Date; days?: number }) {
    const from = filters?.fromDate;
    const to = filters?.toDate;
    const days = filters?.days ?? 30;

    const [assignmentStats, taskTrends, completionRate] = await Promise.all([
      dashboardRepository.getAgentAssignmentStats(agentId, { fromDate: from, toDate: to }),
      dashboardRepository.getAgentTaskTrends(agentId, days),
      dashboardRepository.getAgentCompletionRate(agentId, { fromDate: from, toDate: to }),
    ]);

    return {
      assignmentStats,
      taskTrends,
      completionRate,
    };
  },
};
