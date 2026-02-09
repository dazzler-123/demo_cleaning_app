import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { schedulesService } from './schedules.service.js';

const createValidations = [
  body('leadId').isMongoId(),
  body('date').isISO8601().toDate(),
  body('timeSlot').trim().notEmpty().withMessage('Time slot required'),
  body('duration').isInt({ min: 1 }).withMessage('Estimated duration must be greater than zero'),
  body('notes').optional().trim(),
];

export const schedulesController = {
  getById: [
    validate([param('id').isMongoId()]),
    asyncHandler(async (req: Request, res: Response) => {
      const schedule = await schedulesService.getById(req.params.id);
      res.json({ success: true, data: schedule });
    }),
  ],

  getByLeadId: [
    validate([param('leadId').isMongoId()]),
    asyncHandler(async (req: Request, res: Response) => {
      const items = await schedulesService.getByLeadId(req.params.leadId);
      res.json({ success: true, data: items });
    }),
  ],

  list: [
    validate([
      query('leadId').optional().isMongoId(),
      query('fromDate').optional().isISO8601().toDate(),
      query('toDate').optional().isISO8601().toDate(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await schedulesService.list({
        leadId: req.query.leadId as string | undefined,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
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
      const schedule = await schedulesService.create(req.body, req.user.userId);
      res.status(201).json({ success: true, data: schedule });
    }),
  ],

  update: [
    validate([
      param('id').isMongoId(),
      body('date').optional().isISO8601().toDate(),
      body('timeSlot').optional().trim().notEmpty(),
      body('duration').optional().isInt({ min: 0 }),
      body('notes').optional().trim(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const schedule = await schedulesService.update(req.params.id, req.body, req.user.userId);
      res.json({ success: true, data: schedule });
    }),
  ],

  delete: [
    validate([param('id').isMongoId()]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      await schedulesService.delete(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    }),
  ],
};
