import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { usersService } from './users.service.js';
import type { UserRole, UserStatus } from '../../shared/types/index.js';

const createValidations = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password at least 6 characters'),
  body('role').isIn(['super_admin', 'admin', 'agent']).withMessage('Valid role required'),
];

const updateValidations = [
  param('id').isMongoId().withMessage('Invalid user id'),
  body('name').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'inactive', 'suspended']),
];

export const usersController = {
  getById: [
    validate([param('id').isMongoId()]),
    asyncHandler(async (req: Request, res: Response) => {
      const user = await usersService.getById(req.params.id);
      res.json({ success: true, data: user });
    }),
  ],

  list: [
    validate([
      query('role').optional().isIn(['super_admin', 'admin', 'agent']),
      query('status').optional().isIn(['active', 'inactive', 'suspended']),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await usersService.list({
        role: req.query.role as UserRole | undefined,
        status: req.query.status as UserStatus | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ success: true, data: result });
    }),
  ],

  create: [
    validate(createValidations),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const user = await usersService.create(req.body, req.user.userId, req.user.role);
      res.status(201).json({ success: true, data: user });
    }),
  ],

  update: [
    validate(updateValidations),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const { name, status } = req.body;
      const user = await usersService.update(req.params.id, { name, status }, req.user.userId);
      res.json({ success: true, data: user });
    }),
  ],

  delete: [
    validate([param('id').isMongoId()]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      await usersService.delete(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    }),
  ],
};
