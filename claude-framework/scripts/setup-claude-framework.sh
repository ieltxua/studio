#!/bin/bash
# CLAUDE Framework Setup Script
# Initializes the development environment and all components

set -euo pipefail

# Configuration
FRAMEWORK_ROOT="${CLAUDE_PROJECT_ROOT:-/workspace}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    local color="$NC"
    
    case "$level" in
        "ERROR") color="$RED" ;;
        "WARN") color="$YELLOW" ;;
        "INFO") color="$GREEN" ;;
        "DEBUG") color="$BLUE" ;;
    esac
    
    shift
    echo -e "${color}$(date -Iseconds) [$level] setup:${NC} $*" >&2
}

# Print banner
print_banner() {
    cat << 'EOF'
   _____ _      _    _    _ _____  ______   ______                                           _    
  / ____| |    | |  | |  | |  __ \|  ____| |  ____|                                         | |   
 | |    | |    | |__| |  | | |  | | |__    | |__ _ __ __ _ _ __ ___   _____      _____  _ __| | __
 | |    | |    |  __  |  | | |  | |  __|   |  __| '__/ _` | '_ ` _ \ / _ \ \ /\ / / _ \| '__| |/ /
 | |____| |____| |  | |__| | |__| | |____  | |  | | | (_| | | | | | |  __/\ V  V / (_) | |  |   < 
  \_____|______|_|  |_\____/|_____/|______| |_|  |_|  \__,_|_| |_| |_|\___| \_/\_/ \___/|_|  |_|\_\

Context Learning Automated Unified Development Environment
Version 1.0.0
EOF
    echo ""
    log "INFO" "Starting CLAUDE Framework setup..."
}

# Check dependencies
check_dependencies() {
    log "INFO" "Checking dependencies..."
    
    local missing_deps=()
    
    # Check for required commands
    local required_commands=("docker" "docker-compose" "jq" "curl")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_deps+=("$cmd")
        fi
    done
    
    # Check for optional commands
    local optional_commands=("git" "npm" "python3" "pip3")
    
    for cmd in "${optional_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log "WARN" "Optional dependency missing: $cmd"
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log "ERROR" "Missing required dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    log "INFO" "All required dependencies found"
    return 0
}

# Setup environment
setup_environment() {
    log "INFO" "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "$FRAMEWORK_ROOT/.env" ]; then
        log "INFO" "Creating .env file from template"
        cp "$FRAMEWORK_ROOT/.env.example" "$FRAMEWORK_ROOT/.env"
        
        # Generate random secrets
        local framework_secret
        local jwt_secret
        framework_secret=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | cut -d' ' -f1)
        jwt_secret=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | cut -d' ' -f1)
        
        # Update secrets in .env file
        sed -i "s/your_framework_secret_here/$framework_secret/" "$FRAMEWORK_ROOT/.env"
        sed -i "s/your_jwt_secret_here/$jwt_secret/" "$FRAMEWORK_ROOT/.env"
        
        log "WARN" "Please update the .env file with your actual API keys and tokens"
    fi
    
    # Create context directory
    mkdir -p "$FRAMEWORK_ROOT/.claude"
    
    # Create MCP data directory
    mkdir -p "$FRAMEWORK_ROOT/mcp-data"
    
    log "INFO" "Environment setup completed"
}

# Build MCP servers
build_mcp_servers() {
    log "INFO" "Building MCP servers..."
    
    cd "$FRAMEWORK_ROOT"
    
    # Build all MCP servers using Docker Compose
    if docker-compose build --parallel; then
        log "INFO" "MCP servers built successfully"
    else
        log "ERROR" "Failed to build MCP servers"
        return 1
    fi
}

# Initialize database
initialize_database() {
    log "INFO" "Initializing database..."
    
    cd "$FRAMEWORK_ROOT"
    
    # Start database services
    docker-compose up -d postgres redis chromadb
    
    # Wait for database to be ready
    log "INFO" "Waiting for database to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker-compose exec -T postgres pg_isready -U claude >/dev/null 2>&1; then
            break
        fi
        retries=$((retries - 1))
        sleep 2
    done
    
    if [ $retries -eq 0 ]; then
        log "ERROR" "Database failed to start"
        return 1
    fi
    
    log "INFO" "Database initialized successfully"
}

# Start MCP servers
start_mcp_servers() {
    log "INFO" "Starting MCP servers..."
    
    cd "$FRAMEWORK_ROOT"
    
    # Start all services
    if docker-compose up -d; then
        log "INFO" "MCP servers started successfully"
    else
        log "ERROR" "Failed to start MCP servers"
        return 1
    fi
    
    # Wait for services to be healthy
    log "INFO" "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    local services=("claude-context-server" "claude-orchestrator-server" "claude-quality-server" "claude-github-server" "claude-knowledge-server")
    
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            log "INFO" "$service is running"
        else
            log "WARN" "$service is not running"
        fi
    done
}

# Setup Claude Code configuration
setup_claude_config() {
    log "INFO" "Setting up Claude Code configuration..."
    
    # Create Claude settings directory
    mkdir -p ~/.config/claude-code
    
    # Create settings file with MCP servers
    cat > ~/.config/claude-code/settings.json << 'EOF'
{
  "mcp": {
    "servers": {
      "claude-context": {
        "command": "docker-compose",
        "args": ["exec", "-T", "claude-context-server", "python", "main.py"],
        "transport": "stdio",
        "scope": "project"
      },
      "claude-orchestrator": {
        "command": "docker-compose", 
        "args": ["exec", "-T", "claude-orchestrator-server", "python", "main.py"],
        "transport": "stdio",
        "scope": "project"
      },
      "claude-quality": {
        "command": "docker-compose",
        "args": ["exec", "-T", "claude-quality-server", "python", "main.py"],
        "transport": "stdio",
        "scope": "project"
      },
      "claude-github": {
        "command": "docker-compose",
        "args": ["exec", "-T", "claude-github-server", "python", "main.py"],
        "transport": "stdio",
        "scope": "project"
      },
      "claude-knowledge": {
        "command": "docker-compose",
        "args": ["exec", "-T", "claude-knowledge-server", "python", "main.py"],
        "transport": "stdio",
        "scope": "user"
      }
    }
  },
  "hooks": "./hooks/claude-hooks.json"
}
EOF
    
    log "INFO" "Claude Code configuration created"
}

# Verify setup
verify_setup() {
    log "INFO" "Verifying setup..."
    
    local errors=()
    
    # Check if context validation works
    if ! ./hooks/validate-context.sh >/dev/null 2>&1; then
        errors+=("Context validation failed")
    fi
    
    # Check if MCP servers are accessible
    local mcp_endpoints=("http://localhost:8000/health" "http://localhost:8080/health")
    
    for endpoint in "${mcp_endpoints[@]}"; do
        if ! curl -s "$endpoint" >/dev/null 2>&1; then
            errors+=("MCP server not accessible: $endpoint")
        fi
    done
    
    if [ ${#errors[@]} -gt 0 ]; then
        log "ERROR" "Setup verification failed:"
        for error in "${errors[@]}"; do
            log "ERROR" "  - $error"
        done
        return 1
    fi
    
    log "INFO" "Setup verification passed"
    return 0
}

# Print summary
print_summary() {
    cat << EOF

${GREEN}✅ CLAUDE Framework Setup Complete!${NC}

🚀 What's been set up:
  • MCP servers for context, orchestration, quality, GitHub, and knowledge
  • Docker containers with PostgreSQL, Redis, and ChromaDB
  • Claude Code hooks for automated workflows
  • Development environment configuration

🎯 Next steps:
  1. Update .env file with your API keys and tokens
  2. Test the setup: claude --project test "Hello CLAUDE Framework"
  3. Initialize a project: claude mcp call claude_context_server initialize_project
  4. Start developing with enhanced AI assistance!

📚 Documentation:
  • Framework docs: ./docs/
  • MCP server docs: ./mcp-servers/*/README.md
  • Hook configuration: ./hooks/claude-hooks.json

🔧 Useful commands:
  • Start services: docker-compose up -d
  • View logs: docker-compose logs -f
  • Stop services: docker-compose down
  • Check status: docker-compose ps

EOF
}

# Cleanup on failure
cleanup() {
    log "WARN" "Setup failed, cleaning up..."
    docker-compose down 2>/dev/null || true
}

# Main execution
main() {
    # Set trap for cleanup
    trap cleanup EXIT
    
    print_banner
    
    if ! check_dependencies; then
        log "ERROR" "Dependency check failed"
        exit 1
    fi
    
    setup_environment
    build_mcp_servers
    initialize_database
    start_mcp_servers
    setup_claude_config
    
    if verify_setup; then
        # Remove cleanup trap on success
        trap - EXIT
        print_summary
        log "INFO" "CLAUDE Framework setup completed successfully!"
    else
        log "ERROR" "Setup verification failed"
        exit 1
    fi
}

# Run main function
main "$@"