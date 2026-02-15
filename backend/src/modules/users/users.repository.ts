import { prisma } from '../../config/database.js';
import type { UserRole, UserStatus } from '../../shared/types/index.js';

export const usersRepository = {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findMany(filters: { role?: UserRole; status?: UserStatus; page?: number; limit?: number }) {
    const where: any = {};
    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;
    
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    
    return { items, total, page, limit };
  },

  async create(data: { name: string; email: string; password: string; role: UserRole }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: data.password,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async update(id: string, data: Partial<{ name: string; status: UserStatus }>) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
};
