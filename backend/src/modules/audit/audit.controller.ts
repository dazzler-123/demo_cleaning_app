import { Request, Response } from 'express';
import { query } from 'express-validator';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { auditRepository } from './audit.repository.js';

export const auditController = {
  list: [
    validate([
      query('userId').optional().isUUID(),
      query('resource').optional().trim(),
      query('resourceId').optional().trim(),
      query('action').optional().trim(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await auditRepository.findMany({
        userId: req.query.userId as string | undefined,
        resource: req.query.resource as string | undefined,
        resourceId: req.query.resourceId as string | undefined,
        action: req.query.action as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ success: true, data: result });
    }),
  ],
};
