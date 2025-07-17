import { Router } from 'express';
import authRoutes from './auth';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);

export { router as apiRoutes };