import bcrypt from 'bcryptjs';
import { ApiError } from '../../shared/utils/ApiError.js';
import { User } from '../../shared/models/index.js';
import { usersRepository } from './users.repository.js';
import { createAuditLog } from '../../shared/services/audit.service.js';
import type { UserRole, UserStatus } from '../../shared/types/index.js';

export const usersService = {
  async getById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },

  async list(filters: { role?: UserRole; status?: UserStatus; page?: number; limit?: number }) {
    return usersRepository.findMany(filters);
  },

  async create(
    data: { name: string; email: string; password: string; role: UserRole },
    actorId: string,
    actorRole: UserRole
  ) {
    if (actorRole === 'admin' && data.role !== 'agent') {
      throw new ApiError(403, 'Admin can only create agents, not other admins');
    }
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) throw new ApiError(400, 'Email already registered');
    const hashed = await bcrypt.hash(data.password, 12);
    const user = await usersRepository.create({ ...data, password: hashed });
    await createAuditLog({
      userId: actorId,
      action: 'create',
      resource: 'user',
      resourceId: user._id.toString(),
      details: { email: user.email, role: user.role },
    });
    return usersRepository.findById(user._id.toString());
  },

  async update(
    id: string,
    data: Partial<{ name: string; status: UserStatus }>,
    actorId: string
  ) {
    const user = await usersRepository.update(id, data);
    if (!user) throw new ApiError(404, 'User not found');
    await createAuditLog({
      userId: actorId,
      action: 'update',
      resource: 'user',
      resourceId: id,
      details: data,
    });
    return user;
  },

  async delete(id: string, actorId: string) {
    const user = await usersRepository.delete(id);
    if (!user) throw new ApiError(404, 'User not found');
    await createAuditLog({
      userId: actorId,
      action: 'delete',
      resource: 'user',
      resourceId: id,
    });
    return { deleted: true };
  },
};
