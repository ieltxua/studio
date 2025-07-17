#!/usr/bin/env python3
"""
Simple GitHub token test
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load the GitHub MCP .env file
env_path = Path(__file__).parent / "claude-framework" / "mcp-servers" / "github" / ".env"
load_dotenv(env_path)

# Get the token
github_token = os.getenv("GITHUB_TOKEN")

if github_token and github_token != "PLACEHOLDER_REPLACE_WITH_YOUR_TOKEN":
    print("✅ GitHub token is configured!")
    print(f"   Token starts with: {github_token[:8]}...")
    print(f"   Token length: {len(github_token)}")
    
    # Try to use it with PyGithub
    try:
        from github import Github
        
        g = Github(github_token)
        user = g.get_user()
        
        print(f"\n✅ Successfully authenticated as: {user.login}")
        print(f"   Name: {user.name}")
        print(f"   Company: {user.company}")
        print(f"   Location: {user.location}")
        print(f"   Public Repos: {user.public_repos}")
        
        # Show recent repos
        print("\n📂 Your recent repositories:")
        for repo in list(user.get_repos(sort="pushed"))[:5]:
            print(f"   - {repo.name} {'⭐' + str(repo.stargazers_count) if repo.stargazers_count > 0 else ''}")
            
        print("\n🎉 GitHub integration is ready to use!")
        
    except ImportError:
        print("\n⚠️  PyGithub not found. To test the API:")
        print("   pip install PyGithub")
    except Exception as e:
        print(f"\n❌ Error testing GitHub API: {e}")
else:
    print("❌ GitHub token not configured!")
    print("   Please add your token to:", env_path)