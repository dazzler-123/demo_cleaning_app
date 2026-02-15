import { prisma } from '../../config/database.js';

interface FindManyFilters {
  status?: string;
  scheduleStatus?: string;
  assignmentStatus?: string;
  createdBy?: string;
  page?: number;
  limit?: number;
  search?: string;
  excludeCancelled?: boolean;
  excludeConfirmed?: boolean;
}

interface ConfirmedFilters {
  page?: number;
  limit?: number;
  search?: string;
  scheduleStatus?: string;
  assignmentStatus?: string;
  sortField?: 'location' | 'scheduleStatus' | 'assignmentStatus' | 'scheduleDate';
  sortDirection?: 'asc' | 'desc';
}

interface LeadsRepository {
  findById(id: string): Promise<any>;
  findMany(filters: FindManyFilters): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
  }>;
  create(data: Record<string, unknown>): Promise<any>;
  update(id: string, data: Record<string, unknown>): Promise<any>;
  softDelete(id: string): Promise<any>;
  findConfirmedWithScheduleAndAssignment(
    filters: ConfirmedFilters
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
  }>;
}

// Helper function to transform Prisma lead to match Mongoose structure
function transformLead(lead: any) {
  if (!lead) return null;
  
  return {
    _id: lead.id,
    client: {
      companyName: lead.clientCompanyName,
      contactPerson: lead.clientContactPerson,
      phone: lead.clientPhone,
      email: lead.clientEmail,
    },
    location: {
      address: lead.locationAddress,
      city: lead.locationCity,
      state: lead.locationState,
      pincode: lead.locationPincode,
      geoCoordinates: lead.locationLat && lead.locationLng ? {
        lat: lead.locationLat,
        lng: lead.locationLng,
      } : undefined,
    },
    cleaningDetails: {
      cleaningType: lead.cleaningType,
      category: lead.cleaningCategory,
      areaSize: lead.areaSize,
      rooms: lead.rooms,
      washrooms: lead.washrooms,
      floorType: lead.floorType,
      frequency: lead.frequency,
    },
    resources: lead.resourcesMaterials || lead.resourcesMachines || lead.resourcesSafetyGear ? {
      materials: lead.resourcesMaterials ? JSON.parse(lead.resourcesMaterials) : undefined,
      machines: lead.resourcesMachines ? JSON.parse(lead.resourcesMachines) : undefined,
      safetyGear: lead.resourcesSafetyGear ? JSON.parse(lead.resourcesSafetyGear) : undefined,
      powerAvailable: lead.resourcesPowerAvailable,
      waterAvailable: lead.resourcesWaterAvailable,
    } : undefined,
    images: lead.images ? JSON.parse(lead.images) : [],
    slaPriority: lead.slaPriority,
    leadType: lead.leadType,
    status: lead.status,
    scheduleStatus: lead.scheduleStatus,
    assignmentStatus: lead.assignmentStatus,
    quotedAmount: lead.quotedAmount ? Number(lead.quotedAmount) : undefined,
    confirmedAmount: lead.confirmedAmount ? Number(lead.confirmedAmount) : undefined,
    createdBy: lead.creator,
    deletedAt: lead.deletedAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

// Helper function to transform data for create/update
function transformLeadData(data: any) {
  const transformed: any = {};
  
  if (data.client) {
    transformed.clientCompanyName = data.client.companyName;
    transformed.clientContactPerson = data.client.contactPerson;
    transformed.clientPhone = data.client.phone;
    transformed.clientEmail = data.client.email;
  }
  
  if (data.location) {
    transformed.locationAddress = data.location.address;
    transformed.locationCity = data.location.city;
    transformed.locationState = data.location.state;
    transformed.locationPincode = data.location.pincode;
    if (data.location.geoCoordinates) {
      transformed.locationLat = data.location.geoCoordinates.lat;
      transformed.locationLng = data.location.geoCoordinates.lng;
    }
  }
  
  if (data.cleaningDetails) {
    transformed.cleaningType = data.cleaningDetails.cleaningType;
    transformed.cleaningCategory = data.cleaningDetails.category;
    transformed.areaSize = data.cleaningDetails.areaSize;
    transformed.rooms = data.cleaningDetails.rooms;
    transformed.washrooms = data.cleaningDetails.washrooms;
    transformed.floorType = data.cleaningDetails.floorType;
    transformed.frequency = data.cleaningDetails.frequency;
  }
  
  if (data.resources) {
    transformed.resourcesMaterials = data.resources.materials ? JSON.stringify(data.resources.materials) : null;
    transformed.resourcesMachines = data.resources.machines ? JSON.stringify(data.resources.machines) : null;
    transformed.resourcesSafetyGear = data.resources.safetyGear ? JSON.stringify(data.resources.safetyGear) : null;
    transformed.resourcesPowerAvailable = data.resources.powerAvailable;
    transformed.resourcesWaterAvailable = data.resources.waterAvailable;
  }
  
  // images is required in schema, so always set it (default to empty array)
  transformed.images = JSON.stringify(data.images || []);
  
  if (data.slaPriority) transformed.slaPriority = data.slaPriority;
  if (data.leadType) transformed.leadType = data.leadType;
  if (data.status) transformed.status = data.status;
  if (data.scheduleStatus) transformed.scheduleStatus = data.scheduleStatus;
  if (data.assignmentStatus) transformed.assignmentStatus = data.assignmentStatus;
  if (data.quotedAmount !== undefined) transformed.quotedAmount = data.quotedAmount;
  if (data.confirmedAmount !== undefined) transformed.confirmedAmount = data.confirmedAmount;
  if (data.createdBy) transformed.createdBy = data.createdBy;
  
  return transformed;
}

export const leadsRepository: LeadsRepository = {
  async findById(id) {
    const lead = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return transformLead(lead);
  },

  async findMany(filters) {
    const where: any = { deletedAt: null };

    if (filters.status) {
      where.status = filters.status;
    } else {
      const statusExclusions: string[] = [];
      if (filters.excludeCancelled !== false) statusExclusions.push('cancelled');
      if (filters.excludeConfirmed !== false) statusExclusions.push('confirm');
      statusExclusions.push('completed');
      where.status = { notIn: statusExclusions };
    }

    if (filters.scheduleStatus) where.scheduleStatus = filters.scheduleStatus;
    if (filters.assignmentStatus) where.assignmentStatus = filters.assignmentStatus;
    if (filters.createdBy) where.createdBy = filters.createdBy;

    if (filters.search) {
      where.OR = [
        { clientCompanyName: { contains: filters.search, mode: 'insensitive' } },
        { clientContactPerson: { contains: filters.search, mode: 'insensitive' } },
        { clientEmail: { contains: filters.search, mode: 'insensitive' } },
        { locationCity: { contains: filters.search, mode: 'insensitive' } },
        { locationState: { contains: filters.search, mode: 'insensitive' } },
        { locationPincode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return { 
      items: items.map(transformLead), 
      total, 
      page, 
      limit 
    };
  },

  async create(data) {
    const transformed = transformLeadData(data);
    const lead = await prisma.lead.create({
      data: transformed,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return transformLead(lead);
  },

  async update(id, data) {
    const transformed = transformLeadData(data);
    const lead = await prisma.lead.update({
      where: { id },
      data: transformed,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return transformLead(lead);
  },

  async softDelete(id) {
    const lead = await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    
    return transformLead(lead);
  },

  async findConfirmedWithScheduleAndAssignment(filters) {
    const where: any = {
      deletedAt: null,
      status: { in: ['confirm', 'completed'] },
    };

    if (filters.search) {
      where.OR = [
        { clientCompanyName: { contains: filters.search, mode: 'insensitive' } },
        { clientContactPerson: { contains: filters.search, mode: 'insensitive' } },
        { clientEmail: { contains: filters.search, mode: 'insensitive' } },
        { locationCity: { contains: filters.search, mode: 'insensitive' } },
        { locationState: { contains: filters.search, mode: 'insensitive' } },
        { locationPincode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.scheduleStatus) where.scheduleStatus = filters.scheduleStatus;
    if (filters.assignmentStatus) where.assignmentStatus = filters.assignmentStatus;

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    let orderBy: any = { createdAt: 'desc' };
    if (filters.sortField === 'location') {
      orderBy = [
        { locationCity: filters.sortDirection || 'asc' },
        { locationPincode: filters.sortDirection || 'asc' },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    const leadIds = items.map((l) => l.id);

    // Get schedules
    const schedules = await prisma.schedule.findMany({
      where: {
        leadId: { in: leadIds },
        isActive: true,
      },
      orderBy: { date: 'desc' },
    });

    const schedulesMap = new Map<string, any>();
    for (const s of schedules) {
      if (!schedulesMap.has(s.leadId)) {
        schedulesMap.set(s.leadId, {
          _id: s.id,
          leadId: s.leadId,
          date: s.date,
          timeSlot: s.timeSlot,
          duration: s.duration,
          notes: s.notes,
          isActive: s.isActive,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        });
      }
    }

    const scheduleIds = Array.from(schedulesMap.values()).map((s) => s._id);

    // Get assignments
    const assignments = await prisma.assignment.findMany({
      where: {
        scheduleId: { in: scheduleIds },
        isActive: true,
      },
      include: {
        agent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const assignmentsBySchedule = new Map<string, any>();
    for (const a of assignments) {
      if (!assignmentsBySchedule.has(a.scheduleId)) {
        assignmentsBySchedule.set(a.scheduleId, {
          _id: a.id,
          leadId: a.leadId,
          scheduleId: a.scheduleId,
          agentId: {
            _id: a.agent.id,
            userId: {
              _id: a.agent.user.id,
              name: a.agent.user.name,
              email: a.agent.user.email,
            },
          },
          status: a.status,
          isActive: a.isActive,
          assignedBy: a.assignedBy,
          assignedAt: a.assignedAt,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          notes: a.notes,
          completionImages: a.completionImages ? JSON.parse(a.completionImages) : [],
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        });
      }
    }

    // Create scheduleId -> leadId mapping
    const scheduleIdToLeadId = new Map<string, string>();
    for (const [leadId, schedule] of schedulesMap.entries()) {
      scheduleIdToLeadId.set(schedule._id, leadId);
    }

    const assignmentsMap = new Map<string, any>();
    for (const [scheduleId, assignment] of assignmentsBySchedule.entries()) {
      const leadId = scheduleIdToLeadId.get(scheduleId);
      if (leadId) {
        assignmentsMap.set(leadId, assignment);
      }
    }

    // Enrich leads
    let enrichedItems = items.map((lead) => {
      const leadId = lead.id;
      const schedule = schedulesMap.get(leadId);
      const assignment = assignmentsMap.get(leadId);
      
      const transformed = transformLead(lead);
      return {
        ...transformed,
        schedule: schedule || undefined,
        assignment: assignment || undefined,
      };
    });

    // Handle post-enrichment sorting
    if (filters.sortField === 'scheduleDate') {
      enrichedItems = enrichedItems.sort((a, b) => {
        const aSchedule = schedulesMap.get(a._id);
        const bSchedule = schedulesMap.get(b._id);
        
        if (!aSchedule && !bSchedule) return 0;
        if (!aSchedule) return filters.sortDirection === 'asc' ? 1 : -1;
        if (!bSchedule) return filters.sortDirection === 'asc' ? -1 : 1;
        
        const aDate = new Date(aSchedule.date).getTime();
        const bDate = new Date(bSchedule.date).getTime();
        
        return filters.sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      });
    }

    if (filters.sortField === 'scheduleStatus') {
      enrichedItems = enrichedItems.sort((a, b) => {
        const aHasSchedule = schedulesMap.has(a._id);
        const bHasSchedule = schedulesMap.has(b._id);
        
        if (aHasSchedule === bHasSchedule) return 0;
        if (filters.sortDirection === 'asc') {
          return aHasSchedule ? -1 : 1;
        } else {
          return aHasSchedule ? 1 : -1;
        }
      });
    }

    if (filters.sortField === 'assignmentStatus') {
      enrichedItems = enrichedItems.sort((a, b) => {
        const aHasAssignment = assignmentsMap.has(a._id);
        const bHasAssignment = assignmentsMap.has(b._id);
        
        if (aHasAssignment === bHasAssignment) return 0;
        if (filters.sortDirection === 'asc') {
          return aHasAssignment ? -1 : 1;
        } else {
          return aHasAssignment ? 1 : -1;
        }
      });
    }

    return { items: enrichedItems, total, page, limit };
  },
};
