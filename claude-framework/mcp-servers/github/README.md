# GitHub Integration MCP Server for Studio

A comprehensive GitHub integration server that enables real-time webhook processing, automated PR management, Slack-to-GitHub issue creation, and intelligent agent assignment workflows for the Studio AI platform.

## Features

### Core Capabilities

- **Real-time Webhook Processing**: Handle GitHub events instantly with secure webhook verification
- **Slack Integration**: Create GitHub issues directly from Slack messages
- **PR Automation**: Automated PR creation, labeling, and reviewer assignment
- **Agent Assignment**: Intelligent mapping between Studio AI agents and GitHub tasks
- **Metrics & Analytics**: Comprehensive PR and issue metrics analysis

### Webhook Events Supported

- `push` - Code pushes to any branch
- `pull_request` - PR opened, closed, merged, ready for review
- `issues` - Issue opened, closed, labeled, assigned
- `issue_comment` - Comments on issues and PRs
- `pull_request_review` - PR review submissions
- `workflow_run` - GitHub Actions workflow events
- `check_run` / `check_suite` - CI/CD status updates

## Installation

### Prerequisites

- Python 3.11+
- Redis (for caching and event storage)
- PostgreSQL (for persistent storage)
- GitHub Token or GitHub App credentials
- Studio Backend API running

### Environment Variables

```bash
# GitHub Authentication (choose one)
GITHUB_TOKEN=your_github_personal_access_token
# OR for GitHub App
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY=your_app_private_key

# Webhook Configuration
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Studio Integration
STUDIO_API_URL=http://localhost:3000
STUDIO_API_KEY=your_studio_api_key

# Database
DATABASE_URL=postgresql://user:password@localhost/studio

# Redis
REDIS_URL=redis://localhost:6379

# Server Configuration
LOG_LEVEL=INFO
PORT=8002
```

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python main.py
```

### Docker Deployment

```bash
# Build the image
docker build -t studio-github-mcp .

# Run the container
docker run -d \
  --name studio-github \
  -p 8002:8002 \
  --env-file .env \
  studio-github-mcp
```

## API Documentation

### Resources

#### GET /resources/repositories
List all connected GitHub repositories with their Studio project mappings.

#### GET /resources/webhooks
View active webhook configurations and event subscriptions.

#### GET /resources/pr-automation
Get PR automation rules for each repository.

#### GET /resources/agent-mappings
View mappings between Studio agents and GitHub users.

### Tools

#### connect_repository
Connect a GitHub repository to a Studio project.

```json
{
  "project_id": "project-123",
  "repo_owner": "your-org",
  "repo_name": "your-repo",
  "setup_webhooks": true
}
```

#### create_issue_from_slack
Create a GitHub issue from a Slack message.

```json
{
  "title": "Bug: Login button not working",
  "body": "Users report the login button is unresponsive",
  "labels": ["bug", "urgent"],
  "assignees": ["developer1"],
  "project_id": "project-123",
  "slack_context": {
    "slack_user_id": "U123456",
    "slack_channel_id": "C789012",
    "slack_message_ts": "1234567890.123456"
  }
}
```

#### create_automated_pr
Create a pull request with automated workflows.

```json
{
  "project_id": "project-123",
  "title": "feat: Add user authentication",
  "body": "Implements JWT-based authentication",
  "base_branch": "main",
  "head_branch": "feature/auth",
  "task_id": "task-456",
  "agent_id": "agent-789",
  "draft": false
}
```

#### assign_agent_to_issue
Assign a Studio AI agent to work on a GitHub issue.

```json
{
  "project_id": "project-123",
  "issue_number": 42,
  "agent_id": "agent-789",
  "create_task": true,
  "priority": "high"
}
```

#### configure_pr_automation
Set up automation rules for pull requests.

```json
{
  "project_id": "project-123",
  "auto_assign": true,
  "auto_label": true,
  "require_reviews": 2,
  "protected_branches": ["main", "production"],
  "draft_on_wip": true
}
```

#### analyze_pr_metrics
Generate PR metrics and insights.

```json
{
  "project_id": "project-123",
  "timeframe_days": 30,
  "metrics": ["merge_time", "review_time", "comments", "changes"]
}
```

### Webhook Endpoint

#### POST /webhooks/github
Receives GitHub webhook events. Requires valid signature verification.

Headers:
- `X-Hub-Signature-256`: HMAC signature
- `X-GitHub-Event`: Event type
- `X-GitHub-Delivery`: Unique delivery ID

## Webhook Setup

### Manual Setup

1. Go to your GitHub repository settings
2. Navigate to Webhooks
3. Add webhook with:
   - Payload URL: `https://your-domain/webhooks/github`
   - Content type: `application/json`
   - Secret: Your configured webhook secret
   - Events: Select individual events or "Send me everything"

### Automated Setup

Use the `setup_webhooks` tool or enable it when connecting a repository.

## PR Automation Features

### Auto-Assignment
- Automatically assign reviewers based on file changes
- Round-robin assignment for load balancing
- Respect team ownership rules

### Auto-Labeling
- Apply labels based on:
  - File paths changed
  - PR title patterns
  - Branch naming conventions
  - PR size (XS, S, M, L, XL)

### WIP Detection
- Automatically convert to draft if:
  - Title contains "WIP", "Draft", or "[WIP]"
  - Commit message indicates work in progress

### Stale PR Management
- Flag PRs with no activity
- Auto-close after configured period
- Send reminders to authors and reviewers

## Agent Integration

### Agent Assignment Workflow

1. Issue is created or labeled with agent-compatible tag
2. System analyzes issue content and required capabilities
3. Matching agent is suggested or auto-assigned
4. Studio task is created and linked
5. Agent begins work with full context

### Agent Capabilities Mapping

```python
{
    "backend": ["api", "database", "authentication"],
    "frontend": ["ui", "react", "css", "accessibility"],
    "devops": ["deployment", "ci/cd", "infrastructure"],
    "testing": ["unit-tests", "integration", "e2e"],
    "documentation": ["docs", "readme", "api-docs"]
}
```

## Metrics and Analytics

### Available Metrics

- **Merge Time**: Average time from PR open to merge
- **Review Time**: Time to first review and approval
- **Comment Activity**: Average comments per PR
- **Code Churn**: Lines added/removed per PR
- **Contributor Stats**: Most active contributors
- **Label Distribution**: Common labels and their usage

### Insights Generated

- Bottlenecks in review process
- Optimal PR size recommendations
- Team velocity trends
- Quality metrics based on review feedback

## Security Considerations

### Webhook Verification
All incoming webhooks are verified using HMAC-SHA256 signatures.

### API Authentication
- Studio API calls use bearer token authentication
- GitHub API calls use token or app authentication

### Rate Limiting
- Implements GitHub API rate limit handling
- Queues webhook processing to prevent overload

### Data Privacy
- Sensitive data is encrypted at rest
- Webhook payloads are retained for limited time
- PII is handled according to privacy policy

## Troubleshooting

### Common Issues

1. **Webhook delivery failures**
   - Check webhook secret configuration
   - Verify server is accessible from GitHub
   - Check server logs for signature verification errors

2. **Agent assignment not working**
   - Ensure agent has GitHub username configured
   - Verify agent capabilities match issue requirements
   - Check Studio API connectivity

3. **PR automation not triggering**
   - Verify automation rules are configured
   - Check repository permissions
   - Ensure webhook events are properly subscribed

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=DEBUG python main.py
```

## Development

### Running Tests

```bash
pytest tests/
```

### Adding New Webhook Handlers

1. Add event type to `WebhookEvent` enum
2. Create handler method: `async def _handle_<event>_event(self, payload)`
3. Register in `_register_webhook_handlers()`

### Extending PR Automation

1. Add configuration to `PRAutomationConfig`
2. Implement logic in appropriate event handler
3. Update configuration tool schema

## Support

For issues and feature requests, please contact the Studio development team or create an issue in the repository.