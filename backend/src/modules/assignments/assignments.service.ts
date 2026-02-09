import { ApiError } from '../../shared/utils/ApiError.js';
import { Assignment, Agent, Lead, Schedule } from '../../shared/models/index.js';
import { assignmentsRepository } from './assignments.repository.js';
import { createAuditLog } from '../../shared/services/audit.service.js';
import { TaskLog } from '../../shared/models/index.js';
import type { TaskStatus } from '../../shared/types/index.js';
import mongoose from 'mongoose';
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
    const schedule = await Schedule.findOne({ _id: scheduleId, isActive: true }).lean();
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

    const agents = await Agent.find({ status: 'active' }).lean();
    const eligibleIds: string[] = [];
    for (const agent of agents) {
      // Check availability status FIRST - at the top of the eligibility chec
      // Only proceed if agent is 'available'
      if (agent.availability !== 'available') continue;
      const todayJobCount = await Assignment.countDocuments({
        agentId: agent._id,
        isActive: true,
        assignedAt: { $gte: todayStart, $lt: todayEnd },
      });
      if (todayJobCount >= (agent.dailyCapacity ?? 5)) continue;
      const sameDayAssignments = await Assignment.find({
        agentId: agent._id,
        isActive: true,
      })
        .populate<{ scheduleId: { date: Date; timeSlot: string; duration: number } }>('scheduleId')
        .lean();
      let bufferOk = true;
      for (const existing of sameDayAssignments) {
        const existingSched = existing.scheduleId;
        if (!existingSched || typeof existingSched !== 'object') continue;
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
      if (bufferOk) eligibleIds.push(agent._id.toString());
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
    const lead = await Lead.findById(data.leadId);
    if (!lead) throw new ApiError(404, 'Lead not found');
    if (lead.status === 'cancelled') throw new ApiError(400, 'Cannot assign a cancelled lead');
    if (lead.scheduleStatus !== 'scheduled') throw new ApiError(400, 'Lead must be scheduled first');
    if (lead.assignmentStatus === 'assigned') throw new ApiError(400, 'Lead already has an active assignment');

    const activeAssignment = await assignmentsRepository.findActiveByLeadId(data.leadId);
    if (activeAssignment) throw new ApiError(400, 'Lead must not already have an active assignment');

    const schedule = await Schedule.findOne({ _id: data.scheduleId, leadId: data.leadId, isActive: true });
    if (!schedule) throw new ApiError(404, 'Schedule not found or not active for this lead');

    const agent = await Agent.findById(data.agentId);
    if (!agent) throw new ApiError(404, 'Agent not found');
    if (agent.status !== 'active') throw new ApiError(400, 'Agent must be active');
    // Do NOT check static availability flag — availability is computed per date and time slot below.

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const todayJobCount = await Assignment.countDocuments({
      agentId: data.agentId,
      isActive: true,
      assignedAt: { $gte: todayStart, $lt: todayEnd },
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
    const sameDayAssignments = await Assignment.find({
      agentId: data.agentId,
      isActive: true,
    })
      .populate<{ scheduleId: { date: Date; timeSlot: string; duration: number } }>('scheduleId')
      .lean();
    for (const existing of sameDayAssignments) {
      const existingSched = existing.scheduleId;
      if (!existingSched || typeof existingSched !== 'object') continue;
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
    await Lead.findByIdAndUpdate(data.leadId, { $set: { assignmentStatus: 'assigned' } });
    // Do not set agent availability to 'busy' — availability is time-slot based, not a global flag.
    await createAuditLog({
      userId: assignedBy,
      action: 'create',
      resource: 'assignment',
      resourceId: assignment._id.toString(),
      details: { leadId: data.leadId, agentId: data.agentId },
    });
    return assignmentsRepository.findById(assignment._id.toString());
  },

  async updateStatus(
    id: string,
    status: TaskStatus,
    actorId: string,
    options: { isAdmin?: boolean; actorUserId?: string; reason?: string; notes?: string; completionImages?: string[] } = {}
  ) {
    const assignment = await Assignment.findById(id).populate('agentId').populate('leadId');
    if (!assignment) throw new ApiError(404, 'Assignment not found');
    if (!assignment.isActive) throw new ApiError(400, 'Cannot update an inactive assignment');

    if (!options.isAdmin && options.actorUserId) {
      const agent = await Agent.findOne({ userId: options.actorUserId });
      if (!agent) throw new ApiError(403, 'Access denied');
      const aid = (assignment.agentId as { _id?: mongoose.Types.ObjectId })?._id ?? assignment.agentId;
      if (aid?.toString() !== agent._id.toString()) throw new ApiError(403, 'You can only update your own tasks');
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

    await TaskLog.create({
      assignmentId: id,
      fromStatus,
      toStatus: status,
      changedBy: actorId,
      reason: options.reason,
    });

    if (status === 'completed') {
      const leadId = (assignment.leadId as { _id?: mongoose.Types.ObjectId })?._id ?? assignment.leadId;
      if (leadId) await Lead.findByIdAndUpdate(leadId, { $set: { status: 'completed' } });
    }

    if (status === 'cancelled') {
      await Assignment.findByIdAndUpdate(id, { $set: { isActive: false } });
      const leadId = (assignment.leadId as { _id?: mongoose.Types.ObjectId })?._id ?? assignment.leadId;
      if (leadId) await Lead.findByIdAndUpdate(leadId, { $set: { assignmentStatus: 'not_assigned' } });
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
