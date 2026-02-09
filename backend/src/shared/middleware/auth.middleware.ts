import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { ApiError } from '../utils/ApiError.js';
import type { JwtPayload, UserRole } from '../types/index.js';
import { User } from '../models/index.js';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const user = await User.findById(decoded.userId).select('+password');

    if (!user || user.status !== 'active') {
      throw new ApiError(401, 'Invalid or inactive user');
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    };
    next();
  } catch (err) {
    if (err instanceof ApiError) next(err);
    else next(new ApiError(401, 'Invalid token'));
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ApiError(403, 'Insufficient permissions'));
      return;
    }
    next();
  };
}
