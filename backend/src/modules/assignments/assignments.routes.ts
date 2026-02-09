import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware.js';
import { assignmentsController } from './assignments.controller.js';

const router = Router();

router.use(authenticate);

router.get('/my-tasks', authorize('agent', 'admin', 'super_admin'), assignmentsController.getMyTasks);
router.get('/agent/:agentId/tasks', authorize('admin', 'super_admin'), assignmentsController.getAgentTasks);
router.get('/schedule/:scheduleId', authorize('admin', 'super_admin'), assignmentsController.getByScheduleId);
router.get('/eligible-agents', authorize('admin', 'super_admin'), assignmentsController.getEligibleAgents);
router.get('/', authorize('admin', 'super_admin'), assignmentsController.list);
router.get('/:id', authorize('agent', 'admin', 'super_admin'), assignmentsController.getById);
router.post('/', authorize('admin', 'super_admin'), assignmentsController.create);
router.patch('/:id/status', authorize('agent', 'admin', 'super_admin'), assignmentsController.updateStatus);
router.delete('/:id', authorize('admin', 'super_admin'), assignmentsController.delete);

export const assignmentsRoutes = router;
