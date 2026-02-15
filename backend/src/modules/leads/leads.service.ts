import { ApiError } from '../../shared/utils/ApiError.js';
import { prisma } from '../../config/database.js';
import { leadsRepository } from './leads.repository.js';
import { createAuditLog } from '../../shared/services/audit.service.js';
import type { ILead, IClientInfo, ILocation, ICleaningDetails, IResources } from '../../shared/models/index.js';
import type { SLAPriority } from '../../shared/types/index.js';

// type LeadCreateInput = {
//   client: IClientInfo;
//   location: ILocation;
//   cleaningDetails: ICleaningDetails;
//   resources?: IResources;
//   slaPriority?: SLAPriority;
//   quotedAmount?: number;
//   confirmedAmount?: number;
// };

// export const leadsService = {
//   async getById(id: string) {
//     const lead = await leadsRepository.findById(id);
//     if (!lead) throw new ApiError(404, 'Lead not found');
//     return lead;
//   },

//   async list(filters: {
//     status?: string;
//     scheduleStatus?: string;
//     assignmentStatus?: string;
//     createdBy?: string;
//     page?: number;
//     limit?: number;
//     search?: string;
//     excludeCancelled?: boolean;
//     excludeConfirmed?: boolean;
//   }) {
//     // Default: exclude confirmed leads unless explicitly requested
//     return leadsRepository.findMany({
//       ...filters,
//       excludeConfirmed: filters.excludeConfirmed !== false,
//     });
//   },

//   async getConfirmedWithScheduleAndAssignment(filters: {
//     page?: number;
//     limit?: number;
//     search?: string;
//     scheduleStatus?: string;
//     assignmentStatus?: string;
//     sortField?: string;
//     sortDirection?: 'asc' | 'desc';
//   }) {
//     return leadsRepository.findConfirmedWithScheduleAndAssignment(filters);
//   },

//   async create(data: LeadCreateInput, createdBy: string) {
//     const lead = await leadsRepository.create({
//       ...data,
//       createdBy,
//       status: 'created',
//       scheduleStatus: 'not_scheduled',
//       assignmentStatus: 'not_assigned',
//     });
//     await createAuditLog({
//       userId: createdBy,
//       action: 'create',
//       resource: 'lead',
//       resourceId: (lead as ILead)._id.toString(),
//       details: { companyName: data.client.companyName },
//     });
//     return leadsRepository.findById((lead as ILead)._id.toString());
//   },

//   async update(id: string, data: Partial<LeadCreateInput>, actorId: string) {
//     const existing = await leadsRepository.findById(id);
//     if (!existing) throw new ApiError(404, 'Lead not found');
//     if ((existing as ILead).status === 'cancelled') {
//       throw new ApiError(400, 'Cannot update a cancelled lead');
//     }
//     const lead = await leadsRepository.update(id, data);
//     if (!lead) throw new ApiError(404, 'Lead not found');
//     await createAuditLog({
//       userId: actorId,
//       action: 'update',
//       resource: 'lead',
//       resourceId: id,
//       details: data,
//     });
//     return lead;
//   },

//   async cancel(id: string, actorId: string) {
//     const lead = await leadsRepository.findById(id);
//     if (!lead) throw new ApiError(404, 'Lead not found');
//     if ((lead as ILead).status === 'cancelled') {
//       throw new ApiError(400, 'Lead is already cancelled');
//     }
//     await Lead.findByIdAndUpdate(id, { $set: { status: 'cancelled' } });
//     await Assignment.updateMany(
//       { leadId: id },
//       { $set: { isActive: false, status: 'cancelled' } }
//     );
//     await createAuditLog({
//       userId: actorId,
//       action: 'cancel',
//       resource: 'lead',
//       resourceId: id,
//       details: {},
//     });
//     return leadsRepository.findById(id);
//   },

//   async delete(id: string, actorId: string) {
//     const lead = await leadsRepository.findById(id);
//     if (!lead) throw new ApiError(404, 'Lead not found');
//     const hasSchedules = await Schedule.exists({ leadId: id });
//     const hasAssignments = await Assignment.exists({ leadId: id });
//     if (hasSchedules || hasAssignments) {
//       throw new ApiError(400, 'Cannot delete lead with existing schedules or assignments');
//     }
//     await leadsRepository.softDelete(id);
//     await createAuditLog({
//       userId: actorId,
//       action: 'delete',
//       resource: 'lead',
//       resourceId: id,
//     });
//     return { deleted: true };
//   },
// };

/* =======================
   Types
======================= */

type LeadCreateInput = {
  client: IClientInfo;
  location: ILocation;
  cleaningDetails: ICleaningDetails;
  resources?: IResources;
  slaPriority?: SLAPriority;
  quotedAmount?: number;
  confirmedAmount?: number;
};

type SortField =
  | 'location'
  | 'scheduleStatus'
  | 'assignmentStatus'
  | 'scheduleDate';

type ConfirmedFilters = {
  page?: number;
  limit?: number;
  search?: string;
  scheduleStatus?: string;
  assignmentStatus?: string;
  sortField?: SortField;
  sortDirection?: 'asc' | 'desc';
};

/* =======================
   Service
======================= */

export const leadsService = {
  async getById(id: string) {
    const lead = await leadsRepository.findById(id);
    if (!lead) throw new ApiError(404, 'Lead not found');
    return lead;
  },

  async list(filters: {
    status?: string;
    scheduleStatus?: string;
    assignmentStatus?: string;
    createdBy?: string;
    page?: number;
    limit?: number;
    search?: string;
    excludeCancelled?: boolean;
    excludeConfirmed?: boolean;
  }) {
    return leadsRepository.findMany({
      ...filters,
      excludeConfirmed: filters.excludeConfirmed !== false,
    });
  },

  async getConfirmedWithScheduleAndAssignment(filters: {
    page?: number;
    limit?: number;
    search?: string;
    scheduleStatus?: string;
    assignmentStatus?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    const allowedSortFields: SortField[] = [
      'location',
      'scheduleStatus',
      'assignmentStatus',
      'scheduleDate',
    ];

    const safeFilters: ConfirmedFilters = {
      ...filters,
      sortField: allowedSortFields.includes(filters.sortField as SortField)
        ? (filters.sortField as SortField)
        : undefined,
    };

    return leadsRepository.findConfirmedWithScheduleAndAssignment(safeFilters);
  },

  async create(data: LeadCreateInput, createdBy: string) {
    const lead = await leadsRepository.create({
      ...data,
      createdBy,
      status: 'created',
      scheduleStatus: 'not_scheduled',
      assignmentStatus: 'not_assigned',
    });

    const leadId = (lead as any)._id?.toString() || (lead as any).id;
    await createAuditLog({
      userId: createdBy,
      action: 'create',
      resource: 'lead',
      resourceId: leadId,
      details: { companyName: data.client.companyName },
    });

    return leadsRepository.findById(leadId);
  },

  async update(id: string, data: Partial<LeadCreateInput>, actorId: string) {
    const existing = await leadsRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Lead not found');

    if ((existing as ILead).status === 'cancelled') {
      throw new ApiError(400, 'Cannot update a cancelled lead');
    }

    const lead = await leadsRepository.update(id, data);
    if (!lead) throw new ApiError(404, 'Lead not found');

    await createAuditLog({
      userId: actorId,
      action: 'update',
      resource: 'lead',
      resourceId: id,
      details: data,
    });

    return lead;
  },

  async cancel(id: string, actorId: string) {
    const lead = await leadsRepository.findById(id);
    if (!lead) throw new ApiError(404, 'Lead not found');

    if ((lead as ILead).status === 'cancelled') {
      throw new ApiError(400, 'Lead is already cancelled');
    }

    await prisma.lead.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    await prisma.assignment.updateMany({
      where: { leadId: id },
      data: { isActive: false, status: 'cancelled' },
    });

    await createAuditLog({
      userId: actorId,
      action: 'cancel',
      resource: 'lead',
      resourceId: id,
      details: {},
    });

    return leadsRepository.findById(id);
  },

  async delete(id: string, actorId: string) {
    const lead = await leadsRepository.findById(id);
    if (!lead) throw new ApiError(404, 'Lead not found');

    const [hasSchedules, hasAssignments] = await Promise.all([
      prisma.schedule.count({ where: { leadId: id } }),
      prisma.assignment.count({ where: { leadId: id } }),
    ]);

    if (hasSchedules || hasAssignments) {
      throw new ApiError(
        400,
        'Cannot delete lead with existing schedules or assignments'
      );
    }

    await leadsRepository.softDelete(id);

    await createAuditLog({
      userId: actorId,
      action: 'delete',
      resource: 'lead',
      resourceId: id,
    });

    return { deleted: true };
  },
};
