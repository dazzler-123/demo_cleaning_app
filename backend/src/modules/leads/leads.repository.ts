import { Lead } from '../../shared/models/index.js';
import { Schedule } from '../../shared/models/index.js';
import { Assignment } from '../../shared/models/index.js';

export const leadsRepository = {
  async findById(id: string) {
    return Lead.findOne({ _id: id, deletedAt: null }).populate('createdBy', 'name email');
  },

  async findMany(filters: {
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
    const query: Record<string, unknown> = { deletedAt: null };
    
    // Build status filter
    if (filters.status) {
      // If status is explicitly provided, use it (no exclusions)
      query.status = filters.status;
    } else {
      // Default: exclude cancelled, confirmed, and completed unless explicitly requested
      const statusExclusions: string[] = [];
      if (filters.excludeCancelled !== false) {
        statusExclusions.push('cancelled');
      }
      if (filters.excludeConfirmed !== false) {
        statusExclusions.push('confirm');
      }
      // Always exclude completed by default
      statusExclusions.push('completed');
      if (statusExclusions.length > 0) {
        query.status = { $nin: statusExclusions };
      }
    }
    if (filters.scheduleStatus) query.scheduleStatus = filters.scheduleStatus;
    if (filters.assignmentStatus) query.assignmentStatus = filters.assignmentStatus;
    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.search) {
      query.$or = [
        { 'client.companyName': new RegExp(filters.search, 'i') },
        { 'client.contactPerson': new RegExp(filters.search, 'i') },
        { 'client.email': new RegExp(filters.search, 'i') },
        { 'location.city': new RegExp(filters.search, 'i') },
        { 'location.state': new RegExp(filters.search, 'i') },
        { 'location.pincode': new RegExp(filters.search, 'i') },
      ];
    }
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Lead.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
    ]);
    return { items, total, page, limit };
  },

  async create(data: Record<string, unknown>) {
    return Lead.create(data);
  },

  async update(id: string, data: Record<string, unknown>) {
    return Lead.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: data },
      { new: true }
    ).populate('createdBy', 'name email');
  },

  async softDelete(id: string) {
    return Lead.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
  },

  async findConfirmedWithScheduleAndAssignment(filters: {
    page?: number;
    limit?: number;
    search?: string;
    scheduleStatus?: string;
    assignmentStatus?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
  }) {
    const query: Record<string, unknown> = { deletedAt: null, status: { $in: ['confirm', 'completed'] } };
    if (filters.search) {
      query.$or = [
        { 'client.companyName': new RegExp(filters.search, 'i') },
        { 'client.contactPerson': new RegExp(filters.search, 'i') },
        { 'client.email': new RegExp(filters.search, 'i') },
        { 'location.city': new RegExp(filters.search, 'i') },
        { 'location.state': new RegExp(filters.search, 'i') },
        { 'location.pincode': new RegExp(filters.search, 'i') },
      ];
    }
    if (filters.scheduleStatus) query.scheduleStatus = filters.scheduleStatus;
    if (filters.assignmentStatus) query.assignmentStatus = filters.assignmentStatus;
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    
    // Build sort object based on sortField
    // Note: scheduleStatus, assignmentStatus, and scheduleDate require post-enrichment sorting
    // so we don't sort at database level for these fields
    let sortObj: Record<string, 1 | -1> = { createdAt: -1 }; // Default sort
    const sortDir = filters.sortDirection === 'desc' ? -1 : 1;
    
    if (filters.sortField) {
      switch (filters.sortField) {
        case 'location':
          // Sort by city, then pincode (can be done at database level)
          sortObj = { 'location.city': sortDir, 'location.pincode': sortDir };
          break;
        case 'scheduleStatus':
        case 'assignmentStatus':
        case 'scheduleDate':
          // These require post-enrichment sorting, so keep default sort
          sortObj = { createdAt: -1 };
          break;
        default:
          sortObj = { createdAt: -1 };
      }
    }
    
    const [items, total] = await Promise.all([
      Lead.find(query)
        .populate('createdBy', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
    ]);

    // Get lead IDs
    const leadIds = items.map((lead) => lead._id.toString());

    // Fetch schedules for all leads
    const schedules = await Schedule.find({
      leadId: { $in: leadIds },
      isActive: true,
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Group schedules by leadId and get the most recent active schedule
    const schedulesMap = new Map<string, typeof schedules[0]>();
    for (const schedule of schedules) {
      const leadId = schedule.leadId.toString();
      if (!schedulesMap.has(leadId)) {
        schedulesMap.set(leadId, schedule);
      } else {
        const existing = schedulesMap.get(leadId)!;
        const scheduleDate = new Date(schedule.date);
        const existingDate = new Date(existing.date);
        if (scheduleDate >= existingDate) {
          schedulesMap.set(leadId, schedule);
        }
      }
    }

    // Get schedule IDs
    const scheduleIds = Array.from(schedulesMap.values()).map((s) => s._id.toString());

    // Fetch assignments for all schedules
    const assignments = await Assignment.find({
      scheduleId: { $in: scheduleIds },
      isActive: true,
    })
      .populate({
        path: 'agentId',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .sort({ assignedAt: -1 })
      .lean();

    // Group assignments by scheduleId and get the most recent active assignment
    const assignmentsBySchedule = new Map<string, typeof assignments[0]>();
    for (const assignment of assignments) {
      const scheduleId = assignment.scheduleId.toString();
      if (!assignmentsBySchedule.has(scheduleId)) {
        assignmentsBySchedule.set(scheduleId, assignment);
      }
    }

    // Create a map of leadId -> assignment
    // First, create a map of scheduleId -> leadId from schedulesMap
    const scheduleIdToLeadId = new Map<string, string>();
    for (const [leadId, schedule] of schedulesMap.entries()) {
      scheduleIdToLeadId.set(schedule._id.toString(), leadId);
    }
    
    const assignmentsMap = new Map<string, typeof assignments[0]>();
    for (const [scheduleId, assignment] of assignmentsBySchedule.entries()) {
      const leadId = scheduleIdToLeadId.get(scheduleId);
      if (leadId) {
        assignmentsMap.set(leadId, assignment);
      }
    }

    // Enrich leads with schedule and assignment data
    let enrichedItems = items.map((lead) => {
      const leadId = lead._id.toString();
      const schedule = schedulesMap.get(leadId) || null;
      const assignment = assignmentsMap.get(leadId) || null;
      return {
        ...lead,
        schedule: schedule || undefined,
        assignment: assignment || undefined,
      };
    });

    // Handle scheduleDate sorting (needs to be done after enrichment)
    if (filters.sortField === 'scheduleDate') {
      enrichedItems = enrichedItems.sort((a, b) => {
        const aSchedule = schedulesMap.get(a._id.toString());
        const bSchedule = schedulesMap.get(b._id.toString());
        
        if (!aSchedule && !bSchedule) return 0;
        if (!aSchedule) return sortDir === 1 ? 1 : -1; // No schedule goes to end
        if (!bSchedule) return sortDir === 1 ? -1 : 1; // No schedule goes to end
        
        const aDate = new Date(aSchedule.date).getTime();
        const bDate = new Date(bSchedule.date).getTime();
        
        return sortDir === 1 ? aDate - bDate : bDate - aDate;
      });
    }

    // Handle scheduleStatus sorting after enrichment (needs schedule data)
    if (filters.sortField === 'scheduleStatus') {
      enrichedItems = enrichedItems.sort((a, b) => {
        const aHasSchedule = schedulesMap.has(a._id.toString());
        const bHasSchedule = schedulesMap.has(b._id.toString());
        
        if (aHasSchedule === bHasSchedule) {
          // If both have same status, maintain original order
          return 0;
        }
        if (sortDir === 1) {
          return aHasSchedule ? -1 : 1; // scheduled first (asc)
        } else {
          return aHasSchedule ? 1 : -1; // not_scheduled first (desc)
        }
      });
    }

    // Handle assignmentStatus sorting after enrichment (needs assignment data)
    if (filters.sortField === 'assignmentStatus') {
      enrichedItems = enrichedItems.sort((a, b) => {
        const aHasAssignment = assignmentsMap.has(a._id.toString());
        const bHasAssignment = assignmentsMap.has(b._id.toString());
        
        if (aHasAssignment === bHasAssignment) {
          // If both have same status, maintain original order
          return 0;
        }
        if (sortDir === 1) {
          return aHasAssignment ? -1 : 1; // assigned first (asc)
        } else {
          return aHasAssignment ? 1 : -1; // not_assigned first (desc)
        }
      });
    }

    return { items: enrichedItems, total, page, limit };
  },
};
