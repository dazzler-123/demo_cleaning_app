import { prisma } from '../../config/database.js';

export const assignmentsRepository = {
  async findById(id: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        lead: true,
        schedule: true,
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
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return transformAssignment(assignment);
  },

  async findByAgentId(agentId: string, filters?: { status?: string; fromDate?: Date; toDate?: Date; activeOnly?: boolean }) {
    const where: any = { agentId };
    if (filters?.activeOnly !== false) where.isActive = true;
    if (filters?.status) where.status = filters.status;
    if (filters?.fromDate || filters?.toDate) {
      where.assignedAt = {};
      if (filters?.fromDate) where.assignedAt.gte = filters.fromDate;
      if (filters?.toDate) where.assignedAt.lte = filters.toDate;
    }
    
    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        lead: true,
        schedule: true,
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
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
    
    return assignments.map(transformAssignment);
  },

  async findAgentTasksPaginated(agentId: string, filters?: { status?: string; fromDate?: Date; toDate?: Date; page?: number; limit?: number }) {
    const where: any = { agentId };
    if (filters?.status) where.status = filters.status;
    if (filters?.fromDate || filters?.toDate) {
      where.assignedAt = {};
      if (filters?.fromDate) where.assignedAt.gte = filters.fromDate;
      if (filters?.toDate) where.assignedAt.lte = filters.toDate;
    }
    
    const page = filters?.page ?? 1;
    const limit = Math.min(filters?.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              clientCompanyName: true,
              clientContactPerson: true,
              cleaningType: true,
              cleaningCategory: true,
              status: true,
            },
          },
          schedule: {
            select: {
              id: true,
              date: true,
              timeSlot: true,
              duration: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assignment.count({ where }),
    ]);
    
    return { 
      items: items.map(a => ({
        _id: a.id,
        leadId: {
          _id: a.lead.id,
          client: {
            companyName: a.lead.clientCompanyName,
            contactPerson: a.lead.clientContactPerson,
          },
          cleaningDetails: {
            cleaningType: a.lead.cleaningType,
            category: a.lead.cleaningCategory,
          },
          status: a.lead.status,
        },
        scheduleId: {
          _id: a.schedule.id,
          date: a.schedule.date,
          timeSlot: a.schedule.timeSlot,
          duration: a.schedule.duration,
        },
        agentId: a.agentId,
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
      })), 
      total, 
      page, 
      limit 
    };
  },

  async findByScheduleId(scheduleId: string) {
    const assignments = await prisma.assignment.findMany({
      where: { scheduleId },
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
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return assignments.map(transformAssignment);
  },

  async findMany(filters: {
    leadId?: string;
    agentId?: string;
    scheduleId?: string;
    status?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.agentId) where.agentId = filters.agentId;
    if (filters.scheduleId) where.scheduleId = filters.scheduleId;
    if (filters.status) where.status = filters.status;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const search = filters.search?.trim();

    if (search) {
      // For search, we need to join with leads and users
      // This is complex, so we'll use a raw query or multiple queries
      const searchLower = search.toLowerCase();
      
      // First, find leads matching search
      const matchingLeads = await prisma.lead.findMany({
        where: {
          OR: [
            { clientCompanyName: { contains: search, mode: 'insensitive' } },
            { clientContactPerson: { contains: search, mode: 'insensitive' } },
            { clientEmail: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      
      const leadIds = matchingLeads.map(l => l.id);
      
      // Also search in users (agent names/emails)
      const matchingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      
      const userIds = matchingUsers.map(u => u.id);
      
      // Find agents with matching users
      const matchingAgents = await prisma.agent.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      
      const agentIds = matchingAgents.map(a => a.id);
      
      // Update where clause
      where.OR = [
        { leadId: { in: leadIds } },
        { agentId: { in: agentIds } },
      ];
      
      // Merge with existing where conditions
      if (Object.keys(where).length > 1) {
        const baseWhere = { ...where };
        delete baseWhere.OR;
        where.AND = [
          baseWhere,
          { OR: where.OR },
        ];
        delete where.OR;
      }
    }

    const [items, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          lead: true,
          schedule: true,
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
          assigner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.assignment.count({ where }),
    ]);
    
    return { 
      items: items.map(transformAssignment), 
      total, 
      page, 
      limit 
    };
  },

  async create(data: {
    leadId: string;
    scheduleId: string;
    agentId: string;
    assignedBy: string;
    status?: string;
    notes?: string;
  }) {
    const assignment = await prisma.assignment.create({
      data: {
        leadId: data.leadId,
        scheduleId: data.scheduleId,
        agentId: data.agentId,
        assignedBy: data.assignedBy,
        status: (data.status as any) || 'pending',
        notes: data.notes,
        isActive: true,
        completionImages: '[]', // Default to empty JSON array
      },
      include: {
        lead: true,
        schedule: true,
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
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return transformAssignment(assignment);
  },

  async findActiveByLeadId(leadId: string) {
    const assignment = await prisma.assignment.findFirst({
      where: { leadId, isActive: true },
    });
    
    return assignment ? transformAssignment(assignment) : null;
  },

  async updateStatus(id: string, status: string, completedAt?: Date, startedAt?: Date, notes?: string, completionImages?: string[]) {
    const updateData: any = { status: status as any };
    if (completedAt) updateData.completedAt = completedAt;
    if (startedAt !== undefined) updateData.startedAt = startedAt;
    if (notes !== undefined) updateData.notes = notes;
    if (completionImages !== undefined) updateData.completionImages = JSON.stringify(completionImages);
    
    const assignment = await prisma.assignment.update({
      where: { id },
      data: updateData,
      include: {
        lead: true,
        schedule: true,
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
        assigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return transformAssignment(assignment);
  },

  async delete(id: string) {
    return prisma.assignment.delete({
      where: { id },
    });
  },
};

// Helper function to transform Prisma assignment to match Mongoose structure
function transformAssignment(assignment: any) {
  if (!assignment) return null;
  
  // Transform lead data to nested structure
  let transformedLead = null;
  if (assignment.lead) {
    transformedLead = {
      _id: assignment.lead.id,
      id: assignment.lead.id,
      client: {
        companyName: assignment.lead.clientCompanyName,
        contactPerson: assignment.lead.clientContactPerson,
        phone: assignment.lead.clientPhone,
        email: assignment.lead.clientEmail,
      },
      location: {
        address: assignment.lead.locationAddress,
        city: assignment.lead.locationCity,
        state: assignment.lead.locationState,
        pincode: assignment.lead.locationPincode,
        geoCoordinates: assignment.lead.locationLat && assignment.lead.locationLng ? {
          lat: assignment.lead.locationLat,
          lng: assignment.lead.locationLng,
        } : undefined,
      },
      cleaningDetails: {
        cleaningType: assignment.lead.cleaningType,
        category: assignment.lead.cleaningCategory,
        areaSize: assignment.lead.areaSize,
        rooms: assignment.lead.rooms,
        washrooms: assignment.lead.washrooms,
        floorType: assignment.lead.floorType,
        frequency: assignment.lead.frequency,
      },
      resources: assignment.lead.resourcesMaterials || assignment.lead.resourcesMachines || assignment.lead.resourcesSafetyGear ? {
        materials: assignment.lead.resourcesMaterials ? JSON.parse(assignment.lead.resourcesMaterials) : undefined,
        machines: assignment.lead.resourcesMachines ? JSON.parse(assignment.lead.resourcesMachines) : undefined,
        safetyGear: assignment.lead.resourcesSafetyGear ? JSON.parse(assignment.lead.resourcesSafetyGear) : undefined,
        powerAvailable: assignment.lead.resourcesPowerAvailable,
        waterAvailable: assignment.lead.resourcesWaterAvailable,
      } : undefined,
      images: assignment.lead.images ? (typeof assignment.lead.images === 'string' ? JSON.parse(assignment.lead.images) : assignment.lead.images) : [],
      slaPriority: assignment.lead.slaPriority,
      leadType: assignment.lead.leadType,
      status: assignment.lead.status,
      scheduleStatus: assignment.lead.scheduleStatus,
      assignmentStatus: assignment.lead.assignmentStatus,
      quotedAmount: assignment.lead.quotedAmount ? Number(assignment.lead.quotedAmount) : undefined,
      confirmedAmount: assignment.lead.confirmedAmount ? Number(assignment.lead.confirmedAmount) : undefined,
      createdBy: assignment.lead.createdBy,
      createdAt: assignment.lead.createdAt,
      updatedAt: assignment.lead.updatedAt,
    };
  }
  
  // Transform agent data
  let transformedAgent = null;
  if (assignment.agent) {
    transformedAgent = {
      _id: assignment.agent.id,
      id: assignment.agent.id,
      userId: assignment.agent.user ? {
        _id: assignment.agent.user.id,
        id: assignment.agent.user.id,
        name: assignment.agent.user.name,
        email: assignment.agent.user.email,
        role: assignment.agent.user.role,
        status: assignment.agent.user.status,
      } : assignment.agent.userId,
      phone: assignment.agent.phone,
      skills: assignment.agent.skills ? (typeof assignment.agent.skills === 'string' ? JSON.parse(assignment.agent.skills) : assignment.agent.skills) : [],
      availability: assignment.agent.availability,
      dailyCapacity: assignment.agent.dailyCapacity,
      experience: assignment.agent.experience,
      status: assignment.agent.status,
      createdAt: assignment.agent.createdAt,
      updatedAt: assignment.agent.updatedAt,
    };
  }
  
  return {
    _id: assignment.id,
    leadId: transformedLead || assignment.leadId,
    scheduleId: assignment.schedule ? {
      _id: assignment.schedule.id,
      id: assignment.schedule.id,
      leadId: assignment.schedule.leadId,
      date: assignment.schedule.date,
      timeSlot: assignment.schedule.timeSlot,
      duration: assignment.schedule.duration,
      notes: assignment.schedule.notes,
      isActive: assignment.schedule.isActive,
      createdAt: assignment.schedule.createdAt,
      updatedAt: assignment.schedule.updatedAt,
    } : assignment.scheduleId,
    agentId: transformedAgent || assignment.agentId,
    status: assignment.status,
    isActive: assignment.isActive,
    assignedBy: assignment.assigner ? {
      _id: assignment.assigner.id,
      id: assignment.assigner.id,
      name: assignment.assigner.name,
      email: assignment.assigner.email,
    } : assignment.assignedBy,
    assignedAt: assignment.assignedAt,
    startedAt: assignment.startedAt,
    completedAt: assignment.completedAt,
    notes: assignment.notes,
    completionImages: assignment.completionImages ? JSON.parse(assignment.completionImages) : [],
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}
