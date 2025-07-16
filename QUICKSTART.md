# 🚀 Studio Quickstart Guide

## What You Have Built

Studio is a complete AI-powered project automation platform with:
- **Backend API**: Full REST API with authentication, projects, agents, tasks
- **GitHub Integration**: Automated workflows for issues, PRs, and agent assignments
- **Executive Dashboard**: Real-time metrics, cost tracking, and project visibility
- **CLAUDE Framework**: Self-directing AI development framework

## 🎯 Quick Demo (5 minutes)

### Option 1: See the Dashboard (Recommended)
```bash
# 1. Start the frontend dashboard
cd /Users/ieltxualganaras/ryzlabs/studio/frontend
npm install
npm run dev

# 2. Open browser to: http://localhost:3000
# You'll see the executive dashboard with mock data
```

### Option 2: Test the API
```bash
# 1. Set up the database
cd /Users/ieltxualganaras/ryzlabs/studio/backend
npm run docker:dev  # Starts PostgreSQL & Redis

# 2. Run migrations
npm run migrate

# 3. Start the backend
npm run dev

# 4. Test API endpoints
curl http://localhost:3001/health
```

### Option 3: GitHub Integration
```bash
# 1. Configure the GitHub MCP server
cd /Users/ieltxualganaras/ryzlabs/studio/claude-framework/mcp-servers/github
cp .env.example .env
# Edit .env with your GitHub token

# 2. Start the MCP server
python main.py

# 3. Test GitHub automation tools
```

## 🔧 Full Setup (Production-Ready)

### 1. Infrastructure Setup
```bash
# Start all services
cd /Users/ieltxualganaras/ryzlabs/studio
docker-compose up -d

# This starts:
# - PostgreSQL database
# - Redis cache
# - ChromaDB vector store
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URLs, JWT secrets, etc.

# Run database migrations
npm run migrate

# Seed with sample data (optional)
npm run seed

# Start backend server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies  
npm install

# Configure API endpoint
cp .env.example .env.development
# Set VITE_API_URL=http://localhost:3001

# Start frontend
npm run dev
```

### 4. CLAUDE Framework Setup
```bash
cd claude-framework

# Install MCP servers
./scripts/install-servers.sh

# Configure Claude Code integration
cp .claude/hooks.example.json .claude/hooks.json

# Start framework services
docker-compose up -d
```

## 🎮 What You Can Do Now

### Immediate Actions:

1. **View Executive Dashboard**
   - See real-time project metrics
   - Monitor AI agent activity
   - Track costs and token usage
   - Visualize automation effectiveness

2. **API Testing**
   - Create organizations and projects
   - Register AI agents
   - Manage tasks and workflows
   - Test authentication flows

3. **GitHub Automation**
   - Connect GitHub repositories
   - Set up webhook automation
   - Create issues from Slack messages
   - Assign AI agents to GitHub work

### Next Steps:

1. **Connect Real Data**
   - Integrate with actual GitHub repos
   - Connect Slack workspace
   - Add real AI agents (Claude, OpenAI)
   - Import existing projects

2. **Extend Functionality**
   - Add more automation rules
   - Create custom agent types
   - Build additional integrations
   - Expand dashboard metrics

3. **Scale the Platform**
   - Deploy to production
   - Add team members
   - Configure CI/CD pipelines
   - Set up monitoring

## 🔍 Key Features to Explore

### Dashboard Features:
- **Cost Tracking**: See how much your AI automation is saving
- **Agent Monitoring**: Watch AI agents work on tasks
- **Project Progress**: Real-time updates on all projects
- **Performance Metrics**: Measure automation effectiveness

### API Capabilities:
- **Multi-tenant**: Support multiple organizations
- **RBAC**: Role-based access control
- **Rate Limiting**: Production-ready security
- **Audit Logging**: Track all actions

### GitHub Integration:
- **Webhook Processing**: Real-time GitHub events
- **Slack → GitHub**: Convert messages to issues
- **PR Automation**: Automated pull request workflows
- **Agent Assignment**: AI agents work on GitHub issues

### CLAUDE Framework:
- **Self-Direction**: Framework suggests next actions
- **Autonomous Development**: Builds features independently
- **Learning**: Improves based on development patterns
- **MCP Integration**: Claude Code tools and context

## 📞 Get Help

- **Issues**: Create GitHub issues for bugs
- **Features**: Use the Studio API to request new features
- **Questions**: The CLAUDE framework can help plan next steps

## 🎯 Demo Scenarios

### Executive Demo:
1. Show dashboard with cost savings
2. Demonstrate real-time agent activity
3. Highlight automation metrics

### Developer Demo:
1. Create GitHub issue from Slack
2. Watch AI agent get assigned
3. See automated PR creation

### Technical Demo:
1. API endpoint testing
2. MCP server capabilities
3. CLAUDE framework intelligence

---

**You've built the future of AI project automation!** 🚀