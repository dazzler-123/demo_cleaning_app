import { ApiError } from '../../shared/utils/ApiError.js';
import { prisma } from '../../config/database.js';
import { assignmentsRepository } from './assignments.repository.js';
import { createAuditLog } from '../../shared/services/audit.service.js';
import type { TaskStatus } from '../../shared/types/index.js';
import { scheduleToMinutesRange, satisfiesBuffer } from '../../shared/utils/scheduleTime.js';

const AGENT_ALLOWED_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed'];
const ADMIN_EXTRA_STATUSES: TaskStatus[] = ['rescheduled', 'cancelled', 'on_hold'];

const VALID_AGENT_TRANSITIONS: Record<string, TaskStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  rescheduled: [],
  cancelled: [],
  on_hold: [],
};

export const assignmentsService = {
  async getById(id: string) {
    const assignment = await assignmentsRepository.findById(id);
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    return assignment;
  },

  async getByAgentId(agentId: string, filters?: { status?: string; fromDate?: Date; toDate?: Date }) {
    return assignmentsRepository.findByAgentId(agentId, { ...filters, activeOnly: true });
  },

  async getAgentTasksPaginated(agentId: string, filters?: { status?: string; fromDate?: Date; toDate?: Date; page?: number; limit?: number }) {
    return assignmentsRepository.findAgentTasksPaginated(agentId, filters);
  },

  async getByScheduleId(scheduleId: string) {
    return assignmentsRepository.findByScheduleId(scheduleId);
  },

  async getEligibleAgentIdsForSchedule(scheduleId: string): Promise<string[]> {
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, isActive: true },
    });
    if (!schedule) throw new ApiError(404, 'Schedule not found or not active');
    
    let newStartMinutes: number;
    let newEndMinutes: number;
    try {
      const newRange = scheduleToMinutesRange(schedule.timeSlot, schedule.duration);
      newStartMinutes = newRange.startMinutes;
      newEndMinutes = newRange.endMinutes;
    } catch {
      return [];
    }
    
    const newDateStr = new Date(schedule.date).toISOString().slice(0, 10);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
    });
    
    const eligibleIds: string[] = [];
    for (const agent of agents) {
      // Check availability status FIRST - at the top of the eligibility check
      // Only proceed if agent is 'available'
      if (agent.availability !== 'available') continue;
      
      const todayJobCount = await prisma.assignment.count({
        where: {
          agentId: agent.id,
          isActive: true,
          assignedAt: { gte: todayStart, lt: todayEnd },
        },
      });
      
      if (todayJobCount >= (agent.dailyCapacity ?? 5)) continue;
      
      const sameDayAssignments = await prisma.assignment.findMany({
        where: {
          agentId: agent.id,
          isActive: true,
        },
        include: {
          schedule: true,
        },
      });
      
      let bufferOk = true;
      for (const existing of sameDayAssignments) {
        const existingSched = existing.schedule;
        if (!existingSched) continue;
        const existingDateStr = new Date(existingSched.date).toISOString().slice(0, 10);
        if (existingDateStr !== newDateStr) continue;
        try {
          const existingRange = scheduleToMinutesRange(existingSched.timeSlot, existingSched.duration);
          if (
            !satisfiesBuffer(
              existingRange.startMinutes,
              existingRange.endMinutes,
              newStartMinutes,
              newEndMinutes
            )
          ) {
            bufferOk = false;
            break;
          }
        } catch {
          bufferOk = false;
          break;
        }
      }
      if (bufferOk) eligibleIds.push(agent.id);
    }
    return eligibleIds;
  },

  async list(filters: {
    leadId?: string;
    agentId?: string;
    scheduleId?: string;
    status?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    return assignmentsRepository.findMany(filters);
  },

  async create(
    data: { leadId: string; scheduleId: string; agentId: string; notes?: string },
    assignedBy: string
  ) {
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
    if (!lead) throw new ApiError(404, 'Lead not found');
    if (lead.status === 'cancelled') throw new ApiError(400, 'Cannot assign a cancelled lead');
    if (lead.scheduleStatus !== 'scheduled') throw new ApiError(400, 'Lead must be scheduled first');
    if (lead.assignmentStatus === 'assigned') throw new ApiError(400, 'Lead already has an active assignment');

    const activeAssignment = await assignmentsRepository.findActiveByLeadId(data.leadId);
    if (activeAssignment) throw new ApiError(400, 'Lead must not already have an active assignment');

    const schedule = await prisma.schedule.findFirst({
      where: { id: data.scheduleId, leadId: data.leadId, isActive: true },
    });
    if (!schedule) throw new ApiError(404, 'Schedule not found or not active for this lead');

    const agent = await prisma.agent.findUnique({ where: { id: data.agentId } });
    if (!agent) throw new ApiError(404, 'Agent not found');
    if (agent.status !== 'active') throw new ApiError(400, 'Agent must be active');
    // Do NOT check static availability flag — availability is computed per date and time slot below.

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const todayJobCount = await prisma.assignment.count({
      where: {
        agentId: data.agentId,
        isActive: true,
        assignedAt: { gte: todayStart, lt: todayEnd },
      },
    });
    
    if (todayJobCount >= (agent.dailyCapacity ?? 5)) {
      throw new ApiError(400, 'Agent has exceeded daily job limit');
    }

    // Same-day 2-hour buffer rule: agent can have multiple jobs on same day only if gap >= 2h
    const newDateStr = new Date(schedule.date).toISOString().slice(0, 10);
    let newStartMinutes: number;
    let newEndMinutes: number;
    try {
      const newRange = scheduleToMinutesRange(schedule.timeSlot, schedule.duration);
      newStartMinutes = newRange.startMinutes;
      newEndMinutes = newRange.endMinutes;
    } catch {
      throw new ApiError(400, 'Invalid schedule time slot format');
    }
    
    const sameDayAssignments = await prisma.assignment.findMany({
      where: {
        agentId: data.agentId,
        isActive: true,
      },
      include: {
        schedule: true,
      },
    });
    
    for (const existing of sameDayAssignments) {
      const existingSched = existing.schedule;
      if (!existingSched) continue;
      const existingDateStr = new Date(existingSched.date).toISOString().slice(0, 10);
      if (existingDateStr !== newDateStr) continue;
      try {
        const existingRange = scheduleToMinutesRange(existingSched.timeSlot, existingSched.duration);
        const ok = satisfiesBuffer(
          existingRange.startMinutes,
          existingRange.endMinutes,
          newStartMinutes,
          newEndMinutes
        );
        if (!ok) {
          throw new ApiError(
            400,
            'This agent already has a job on the same day. A minimum 2-hour gap between jobs is required.'
          );
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(
          400,
          'This agent already has a job on the same day. A minimum 2-hour gap between jobs is required.'
        );
      }
    }

    const assignment = await assignmentsRepository.create({
      ...data,
      assignedBy,
      status: 'pending',
    });
    
    await prisma.lead.update({
      where: { id: data.leadId },
      data: { assignmentStatus: 'assigned' },
    });
    
    // Do not set agent availability to 'busy' — availability is time-slot based, not a global flag.
    await createAuditLog({
      userId: assignedBy,
      action: 'create',
      resource: 'assignment',
      resourceId: assignment._id?.toString() || assignment.id || '',
      details: { leadId: data.leadId, agentId: data.agentId },
    });
    
    const assignmentId = (assignment as any)._id?.toString() || (assignment as any).id;
    return assignmentsRepository.findById(assignmentId);
  },

  async updateStatus(
    id: string,
    status: TaskStatus,
    actorId: string,
    options: { isAdmin?: boolean; actorUserId?: string; reason?: string; notes?: string; completionImages?: string[] } = {}
  ) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        agent: true,
        lead: true,
      },
    });
    
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    if (!assignment.isActive) throw new ApiError(400, 'Cannot update an inactive assignment');

    if (!options.isAdmin && options.actorUserId) {
      const agent = await prisma.agent.findUnique({
        where: { userId: options.actorUserId },
      });
      if (!agent) throw new ApiError(403, 'Access denied');
      if (assignment.agentId !== agent.id) throw new ApiError(403, 'You can only update your own tasks');
    }

    const fromStatus = assignment.status as TaskStatus;

    if (!options.isAdmin) {
      if (fromStatus === 'completed') throw new ApiError(400, 'Completed task cannot be edited');
      const allowedNext = VALID_AGENT_TRANSITIONS[fromStatus] ?? [];
      if (!allowedNext.includes(status)) {
        throw new ApiError(400, `Agent can only transition ${fromStatus} to ${allowedNext.join(' or ')}`);
      }
      if (status === 'completed' && (!options.completionImages || options.completionImages.length === 0)) {
        throw new ApiError(400, 'Completion images are required when marking task as completed');
      }
    } else {
      const allowed = [...AGENT_ALLOWED_STATUSES, ...ADMIN_EXTRA_STATUSES];
      if (!allowed.includes(status)) throw new ApiError(403, 'Status not allowed');
    }

    const completedAt = status === 'completed' ? new Date() : undefined;
    const startedAt = status === 'in_progress' ? new Date() : undefined;

    const updated = await assignmentsRepository.updateStatus(
      id,
      status,
      completedAt,
      startedAt,
      options.notes,
      options.completionImages
    );
    if (!updated) throw new ApiError(404, 'Assignment not found');

    await prisma.taskLog.create({
      data: {
        assignmentId: id,
        fromStatus: fromStatus as any,
        toStatus: status as any,
        changedBy: actorId,
        reason: options.reason,
      },
    });

    if (status === 'completed') {
      await prisma.lead.update({
        where: { id: assignment.leadId },
        data: { status: 'completed' },
      });
    }

    if (status === 'cancelled') {
      await prisma.assignment.update({
        where: { id },
        data: { isActive: false },
      });
      await prisma.lead.update({
        where: { id: assignment.leadId },
        data: { assignmentStatus: 'not_assigned' },
      });
    }

    // Do not toggle agent availability — availability is computed per time slot, not a global flag.

    await createAuditLog({
      userId: actorId,
      action: 'update_status',
      resource: 'assignment',
      resourceId: id,
      details: { fromStatus, toStatus: status },
    });

    return assignmentsRepository.findById(id);
  },

  async delete(id: string, actorId: string) {
    const assignment = await assignmentsRepository.delete(id);
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    // Do not set agent availability — availability is time-slot based.
    await createAuditLog({
      userId: actorId,
      action: 'delete',
      resource: 'assignment',
      resourceId: id,
    });
    return { deleted: true };
  },
};
