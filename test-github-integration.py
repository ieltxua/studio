#!/usr/bin/env python3
"""
Test script for GitHub Integration MCP Server
"""

import os
import sys
import subprocess
from pathlib import Path

def test_github_integration():
    """Test the GitHub integration"""
    print("🧪 Testing GitHub Integration MCP Server...")
    
    # Check if we're in the right directory
    studio_dir = Path(__file__).parent
    github_mcp_dir = studio_dir / "claude-framework" / "mcp-servers" / "github"
    
    if not github_mcp_dir.exists():
        print("❌ GitHub MCP server directory not found")
        return False
        
    print("✅ GitHub MCP server directory found")
    
    # Check if .env file exists
    env_file = github_mcp_dir / ".env"
    if not env_file.exists():
        print("❌ .env file not found in GitHub MCP server directory")
        return False
        
    print("✅ .env file found")
    
    # Check if requirements.txt exists
    requirements_file = github_mcp_dir / "requirements.txt"
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
        
    print("✅ requirements.txt found")
    
    # Check if main.py exists
    main_file = github_mcp_dir / "main.py"
    if not main_file.exists():
        print("❌ main.py not found")
        return False
        
    print("✅ main.py found")
    
    # Check current git repository
    try:
        result = subprocess.run(['git', 'config', '--get', 'remote.origin.url'], 
                              capture_output=True, text=True, cwd=studio_dir)
        if result.returncode == 0:
            repo_url = result.stdout.strip()
            print(f"✅ Current repository: {repo_url}")
            
            # Parse owner/repo from URL
            if "github.com" in repo_url:
                if repo_url.endswith('.git'):
                    repo_url = repo_url[:-4]
                parts = repo_url.split('/')
                if len(parts) >= 2:
                    owner = parts[-2]
                    repo = parts[-1]
                    print(f"✅ Repository parsed: {owner}/{repo}")
                else:
                    print("⚠️  Could not parse repository owner/name")
            else:
                print("⚠️  Not a GitHub repository")
        else:
            print("⚠️  Not in a git repository")
            
    except Exception as e:
        print(f"⚠️  Error checking repository: {e}")
    
    # Check .env configuration
    try:
        with open(env_file, 'r') as f:
            env_content = f.read()
            
        if "PLACEHOLDER_REPLACE_WITH_YOUR_TOKEN" in env_content:
            print("⚠️  GitHub token not configured (still using placeholder)")
        else:
            print("✅ GitHub token appears to be configured")
            
        if "localhost:3001" in env_content:
            print("✅ Studio API URL configured correctly")
        else:
            print("⚠️  Studio API URL may need configuration")
            
    except Exception as e:
        print(f"⚠️  Error reading .env file: {e}")
    
    # List available MCP tools
    tools = [
        "connect_repository",
        "create_issue_from_slack", 
        "create_automated_pr",
        "assign_agent_to_issue",
        "setup_webhooks",
        "configure_pr_automation",
        "analyze_pr_metrics"
    ]
    
    print("✅ Available MCP Tools:")
    for tool in tools:
        print(f"   - {tool}")
        
    print("\n🎉 GitHub Integration MCP Server is ready for setup!")
    
    return True

def main():
    """Main test function"""
    success = test_github_integration()
    
    if success:
        print("\n🚀 Next steps:")
        print("1. Create a GitHub Personal Access Token:")
        print("   - Go to GitHub Settings → Developer settings → Personal access tokens")
        print("   - Create token with scopes: repo, workflow, admin:repo_hook, read:org")
        print("2. Run: ./setup-github-integration.sh <your_github_token>")
        print("3. Open http://localhost:3000 to see the Studio dashboard")
        print("4. Create a project and connect it to your GitHub repository")
        print("\nAlternatively, you can manually configure:")
        print("1. Replace PLACEHOLDER_REPLACE_WITH_YOUR_TOKEN in .env with your token")
        print("2. cd claude-framework/mcp-servers/github && pip install -r requirements.txt")
        print("3. cd claude-framework/mcp-servers/github && python main.py")
        sys.exit(0)
    else:
        print("\n❌ GitHub integration test failed")
        sys.exit(1)

if __name__ == "__main__":
    main()