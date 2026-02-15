import { prisma } from '../../config/database.js';

export const agentsRepository = {
  async findById(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
    
    if (!agent) return null;
    
    // Transform skills from JSON string to array
    return {
      ...agent,
      skills: typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills,
      _id: agent.id,
      userId: agent.user ? {
        _id: agent.user.id,
        id: agent.user.id,
        name: agent.user.name,
        email: agent.user.email,
        role: agent.user.role,
        status: agent.user.status,
      } : agent.userId,
    };
  },

  async findByUserId(userId: string) {
    const agent = await prisma.agent.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
    
    if (!agent) return null;
    
    // Transform skills from JSON string to array
    return {
      ...agent,
      skills: typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills,
      _id: agent.id,
      userId: agent.user ? {
        _id: agent.user.id,
        id: agent.user.id,
        name: agent.user.name,
        email: agent.user.email,
        role: agent.user.role,
        status: agent.user.status,
      } : agent.userId,
    };
  },

  async findMany(filters: {
    availability?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.availability) where.availability = filters.availability;
    if (filters.status) where.status = filters.status;
    
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.agent.count({ where }),
    ]);
    
    // Transform skills from JSON string to array
    const transformedItems = items.map(item => ({
      ...item,
      skills: typeof item.skills === 'string' ? JSON.parse(item.skills) : item.skills,
      _id: item.id,
      userId: item.user ? {
        _id: item.user.id,
        id: item.user.id,
        name: item.user.name,
        email: item.user.email,
        role: item.user.role,
        status: item.user.status,
      } : item.userId,
    }));
    
    return { items: transformedItems, total, page, limit };
  },

  async create(data: {
    userId: string;
    phone?: string;
    skills?: string[];
    dailyCapacity?: number;
    experience?: string;
  }) {
    const agent = await prisma.agent.create({
      data: {
        userId: data.userId,
        phone: data.phone,
        skills: JSON.stringify(data.skills || []),
        dailyCapacity: data.dailyCapacity ?? 5,
        experience: data.experience,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
    
    // Transform skills from JSON string to array
    return {
      ...agent,
      skills: typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills,
      _id: agent.id,
      userId: agent.user ? {
        _id: agent.user.id,
        id: agent.user.id,
        name: agent.user.name,
        email: agent.user.email,
        role: agent.user.role,
        status: agent.user.status,
      } : agent.userId,
    };
  },

  async update(
    id: string,
    data: Partial<{
      phone: string;
      skills: string[];
      availability: string;
      dailyCapacity: number;
      experience: string;
      status: string;
    }>
  ) {
    const updateData: any = { ...data };
    if (data.skills) {
      updateData.skills = JSON.stringify(data.skills);
    }
    
    const agent = await prisma.agent.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
    
    // Transform skills from JSON string to array
    return {
      ...agent,
      skills: typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills,
      _id: agent.id,
      userId: agent.user ? {
        _id: agent.user.id,
        id: agent.user.id,
        name: agent.user.name,
        email: agent.user.email,
        role: agent.user.role,
        status: agent.user.status,
      } : agent.userId,
    };
  },

  async delete(id: string) {
    return prisma.agent.delete({
      where: { id },
    });
  },
};
