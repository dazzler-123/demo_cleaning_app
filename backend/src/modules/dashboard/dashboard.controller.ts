import { Request, Response } from 'express';
import { query } from 'express-validator';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { dashboardService } from './dashboard.service.js';
import { prisma } from '../../config/database.js';

export const dashboardController = {
  getOverview: [
    validate([
      query('fromDate').optional().isISO8601().toDate(),
      query('toDate').optional().isISO8601().toDate(),
      query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await dashboardService.getOverview({
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        days: req.query.days ? Number(req.query.days) : undefined,
      });
      res.json({ success: true, data: result });
    }),
  ],

  getAgentOverview: [
    validate([
      query('fromDate').optional().isISO8601().toDate(),
      query('toDate').optional().isISO8601().toDate(),
      query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      
      // Get agent ID from user
      const agent = await prisma.agent.findUnique({
        where: { userId: req.user.userId },
      });
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent profile not found' });
      }

      const result = await dashboardService.getAgentOverview(
        agent.id,
        {
          fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
          toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
          days: req.query.days ? Number(req.query.days) : undefined,
        }
      );
      res.json({ success: true, data: result });
    }),
  ],

  getAgentReport: [
    validate([
      query('agentId').isUUID(),
      query('fromDate').optional().isISO8601().toDate(),
      query('toDate').optional().isISO8601().toDate(),
      query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const agentId = req.query.agentId as string;
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      const result = await dashboardService.getAgentOverview(
        agentId,
        {
          fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
          toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
          days: req.query.days ? Number(req.query.days) : undefined,
        }
      );
      res.json({ success: true, data: { agent, ...result } });
    }),
  ],
};
