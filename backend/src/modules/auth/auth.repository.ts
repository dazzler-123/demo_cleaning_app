import { User } from '../../shared/models/index.js';
import type { UserRole } from '../../shared/types/index.js';

export const authRepository = {
  async findByEmail(email: string) {
    return User.findOne({ email: email.toLowerCase() }).select('+password');
  },

  async create(data: { name: string; email: string; password: string; role: UserRole }) {
    return User.create(data);
  },
};
