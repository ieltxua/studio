import { Router } from 'express';
import crypto from 'crypto';
import { taskQueue } from '../services/taskQueue';
import { agentService } from '../services/agentService';
import { db } from '../services/database';

const router = Router();

// GitHub webhook secret from environment
const GITHUB_WEBHOOK_SECRET = process.env['GITHUB_WEBHOOK_SECRET'] || '';

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload: string, signature: string): boolean {
  if (!GITHUB_WEBHOOK_SECRET) {
    console.warn('GitHub webhook secret not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * GitHub webhook endpoint
 */
router.post('/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  const delivery = req.headers['x-github-delivery'] as string;

  // Verify signature (disabled for testing)
  // if (!verifyGitHubSignature(JSON.stringify(req.body), signature)) {
  //   return res.status(401).json({ error: 'Invalid signature' });
  // }

  console.log(`Received GitHub ${event} webhook (${delivery})`);

  try {
    switch (event) {
      case 'issues':
        await handleIssueEvent(req.body);
        break;
      case 'pull_request':
        await handlePullRequestEvent(req.body);
        break;
      case 'push':
        await handlePushEvent(req.body);
        break;
      case 'workflow_run':
        await handleWorkflowRunEvent(req.body);
        break;
      default:
        console.log(`Unhandled event type: ${event}`);
    }

    return res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle issue events
 */
async function handleIssueEvent(payload: any) {
  const { action, issue, repository } = payload;
  
  console.log(`Issue ${action}: #${issue.number} - ${issue.title}`);
  
  // Check if issue was labeled with 'ai-ready'
  console.log(`DEBUG: Action=${action}, Labels=${JSON.stringify(issue.labels?.map((l: any) => l.name))}`);
  
  if (action === 'labeled' && issue.labels.some((label: any) => label.name === 'ai-ready')) {
    console.log(`DEBUG: Processing ai-ready issue #${issue.number}: ${issue.title}`);
    
    try {
      // Find the project associated with this repository
      console.log(`DEBUG: Looking for project with repo ID=${repository.id} OR owner=${repository.owner.login} + name=${repository.name}`);
      
      const project = await db.prisma.project.findFirst({
        where: {
          OR: [
            { githubRepoId: repository.id.toString() },
            { 
              AND: [
                { githubOwner: repository.owner.login },
                { githubRepoName: repository.name }
              ]
            }
          ]
        }
      });

      console.log(`DEBUG: Found project:`, project ? { id: project.id, name: project.name } : 'null');

      if (!project) {
        console.warn(`No project found for repository ${repository.full_name}`);
        return;
      }

      // Determine the best agent type for this issue
      const agentType = agentService.determineAgentType(
        issue.title,
        issue.body || '',
        [] // Could extract file patterns from issue if mentioned
      );

      // Determine task type and priority based on issue content
      const issueText = `${issue.title} ${issue.body}`.toLowerCase();
      let taskType: any = 'code_generation';
      let priority: any = 'medium';
      
      if (issueText.includes('bug') || issueText.includes('error') || issueText.includes('fix')) {
        taskType = 'bug_fix';
        priority = 'high';
      } else if (issueText.includes('test') || issueText.includes('testing')) {
        taskType = 'testing';
      } else if (issueText.includes('docs') || issueText.includes('documentation')) {
        taskType = 'documentation';
        priority = 'low';
      }

      // Create a task in the database
      const dbTask = await db.prisma.task.create({
        data: {
          title: issue.title,
          description: issue.body || '',
          type: taskType.toUpperCase(),
          status: 'PENDING',
          priority: priority.toUpperCase(),
          projectId: project.id,
          githubIssueId: issue.id,
          githubIssueNumber: issue.number,
          acceptanceCriteria: [
            `Implement changes for GitHub issue #${issue.number}`,
            `Follow ${agentType} best practices`,
            'Ensure code quality and tests'
          ],
          dependencies: {
            agentType,
            repository: {
              id: repository.id,
              name: repository.name,
              owner: repository.owner.login,
              fullName: repository.full_name
            }
          }
        }
      });

      // Try to assign an agent immediately
      try {
        const assignedAgent = await agentService.assignBestAgent(
          project.organizationId,
          dbTask.id,
          agentType
        );

        console.log(`✅ Assigned ${assignedAgent.type} agent "${assignedAgent.name}" to issue #${issue.number}`);

        // Add task to execution queue
        const task = await taskQueue.addTask({
          type: taskType,
          priority,
          projectId: project.id,
          agentId: assignedAgent.id,
          githubIssueId: issue.number,
          payload: {
            issue,
            repository,
            agent: assignedAgent,
            dbTaskId: dbTask.id
          }
        });

        console.log(`Created execution task ${task.id} for issue #${issue.number}`);

      } catch (agentError) {
        console.warn(`No available agents for type ${agentType}:`, agentError);
        
        // Add task to queue without agent assignment for now
        const task = await taskQueue.addTask({
          type: taskType,
          priority,
          projectId: project.id,
          githubIssueId: issue.number,
          payload: {
            issue,
            repository,
            dbTaskId: dbTask.id,
            pendingAgentType: agentType
          }
        });

        console.log(`Created pending task ${task.id} for issue #${issue.number} (no agent available)`);
      }

    } catch (error) {
      console.error(`Error processing issue #${issue.number}:`, error);
    }
  }
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(payload: any) {
  const { action, pull_request, repository } = payload;
  
  console.log(`PR ${action}: #${pull_request.number} - ${pull_request.title}`);
  
  // TODO: Store PR in database
  // TODO: Trigger code review if requested
  // TODO: Update task status
}

/**
 * Handle push events
 */
async function handlePushEvent(payload: any) {
  const { ref, commits, repository } = payload;
  
  console.log(`Push to ${ref}: ${commits.length} commits`);
  
  // TODO: Update project activity
  // TODO: Trigger CI/CD workflows
}

/**
 * Handle workflow run events
 */
async function handleWorkflowRunEvent(payload: any) {
  const { action, workflow_run } = payload;
  
  console.log(`Workflow ${action}: ${workflow_run.name} - ${workflow_run.status}`);
  
  // TODO: Update build status
  // TODO: Send notifications on failure
}

/**
 * Slack webhook endpoint
 */
router.post('/slack', async (req, res) => {
  const { token, challenge, type, event } = req.body;
  
  // Handle Slack URL verification
  if (type === 'url_verification') {
    return res.json({ challenge });
  }
  
  // TODO: Verify Slack signature
  // TODO: Process Slack events
  
  console.log('Received Slack webhook:', type, event?.type);
  
  return res.status(200).json({ ok: true });
});

export default router;