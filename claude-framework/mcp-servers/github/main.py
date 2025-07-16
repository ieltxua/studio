"""
GitHub Integration MCP Server for Studio

This server provides advanced GitHub integration capabilities including:
- Real-time webhook processing for GitHub events
- Automated issue creation from Slack messages
- PR automation and management
- Agent assignment workflows
- Studio backend API integration
"""

import asyncio
import json
import os
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from enum import Enum
import logging

from ..base.mcp_server import BaseMCPServer, MCPResource, MCPTool, MCPPrompt, DatabaseMixin, CacheMixin
from fastapi import Request, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx
from github import Github, GithubException
from github.PullRequest import PullRequest
from github.Issue import Issue
from github.Repository import Repository


class WebhookEvent(str, Enum):
    """GitHub webhook event types"""
    PUSH = "push"
    PULL_REQUEST = "pull_request"
    ISSUES = "issues"
    ISSUE_COMMENT = "issue_comment"
    PULL_REQUEST_REVIEW = "pull_request_review"
    PULL_REQUEST_REVIEW_COMMENT = "pull_request_review_comment"
    WORKFLOW_RUN = "workflow_run"
    CHECK_RUN = "check_run"
    CHECK_SUITE = "check_suite"
    RELEASE = "release"
    DEPLOYMENT = "deployment"
    DEPLOYMENT_STATUS = "deployment_status"


class PRAction(str, Enum):
    """Pull request actions"""
    OPENED = "opened"
    CLOSED = "closed"
    REOPENED = "reopened"
    SYNCHRONIZE = "synchronize"
    READY_FOR_REVIEW = "ready_for_review"
    CONVERTED_TO_DRAFT = "converted_to_draft"
    REVIEW_REQUESTED = "review_requested"
    REVIEW_REQUEST_REMOVED = "review_request_removed"


class IssueAction(str, Enum):
    """Issue actions"""
    OPENED = "opened"
    CLOSED = "closed"
    REOPENED = "reopened"
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned"
    LABELED = "labeled"
    UNLABELED = "unlabeled"


class GitHubWebhookPayload(BaseModel):
    """Base webhook payload"""
    action: Optional[str] = None
    repository: Dict[str, Any]
    sender: Dict[str, Any]
    installation: Optional[Dict[str, Any]] = None


class SlackIssueRequest(BaseModel):
    """Request to create GitHub issue from Slack"""
    title: str
    body: str
    labels: List[str] = []
    assignees: List[str] = []
    milestone: Optional[int] = None
    project_id: str
    slack_user_id: str
    slack_channel_id: str
    slack_message_ts: str


class PRAutomationConfig(BaseModel):
    """PR automation configuration"""
    auto_assign: bool = True
    auto_label: bool = True
    require_reviews: int = 2
    protected_branches: List[str] = ["main", "master", "production"]
    draft_on_wip: bool = True
    close_stale_after_days: int = 30


class AgentAssignment(BaseModel):
    """Agent assignment configuration"""
    agent_id: str
    agent_type: str
    capabilities: List[str]
    github_username: Optional[str] = None
    auto_assign_labels: List[str] = []
    max_concurrent_tasks: int = 3


class GitHubIntegrationMCPServer(BaseMCPServer, DatabaseMixin, CacheMixin):
    """
    GitHub Integration MCP Server for Studio
    
    Provides comprehensive GitHub integration with real-time webhooks,
    Slack integration, and automated workflows.
    """
    
    def __init__(self):
        super().__init__("github-integration", "1.0.0")
        DatabaseMixin.__init__(self)
        CacheMixin.__init__(self)
        
        # Configuration
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.github_app_id = os.getenv("GITHUB_APP_ID")
        self.github_app_key = os.getenv("GITHUB_APP_PRIVATE_KEY")
        self.webhook_secret = os.getenv("GITHUB_WEBHOOK_SECRET")
        self.studio_api_url = os.getenv("STUDIO_API_URL", "http://localhost:3000")
        self.studio_api_key = os.getenv("STUDIO_API_KEY")
        
        # GitHub client
        self.github_client = None
        
        # Webhook event handlers
        self.webhook_handlers = {}
        
        # PR automation configs by repository
        self.pr_configs = {}
        
        # Agent assignments
        self.agent_assignments = {}
        
        # Studio API client
        self.studio_client = httpx.AsyncClient(
            base_url=self.studio_api_url,
            headers={"Authorization": f"Bearer {self.studio_api_key}"}
        )
        
        self._register_resources()
        self._register_tools()
        self._register_prompts()
        self._setup_webhook_routes()
    
    def _register_resources(self):
        """Register available resources"""
        
        self.register_resource(MCPResource(
            uri="repositories",
            name="GitHub Repositories",
            description="List of connected GitHub repositories",
            mimeType="application/json"
        ))
        
        self.register_resource(MCPResource(
            uri="webhooks",
            name="Webhook Configurations",
            description="Active webhook configurations and event subscriptions",
            mimeType="application/json"
        ))
        
        self.register_resource(MCPResource(
            uri="pr-automation",
            name="PR Automation Rules",
            description="Pull request automation configurations",
            mimeType="application/json"
        ))
        
        self.register_resource(MCPResource(
            uri="agent-mappings",
            name="Agent GitHub Mappings",
            description="Mappings between Studio agents and GitHub users",
            mimeType="application/json"
        ))
        
        self.register_resource(MCPResource(
            uri="issue-templates",
            name="Issue Templates",
            description="Templates for creating GitHub issues",
            mimeType="application/json"
        ))
    
    def _register_tools(self):
        """Register available tools"""
        
        # Repository management
        self.register_tool(MCPTool(
            name="connect_repository",
            description="Connect a GitHub repository to a Studio project",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Studio project ID"
                    },
                    "repo_owner": {
                        "type": "string",
                        "description": "GitHub repository owner (user or organization)"
                    },
                    "repo_name": {
                        "type": "string",
                        "description": "GitHub repository name"
                    },
                    "setup_webhooks": {
                        "type": "boolean",
                        "description": "Automatically setup webhooks",
                        "default": True
                    }
                },
                "required": ["project_id", "repo_owner", "repo_name"]
            }
        ))
        
        # Issue management
        self.register_tool(MCPTool(
            name="create_issue_from_slack",
            description="Create a GitHub issue from a Slack message",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Issue title"
                    },
                    "body": {
                        "type": "string",
                        "description": "Issue description"
                    },
                    "labels": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Labels to apply"
                    },
                    "assignees": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "GitHub usernames to assign"
                    },
                    "project_id": {
                        "type": "string",
                        "description": "Studio project ID"
                    },
                    "slack_context": {
                        "type": "object",
                        "description": "Slack message context"
                    }
                },
                "required": ["title", "body", "project_id", "slack_context"]
            }
        ))
        
        # PR automation
        self.register_tool(MCPTool(
            name="create_automated_pr",
            description="Create an automated pull request with agent assignments",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Studio project ID"
                    },
                    "title": {
                        "type": "string",
                        "description": "PR title"
                    },
                    "body": {
                        "type": "string",
                        "description": "PR description"
                    },
                    "base_branch": {
                        "type": "string",
                        "description": "Base branch",
                        "default": "main"
                    },
                    "head_branch": {
                        "type": "string",
                        "description": "Head branch"
                    },
                    "task_id": {
                        "type": "string",
                        "description": "Associated Studio task ID"
                    },
                    "agent_id": {
                        "type": "string",
                        "description": "Agent creating the PR"
                    },
                    "draft": {
                        "type": "boolean",
                        "description": "Create as draft PR",
                        "default": False
                    }
                },
                "required": ["project_id", "title", "head_branch"]
            }
        ))
        
        self.register_tool(MCPTool(
            name="manage_pr_reviewers",
            description="Manage PR reviewers and assignments",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Studio project ID"
                    },
                    "pr_number": {
                        "type": "integer",
                        "description": "Pull request number"
                    },
                    "action": {
                        "type": "string",
                        "enum": ["add", "remove", "request_review"],
                        "description": "Action to perform"
                    },
                    "reviewers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "GitHub usernames"
                    },
                    "team_reviewers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "GitHub team slugs"
                    }
                },
                "required": ["project_id", "pr_number", "action"]
            }
        ))
        
        # Agent assignment
        self.register_tool(MCPTool(
            name="assign_agent_to_issue",
            description="Assign a Studio agent to a GitHub issue",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Studio project ID"
                    },
                    "issue_number": {
                        "type": "integer",
                        "description": "GitHub issue number"
                    },
                    "agent_id": {
                        "type": "string",
                        "description": "Studio agent ID"
                    },
                    "create_task": {
                        "type": "boolean",
                        "description": "Create a Studio task for this issue",
                        "default": True
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "urgent"],
                        "description": "Task priority"
                    }
                },
                "required": ["project_id", "issue_number", "agent_id"]
            }
        ))
        
        self.register_tool(MCPTool(
            name="configure_pr_automation",
            description="Configure PR automation rules for a repository",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Studio project ID"
                    },
                    "auto_assign": {
                        "type": "boolean",
                        "description": "Enable auto-assignment"
                    },
                    "auto_label": {
                        "type": "boolean",
                        "description": "Enable auto-labeling"
                    },
                    "require_reviews": {
                        "type": "integer",
                        "description": "Required number of reviews"
                    },
                    "protected_branches": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Protected branch patterns"
                    },
                    "draft_on_wip": {
                        "type": "boolean",
                        "description": "Convert to draft if WIP in title"
                    }
                },
                "required": ["project_id"]
            }
        ))
        
        # Webhook management
        self.register_tool(MCPTool(
            name="setup_webhooks",
            description="Setup GitHub webhooks for a repository",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Studio project ID"
                    },
                    "events": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "GitHub events to subscribe to",
                        "default": ["push", "pull_request", "issues", "issue_comment"]
                    },
                    "active": {
                        "type": "boolean",
                        "description": "Whether webhook is active",
                        "default": True
                    }
                },
                "required": ["project_id"]
            }
        ))
        
        # Analytics and reporting
        self.register_tool(MCPTool(
            name="analyze_pr_metrics",
            description="Analyze PR metrics and generate insights",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "Studio project ID"
                    },
                    "timeframe_days": {
                        "type": "integer",
                        "description": "Number of days to analyze",
                        "default": 30
                    },
                    "metrics": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Metrics to include",
                        "default": ["merge_time", "review_time", "comments", "changes"]
                    }
                },
                "required": ["project_id"]
            }
        ))
    
    def _register_prompts(self):
        """Register available prompts"""
        
        self.register_prompt(MCPPrompt(
            name = "pr-description",
            description="Generate a comprehensive PR description",
            arguments=[
                {"name": "changes", "description": "Summary of changes"},
                {"name": "task_context", "description": "Related task information"}
            ]
        ))
        
        self.register_prompt(MCPPrompt(
            name="issue-triage",
            description="Triage and categorize a GitHub issue",
            arguments=[
                {"name": "issue_body", "description": "Issue description"},
                {"name": "repository_context", "description": "Repository information"}
            ]
        ))
        
        self.register_prompt(MCPPrompt(
            name="code-review",
            description="Generate code review comments",
            arguments=[
                {"name": "diff", "description": "Code diff to review"},
                {"name": "pr_context", "description": "PR context and description"}
            ]
        ))
    
    def _setup_webhook_routes(self):
        """Setup webhook endpoint routes"""
        
        @self.app.post("/webhooks/github")
        async def github_webhook(request: Request, background_tasks: BackgroundTasks):
            """Handle incoming GitHub webhooks"""
            
            # Verify webhook signature
            signature = request.headers.get("X-Hub-Signature-256")
            if not await self._verify_webhook_signature(request, signature):
                raise HTTPException(status_code=401, detail="Invalid signature")
            
            # Get event type
            event_type = request.headers.get("X-GitHub-Event")
            delivery_id = request.headers.get("X-GitHub-Delivery")
            
            # Parse payload
            payload = await request.json()
            
            self.logger.info(f"Received webhook: {event_type} (delivery: {delivery_id})")
            
            # Process webhook in background
            background_tasks.add_task(
                self._process_webhook,
                event_type,
                payload,
                delivery_id
            )
            
            return {"status": "accepted", "delivery_id": delivery_id}
    
    async def _verify_webhook_signature(self, request: Request, signature: str) -> bool:
        """Verify GitHub webhook signature"""
        if not self.webhook_secret or not signature:
            return False
        
        body = await request.body()
        expected = hmac.new(
            self.webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(
            f"sha256={expected}",
            signature
        )
    
    async def initialize(self):
        """Initialize the GitHub integration server"""
        await self.init_database()
        await self.init_cache()
        
        # Initialize GitHub client
        if self.github_token:
            self.github_client = Github(self.github_token)
        elif self.github_app_id and self.github_app_key:
            # Initialize as GitHub App
            # This would require additional app authentication logic
            pass
        
        # Register webhook handlers
        self._register_webhook_handlers()
        
        # Load configurations
        await self._load_configurations()
        
        self.logger.info("GitHub Integration MCP Server initialized")
    
    def _register_webhook_handlers(self):
        """Register webhook event handlers"""
        self.webhook_handlers = {
            WebhookEvent.PUSH: self._handle_push_event,
            WebhookEvent.PULL_REQUEST: self._handle_pr_event,
            WebhookEvent.ISSUES: self._handle_issue_event,
            WebhookEvent.ISSUE_COMMENT: self._handle_comment_event,
            WebhookEvent.PULL_REQUEST_REVIEW: self._handle_review_event,
            WebhookEvent.WORKFLOW_RUN: self._handle_workflow_event,
        }
    
    async def _load_configurations(self):
        """Load PR automation configurations and agent mappings"""
        # In a real implementation, this would load from database
        self.pr_configs = {}
        self.agent_assignments = {}
    
    async def _process_webhook(self, event_type: str, payload: Dict[str, Any], delivery_id: str):
        """Process webhook event"""
        try:
            # Store webhook event
            await self._store_webhook_event(event_type, payload, delivery_id)
            
            # Get handler for event type
            handler = self.webhook_handlers.get(event_type)
            if handler:
                await handler(payload)
            else:
                self.logger.warning(f"No handler for webhook event: {event_type}")
            
            # Notify Studio backend
            await self._notify_studio_backend(event_type, payload)
            
        except Exception as e:
            self.logger.error(f"Error processing webhook {delivery_id}: {e}")
            await self._store_webhook_error(delivery_id, str(e))
    
    async def _store_webhook_event(self, event_type: str, payload: Dict[str, Any], delivery_id: str):
        """Store webhook event in database"""
        # Store in Redis for quick access
        if self.redis_client:
            key = f"webhook:{delivery_id}"
            await self.redis_client.setex(
                key,
                3600,  # 1 hour TTL
                json.dumps({
                    "event_type": event_type,
                    "payload": payload,
                    "timestamp": datetime.utcnow().isoformat(),
                    "delivery_id": delivery_id
                })
            )
    
    async def _notify_studio_backend(self, event_type: str, payload: Dict[str, Any]):
        """Notify Studio backend about GitHub event"""
        try:
            repository = payload.get("repository", {})
            
            # Find associated project
            project_id = await self._get_project_id_for_repo(
                repository.get("owner", {}).get("login"),
                repository.get("name")
            )
            
            if project_id:
                # Send event to Studio backend
                await self.studio_client.post(
                    f"/api/projects/{project_id}/github-events",
                    json={
                        "event_type": event_type,
                        "payload": payload,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
        except Exception as e:
            self.logger.error(f"Error notifying Studio backend: {e}")
    
    async def _handle_push_event(self, payload: Dict[str, Any]):
        """Handle push events"""
        repository = payload["repository"]
        pusher = payload["pusher"]
        commits = payload.get("commits", [])
        
        self.logger.info(f"Push event: {len(commits)} commits to {repository['full_name']}")
        
        # Check for automated actions based on commit messages
        for commit in commits:
            message = commit["message"]
            
            # Check for issue references
            issue_refs = self._extract_issue_references(message)
            if issue_refs:
                await self._update_referenced_issues(repository, issue_refs, commit)
            
            # Check for task completion markers
            if any(marker in message.lower() for marker in ["fixes #", "closes #", "resolves #"]):
                await self._handle_issue_closure(repository, message)
    
    async def _handle_pr_event(self, payload: Dict[str, Any]):
        """Handle pull request events"""
        action = payload["action"]
        pr = payload["pull_request"]
        repository = payload["repository"]
        
        self.logger.info(f"PR event: {action} on PR #{pr['number']} in {repository['full_name']}")
        
        # Get PR automation config
        config = await self._get_pr_config(repository)
        
        if action == PRAction.OPENED:
            await self._handle_pr_opened(repository, pr, config)
        elif action == PRAction.READY_FOR_REVIEW:
            await self._handle_pr_ready(repository, pr, config)
        elif action == PRAction.CLOSED and pr.get("merged"):
            await self._handle_pr_merged(repository, pr)
    
    async def _handle_pr_opened(self, repository: Dict, pr: Dict, config: PRAutomationConfig):
        """Handle newly opened PR"""
        
        # Auto-convert to draft if WIP
        if config.draft_on_wip and self._is_wip_pr(pr["title"]):
            await self._convert_pr_to_draft(repository, pr["number"])
        
        # Auto-assign reviewers
        if config.auto_assign:
            await self._auto_assign_reviewers(repository, pr)
        
        # Auto-label
        if config.auto_label:
            await self._auto_label_pr(repository, pr)
        
        # Create Studio task if needed
        await self._create_task_for_pr(repository, pr)
        
        # Assign agent if specified
        if pr["body"] and "agent:" in pr["body"].lower():
            agent_info = self._extract_agent_assignment(pr["body"])
            if agent_info:
                await self._assign_agent_to_pr(repository, pr, agent_info)
    
    async def _handle_issue_event(self, payload: Dict[str, Any]):
        """Handle issue events"""
        action = payload["action"]
        issue = payload["issue"]
        repository = payload["repository"]
        
        self.logger.info(f"Issue event: {action} on issue #{issue['number']} in {repository['full_name']}")
        
        if action == IssueAction.OPENED:
            await self._handle_issue_opened(repository, issue)
        elif action == IssueAction.LABELED:
            await self._handle_issue_labeled(repository, issue, payload["label"])
    
    async def _handle_issue_opened(self, repository: Dict, issue: Dict):
        """Handle newly opened issue"""
        
        # Analyze issue for automatic triage
        triage_result = await self._triage_issue(issue)
        
        # Apply labels based on triage
        if triage_result.get("labels"):
            await self._apply_labels_to_issue(repository, issue["number"], triage_result["labels"])
        
        # Create Studio task
        await self._create_task_for_issue(repository, issue, triage_result.get("priority"))
        
        # Check for agent assignment request
        if triage_result.get("suggested_agent"):
            await self._suggest_agent_for_issue(repository, issue, triage_result["suggested_agent"])
    
    async def get_resource_content(self, uri: str) -> Dict[str, Any]:
        """Get the content of a resource"""
        
        if uri == "repositories":
            repos = await self._get_connected_repositories()
            return {
                "contents": [{
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": json.dumps(repos, indent=2)
                }]
            }
        
        elif uri == "webhooks":
            webhooks = await self._get_webhook_configurations()
            return {
                "contents": [{
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": json.dumps(webhooks, indent=2)
                }]
            }
        
        elif uri == "pr-automation":
            configs = {
                repo_id: config.dict() for repo_id, config in self.pr_configs.items()
            }
            return {
                "contents": [{
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": json.dumps(configs, indent=2)
                }]
            }
        
        elif uri == "agent-mappings":
            return {
                "contents": [{
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": json.dumps(self.agent_assignments, indent=2)
                }]
            }
        
        return {"error": "Resource not found"}
    
    async def call_tool_impl(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Implementation for tool calls"""
        
        tool_handlers = {
            "connect_repository": self._connect_repository,
            "create_issue_from_slack": self._create_issue_from_slack,
            "create_automated_pr": self._create_automated_pr,
            "manage_pr_reviewers": self._manage_pr_reviewers,
            "assign_agent_to_issue": self._assign_agent_to_issue,
            "configure_pr_automation": self._configure_pr_automation,
            "setup_webhooks": self._setup_webhooks,
            "analyze_pr_metrics": self._analyze_pr_metrics,
        }
        
        handler = tool_handlers.get(tool_name)
        if handler:
            return await handler(arguments)
        
        return {"error": f"Tool {tool_name} not implemented"}
    
    async def get_prompt_impl(self, prompt_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Implementation for prompt requests"""
        
        if prompt_name == "pr-description":
            return await self._generate_pr_description_prompt(arguments)
        elif prompt_name == "issue-triage":
            return await self._generate_issue_triage_prompt(arguments)
        elif prompt_name == "code-review":
            return await self._generate_code_review_prompt(arguments)
        
        return {"error": "Prompt not implemented"}
    
    # Tool implementations
    
    async def _connect_repository(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Connect a GitHub repository to a Studio project"""
        try:
            project_id = arguments["project_id"]
            repo_owner = arguments["repo_owner"]
            repo_name = arguments["repo_name"]
            setup_webhooks = arguments.get("setup_webhooks", True)
            
            # Get repository information
            repo = self.github_client.get_repo(f"{repo_owner}/{repo_name}")
            
            # Update project with GitHub info
            response = await self.studio_client.patch(
                f"/api/projects/{project_id}",
                json={
                    "githubRepoId": str(repo.id),
                    "githubRepoName": repo.name,
                    "githubOwner": repo.owner.login,
                }
            )
            
            if response.status_code != 200:
                return {"success": False, "error": "Failed to update project"}
            
            # Setup webhooks if requested
            if setup_webhooks:
                webhook_result = await self._setup_webhooks({
                    "project_id": project_id,
                    "events": ["push", "pull_request", "issues", "issue_comment"],
                    "active": True
                })
                
                if not webhook_result.get("success"):
                    self.logger.warning("Failed to setup webhooks")
            
            # Store repository configuration
            await self._store_repo_config(project_id, repo)
            
            return {
                "success": True,
                "repository": {
                    "id": repo.id,
                    "full_name": repo.full_name,
                    "html_url": repo.html_url,
                    "default_branch": repo.default_branch,
                    "private": repo.private
                },
                "message": f"Successfully connected {repo.full_name} to project"
            }
            
        except GithubException as e:
            self.logger.error(f"GitHub error: {e}")
            return {"success": False, "error": f"GitHub error: {e.data.get('message', str(e))}"}
        except Exception as e:
            self.logger.error(f"Error connecting repository: {e}")
            return {"success": False, "error": str(e)}
    
    async def _create_issue_from_slack(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Create a GitHub issue from Slack message"""
        try:
            project_id = arguments["project_id"]
            title = arguments["title"]
            body = arguments["body"]
            labels = arguments.get("labels", [])
            assignees = arguments.get("assignees", [])
            slack_context = arguments["slack_context"]
            
            # Get project repository info
            project = await self._get_project_info(project_id)
            if not project.get("githubRepoId"):
                return {"success": False, "error": "Project not connected to GitHub"}
            
            # Get repository
            repo = self.github_client.get_repo_by_id(int(project["githubRepoId"]))
            
            # Enhance body with Slack context
            enhanced_body = self._enhance_issue_body_with_slack_context(body, slack_context)
            
            # Create issue
            issue = repo.create_issue(
                title=title,
                body=enhanced_body,
                labels=labels,
                assignees=assignees
            )
            
            # Create corresponding Studio task
            task_response = await self.studio_client.post(
                "/api/tasks",
                json={
                    "title": title,
                    "description": enhanced_body,
                    "projectId": project_id,
                    "type": "FEATURE",
                    "status": "PENDING",
                    "githubIssueId": issue.id,
                    "githubIssueNumber": issue.number,
                    "metadata": {
                        "source": "slack",
                        "slack_user_id": slack_context["slack_user_id"],
                        "slack_channel_id": slack_context["slack_channel_id"],
                        "slack_message_ts": slack_context["slack_message_ts"]
                    }
                }
            )
            
            # Send confirmation to Slack
            await self._send_slack_confirmation(slack_context, issue)
            
            return {
                "success": True,
                "issue": {
                    "number": issue.number,
                    "title": issue.title,
                    "html_url": issue.html_url,
                    "state": issue.state
                },
                "task_id": task_response.json().get("id") if task_response.status_code == 201 else None,
                "message": f"Created issue #{issue.number}: {issue.title}"
            }
            
        except Exception as e:
            self.logger.error(f"Error creating issue from Slack: {e}")
            return {"success": False, "error": str(e)}
    
    async def _create_automated_pr(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Create an automated pull request"""
        try:
            project_id = arguments["project_id"]
            title = arguments["title"]
            body = arguments.get("body", "")
            base_branch = arguments.get("base_branch", "main")
            head_branch = arguments["head_branch"]
            task_id = arguments.get("task_id")
            agent_id = arguments.get("agent_id")
            draft = arguments.get("draft", False)
            
            # Get project repository info
            project = await self._get_project_info(project_id)
            if not project.get("githubRepoId"):
                return {"success": False, "error": "Project not connected to GitHub"}
            
            # Get repository
            repo = self.github_client.get_repo_by_id(int(project["githubRepoId"]))
            
            # Enhance PR body with context
            if task_id:
                task_info = await self._get_task_info(task_id)
                body = self._enhance_pr_body_with_task(body, task_info)
            
            if agent_id:
                agent_info = await self._get_agent_info(agent_id)
                body = self._add_agent_attribution(body, agent_info)
            
            # Create pull request
            pr = repo.create_pull(
                title=title,
                body=body,
                base=base_branch,
                head=head_branch,
                draft=draft
            )
            
            # Apply automation rules
            config = await self._get_pr_config({"id": str(repo.id)})
            if config.auto_label:
                await self._auto_label_pr({"id": str(repo.id)}, pr.raw_data)
            
            # Update task if provided
            if task_id:
                await self.studio_client.patch(
                    f"/api/tasks/{task_id}",
                    json={
                        "githubPrId": pr.id,
                        "githubPrNumber": pr.number,
                        "status": "IN_PROGRESS"
                    }
                )
            
            return {
                "success": True,
                "pr": {
                    "number": pr.number,
                    "title": pr.title,
                    "html_url": pr.html_url,
                    "state": pr.state,
                    "draft": pr.draft
                },
                "message": f"Created PR #{pr.number}: {pr.title}"
            }
            
        except Exception as e:
            self.logger.error(f"Error creating automated PR: {e}")
            return {"success": False, "error": str(e)}
    
    async def _assign_agent_to_issue(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Assign a Studio agent to a GitHub issue"""
        try:
            project_id = arguments["project_id"]
            issue_number = arguments["issue_number"]
            agent_id = arguments["agent_id"]
            create_task = arguments.get("create_task", True)
            priority = arguments.get("priority", "medium")
            
            # Get project repository info
            project = await self._get_project_info(project_id)
            if not project.get("githubRepoId"):
                return {"success": False, "error": "Project not connected to GitHub"}
            
            # Get repository and issue
            repo = self.github_client.get_repo_by_id(int(project["githubRepoId"]))
            issue = repo.get_issue(issue_number)
            
            # Get agent info
            agent_info = await self._get_agent_info(agent_id)
            
            # Add comment to issue
            comment = self._generate_agent_assignment_comment(agent_info)
            issue.create_comment(comment)
            
            # Apply agent label if configured
            if agent_info.get("github_label"):
                issue.add_to_labels(agent_info["github_label"])
            
            # Create or update Studio task
            if create_task:
                # Check if task already exists for this issue
                existing_task = await self._find_task_for_issue(project_id, issue.id)
                
                if existing_task:
                    # Update existing task
                    await self.studio_client.patch(
                        f"/api/tasks/{existing_task['id']}",
                        json={
                            "agentId": agent_id,
                            "priority": priority.upper(),
                            "status": "IN_PROGRESS"
                        }
                    )
                    task_id = existing_task["id"]
                else:
                    # Create new task
                    task_response = await self.studio_client.post(
                        "/api/tasks",
                        json={
                            "title": issue.title,
                            "description": issue.body or "",
                            "projectId": project_id,
                            "agentId": agent_id,
                            "type": "FEATURE",
                            "status": "IN_PROGRESS",
                            "priority": priority.upper(),
                            "githubIssueId": issue.id,
                            "githubIssueNumber": issue.number
                        }
                    )
                    task_id = task_response.json().get("id") if task_response.status_code == 201 else None
            
            return {
                "success": True,
                "issue": {
                    "number": issue.number,
                    "title": issue.title,
                    "assignee": agent_info.get("name")
                },
                "task_id": task_id if create_task else None,
                "message": f"Assigned agent {agent_info.get('name')} to issue #{issue.number}"
            }
            
        except Exception as e:
            self.logger.error(f"Error assigning agent to issue: {e}")
            return {"success": False, "error": str(e)}
    
    async def _setup_webhooks(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Setup GitHub webhooks for a repository"""
        try:
            project_id = arguments["project_id"]
            events = arguments.get("events", ["push", "pull_request", "issues", "issue_comment"])
            active = arguments.get("active", True)
            
            # Get project repository info
            project = await self._get_project_info(project_id)
            if not project.get("githubRepoId"):
                return {"success": False, "error": "Project not connected to GitHub"}
            
            # Get repository
            repo = self.github_client.get_repo_by_id(int(project["githubRepoId"]))
            
            # Determine webhook URL
            webhook_url = f"{self.studio_api_url.replace('3000', '8002')}/webhooks/github"
            if not webhook_url.startswith("http"):
                webhook_url = f"https://{webhook_url}"
            
            # Check if webhook already exists
            existing_webhook = None
            try:
                hooks = repo.get_hooks()
                for hook in hooks:
                    if hook.config.get("url") == webhook_url:
                        existing_webhook = hook
                        break
            except Exception as e:
                self.logger.warning(f"Could not check existing webhooks: {e}")
            
            # Create or update webhook
            if existing_webhook:
                # Update existing webhook
                existing_webhook.edit(
                    events=events,
                    active=active,
                    config={
                        "url": webhook_url,
                        "content_type": "json",
                        "secret": self.webhook_secret,
                        "insecure_ssl": "0"
                    }
                )
                webhook = existing_webhook
                action = "updated"
            else:
                # Create new webhook
                webhook = repo.create_hook(
                    name="web",
                    config={
                        "url": webhook_url,
                        "content_type": "json",
                        "secret": self.webhook_secret,
                        "insecure_ssl": "0"
                    },
                    events=events,
                    active=active
                )
                action = "created"
            
            # Store webhook configuration
            webhook_config = {
                "project_id": project_id,
                "repo_id": str(repo.id),
                "webhook_id": webhook.id,
                "webhook_url": webhook_url,
                "events": events,
                "active": active,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Store in cache/database
            if self.redis_client:
                await self.redis_client.setex(
                    f"webhook:config:{project_id}",
                    86400 * 7,  # 7 days TTL
                    json.dumps(webhook_config)
                )
            
            return {
                "success": True,
                "action": action,
                "webhook": {
                    "id": webhook.id,
                    "url": webhook_url,
                    "events": events,
                    "active": active
                },
                "message": f"Successfully {action} webhook for {repo.full_name}"
            }
            
        except GithubException as e:
            self.logger.error(f"GitHub error setting up webhook: {e}")
            return {"success": False, "error": f"GitHub error: {e.data.get('message', str(e))}"}
        except Exception as e:
            self.logger.error(f"Error setting up webhook: {e}")
            return {"success": False, "error": str(e)}
    
    async def _configure_pr_automation(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Configure PR automation rules for a repository"""
        try:
            project_id = arguments["project_id"]
            
            # Get project repository info
            project = await self._get_project_info(project_id)
            if not project.get("githubRepoId"):
                return {"success": False, "error": "Project not connected to GitHub"}
            
            # Create configuration
            config = PRAutomationConfig(
                auto_assign=arguments.get("auto_assign", True),
                auto_label=arguments.get("auto_label", True),
                require_reviews=arguments.get("require_reviews", 2),
                protected_branches=arguments.get("protected_branches", ["main", "master", "production"]),
                draft_on_wip=arguments.get("draft_on_wip", True)
            )
            
            # Store configuration
            repo_id = str(project["githubRepoId"])
            self.pr_configs[repo_id] = config
            
            # Persist to database/cache
            if self.redis_client:
                await self.redis_client.setex(
                    f"pr:config:{repo_id}",
                    86400 * 30,  # 30 days TTL
                    json.dumps(config.dict())
                )
            
            return {
                "success": True,
                "config": config.dict(),
                "message": f"PR automation configured for project {project_id}"
            }
            
        except Exception as e:
            self.logger.error(f"Error configuring PR automation: {e}")
            return {"success": False, "error": str(e)}
    
    async def _analyze_pr_metrics(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze PR metrics for a project"""
        try:
            project_id = arguments["project_id"]
            timeframe_days = arguments.get("timeframe_days", 30)
            metrics = arguments.get("metrics", ["merge_time", "review_time", "comments", "changes"])
            
            # Get project repository info
            project = await self._get_project_info(project_id)
            if not project.get("githubRepoId"):
                return {"success": False, "error": "Project not connected to GitHub"}
            
            # Get repository
            repo = self.github_client.get_repo_by_id(int(project["githubRepoId"]))
            
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=timeframe_days)
            
            # Get PRs in timeframe
            prs = repo.get_pulls(state="all", sort="created", direction="desc")
            
            # Analyze metrics
            pr_metrics = {
                "total_prs": 0,
                "merged_prs": 0,
                "open_prs": 0,
                "closed_without_merge": 0,
                "avg_merge_time_hours": 0,
                "avg_review_time_hours": 0,
                "avg_comments": 0,
                "avg_changes": 0,
                "top_contributors": {},
                "label_distribution": {},
                "daily_activity": {}
            }
            
            merge_times = []
            review_times = []
            comment_counts = []
            change_counts = []
            
            for pr in prs:
                if pr.created_at < start_date:
                    break
                
                pr_metrics["total_prs"] += 1
                
                if pr.merged:
                    pr_metrics["merged_prs"] += 1
                    if pr.merged_at and pr.created_at:
                        merge_time = (pr.merged_at - pr.created_at).total_seconds() / 3600
                        merge_times.append(merge_time)
                elif pr.state == "open":
                    pr_metrics["open_prs"] += 1
                else:
                    pr_metrics["closed_without_merge"] += 1
                
                # Contributor metrics
                contributor = pr.user.login
                pr_metrics["top_contributors"][contributor] = pr_metrics["top_contributors"].get(contributor, 0) + 1
                
                # Comments and reviews
                if "comments" in metrics:
                    comments = pr.get_comments().totalCount
                    reviews = pr.get_reviews().totalCount
                    total_comments = comments + reviews
                    comment_counts.append(total_comments)
                
                # Changes
                if "changes" in metrics and pr.merged:
                    change_counts.append(pr.additions + pr.deletions)
                
                # Labels
                for label in pr.labels:
                    pr_metrics["label_distribution"][label.name] = pr_metrics["label_distribution"].get(label.name, 0) + 1
            
            # Calculate averages
            if merge_times:
                pr_metrics["avg_merge_time_hours"] = sum(merge_times) / len(merge_times)
            
            if comment_counts:
                pr_metrics["avg_comments"] = sum(comment_counts) / len(comment_counts)
            
            if change_counts:
                pr_metrics["avg_changes"] = sum(change_counts) / len(change_counts)
            
            # Sort top contributors
            pr_metrics["top_contributors"] = dict(
                sorted(pr_metrics["top_contributors"].items(), key=lambda x: x[1], reverse=True)[:10]
            )
            
            # Generate insights
            insights = self._generate_pr_insights(pr_metrics)
            
            return {
                "success": True,
                "metrics": pr_metrics,
                "insights": insights,
                "timeframe": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": timeframe_days
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing PR metrics: {e}")
            return {"success": False, "error": str(e)}
    
    # Helper methods
    
    def _extract_issue_references(self, message: str) -> List[int]:
        """Extract issue references from commit message"""
        import re
        pattern = r'#(\d+)'
        return [int(match) for match in re.findall(pattern, message)]
    
    def _is_wip_pr(self, title: str) -> bool:
        """Check if PR is work in progress"""
        wip_markers = ["wip", "work in progress", "draft", "[wip]", "[draft]"]
        return any(marker in title.lower() for marker in wip_markers)
    
    def _extract_agent_assignment(self, body: str) -> Optional[Dict[str, str]]:
        """Extract agent assignment from PR/issue body"""
        import re
        pattern = r'agent:\s*@?(\w+)'
        match = re.search(pattern, body.lower())
        if match:
            return {"agent_name": match.group(1)}
        return None
    
    async def _get_project_id_for_repo(self, owner: str, name: str) -> Optional[str]:
        """Get Studio project ID for a GitHub repository"""
        # This would query the database to find the project
        # For now, return None
        return None
    
    async def _get_pr_config(self, repository: Dict) -> PRAutomationConfig:
        """Get PR automation configuration for repository"""
        repo_id = str(repository.get("id"))
        if repo_id in self.pr_configs:
            return self.pr_configs[repo_id]
        return PRAutomationConfig()
    
    def _enhance_issue_body_with_slack_context(self, body: str, slack_context: Dict) -> str:
        """Enhance issue body with Slack context"""
        slack_info = f"""

---
**Created from Slack**
- User: <@{slack_context.get('slack_user_id')}>
- Channel: <#{slack_context.get('slack_channel_id')}>
- Message: {slack_context.get('slack_message_ts')}
"""
        return body + slack_info
    
    def _generate_agent_assignment_comment(self, agent_info: Dict) -> str:
        """Generate comment for agent assignment"""
        return f"""
🤖 **Agent Assigned**: {agent_info.get('name')}

This issue has been assigned to the Studio AI agent **{agent_info.get('name')}** (ID: `{agent_info.get('id')}`).

**Agent Capabilities**:
{chr(10).join(f"- {cap}" for cap in agent_info.get('capabilities', []))}

The agent will begin working on this issue shortly. You can track progress in the Studio dashboard.
"""
    
    def _generate_pr_insights(self, metrics: Dict) -> List[str]:
        """Generate insights from PR metrics"""
        insights = []
        
        # Merge rate
        if metrics["total_prs"] > 0:
            merge_rate = (metrics["merged_prs"] / metrics["total_prs"]) * 100
            insights.append(f"Merge rate: {merge_rate:.1f}% ({metrics['merged_prs']}/{metrics['total_prs']} PRs)")
        
        # Merge time
        if metrics["avg_merge_time_hours"] > 0:
            if metrics["avg_merge_time_hours"] < 24:
                insights.append(f"Average merge time: {metrics['avg_merge_time_hours']:.1f} hours")
            else:
                days = metrics["avg_merge_time_hours"] / 24
                insights.append(f"Average merge time: {days:.1f} days")
        
        # Review engagement
        if metrics["avg_comments"] > 0:
            insights.append(f"Average comments per PR: {metrics['avg_comments']:.1f}")
        
        # Top contributor
        if metrics["top_contributors"]:
            top_contributor = list(metrics["top_contributors"].keys())[0]
            contributions = metrics["top_contributors"][top_contributor]
            insights.append(f"Top contributor: {top_contributor} ({contributions} PRs)")
        
        # Open PR warning
        if metrics["open_prs"] > 10:
            insights.append(f"⚠️ High number of open PRs: {metrics['open_prs']}")
        
        return insights
    
    async def _get_project_info(self, project_id: str) -> Dict[str, Any]:
        """Get project information from Studio API"""
        response = await self.studio_client.get(f"/api/projects/{project_id}")
        if response.status_code == 200:
            return response.json()
        return {}
    
    async def _get_task_info(self, task_id: str) -> Dict[str, Any]:
        """Get task information from Studio API"""
        response = await self.studio_client.get(f"/api/tasks/{task_id}")
        if response.status_code == 200:
            return response.json()
        return {}
    
    async def _get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """Get agent information from Studio API"""
        response = await self.studio_client.get(f"/api/agents/{agent_id}")
        if response.status_code == 200:
            return response.json()
        return {}
    
    def _enhance_pr_body_with_task(self, body: str, task_info: Dict) -> str:
        """Enhance PR body with task information"""
        task_section = f"""

## Related Task
- **Task**: [{task_info.get('title')}](https://studio.example.com/tasks/{task_info.get('id')})
- **Type**: {task_info.get('type')}
- **Priority**: {task_info.get('priority')}
- **Status**: {task_info.get('status')}
"""
        return body + task_section
    
    def _add_agent_attribution(self, body: str, agent_info: Dict) -> str:
        """Add agent attribution to PR body"""
        attribution = f"""

---
*This PR was created by Studio AI Agent: **{agent_info.get('name')}** (v{agent_info.get('version', '1.0')})*
"""
        return body + attribution
    
    async def _find_task_for_issue(self, project_id: str, issue_id: int) -> Optional[Dict[str, Any]]:
        """Find existing Studio task for a GitHub issue"""
        try:
            response = await self.studio_client.get(
                f"/api/tasks",
                params={
                    "projectId": project_id,
                    "githubIssueId": issue_id
                }
            )
            if response.status_code == 200:
                tasks = response.json()
                return tasks[0] if tasks else None
        except Exception as e:
            self.logger.error(f"Error finding task for issue: {e}")
        return None
    
    async def _get_connected_repositories(self) -> List[Dict[str, Any]]:
        """Get list of connected repositories"""
        try:
            response = await self.studio_client.get("/api/projects")
            if response.status_code == 200:
                projects = response.json()
                repos = []
                for project in projects:
                    if project.get("githubRepoId"):
                        repos.append({
                            "project_id": project["id"],
                            "repo_id": project["githubRepoId"],
                            "repo_name": project.get("githubRepoName"),
                            "owner": project.get("githubOwner"),
                            "connected_at": project.get("createdAt")
                        })
                return repos
        except Exception as e:
            self.logger.error(f"Error getting connected repositories: {e}")
        return []
    
    async def _get_webhook_configurations(self) -> List[Dict[str, Any]]:
        """Get webhook configurations"""
        webhooks = []
        if self.redis_client:
            try:
                # Get all webhook config keys
                keys = await self.redis_client.keys("webhook:config:*")
                for key in keys:
                    config_json = await self.redis_client.get(key)
                    if config_json:
                        config = json.loads(config_json)
                        webhooks.append(config)
            except Exception as e:
                self.logger.error(f"Error getting webhook configurations: {e}")
        return webhooks
    
    async def _store_repo_config(self, project_id: str, repo: Repository):
        """Store repository configuration"""
        config = {
            "project_id": project_id,
            "repo_id": str(repo.id),
            "repo_name": repo.name,
            "full_name": repo.full_name,
            "owner": repo.owner.login,
            "default_branch": repo.default_branch,
            "private": repo.private,
            "connected_at": datetime.utcnow().isoformat()
        }
        
        if self.redis_client:
            await self.redis_client.setex(
                f"repo:config:{project_id}",
                86400 * 30,  # 30 days TTL
                json.dumps(config)
            )
    
    async def _send_slack_confirmation(self, slack_context: Dict, issue: Issue):
        """Send confirmation to Slack about created issue"""
        # This would integrate with Slack API
        # For now, just log the confirmation
        self.logger.info(f"Issue created: {issue.html_url} for Slack user {slack_context.get('slack_user_id')}")
    
    async def _triage_issue(self, issue: Dict) -> Dict[str, Any]:
        """Analyze and triage a GitHub issue"""
        # This would use AI/ML to analyze the issue
        # For now, return basic triage
        labels = []
        priority = "medium"
        
        title = issue.get("title", "").lower()
        body = issue.get("body", "").lower()
        
        # Simple keyword-based triage
        if any(word in title or word in body for word in ["bug", "error", "crash", "fail"]):
            labels.append("bug")
            priority = "high"
        elif any(word in title or word in body for word in ["feature", "enhancement", "improve"]):
            labels.append("enhancement")
        elif any(word in title or word in body for word in ["question", "help", "how"]):
            labels.append("question")
            priority = "low"
        
        return {
            "labels": labels,
            "priority": priority,
            "suggested_agent": None  # Could suggest based on keywords/context
        }
    
    async def _apply_labels_to_issue(self, repository: Dict, issue_number: int, labels: List[str]):
        """Apply labels to a GitHub issue"""
        try:
            repo = self.github_client.get_repo_by_id(int(repository["id"]))
            issue = repo.get_issue(issue_number)
            issue.add_to_labels(*labels)
        except Exception as e:
            self.logger.error(f"Error applying labels to issue: {e}")
    
    async def _create_task_for_issue(self, repository: Dict, issue: Dict, priority: str = "medium"):
        """Create a Studio task for a GitHub issue"""
        try:
            # Find project for this repository
            project_id = await self._get_project_id_for_repo(
                repository.get("owner", {}).get("login"),
                repository.get("name")
            )
            
            if project_id:
                await self.studio_client.post(
                    "/api/tasks",
                    json={
                        "title": issue["title"],
                        "description": issue.get("body", ""),
                        "projectId": project_id,
                        "type": "FEATURE",
                        "status": "PENDING",
                        "priority": priority.upper(),
                        "githubIssueId": issue["id"],
                        "githubIssueNumber": issue["number"]
                    }
                )
        except Exception as e:
            self.logger.error(f"Error creating task for issue: {e}")
    
    async def _create_task_for_pr(self, repository: Dict, pr: Dict):
        """Create a Studio task for a GitHub PR"""
        try:
            # Find project for this repository
            project_id = await self._get_project_id_for_repo(
                repository.get("owner", {}).get("login"),
                repository.get("name")
            )
            
            if project_id:
                await self.studio_client.post(
                    "/api/tasks",
                    json={
                        "title": f"Review PR: {pr['title']}",
                        "description": pr.get("body", ""),
                        "projectId": project_id,
                        "type": "REVIEW",
                        "status": "IN_PROGRESS",
                        "priority": "MEDIUM",
                        "githubPrId": pr["id"],
                        "githubPrNumber": pr["number"]
                    }
                )
        except Exception as e:
            self.logger.error(f"Error creating task for PR: {e}")
    
    async def _generate_pr_description_prompt(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Generate PR description prompt"""
        changes = arguments.get("changes", "")
        task_context = arguments.get("task_context", {})
        
        prompt = f"""Generate a comprehensive pull request description based on the following information:

**Changes Made**:
{changes}

**Task Context**:
- Title: {task_context.get('title', 'N/A')}
- Description: {task_context.get('description', 'N/A')}
- Type: {task_context.get('type', 'N/A')}
- Acceptance Criteria: {json.dumps(task_context.get('acceptanceCriteria', []), indent=2)}

Please create a well-structured PR description that includes:
1. A clear summary of what changed and why
2. Technical details of the implementation
3. Testing performed
4. Any breaking changes or migration notes
5. Screenshots or examples if applicable
6. Related issues or tasks

Format the description using GitHub-flavored markdown."""
        
        return {
            "messages": [{
                "role": "user",
                "content": {
                    "type": "text",
                    "text": prompt
                }
            }]
        }
    
    async def _generate_issue_triage_prompt(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Generate issue triage prompt"""
        issue_body = arguments.get("issue_body", "")
        repository_context = arguments.get("repository_context", {})
        
        prompt = f"""Analyze and triage this GitHub issue:

**Issue Content**:
{issue_body}

**Repository Context**:
- Name: {repository_context.get('name', 'N/A')}
- Description: {repository_context.get('description', 'N/A')}
- Topics: {', '.join(repository_context.get('topics', []))}

Please provide:
1. Issue category (bug, feature, question, documentation, etc.)
2. Priority level (low, medium, high, urgent)
3. Suggested labels
4. Estimated complexity
5. Recommended next steps"""
        
        return {
            "messages": [{
                "role": "user",
                "content": {
                    "type": "text",
                    "text": prompt
                }
            }]
        }
    
    async def _generate_code_review_prompt(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Generate code review prompt"""
        diff = arguments.get("diff", "")
        pr_context = arguments.get("pr_context", {})
        
        prompt = f"""Review this code diff and provide feedback:

**Pull Request Context**:
- Title: {pr_context.get('title', 'N/A')}
- Description: {pr_context.get('body', 'N/A')}

**Code Diff**:
```diff
{diff}
```

Please provide:
1. Overall assessment
2. Code quality feedback
3. Potential issues or bugs
4. Performance considerations
5. Security concerns
6. Suggestions for improvement
7. Specific line-by-line comments if needed"""
        
        return {
            "messages": [{
                "role": "user",
                "content": {
                    "type": "text",
                    "text": prompt
                }
            }]
        }
    
    async def _store_webhook_error(self, delivery_id: str, error: str):
        """Store webhook processing error"""
        if self.redis_client:
            key = f"webhook:error:{delivery_id}"
            await self.redis_client.setex(
                key,
                86400,  # 24 hour TTL
                json.dumps({
                    "delivery_id": delivery_id,
                    "error": error,
                    "timestamp": datetime.utcnow().isoformat()
                })
            )
    
    async def shutdown(self):
        """Cleanup on shutdown"""
        await self.studio_client.aclose()
        await super().shutdown()


# Create the server instance
app = GitHubIntegrationMCPServer().app

if __name__ == "__main__":
    server = GitHubIntegrationMCPServer()
    server.run(port=8002)