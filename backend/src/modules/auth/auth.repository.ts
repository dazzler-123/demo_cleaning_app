import { prisma } from '../../config/database.js';
import type { UserRole } from '../../shared/types/index.js';

export const authRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      // Password is included by default in Prisma, no need to select
    });
  },

  async create(data: { name: string; email: string; password: string; role: UserRole }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: data.password,
        role: data.role,
      },
    });
  },
};
