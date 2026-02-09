import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware.js';
import { dashboardController } from './dashboard.controller.js';

const router = Router();

router.use(authenticate);

// Admin/SuperAdmin: full dashboard overview
router.get('/overview', authorize('admin', 'super_admin'), dashboardController.getOverview);

// Admin/SuperAdmin: agent report by agentId
router.get('/agent/report', authorize('admin', 'super_admin'), dashboardController.getAgentReport);

// Agent: agent-specific dashboard overview
router.get('/agent/overview', authorize('agent'), dashboardController.getAgentOverview);

export const dashboardRoutes = router;
