import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { leadsService } from './leads.service.js';
import { uploadMultipleToCloudinary } from '../../shared/services/cloudinary.service.js';

const clientValidations = [
  body('client.companyName').trim().notEmpty().withMessage('Company name required'),
  body('client.contactPerson').trim().notEmpty().withMessage('Contact person required'),
  body('client.phone').optional().trim(),
  body('client.email').optional().isEmail().withMessage('Valid email format required if provided'),
];

const locationValidations = [
  body('location.address').optional().trim(),
  body('location.city').trim().notEmpty().withMessage('City required'),
  body('location.state').optional().trim(),
  body('location.pincode').optional().trim(),
];

const cleaningValidations = [
  body('cleaningDetails.cleaningType').trim().notEmpty().withMessage('Cleaning type required'),
  body('cleaningDetails.category').trim().notEmpty().withMessage('Service category required'),
  body('cleaningDetails.areaSize').optional().trim(),
];

const createValidations = [
  ...clientValidations,
  ...locationValidations,
  ...cleaningValidations,
  body('cleaningDetails.rooms').optional().isInt({ min: 0 }),
  body('cleaningDetails.washrooms').optional().isInt({ min: 0 }),
  body('cleaningDetails.floorType').optional().trim(),
  body('cleaningDetails.frequency').optional().trim(),
  body('resources').optional().isObject(),
  body('slaPriority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('leadType').optional().isIn(['facebook', 'instagram', 'google', 'website', 'referral', 'walk_in', 'phone_call', 'email', 'other']),
  body('quotedAmount').optional().isFloat({ min: 0 }).withMessage('Quoted amount must be a positive number'),
  body('confirmedAmount').optional().isFloat({ min: 0 }).withMessage('Confirmed amount must be a positive number'),
];

const updateValidations = [
  param('id').isUUID(),
  body('client').optional().isObject(),
  body('location').optional().isObject(),
  body('cleaningDetails').optional().isObject(),
  body('cleaningDetails.areaSize').optional().trim(),
  body('resources').optional().isObject(),
  body('slaPriority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('leadType').optional().isIn(['facebook', 'instagram', 'google', 'website', 'referral', 'walk_in', 'phone_call', 'email', 'other']),
  body('status').optional().isIn(['created', 'in_progress', 'confirm', 'follow_up', 'completed', 'cancelled']),
  body('quotedAmount').optional().isFloat({ min: 0 }).withMessage('Quoted amount must be a positive number'),
  body('confirmedAmount').optional().isFloat({ min: 0 }).withMessage('Confirmed amount must be a positive number'),
];

export const leadsController = {
  getById: [
    validate([param('id').isUUID().withMessage('Invalid lead ID format')]),
    asyncHandler(async (req: Request, res: Response) => {
      const lead = await leadsService.getById(req.params.id);
      res.json({ success: true, data: lead });
    }),
  ],

  list: [
    validate([
      query('status').optional().trim(),
      query('scheduleStatus').optional().isIn(['not_scheduled', 'scheduled']),
      query('assignmentStatus').optional().isIn(['not_assigned', 'assigned']),
      query('createdBy').optional().isUUID(),
      query('search').optional().trim(),
      query('excludeCancelled').optional().isIn(['true', 'false']),
      query('excludeConfirmed').optional().isIn(['true', 'false']),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await leadsService.list({
        status: req.query.status as string | undefined,
        scheduleStatus: req.query.scheduleStatus as string | undefined,
        assignmentStatus: req.query.assignmentStatus as string | undefined,
        createdBy: req.query.createdBy as string | undefined,
        search: req.query.search as string | undefined,
        excludeCancelled: req.query.excludeCancelled === 'true',
        excludeConfirmed: req.query.excludeConfirmed === 'false' ? false : true, // Default: exclude confirmed
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
      const lead = await leadsService.create(req.body, req.user.userId);
      res.status(201).json({ success: true, data: lead });
    }),
  ],

  update: [
    validate(updateValidations),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const lead = await leadsService.update(req.params.id, req.body, req.user.userId);
      res.json({ success: true, data: lead });
    }),
  ],

  cancel: [
    validate([param('id').isUUID()]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      const lead = await leadsService.cancel(req.params.id, req.user.userId);
      res.json({ success: true, data: lead });
    }),
  ],

  delete: [
    validate([param('id').isUUID()]),
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new Error('User not set');
      await leadsService.delete(req.params.id, req.user.userId);
      res.json({ success: true, data: { deleted: true } });
    }),
  ],

  uploadImages: asyncHandler(async (req: Request, res: Response) => {
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const uploadResults = await uploadMultipleToCloudinary(files, 'leads');
    const imageUrls = uploadResults.map((result) => result.secureUrl);
    res.json({ success: true, data: { images: imageUrls } });
  }),

  getConfirmed: [
    validate([
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
      query('search').optional().trim(),
      query('scheduleStatus').optional().isIn(['not_scheduled', 'scheduled']),
      query('assignmentStatus').optional().isIn(['not_assigned', 'assigned']),
      query('sortField').optional().isIn(['location', 'scheduleStatus', 'assignmentStatus', 'scheduleDate']),
      query('sortDirection').optional().isIn(['asc', 'desc']),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await leadsService.getConfirmedWithScheduleAndAssignment({
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        scheduleStatus: req.query.scheduleStatus as string | undefined,
        assignmentStatus: req.query.assignmentStatus as string | undefined,
        sortField: req.query.sortField as string | undefined,
        sortDirection: (req.query.sortDirection as 'asc' | 'desc') || 'asc',
      });
      res.json({ success: true, data: result });
    }),
  ],
};
