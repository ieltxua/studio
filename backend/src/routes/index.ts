import { Router } from 'express';
import { authRoutes } from './auth';
import { projectRoutes } from './projects';
import { userRoutes } from './users';
import { agentRoutes } from './agents';
import { taskRoutes } from './tasks';
import { organizationRoutes } from './organizations';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/users', userRoutes);
router.use('/agents', agentRoutes);
router.use('/tasks', taskRoutes);
router.use('/organizations', organizationRoutes);

export { router as apiRoutes };