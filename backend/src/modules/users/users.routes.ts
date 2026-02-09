import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware.js';
import { usersController } from './users.controller.js';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/', usersController.list);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.patch('/:id', usersController.update);
router.delete('/:id', usersController.delete);

export const usersRoutes = router;
