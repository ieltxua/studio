import { Router } from 'express';
import { agentService } from '../services/agentService';
import { AgentType } from '@prisma/client';

const router = Router();

/**
 * GET /api/v1/agents
 * Get all agents for the current organization
 */
router.get('/', async (_req, res) => {
  try {
    // For now, use a hardcoded organization ID
    // TODO: Get from authenticated user context
    const organizationId = 'default-org';
    
    const agents = await agentService.getAgentsByOrganization(organizationId);
    
    return res.json({
      success: true,
      data: { agents }
    });
  } catch (error) {
    console.error('Error getting agents:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get agents'
    });
  }
});

/**
 * POST /api/v1/agents
 * Create a new agent
 */
router.post('/', async (req, res) => {
  try {
    const { name, type, configuration } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'name and type are required'
      });
    }

    if (!Object.values(AgentType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid agent type. Must be one of: ${Object.values(AgentType).join(', ')}`
      });
    }

    // For now, use a hardcoded organization ID
    // TODO: Get from authenticated user context
    const organizationId = 'default-org';

    const agent = await agentService.createAgent({
      name,
      organizationId,
      type,
      configuration
    });

    return res.status(201).json({
      success: true,
      data: { agent },
      message: `Successfully created ${agent.type} agent "${agent.name}"`
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create agent'
    });
  }
});

/**
 * GET /api/v1/agents/:id
 * Get specific agent by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = await agentService.getAgentStats(id);
    
    return res.json({
      success: true,
      data: { agent: stats }
    });
  } catch (error) {
    console.error('Error getting agent:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get agent'
    });
  }
});

/**
 * PUT /api/v1/agents/:id/configuration
 * Update agent configuration
 */
router.put('/:id/configuration', async (req, res) => {
  try {
    const { id } = req.params;
    const configuration = req.body;

    const agent = await agentService.updateAgentConfiguration(id, configuration);

    return res.json({
      success: true,
      data: { agent },
      message: 'Agent configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating agent configuration:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update agent configuration'
    });
  }
});

/**
 * GET /api/v1/agents/available/:type?
 * Get available agents for assignment
 */
router.get('/available/:type?', async (req, res) => {
  try {
    const { type } = req.params;
    
    // For now, use a hardcoded organization ID
    // TODO: Get from authenticated user context
    const organizationId = 'default-org';
    
    const agentType = type ? type.toUpperCase() as AgentType : undefined;
    
    if (type && !Object.values(AgentType).includes(agentType!)) {
      return res.status(400).json({
        success: false,
        error: `Invalid agent type. Must be one of: ${Object.values(AgentType).join(', ')}`
      });
    }

    const agents = await agentService.getAvailableAgents(organizationId, agentType);

    return res.json({
      success: true,
      data: { agents }
    });
  } catch (error) {
    console.error('Error getting available agents:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get available agents'
    });
  }
});

export default router;