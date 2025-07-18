import { Router } from 'express';
import { RepositoryService } from '../services/repositoryService';

const router = Router();

// GitHub token should come from environment or user authentication
const githubToken = process.env['GITHUB_TOKEN'] || '';
const repositoryService = new RepositoryService(githubToken);

/**
 * GET /api/v1/repositories
 * Get all connected repositories
 */
router.get('/', async (_req, res) => {
  try {
    const repositories = await repositoryService.getConnectedRepositories();
    return res.json({
      success: true,
      data: { repositories }
    });
  } catch (error) {
    console.error('Error getting repositories:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get repositories'
    });
  }
});

/**
 * GET /api/v1/repositories/search
 * Search accessible repositories
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const repositories = await repositoryService.searchRepositories(query, Number(limit));
    return res.json({
      success: true,
      data: { repositories }
    });
  } catch (error) {
    console.error('Error searching repositories:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search repositories'
    });
  }
});

/**
 * GET /api/v1/repositories/project/:projectId
 * Get repository connected to a project
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const repository = await repositoryService.getRepositoryByProject(projectId);
    
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: 'No repository connected to this project'
      });
    }

    return res.json({
      success: true,
      data: { repository }
    });
  } catch (error) {
    console.error('Error getting repository by project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get repository'
    });
  }
});

/**
 * POST /api/v1/repositories/connect
 * Connect a repository to a project
 */
router.post('/connect', async (req, res) => {
  try {
    const { projectId, repoOwner, repoName, setupWebhooks = true } = req.body;

    if (!projectId || !repoOwner || !repoName) {
      return res.status(400).json({
        success: false,
        error: 'projectId, repoOwner, and repoName are required'
      });
    }

    const repository = await repositoryService.connectRepository({
      projectId,
      repoOwner,
      repoName,
      setupWebhooks
    });

    return res.status(201).json({
      success: true,
      data: { repository },
      message: `Successfully connected ${repository.fullName}`
    });
  } catch (error) {
    console.error('Error connecting repository:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect repository'
    });
  }
});

/**
 * DELETE /api/v1/repositories/project/:projectId
 * Disconnect repository from a project
 */
router.delete('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    await repositoryService.disconnectRepository(projectId);

    return res.json({
      success: true,
      message: 'Repository disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting repository:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to disconnect repository'
    });
  }
});

export default router;