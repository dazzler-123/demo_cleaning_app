import { Request, Response } from 'express';
import { param } from 'express-validator';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { taskLogsService } from './task-logs.service.js';

export const taskLogsController = {
  getByAssignmentId: [
    validate([param('assignmentId').isUUID().withMessage('Invalid assignment ID format')]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const items = await taskLogsService.getByAssignmentId(
        req.params.assignmentId,
        req.user.userId,
        req.user.role
      );
      res.json({ success: true, data: items });
    }),
  ],
};
