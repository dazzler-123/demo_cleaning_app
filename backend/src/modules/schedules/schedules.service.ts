import { ApiError } from '../../shared/utils/ApiError.js';
import { prisma } from '../../config/database.js';
import { schedulesRepository } from './schedules.repository.js';
import { createAuditLog } from '../../shared/services/audit.service.js';
import { scheduleToMinutesRange, satisfiesBuffer, timeSlotToMinutes } from '../../shared/utils/scheduleTime.js';

/**
 * Validates that a time slot string is in the correct format (HH:MM AM/PM)
 * and represents a valid time (hours 1-12, minutes 0-59)
 */
function validateTimeSlotFormat(timeSlot: string): void {
  const trimmed = (timeSlot || '').trim();
  if (!trimmed) {
    throw new ApiError(400, 'Time slot is required');
  }
  // Use the existing timeSlotToMinutes function to validate format
  // It will throw an error if the format is invalid
  try {
    timeSlotToMinutes(trimmed);
  } catch (error) {
    throw new ApiError(400, `Invalid time slot format. Expected format: "HH:MM AM/PM" (e.g., "9:00 AM", "2:30 PM")`);
  }
}

export const schedulesService = {
  async getById(id: string) {
    const schedule = await schedulesRepository.findById(id);
    if (!schedule) throw new ApiError(404, 'Schedule not found');
    return schedule;
  },

  async getByLeadId(leadId: string) {
    return schedulesRepository.findByLeadId(leadId);
  },

  async list(filters: {
    leadId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    activeOnly?: boolean;
  }) {
    return schedulesRepository.findMany(filters);
  },

  async create(
    data: { leadId: string; date: Date; timeSlot: string; duration: number; notes?: string },
    actorId: string
  ) {
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
    if (!lead) throw new ApiError(404, 'Lead not found');
    if (lead.status === 'cancelled') throw new ApiError(400, 'Cannot schedule a cancelled lead');
    if (lead.status !== 'confirm') throw new ApiError(400, 'Lead must be in confirm status to be scheduled');

    const scheduleDate = new Date(data.date);
    scheduleDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scheduleDate <= today) {
      throw new ApiError(400, 'Service date must be in the future');
    }
    if (data.duration <= 0) {
      throw new ApiError(400, 'Estimated duration must be greater than zero');
    }
    const slotTrimmed = (data.timeSlot || '').trim();
    validateTimeSlotFormat(slotTrimmed);

    const existingActive = await schedulesRepository.findActiveByLeadId(data.leadId);
    if (existingActive && lead.scheduleStatus === 'not_scheduled') {
      throw new ApiError(400, 'Lead must not already be scheduled');
    }
    if (existingActive && lead.scheduleStatus === 'scheduled') {
      await schedulesRepository.deactivateByLeadId(data.leadId);
    }

    const created = await schedulesRepository.create({
      ...data,
      timeSlot: slotTrimmed,
    });
    if (lead.scheduleStatus === 'not_scheduled') {
      await prisma.lead.update({
        where: { id: data.leadId },
        data: { scheduleStatus: 'scheduled' },
      });
    }
    const createdId = (created as any)._id?.toString() || (created as any).id;
    await createAuditLog({
      userId: actorId,
      action: existingActive ? 'reschedule' : 'create',
      resource: 'schedule',
      resourceId: createdId,
      details: { leadId: data.leadId, date: data.date },
    });
    return schedulesRepository.findById(createdId);
  },

  async update(
    id: string,
    data: Partial<{ date: Date; timeSlot: string; duration: number; notes: string }>,
    actorId: string
  ) {
    const existing = await prisma.schedule.findUnique({
      where: { id },
      include: { lead: true },
    });
    if (!existing) throw new ApiError(404, 'Schedule not found');
    const lead = existing.lead;
    if (!lead) throw new ApiError(404, 'Lead not found');

    // Rule: If lead is not assigned, schedule is fully editable. If assigned but not completed, it can be rescheduled.
    if (lead.assignmentStatus === 'assigned') {
      const assignment = await prisma.assignment.findFirst({
        where: {
          scheduleId: id,
          isActive: true,
        },
      });
      if (assignment) {
        if (assignment.status === 'completed') {
          throw new ApiError(400, 'Cannot reschedule: this job is already completed.');
        }
        // Reschedule allowed; validate new date/time against 2-hour buffer for this agent's other same-day jobs
        const newDate = data.date != null ? new Date(data.date) : new Date(existing.date);
        const newTimeSlot = (data.timeSlot ?? existing.timeSlot)?.trim() ?? existing.timeSlot;
        const newDuration = data.duration != null ? data.duration : existing.duration;
        const scheduleDate = new Date(newDate);
        scheduleDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (scheduleDate <= today) {
          throw new ApiError(400, 'Service date must be in the future');
        }
        if (newDuration <= 0) throw new ApiError(400, 'Estimated duration must be greater than zero');
        const slotTrimmed = newTimeSlot.trim();
        validateTimeSlotFormat(slotTrimmed);
        let newStartMinutes: number;
        let newEndMinutes: number;
        try {
          const range = scheduleToMinutesRange(slotTrimmed, newDuration);
          newStartMinutes = range.startMinutes;
          newEndMinutes = range.endMinutes;
        } catch {
          throw new ApiError(400, 'Invalid schedule time slot format');
        }
        const newDateStr = new Date(newDate).toISOString().slice(0, 10);
        const otherSameDayAssignments = await prisma.assignment.findMany({
          where: {
            agentId: assignment.agentId,
            isActive: true,
            scheduleId: { not: id },
          },
          include: {
            schedule: true,
          },
        });
        for (const other of otherSameDayAssignments) {
          const otherSched = other.schedule;
          if (!otherSched) continue;
          const otherDateStr = new Date(otherSched.date).toISOString().slice(0, 10);
          if (otherDateStr !== newDateStr) continue;
          try {
            const otherRange = scheduleToMinutesRange(otherSched.timeSlot, otherSched.duration);
            const ok = satisfiesBuffer(
              otherRange.startMinutes,
              otherRange.endMinutes,
              newStartMinutes,
              newEndMinutes
            );
            if (!ok) {
              throw new ApiError(
                400,
                'This reschedule would conflict with another job for the same agent on that day. A minimum 2-hour gap is required.'
              );
            }
          } catch (err) {
            if (err instanceof ApiError) throw err;
            throw new ApiError(
              400,
              'This reschedule would conflict with another job for the same agent on that day. A minimum 2-hour gap is required.'
            );
          }
        }
      }
    } else {
      // Lead not assigned: full edit with standard validations
      if (data.date != null) {
        const scheduleDate = new Date(data.date);
        scheduleDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (scheduleDate <= today) {
          throw new ApiError(400, 'Service date must be in the future');
        }
      }
      if (data.duration != null && data.duration <= 0) {
        throw new ApiError(400, 'Estimated duration must be greater than zero');
      }
      if (data.timeSlot != null) {
        const slotTrimmed = (data.timeSlot || '').trim();
        validateTimeSlotFormat(slotTrimmed);
        data.timeSlot = slotTrimmed;
      }
    }

    const schedule = await schedulesRepository.update(id, data);
    if (!schedule) throw new ApiError(404, 'Schedule not found');
    await createAuditLog({
      userId: actorId,
      action: 'update',
      resource: 'schedule',
      resourceId: id,
      details: data,
    });
    return schedule;
  },

  async delete(id: string, actorId: string) {
    const hasAssignments = await prisma.assignment.count({ where: { scheduleId: id } }) > 0;
    if (hasAssignments) throw new ApiError(400, 'Cannot delete schedule with assignments');
    const schedule = await schedulesRepository.delete(id);
    if (!schedule) throw new ApiError(404, 'Schedule not found');
    await createAuditLog({
      userId: actorId,
      action: 'delete',
      resource: 'schedule',
      resourceId: id,
    });
    return { deleted: true };
  },
};
