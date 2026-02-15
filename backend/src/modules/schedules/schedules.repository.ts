import { prisma } from '../../config/database.js';

export const schedulesRepository = {
  async findById(id: string) {
    return prisma.schedule.findUnique({
      where: { id },
      include: {
        lead: true,
      },
    });
  },

  async findByLeadId(leadId: string) {
    return prisma.schedule.findMany({
      where: { leadId },
      include: {
        lead: true,
      },
      orderBy: { date: 'asc' },
    });
  },

  async findMany(filters: {
    leadId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    activeOnly?: boolean;
  }) {
    const where: any = {};
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.activeOnly !== false) where.isActive = true;
    if (filters.fromDate || filters.toDate) {
      where.date = {};
      if (filters.fromDate) where.date.gte = filters.fromDate;
      if (filters.toDate) where.date.lte = filters.toDate;
    }
    
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        include: {
          lead: true,
        },
        orderBy: [
          { date: 'asc' },
          { timeSlot: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.schedule.count({ where }),
    ]);
    
    return { items, total, page, limit };
  },

  async create(data: { leadId: string; date: Date; timeSlot: string; duration: number; notes?: string }) {
    return prisma.schedule.create({
      data: {
        leadId: data.leadId,
        date: data.date,
        timeSlot: data.timeSlot,
        duration: data.duration,
        notes: data.notes,
      },
      include: {
        lead: true,
      },
    });
  },

  async deactivateByLeadId(leadId: string) {
    return prisma.schedule.updateMany({
      where: { leadId },
      data: { isActive: false },
    });
  },

  async findActiveByLeadId(leadId: string) {
    return prisma.schedule.findFirst({
      where: { leadId, isActive: true },
      include: {
        lead: true,
      },
    });
  },

  async update(id: string, data: Partial<{ date: Date; timeSlot: string; duration: number; notes: string }>) {
    return prisma.schedule.update({
      where: { id },
      data,
      include: {
        lead: true,
      },
    });
  },

  async delete(id: string) {
    return prisma.schedule.delete({
      where: { id },
    });
  },
};
