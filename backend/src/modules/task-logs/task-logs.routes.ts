import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware.js';
import { taskLogsController } from './task-logs.controller.js';

const router = Router();

router.use(authenticate, authorize('agent', 'admin', 'super_admin'));

router.get('/assignment/:assignmentId', taskLogsController.getByAssignmentId);

export const taskLogsRoutes = router;
