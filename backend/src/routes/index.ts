import { Router } from 'express';
import authRoutes from './auth';
import agentsRoutes from './agents';
import repositoriesRoutes from './repositories';
import webhooksRoutes from './webhooks';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/agents', agentsRoutes);
router.use('/repositories', repositoriesRoutes);
router.use('/webhooks', webhooksRoutes);

export { router as apiRoutes };