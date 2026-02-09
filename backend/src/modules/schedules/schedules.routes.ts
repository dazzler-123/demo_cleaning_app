import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware.js';
import { schedulesController } from './schedules.controller.js';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/', schedulesController.list);
router.get('/lead/:leadId', schedulesController.getByLeadId);
router.get('/:id', schedulesController.getById);
router.post('/', schedulesController.create);
router.patch('/:id', schedulesController.update);
router.delete('/:id', schedulesController.delete);

export const schedulesRoutes = router;
