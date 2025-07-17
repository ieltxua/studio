#!/usr/bin/env python3
"""
Test GitHub token and connection
"""

import os
import sys
from pathlib import Path

# Add the GitHub MCP server to the path
sys.path.insert(0, str(Path(__file__).parent / "claude-framework" / "mcp-servers" / "github"))

try:
    from PyGithub import Github
    from config import GitHubConfig
    
    # Load configuration
    config = GitHubConfig()
    
    print("🔍 Testing GitHub Integration...")
    print(f"✅ Configuration loaded")
    
    # Test GitHub connection
    if config.github_token and config.github_token != "PLACEHOLDER_REPLACE_WITH_YOUR_TOKEN":
        g = Github(config.github_token)
        
        try:
            # Get authenticated user
            user = g.get_user()
            print(f"✅ GitHub authenticated as: {user.login}")
            print(f"   Name: {user.name}")
            print(f"   Public repos: {user.public_repos}")
            
            # List recent repositories
            print("\n📂 Recent repositories:")
            repos = list(user.get_repos(sort="pushed"))[:5]
            for repo in repos:
                print(f"   - {repo.full_name} {'(private)' if repo.private else '(public)'}")
            
            print(f"\n✅ GitHub token is valid and working!")
            print(f"✅ Studio API URL: {config.studio_api_url}")
            print(f"✅ MCP Server Port: {config.server_port}")
            
        except Exception as e:
            print(f"❌ GitHub authentication failed: {e}")
            
    else:
        print("❌ GitHub token not configured")
        print("   Please add your token to claude-framework/mcp-servers/github/.env")
        
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("   Make sure you've installed the requirements: pip install -r requirements.txt")
except Exception as e:
    print(f"❌ Error: {e}")