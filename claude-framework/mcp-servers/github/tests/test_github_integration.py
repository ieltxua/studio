"""
Tests for GitHub Integration MCP Server
"""

import pytest
import json
import hmac
import hashlib
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient

from ..main import GitHubIntegrationMCPServer, WebhookEvent, PRAction, IssueAction
from ..config import Settings


@pytest.fixture
def mock_settings():
    """Mock settings for testing"""
    settings = Mock(spec=Settings)
    settings.github.token = "test-token"
    settings.github.webhook_secret = "test-secret"
    settings.studio.api_url = "http://test-api"
    settings.studio.api_key = "test-key"
    settings.server.database_url = "postgresql://test"
    settings.server.redis_url = "redis://test"
    return settings


@pytest.fixture
def server(mock_settings):
    """Create test server instance"""
    with patch("..main.settings", mock_settings):
        server = GitHubIntegrationMCPServer()
        server.github_client = Mock()
        server.studio_client = AsyncMock()
        return server


@pytest.fixture
def client(server):
    """Create test client"""
    return TestClient(server.app)


class TestWebhookHandling:
    """Test webhook processing"""
    
    def test_webhook_signature_verification(self, server):
        """Test webhook signature verification"""
        payload = json.dumps({"test": "data"}).encode()
        secret = "test-secret".encode()
        
        # Valid signature
        valid_signature = "sha256=" + hmac.new(secret, payload, hashlib.sha256).hexdigest()
        request = Mock()
        request.body = AsyncMock(return_value=payload)
        
        result = server._verify_webhook_signature(request, valid_signature)
        assert result is True
        
        # Invalid signature
        invalid_signature = "sha256=invalid"
        result = server._verify_webhook_signature(request, invalid_signature)
        assert result is False
    
    def test_webhook_endpoint_with_valid_signature(self, client, server):
        """Test webhook endpoint with valid signature"""
        payload = {"repository": {"name": "test-repo"}, "action": "opened"}
        body = json.dumps(payload).encode()
        
        # Generate valid signature
        secret = "test-secret".encode()
        signature = "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()
        
        response = client.post(
            "/webhooks/github",
            content=body,
            headers={
                "X-Hub-Signature-256": signature,
                "X-GitHub-Event": "pull_request",
                "X-GitHub-Delivery": "12345",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "accepted"
    
    def test_webhook_endpoint_with_invalid_signature(self, client):
        """Test webhook endpoint with invalid signature"""
        payload = {"test": "data"}
        
        response = client.post(
            "/webhooks/github",
            json=payload,
            headers={
                "X-Hub-Signature-256": "sha256=invalid",
                "X-GitHub-Event": "push",
                "X-GitHub-Delivery": "12345"
            }
        )
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_push_event_handling(self, server):
        """Test push event processing"""
        payload = {
            "repository": {
                "id": 123,
                "full_name": "test/repo",
                "owner": {"login": "test"}
            },
            "pusher": {"name": "developer"},
            "commits": [
                {
                    "message": "Fix bug in #42",
                    "author": {"name": "developer"}
                }
            ]
        }
        
        with patch.object(server, "_update_referenced_issues") as mock_update:
            await server._handle_push_event(payload)
            mock_update.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_pr_opened_event(self, server):
        """Test PR opened event handling"""
        payload = {
            "action": "opened",
            "pull_request": {
                "number": 1,
                "title": "New feature",
                "body": "Implements feature X",
                "draft": False
            },
            "repository": {
                "id": 123,
                "full_name": "test/repo"
            }
        }
        
        with patch.object(server, "_get_pr_config") as mock_config:
            mock_config.return_value = Mock(
                auto_assign=True,
                auto_label=True,
                draft_on_wip=False
            )
            
            with patch.object(server, "_auto_assign_reviewers") as mock_assign:
                with patch.object(server, "_auto_label_pr") as mock_label:
                    await server._handle_pr_event(payload)
                    
                    mock_assign.assert_called_once()
                    mock_label.assert_called_once()


class TestTools:
    """Test MCP tools"""
    
    @pytest.mark.asyncio
    async def test_connect_repository(self, server):
        """Test repository connection"""
        # Mock GitHub repository
        mock_repo = Mock()
        mock_repo.id = 123
        mock_repo.name = "test-repo"
        mock_repo.full_name = "test/test-repo"
        mock_repo.owner.login = "test"
        mock_repo.html_url = "https://github.com/test/test-repo"
        mock_repo.default_branch = "main"
        mock_repo.private = False
        
        server.github_client.get_repo.return_value = mock_repo
        server.studio_client.patch.return_value = Mock(status_code=200)
        
        result = await server._connect_repository({
            "project_id": "proj-123",
            "repo_owner": "test",
            "repo_name": "test-repo",
            "setup_webhooks": False
        })
        
        assert result["success"] is True
        assert result["repository"]["id"] == 123
        assert result["repository"]["full_name"] == "test/test-repo"
    
    @pytest.mark.asyncio
    async def test_create_issue_from_slack(self, server):
        """Test issue creation from Slack"""
        # Mock project info
        server._get_project_info = AsyncMock(return_value={
            "id": "proj-123",
            "githubRepoId": "123"
        })
        
        # Mock repository and issue
        mock_repo = Mock()
        mock_issue = Mock()
        mock_issue.number = 42
        mock_issue.title = "Test Issue"
        mock_issue.html_url = "https://github.com/test/repo/issues/42"
        mock_issue.state = "open"
        mock_issue.id = 999
        
        mock_repo.create_issue.return_value = mock_issue
        server.github_client.get_repo_by_id.return_value = mock_repo
        
        # Mock Studio API response
        server.studio_client.post.return_value = Mock(
            status_code=201,
            json=Mock(return_value={"id": "task-123"})
        )
        
        result = await server._create_issue_from_slack({
            "title": "Test Issue",
            "body": "Issue description",
            "labels": ["bug"],
            "assignees": ["developer"],
            "project_id": "proj-123",
            "slack_context": {
                "slack_user_id": "U123",
                "slack_channel_id": "C456",
                "slack_message_ts": "789"
            }
        })
        
        assert result["success"] is True
        assert result["issue"]["number"] == 42
        assert result["task_id"] == "task-123"
    
    @pytest.mark.asyncio
    async def test_assign_agent_to_issue(self, server):
        """Test agent assignment to issue"""
        # Mock project and agent info
        server._get_project_info = AsyncMock(return_value={
            "id": "proj-123",
            "githubRepoId": "123"
        })
        
        server._get_agent_info = AsyncMock(return_value={
            "id": "agent-123",
            "name": "Backend Agent",
            "capabilities": ["api", "database"]
        })
        
        # Mock issue
        mock_issue = Mock()
        mock_issue.number = 42
        mock_issue.title = "Fix API bug"
        mock_issue.id = 999
        
        mock_repo = Mock()
        mock_repo.get_issue.return_value = mock_issue
        server.github_client.get_repo_by_id.return_value = mock_repo
        
        # Mock task lookup
        server._find_task_for_issue = AsyncMock(return_value=None)
        
        # Mock Studio API
        server.studio_client.post.return_value = Mock(
            status_code=201,
            json=Mock(return_value={"id": "task-456"})
        )
        
        result = await server._assign_agent_to_issue({
            "project_id": "proj-123",
            "issue_number": 42,
            "agent_id": "agent-123",
            "create_task": True,
            "priority": "high"
        })
        
        assert result["success"] is True
        assert result["issue"]["number"] == 42
        assert result["issue"]["assignee"] == "Backend Agent"
        assert result["task_id"] == "task-456"
        
        # Verify comment was added
        mock_issue.create_comment.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_pr_metrics(self, server):
        """Test PR metrics analysis"""
        # Mock project info
        server._get_project_info = AsyncMock(return_value={
            "id": "proj-123",
            "githubRepoId": "123"
        })
        
        # Mock PRs
        mock_prs = []
        base_date = datetime.utcnow()
        
        for i in range(5):
            pr = Mock()
            pr.number = i + 1
            pr.created_at = base_date - timedelta(days=i)
            pr.merged = i % 2 == 0
            pr.merged_at = base_date - timedelta(days=i-1) if pr.merged else None
            pr.state = "closed" if pr.merged else "open"
            pr.user.login = f"user{i % 3}"
            pr.additions = 100 * (i + 1)
            pr.deletions = 50 * (i + 1)
            pr.labels = []
            pr.get_comments.return_value.totalCount = i * 2
            pr.get_reviews.return_value.totalCount = i
            mock_prs.append(pr)
        
        mock_repo = Mock()
        mock_repo.get_pulls.return_value = mock_prs
        server.github_client.get_repo_by_id.return_value = mock_repo
        
        result = await server._analyze_pr_metrics({
            "project_id": "proj-123",
            "timeframe_days": 30,
            "metrics": ["merge_time", "comments", "changes"]
        })
        
        assert result["success"] is True
        assert result["metrics"]["total_prs"] == 5
        assert result["metrics"]["merged_prs"] == 3
        assert result["metrics"]["open_prs"] == 2
        assert "top_contributors" in result["metrics"]
        assert len(result["insights"]) > 0


class TestAutomation:
    """Test automation features"""
    
    def test_is_wip_pr(self, server):
        """Test WIP PR detection"""
        assert server._is_wip_pr("WIP: New feature") is True
        assert server._is_wip_pr("[WIP] Bug fix") is True
        assert server._is_wip_pr("Work in progress - authentication") is True
        assert server._is_wip_pr("feat: Add login feature") is False
    
    def test_extract_issue_references(self, server):
        """Test issue reference extraction"""
        message = "Fix bug in authentication #42 and #123"
        refs = server._extract_issue_references(message)
        assert refs == [42, 123]
        
        message = "No issues referenced"
        refs = server._extract_issue_references(message)
        assert refs == []
    
    def test_extract_agent_assignment(self, server):
        """Test agent assignment extraction from text"""
        body = "This PR implements the feature.\n\nagent: backend-specialist"
        result = server._extract_agent_assignment(body)
        assert result == {"agent_name": "backend-specialist"}
        
        body = "Regular PR description"
        result = server._extract_agent_assignment(body)
        assert result is None


class TestPrompts:
    """Test prompt generation"""
    
    @pytest.mark.asyncio
    async def test_pr_description_prompt(self, server):
        """Test PR description prompt generation"""
        result = await server._generate_pr_description_prompt({
            "changes": "Added user authentication with JWT",
            "task_context": {
                "title": "Implement user authentication",
                "type": "FEATURE",
                "acceptanceCriteria": ["Users can login", "JWT tokens are issued"]
            }
        })
        
        assert "messages" in result
        assert len(result["messages"]) == 1
        assert "JWT" in result["messages"][0]["content"]["text"]
        assert "authentication" in result["messages"][0]["content"]["text"]


class TestResources:
    """Test resource endpoints"""
    
    @pytest.mark.asyncio
    async def test_repositories_resource(self, server):
        """Test repositories resource"""
        server._get_connected_repositories = AsyncMock(return_value=[
            {
                "id": 123,
                "name": "test-repo",
                "project_id": "proj-123"
            }
        ])
        
        result = await server.get_resource_content("repositories")
        assert "contents" in result
        content = json.loads(result["contents"][0]["text"])
        assert len(content) == 1
        assert content[0]["name"] == "test-repo"
    
    @pytest.mark.asyncio
    async def test_pr_automation_resource(self, server):
        """Test PR automation resource"""
        from ..main import PRAutomationConfig
        
        server.pr_configs = {
            "123": PRAutomationConfig(
                auto_assign=True,
                auto_label=True,
                require_reviews=2
            )
        }
        
        result = await server.get_resource_content("pr-automation")
        assert "contents" in result
        content = json.loads(result["contents"][0]["text"])
        assert "123" in content
        assert content["123"]["auto_assign"] is True