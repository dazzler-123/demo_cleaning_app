import { Request, Response } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { authService } from './auth.service.js';
import type { UserRole } from '../../shared/types/index.js';

const loginValidations = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

const registerValidations = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['super_admin', 'admin', 'agent']).withMessage('Valid role required'),
];

export const authController = {
  login: [
    validate(loginValidations),
    asyncHandler(async (req: Request, res: Response) => {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
    }),
  ],

  register: [
    validate(registerValidations),
    asyncHandler(async (req: Request, res: Response) => {
      const { name, email, password, role } = req.body;
      const result = await authService.register({ name, email, password, role: role as UserRole });
      res.status(201).json({ success: true, data: result });
    }),
  ],

  getMe: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new Error('User not set');
    const user = await authService.getMe(req.user.userId);
    res.json({ success: true, data: user });
  }),
};
