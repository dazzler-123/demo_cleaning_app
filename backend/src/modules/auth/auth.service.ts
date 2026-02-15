import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { prisma } from '../../config/database.js';
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
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };
    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn
    };
    const token = jwt.sign(payload, config.jwt.secret, options);

    await createAuditLog({
      userId: user.id,
      action: 'login',
      resource: 'auth',
      details: { email: user.email },
    });

    return {
      token,
      user: {
        _id: user.id,
        id: user.id,
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
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    return {
      token,
      user: {
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
    if (!user) throw new ApiError(404, 'User not found');
    
    // Transform to match expected format with _id
    return {
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
};
