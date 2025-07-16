#!/bin/bash
# CLAUDE Framework - Context Validation Hook
# Ensures project context is loaded before development tasks

set -euo pipefail

# Configuration
CONTEXT_PATH="${CLAUDE_CONTEXT_PATH:-/workspace/.claude}"
CONTEXT_FILE="$CONTEXT_PATH/project_state.json"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

# Logging function
log() {
    local level="$1"
    shift
    echo "$(date -Iseconds) [$level] validate-context: $*" >&2
}

# Check if context exists and is valid
check_context() {
    if [ ! -f "$CONTEXT_FILE" ]; then
        log "WARN" "No project context found at $CONTEXT_FILE"
        return 1
    fi
    
    # Validate JSON structure
    if ! jq empty "$CONTEXT_FILE" 2>/dev/null; then
        log "ERROR" "Invalid JSON in context file"
        return 1
    fi
    
    # Check if context is recent (within last 24 hours)
    local last_updated
    last_updated=$(jq -r '.last_updated // empty' "$CONTEXT_FILE")
    
    if [ -n "$last_updated" ]; then
        local context_age
        context_age=$(( $(date +%s) - $(date -d "$last_updated" +%s) ))
        
        if [ $context_age -gt 86400 ]; then
            log "WARN" "Project context is older than 24 hours"
        fi
    fi
    
    return 0
}

# Load context from MCP server
load_context() {
    log "INFO" "Loading project context from MCP server"
    
    # Try to restore context using MCP call
    if command -v claude >/dev/null 2>&1; then
        if claude mcp call claude_context_server restore_context 2>/dev/null; then
            log "INFO" "Context restored successfully"
            return 0
        else
            log "WARN" "Failed to restore context via MCP"
        fi
    fi
    
    # Fallback: initialize new context
    log "INFO" "Initializing new project context"
    mkdir -p "$CONTEXT_PATH"
    
    # Create basic context structure
    cat > "$CONTEXT_FILE" << EOF
{
  "project": {
    "name": "$(basename "$(pwd)")",
    "path": "$(pwd)",
    "created_at": "$(date -Iseconds)"
  },
  "session": {
    "started_at": "$(date -Iseconds)",
    "session_id": "$(uuidgen || date +%s)"
  },
  "status": "initialized",
  "last_updated": "$(date -Iseconds)"
}
EOF
    
    return 0
}

# Main execution
main() {
    log "INFO" "Validating project context"
    
    # Create context directory if it doesn't exist
    mkdir -p "$CONTEXT_PATH"
    
    # Check if context is valid
    if check_context; then
        log "INFO" "Project context is valid"
        
        # Output success response for Claude
        cat << EOF
{
  "approved": true,
  "message": "Project context is loaded and valid",
  "context_path": "$CONTEXT_FILE"
}
EOF
        exit 0
    else
        log "INFO" "Loading project context"
        
        if load_context; then
            log "INFO" "Project context loaded successfully"
            
            cat << EOF
{
  "approved": true,
  "message": "Project context loaded successfully",
  "context_path": "$CONTEXT_FILE"
}
EOF
            exit 0
        else
            log "ERROR" "Failed to load project context"
            
            cat << EOF
{
  "approved": false,
  "message": "Failed to load project context",
  "error": "Context validation failed"
}
EOF
            exit 1
        fi
    fi
}

# Run main function
main "$@"