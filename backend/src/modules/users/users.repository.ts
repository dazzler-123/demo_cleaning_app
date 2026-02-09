import { User } from '../../shared/models/index.js';
import type { UserRole, UserStatus } from '../../shared/types/index.js';

export const usersRepository = {
  async findById(id: string) {
    return User.findById(id).select('-password');
  },

  async findMany(filters: { role?: UserRole; status?: UserStatus; page?: number; limit?: number }) {
    const query: Record<string, unknown> = {};
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);
    return { items, total, page, limit };
  },

  async create(data: { name: string; email: string; password: string; role: UserRole }) {
    return User.create(data);
  },

  async update(id: string, data: Partial<{ name: string; status: UserStatus }>) {
    return User.findByIdAndUpdate(id, { $set: data }, { new: true }).select('-password');
  },

  async delete(id: string) {
    return User.findByIdAndDelete(id);
  },
};
