"""
Configuration module for GitHub Integration MCP Server
"""

import os
from typing import Dict, List, Optional
from pydantic import BaseSettings, Field


class GitHubConfig(BaseSettings):
    """GitHub API configuration"""
    
    # Authentication (one of these must be provided)
    token: Optional[str] = Field(None, env="GITHUB_TOKEN")
    app_id: Optional[str] = Field(None, env="GITHUB_APP_ID")
    app_private_key: Optional[str] = Field(None, env="GITHUB_APP_PRIVATE_KEY")
    
    # Webhook
    webhook_secret: str = Field(..., env="GITHUB_WEBHOOK_SECRET")
    webhook_path: str = Field("/webhooks/github", env="GITHUB_WEBHOOK_PATH")
    
    # API settings
    api_version: str = Field("2022-11-28", env="GITHUB_API_VERSION")
    base_url: str = Field("https://api.github.com", env="GITHUB_API_URL")
    
    class Config:
        env_file = ".env"


class StudioConfig(BaseSettings):
    """Studio backend configuration"""
    
    api_url: str = Field("http://localhost:3000", env="STUDIO_API_URL")
    api_key: str = Field(..., env="STUDIO_API_KEY")
    api_timeout: int = Field(30, env="STUDIO_API_TIMEOUT")
    
    class Config:
        env_file = ".env"


class ServerConfig(BaseSettings):
    """MCP Server configuration"""
    
    name: str = Field("github-integration", env="MCP_SERVER_NAME")
    version: str = Field("1.0.0", env="MCP_SERVER_VERSION")
    host: str = Field("0.0.0.0", env="SERVER_HOST")
    port: int = Field(8002, env="SERVER_PORT")
    log_level: str = Field("INFO", env="LOG_LEVEL")
    
    # Database
    database_url: str = Field(..., env="DATABASE_URL")
    
    # Redis
    redis_url: str = Field("redis://localhost:6379", env="REDIS_URL")
    redis_ttl: int = Field(3600, env="REDIS_TTL")
    
    class Config:
        env_file = ".env"


class AutomationDefaults(BaseSettings):
    """Default automation settings"""
    
    # PR Automation
    auto_assign_enabled: bool = Field(True, env="PR_AUTO_ASSIGN")
    auto_label_enabled: bool = Field(True, env="PR_AUTO_LABEL")
    required_reviews: int = Field(2, env="PR_REQUIRED_REVIEWS")
    draft_on_wip: bool = Field(True, env="PR_DRAFT_ON_WIP")
    close_stale_days: int = Field(30, env="PR_CLOSE_STALE_DAYS")
    
    # Protected branches
    protected_branches: List[str] = Field(
        ["main", "master", "production", "release/*"],
        env="PROTECTED_BRANCHES"
    )
    
    # Auto-labeling rules
    size_labels: Dict[str, int] = Field(
        {
            "size/XS": 10,
            "size/S": 50,
            "size/M": 250,
            "size/L": 1000,
            "size/XL": 5000
        }
    )
    
    # File-based labels
    file_label_rules: Dict[str, List[str]] = Field(
        {
            "frontend": ["*.tsx", "*.jsx", "*.css", "*.scss"],
            "backend": ["*.py", "*.go", "*.java", "*.rb"],
            "docs": ["*.md", "*.rst", "*.txt"],
            "tests": ["*test*", "*spec*"],
            "ci/cd": [".github/*", ".gitlab-ci.yml", "Jenkinsfile"]
        }
    )
    
    class Config:
        env_file = ".env"


class AgentConfig(BaseSettings):
    """Agent configuration defaults"""
    
    # Agent type capabilities
    agent_capabilities: Dict[str, List[str]] = Field(
        {
            "GENERAL": ["any"],
            "BACKEND": ["api", "database", "server", "authentication", "integration"],
            "FRONTEND": ["ui", "react", "vue", "angular", "css", "html", "accessibility"],
            "DEVOPS": ["deployment", "ci/cd", "infrastructure", "monitoring", "security"],
            "TESTING": ["unit-test", "integration-test", "e2e", "performance", "security-test"],
            "REVIEW": ["code-review", "architecture", "security-review", "performance-review"],
            "DOCUMENTATION": ["docs", "api-docs", "readme", "changelog", "wiki"]
        }
    )
    
    # Label to agent type mapping
    label_agent_mapping: Dict[str, str] = Field(
        {
            "bug": "BACKEND",
            "feature": "GENERAL",
            "frontend": "FRONTEND",
            "backend": "BACKEND",
            "api": "BACKEND",
            "ui": "FRONTEND",
            "test": "TESTING",
            "docs": "DOCUMENTATION",
            "devops": "DEVOPS",
            "security": "REVIEW",
            "performance": "REVIEW"
        }
    )
    
    # Max concurrent tasks per agent
    max_concurrent_tasks: int = Field(3, env="AGENT_MAX_TASKS")
    
    class Config:
        env_file = ".env"


class WebhookConfig(BaseSettings):
    """Webhook processing configuration"""
    
    # Events to subscribe by default
    default_events: List[str] = Field(
        [
            "push",
            "pull_request",
            "pull_request_review",
            "pull_request_review_comment",
            "issues",
            "issue_comment",
            "workflow_run",
            "check_run",
            "check_suite"
        ]
    )
    
    # Webhook processing
    max_retries: int = Field(3, env="WEBHOOK_MAX_RETRIES")
    retry_delay: int = Field(5, env="WEBHOOK_RETRY_DELAY")
    timeout: int = Field(30, env="WEBHOOK_TIMEOUT")
    
    # Event storage
    store_events: bool = Field(True, env="WEBHOOK_STORE_EVENTS")
    event_retention_days: int = Field(30, env="WEBHOOK_RETENTION_DAYS")
    
    class Config:
        env_file = ".env"


class NotificationConfig(BaseSettings):
    """Notification settings"""
    
    # Slack notifications
    slack_enabled: bool = Field(False, env="SLACK_NOTIFICATIONS")
    slack_webhook_url: Optional[str] = Field(None, env="SLACK_WEBHOOK_URL")
    slack_channel: Optional[str] = Field(None, env="SLACK_CHANNEL")
    
    # Email notifications
    email_enabled: bool = Field(False, env="EMAIL_NOTIFICATIONS")
    smtp_host: Optional[str] = Field(None, env="SMTP_HOST")
    smtp_port: int = Field(587, env="SMTP_PORT")
    smtp_user: Optional[str] = Field(None, env="SMTP_USER")
    smtp_password: Optional[str] = Field(None, env="SMTP_PASSWORD")
    
    # Notification events
    notify_on_pr_merge: bool = Field(True, env="NOTIFY_PR_MERGE")
    notify_on_issue_assign: bool = Field(True, env="NOTIFY_ISSUE_ASSIGN")
    notify_on_build_fail: bool = Field(True, env="NOTIFY_BUILD_FAIL")
    
    class Config:
        env_file = ".env"


class Settings:
    """Combined settings for the GitHub MCP Server"""
    
    def __init__(self):
        self.github = GitHubConfig()
        self.studio = StudioConfig()
        self.server = ServerConfig()
        self.automation = AutomationDefaults()
        self.agents = AgentConfig()
        self.webhooks = WebhookConfig()
        self.notifications = NotificationConfig()
    
    def validate(self):
        """Validate configuration"""
        # Ensure GitHub authentication is configured
        if not (self.github.token or (self.github.app_id and self.github.app_private_key)):
            raise ValueError("Either GITHUB_TOKEN or GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY must be provided")
        
        # Ensure required settings are present
        if not self.github.webhook_secret:
            raise ValueError("GITHUB_WEBHOOK_SECRET is required")
        
        if not self.studio.api_key:
            raise ValueError("STUDIO_API_KEY is required")
        
        return True


# Global settings instance
settings = Settings()


# Label categories for issue/PR classification
LABEL_CATEGORIES = {
    "type": ["bug", "feature", "enhancement", "documentation", "test", "refactor", "chore"],
    "priority": ["critical", "high", "medium", "low"],
    "status": ["in-progress", "blocked", "ready", "review-needed"],
    "component": ["frontend", "backend", "api", "database", "infrastructure", "ui/ux"],
    "size": ["size/XS", "size/S", "size/M", "size/L", "size/XL"]
}

# PR review assignment strategies
REVIEW_STRATEGIES = {
    "round_robin": "Assign reviews in rotation",
    "load_balanced": "Assign to reviewer with least active reviews",
    "expertise_based": "Assign based on code ownership and expertise",
    "random": "Random assignment from eligible reviewers"
}

# Issue triage priorities based on labels and keywords
TRIAGE_KEYWORDS = {
    "critical": ["production", "outage", "security", "data loss", "breaking", "urgent"],
    "high": ["regression", "blocker", "customer", "performance", "error"],
    "medium": ["bug", "issue", "problem", "incorrect"],
    "low": ["enhancement", "improvement", "nice-to-have", "future"]
}