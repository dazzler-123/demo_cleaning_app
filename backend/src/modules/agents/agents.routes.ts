import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware.js';
import { agentsController } from './agents.controller.js';

const router = Router();

router.use(authenticate);

// Admin/SuperAdmin: full CRUD
router.get('/', authorize('admin', 'super_admin'), agentsController.list);
router.get('/available-users', authorize('admin', 'super_admin'), agentsController.getAvailableUsers);
router.get('/me', authorize('agent'), agentsController.getMe);
router.get('/user/:userId', authorize('admin', 'super_admin'), agentsController.getByUserId);
router.get('/:id', authorize('admin', 'super_admin', 'agent'), agentsController.getById);
router.post('/', authorize('admin', 'super_admin'), agentsController.create);
router.patch('/:id', authorize('admin', 'super_admin', 'agent'), agentsController.update);
router.delete('/:id', authorize('admin', 'super_admin'), agentsController.delete);

export const agentsRoutes = router;
