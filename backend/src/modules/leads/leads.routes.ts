import { Router } from 'express';
import { authenticate, authorize } from '../../shared/middleware/auth.middleware.js';
import { upload } from '../../shared/middleware/upload.middleware.js';
import { leadsController } from './leads.controller.js';

const router = Router();

router.use(authenticate, authorize('admin', 'super_admin'));

router.get('/', leadsController.list);
router.get('/scheduled', leadsController.getConfirmed);
router.get('/:id', leadsController.getById);
router.post('/upload-images', upload.array('images', 10), leadsController.uploadImages);
router.post('/', leadsController.create);
router.patch('/:id', leadsController.update);
router.post('/:id/cancel', leadsController.cancel);
router.delete('/:id', leadsController.delete);

export const leadsRoutes = router;
