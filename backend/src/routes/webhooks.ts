import { Router } from 'express';
import crypto from 'crypto';
import { taskQueue } from '../services/taskQueue';

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

  // Verify signature
  if (!verifyGitHubSignature(JSON.stringify(req.body), signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

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
  if (action === 'labeled' && issue.labels.some((label: any) => label.name === 'ai-ready')) {
    // Determine task type based on issue content
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
    
    // Add task to queue
    const task = await taskQueue.addTask({
      type: taskType,
      priority,
      projectId: repository.full_name,
      githubIssueId: issue.number,
      payload: {
        issue,
        repository
      }
    });
    
    console.log(`Created task ${task.id} for issue #${issue.number}`);
  }
  
  // TODO: Store issue in database
  // TODO: Send notifications
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