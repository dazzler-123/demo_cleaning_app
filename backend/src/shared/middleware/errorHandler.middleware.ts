import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err.name === 'ValidationError') {
    const message = Object.values((err as mongoose.Error.ValidationError).errors)
      .map((e) => e.message)
      .join(', ');
    res.status(400).json({ success: false, message });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }

  console.error('[Error]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}
