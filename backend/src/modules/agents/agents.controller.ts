import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { agentsService } from './agents.service.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { prisma } from '../../config/database.js';

const createValidations = [
  body('userId').isUUID().withMessage('Valid user id required'),
  body('phone').optional().trim(),
  body('skills').optional().isArray(),
  body('skills.*').optional().trim().notEmpty(),
  body('dailyCapacity').optional().isInt({ min: 1 }),
  body('experience').optional().trim(),
];

const updateValidations = [
  param('id').isUUID(),
  body('phone').optional().trim(),
  body('skills').optional().isArray(),
  body('availability').optional().isIn(['available', 'busy', 'off_duty']),
  body('dailyCapacity').optional().isInt({ min: 1 }),
  body('experience').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']),
];

export const agentsController = {
  getById: [
    validate([param('id').isUUID()]),
    asyncHandler(async (req: Request, res: Response) => {
      const agent = await agentsService.getById(req.params.id);
      res.json({ success: true, data: agent });
    }),
  ],

  getByUserId: [
    validate([param('userId').isUUID()]),
    asyncHandler(async (req: Request, res: Response) => {
      const agent = await agentsService.getByUserId(req.params.userId);
      res.json({ success: true, data: agent });
    }),
  ],

  /** Logged-in agent gets their own profile (for availability update UI). */
  getMe: [
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const agent = await agentsService.getByUserId(req.user.userId);
      res.json({ success: true, data: agent });
    }),
  ],

  getAvailableUsers: [
    asyncHandler(async (_req: Request, res: Response) => {
      const users = await agentsService.getAvailableUsersForProfile();
      res.json({ success: true, data: users });
    }),
  ],

  list: [
    validate([
      query('availability').optional().isIn(['available', 'busy', 'off_duty']),
      query('status').optional().isIn(['active', 'inactive']),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await agentsService.list({
        availability: req.query.availability as string | undefined,
        status: req.query.status as string | undefined,
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
      const agent = await agentsService.create(req.body, req.user.userId);
      res.status(201).json({ success: true, data: agent });
    }),
  ],

  update: [
    validate(updateValidations),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const id = req.params.id as string;
      let body: Record<string, unknown> = { ...req.body };
      if (req.user.role === 'agent') {
        const myAgent = await prisma.agent.findUnique({ where: { userId: req.user.userId } });
        if (!myAgent || myAgent.id !== id) {
          throw new ApiError(403, 'You can only update your own agent profile');
        }
        body = { availability: req.body.availability };
      }
      const agent = await agentsService.update(id, body, req.user.userId);
      res.json({ success: true, data: agent });
    }),
  ],

  delete: [
    validate([param('id').isUUID()]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      await agentsService.delete(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    }),
  ],
};
