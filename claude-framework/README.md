# CLAUDE Meta-Development Framework

**C**ontext **L**earning **A**utomated **U**nified **D**evelopment **E**nvironment

## Overview
The CLAUDE framework is a comprehensive meta-development system that enhances Claude Code agents with persistent context, intelligent orchestration, and automated quality assurance. It leverages Claude Code's native ecosystem (hooks, MCPs, devcontainers) to create self-improving development workflows.

## Architecture

```
claude-framework/
├── mcp-servers/          # Custom MCP server implementations
│   ├── context/          # Project memory and state management
│   ├── orchestrator/     # Task breakdown and coordination
│   ├── quality/          # Testing and code quality automation
│   ├── github/           # GitHub integration and automation
│   └── knowledge/        # Pattern learning and insights
├── hooks/                # Claude Code hook scripts
├── devcontainer/         # Development environment configuration
├── scripts/              # Setup and utility scripts
├── configs/              # Configuration templates
├── templates/            # Project templates
├── deployments/          # Docker and Kubernetes configs
├── tests/                # Framework testing
└── docs/                 # Documentation
```

## Core Components

### 1. MCP Servers
- **Context Server**: Persistent project context and memory management
- **Orchestrator Server**: Intelligent task breakdown and agent coordination
- **Quality Server**: Automated testing, security scanning, and code quality
- **GitHub Server**: Issue/PR automation and workflow integration
- **Knowledge Server**: Pattern recognition and cross-project learning

### 2. Hook System
- **PreToolUse**: Context validation, quality gates, task tracking
- **PostToolUse**: Context updates, quality validation, progress reporting
- **Notification**: Slack/GitHub updates, milestone notifications
- **Stop/SubagentStop**: Session archiving, knowledge extraction

### 3. Development Environment
- **Secure devcontainer** with network isolation
- **Persistent volumes** for project state and context
- **Orchestrated services** with PostgreSQL, Redis, ChromaDB
- **Automated setup** and configuration management

## Quick Start

1. **Setup the framework**
   ```bash
   cd claude-framework
   ./scripts/setup.sh
   ```

2. **Start the development environment**
   ```bash
   docker-compose up -d
   ```

3. **Open in devcontainer**
   - Use VS Code Remote - Containers extension
   - Open folder in container

4. **Initialize project context**
   ```bash
   claude mcp call claude_context_server initialize_project
   ```

## Usage

### Starting a new development session
```bash
# The hooks automatically load context when you start development tasks
claude --project myproject "Let's implement the user authentication feature"
```

### Manual context operations
```bash
# Save current context
claude mcp call claude_context_server save_context

# Restore context  
claude mcp call claude_context_server restore_context

# Query knowledge base
claude mcp call claude_knowledge_server query_patterns --pattern="authentication"
```

### Task orchestration
```bash
# Break down a large feature
claude mcp call claude_orchestrator_server breakdown_epic --epic="user dashboard"

# Check progress
claude mcp call claude_orchestrator_server track_progress
```

## Implementation Status

### Phase 1: Foundation ✅
- [x] Project structure setup
- [x] Devcontainer configuration
- [x] Docker orchestration
- [x] MCP server templates
- [x] Basic hook system

### Phase 2: Core Intelligence 🔄
- [ ] Context MCP server implementation
- [ ] Orchestrator MCP server implementation
- [ ] Hook integration and testing
- [ ] Context persistence system

### Phase 3: Quality Automation 📋
- [ ] Quality MCP server implementation
- [ ] Automated testing hooks
- [ ] Security scanning integration
- [ ] Performance monitoring

### Phase 4: GitHub Integration 📋
- [ ] GitHub MCP server implementation
- [ ] PR/Issue automation
- [ ] Webhook handling
- [ ] End-to-end workflows

### Phase 5: Knowledge System 📋
- [ ] Knowledge MCP server implementation
- [ ] Pattern recognition system
- [ ] Learning aggregation
- [ ] Cross-project insights

### Phase 6: Production Ready 📋
- [ ] Performance optimization
- [ ] Monitoring and alerting
- [ ] Kubernetes deployment
- [ ] Documentation and testing

## Configuration

The framework uses several configuration files:
- `configs/claude-settings.json` - Claude Code settings with MCP servers
- `configs/hooks.json` - Hook configuration and workflows
- `docker-compose.yml` - Service orchestration
- `.devcontainer/devcontainer.json` - Development environment

## Security

- All MCP servers run in isolated containers
- Network access is restricted through custom firewall rules
- Sensitive data is managed through environment variables
- Audit logging for all framework operations

## Contributing

1. Follow the development workflow in `docs/CONTRIBUTING.md`
2. All changes must pass quality gates
3. Update documentation for new features
4. Test in the devcontainer environment

## License

MIT License - see LICENSE file for details

---

**Built to make Claude Code agents exponentially more effective**