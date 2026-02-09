import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware.js';
import { auditController } from './audit.controller.js';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/', auditController.list);

export const auditRoutes = router;
