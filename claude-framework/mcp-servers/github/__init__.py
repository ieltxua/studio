"""
GitHub Integration MCP Server

A comprehensive GitHub integration server for Studio AI platform that provides:
- Real-time webhook processing
- Automated PR and issue management
- Slack to GitHub integration
- Agent assignment workflows
- Metrics and analytics
"""

from .main import GitHubIntegrationMCPServer, app
from .config import settings, Settings
from .utils import GitHubUtils, MarkdownUtils, LabelUtils, MetricsUtils

__version__ = "1.0.0"
__all__ = [
    "GitHubIntegrationMCPServer",
    "app",
    "settings",
    "Settings",
    "GitHubUtils",
    "MarkdownUtils",
    "LabelUtils",
    "MetricsUtils"
]