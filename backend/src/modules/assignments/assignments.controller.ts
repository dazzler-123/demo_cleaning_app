import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { assignmentsService } from './assignments.service.js';
import { upload } from '../../shared/middleware/upload.middleware.js';
import { uploadMultipleToCloudinary } from '../../shared/services/cloudinary.service.js';
import type { TaskStatus } from '../../shared/types/index.js';

const createValidations = [
  body('leadId').isMongoId(),
  body('scheduleId').isMongoId(),
  body('agentId').isMongoId(),
  body('notes').optional().trim(),
];

const statusValidations = [
  param('id').isMongoId(),
  body('status')
    .isIn(['pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold']),
  body('reason').optional().trim(),
  body('notes').optional().trim(),
];

const statusValidationsWithFiles = [
  param('id').isMongoId(),
  body('status')
    .isIn(['pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold']),
  body('reason').optional().trim(),
  body('notes').optional().trim(),
];

export const assignmentsController = {
  getById: [
    validate([param('id').isMongoId()]),
    asyncHandler(async (req: Request, res: Response) => {
      const assignment = await assignmentsService.getById(req.params.id);
      if (req.user?.role === 'agent') {
        const { Agent } = await import('../../shared/models/index.js');
        const agent = await Agent.findOne({ userId: req.user.userId });
        const aid = typeof assignment.agentId === 'object' && assignment.agentId && '_id' in assignment.agentId
          ? (assignment.agentId as { _id: { toString(): string } })._id.toString()
          : String(assignment.agentId);
        if (!agent || aid !== agent._id.toString()) {
          const { ApiError } = await import('../../shared/utils/ApiError.js');
          throw new ApiError(403, 'Access denied');
        }
      }
      res.json({ success: true, data: assignment });
    }),
  ],

  getMyTasks: [
    validate([
      query('status').optional().isIn(['pending', 'in_progress', 'completed']),
      query('fromDate').optional().isISO8601().toDate(),
      query('toDate').optional().isISO8601().toDate(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const agentId = req.query.agentId as string | undefined;
      const userId = req.user.userId;
      if (req.user.role === 'agent' && !agentId) {
        const { Agent } = await import('../../shared/models/index.js');
        const agent = await Agent.findOne({ userId });
        if (!agent) {
          res.json({ success: true, data: [] });
          return;
        }
        const items = await assignmentsService.getByAgentId(agent._id.toString(), {
          status: req.query.status as string | undefined,
          fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
          toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        });
        res.json({ success: true, data: items });
        return;
      }
      const items = agentId
        ? await assignmentsService.getByAgentId(agentId, {
            status: req.query.status as string | undefined,
            fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
            toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
          })
        : await assignmentsService.list({
            status: req.query.status as string | undefined,
            page: req.query.page ? Number(req.query.page) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
          });
      res.json({ success: true, data: items });
    }),
  ],

  getByScheduleId: [
    validate([param('scheduleId').isMongoId()]),
    asyncHandler(async (req: Request, res: Response) => {
      const items = await assignmentsService.getByScheduleId(req.params.scheduleId);
      res.json({ success: true, data: items });
    }),
  ],

  getEligibleAgents: [
    validate([query('scheduleId').isMongoId()]),
    asyncHandler(async (req: Request, res: Response) => {
      const agentIds = await assignmentsService.getEligibleAgentIdsForSchedule(req.query.scheduleId as string);
      res.json({ success: true, data: { eligibleAgentIds: agentIds } });
    }),
  ],

  getAgentTasks: [
    validate([
      param('agentId').isMongoId(),
      query('status').optional().isIn(['pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold']),
      query('fromDate').optional().isISO8601().toDate(),
      query('toDate').optional().isISO8601().toDate(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await assignmentsService.getAgentTasksPaginated(req.params.agentId as string, {
        status: req.query.status as string | undefined,
        fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
        toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      
      // Format the response similar to dashboard repository format
      const formattedItems = result.items.map((a: any) => ({
        _id: a._id.toString(),
        status: a.status,
        assignedAt: a.assignedAt ? a.assignedAt.toISOString() : null,
        completedAt: a.completedAt ? a.completedAt.toISOString() : null,
        startedAt: a.startedAt ? a.startedAt.toISOString() : null,
        leadId: a.leadId ? {
          _id: a.leadId._id.toString(),
          client: {
            companyName: a.leadId.client?.companyName || '',
            contactPerson: a.leadId.client?.contactPerson || '',
            email: a.leadId.client?.email || '',
            phone: a.leadId.client?.phone || '',
          },
          cleaningDetails: {
            cleaningType: a.leadId.cleaningDetails?.cleaningType || '',
            category: a.leadId.cleaningDetails?.category || '',
            areaSize: a.leadId.cleaningDetails?.areaSize || '',
          },
          status: a.leadId.status,
        } : null,
        scheduleId: a.scheduleId ? {
          _id: a.scheduleId._id.toString(),
          date: a.scheduleId.date ? a.scheduleId.date.toISOString() : null,
          timeSlot: a.scheduleId.timeSlot || '',
          duration: a.scheduleId.duration || 0,
        } : null,
      }));
      
      res.json({ 
        success: true, 
        data: {
          items: formattedItems,
          total: result.total,
          page: result.page,
          limit: result.limit,
        }
      });
    }),
  ],

  list: [
    validate([
      query('leadId').optional().isMongoId(),
      query('agentId').optional().isMongoId(),
      query('scheduleId').optional().isMongoId(),
      query('status')
        .optional()
        .custom((v) => !v || v === 'undefined' || ['pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold'].includes(v))
        .withMessage('Invalid status'),
      query('search').optional().trim().isLength({ min: 1 }).withMessage('Invalid search'),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const statusParam = req.query.status as string | undefined;
      const validStatuses = ['pending', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'on_hold'];
      const status = statusParam && statusParam !== 'undefined' && validStatuses.includes(statusParam) ? statusParam : undefined;
      const result = await assignmentsService.list({
        leadId: req.query.leadId as string | undefined,
        agentId: req.query.agentId as string | undefined,
        scheduleId: req.query.scheduleId as string | undefined,
        status,
        search: req.query.search as string | undefined,
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
      const assignment = await assignmentsService.create(req.body, req.user.userId);
      res.status(201).json({ success: true, data: assignment });
    }),
  ],

  updateStatus: [
    (req: Request, res: Response, next: any) => {
      upload.array('images', 10)(req, res, (err: any) => {
        if (err) {
          return res.status(400).json({ success: false, message: err.message });
        }
        next();
      });
    },
    validate(statusValidationsWithFiles),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
      const files = (req as any).files as Express.Multer.File[] | undefined;
      const imageUrls: string[] = [];
      if (files && files.length > 0) {
        const uploadResults = await uploadMultipleToCloudinary(files, 'assignments');
        imageUrls.push(...uploadResults.map((result) => result.secureUrl));
      }
      const assignment = await assignmentsService.updateStatus(
        req.params.id,
        req.body.status as TaskStatus,
        req.user.userId,
        { isAdmin, actorUserId: req.user.userId, reason: req.body.reason, notes: req.body.notes, completionImages: imageUrls.length > 0 ? imageUrls : undefined }
      );
      res.json({ success: true, data: assignment });
    }),
  ],

  delete: [
    validate([param('id').isMongoId()]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      await assignmentsService.delete(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    }),
  ],
};
