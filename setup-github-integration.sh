#!/bin/bash

# Studio GitHub Integration Setup Script
set -e

echo "🚀 Setting up GitHub Integration for Studio..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if GitHub token is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide your GitHub Personal Access Token${NC}"
    echo "Usage: $0 <github_token>"
    echo ""
    echo "To create a token:"
    echo "1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Select scopes: repo, workflow, admin:repo_hook, read:org"
    echo "4. Copy the token and run: $0 <token>"
    exit 1
fi

GITHUB_TOKEN="$1"

# Set up GitHub MCP server environment
echo -e "${YELLOW}📝 Configuring GitHub MCP Server...${NC}"
cd claude-framework/mcp-servers/github

# Update the .env file with the actual token
sed -i.bak "s/PLACEHOLDER_REPLACE_WITH_YOUR_TOKEN/$GITHUB_TOKEN/g" .env

# Generate API key for Studio backend
STUDIO_API_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
sed -i.bak "s/your_studio_api_key_here/$STUDIO_API_KEY/g" .env

echo -e "${GREEN}✅ GitHub MCP Server configured${NC}"

# Install Python dependencies
echo -e "${YELLOW}📦 Installing GitHub MCP Server dependencies...${NC}"
pip install -r requirements.txt

# Start the MCP server
echo -e "${YELLOW}🚀 Starting GitHub MCP Server...${NC}"
python main.py &
MCP_PID=$!

# Wait for server to start
sleep 3

# Test the MCP server
echo -e "${YELLOW}🧪 Testing MCP Server connection...${NC}"
curl -s http://localhost:8002/health && echo -e "${GREEN}✅ MCP Server is running${NC}" || echo -e "${RED}❌ MCP Server failed to start${NC}"

# Go back to root
cd ../../..

# Start backend if not running
echo -e "${YELLOW}🔧 Starting Studio Backend...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Test backend
echo -e "${YELLOW}🧪 Testing Studio Backend...${NC}"
curl -s http://localhost:3001/health && echo -e "${GREEN}✅ Studio Backend is running${NC}" || echo -e "${RED}❌ Studio Backend failed to start${NC}"

cd ..

echo ""
echo -e "${GREEN}🎉 GitHub Integration Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Open your browser to: http://localhost:3000"
echo "2. Your GitHub MCP Server is running on: http://localhost:8002"
echo "3. Your Studio Backend is running on: http://localhost:3001"
echo ""
echo "To connect this repository to Studio:"
echo "1. In the Studio dashboard, create a new project"
echo "2. Connect it to this GitHub repository: $(git config --get remote.origin.url)"
echo "3. The GitHub automation will be automatically configured"
echo ""
echo "Processes running:"
echo "- MCP Server PID: $MCP_PID"
echo "- Backend PID: $BACKEND_PID"
echo ""
echo "To stop the services:"
echo "  kill $MCP_PID $BACKEND_PID"