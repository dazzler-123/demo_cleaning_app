import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { User } from '../../shared/models/index.js';
import { authRepository } from './auth.repository.js';
import { createAuditLog } from '../../shared/services/audit.service.js';
import type { JwtPayload, UserRole } from '../../shared/types/index.js';

export const authService = {
  async login(email: string, password: string) {
    const user = await authRepository.findByEmail(email);
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new ApiError(401, 'Invalid email or password');

    if (user.status !== 'active') throw new ApiError(403, 'Account is inactive');

    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    await createAuditLog({
      userId: user._id.toString(),
      action: 'login',
      resource: 'auth',
      details: { email: user.email },
    });

    return {
      token,
      user: {
        _id: user._id.toString(),
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  },

  async register(data: { name: string; email: string; password: string; role: UserRole }) {
    const existing = await authRepository.findByEmail(data.email);
    if (existing) throw new ApiError(400, 'Email already registered');

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await authRepository.create({
      ...data,
      password: hashed,
    });

    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    return {
      token,
      user: {
        _id: user._id.toString(),
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  },

  async getMe(userId: string) {
    const user = await User.findById(userId).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },
};
