#!/bin/bash
# CLAUDE Framework - Context Update Hook
# Updates project context after successful operations

set -euo pipefail

# Configuration
CONTEXT_PATH="${CLAUDE_CONTEXT_PATH:-/workspace/.claude}"
CONTEXT_FILE="$CONTEXT_PATH/project_state.json"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

# Logging function
log() {
    local level="$1"
    shift
    echo "$(date -Iseconds) [$level] update-context: $*" >&2
}

# Extract context from environment and arguments
extract_context() {
    local tool_name="${CLAUDE_TOOL_NAME:-unknown}"
    local tool_args="${CLAUDE_TOOL_ARGS:-{}}"
    local tool_result="${CLAUDE_TOOL_RESULT:-{}}"
    
    # Parse tool information
    local context_update="{}"
    
    case "$tool_name" in
        "Edit"|"Write"|"MultiEdit")
            # Code modification detected
            local file_path
            file_path=$(echo "$tool_args" | jq -r '.file_path // empty' 2>/dev/null || echo "")
            
            if [ -n "$file_path" ]; then
                context_update=$(jq -n \
                    --arg tool "$tool_name" \
                    --arg file "$file_path" \
                    --arg timestamp "$(date -Iseconds)" \
                    '{
                        type: "code_modification",
                        tool: $tool,
                        file: $file,
                        timestamp: $timestamp
                    }')
            fi
            ;;
        "Bash")
            # Command execution detected
            local command
            command=$(echo "$tool_args" | jq -r '.command // empty' 2>/dev/null || echo "")
            
            if [ -n "$command" ]; then
                context_update=$(jq -n \
                    --arg tool "$tool_name" \
                    --arg command "$command" \
                    --arg timestamp "$(date -Iseconds)" \
                    '{
                        type: "command_execution",
                        tool: $tool,
                        command: $command,
                        timestamp: $timestamp
                    }')
            fi
            ;;
        *)
            # Generic tool usage
            context_update=$(jq -n \
                --arg tool "$tool_name" \
                --arg timestamp "$(date -Iseconds)" \
                '{
                    type: "tool_usage",
                    tool: $tool,
                    timestamp: $timestamp
                }')
            ;;
    esac
    
    echo "$context_update"
}

# Update project context file
update_context_file() {
    local context_update="$1"
    
    log "INFO" "Updating project context file"
    
    # Ensure context directory exists
    mkdir -p "$CONTEXT_PATH"
    
    # Create context file if it doesn't exist
    if [ ! -f "$CONTEXT_FILE" ]; then
        log "INFO" "Creating new context file"
        echo '{}' > "$CONTEXT_FILE"
    fi
    
    # Update context with new information
    local updated_context
    updated_context=$(jq \
        --argjson update "$context_update" \
        --arg timestamp "$(date -Iseconds)" \
        '
        .last_updated = $timestamp |
        .session.last_activity = $timestamp |
        .recent_activities = (.recent_activities // []) |
        .recent_activities = [.recent_activities[], $update] |
        .recent_activities = .recent_activities[-20:] |
        .activity_count = (.activity_count // 0) + 1
        ' "$CONTEXT_FILE")
    
    echo "$updated_context" > "$CONTEXT_FILE"
    
    log "INFO" "Context file updated successfully"
}

# Send context to MCP server
send_to_mcp_server() {
    local context_data
    
    if [ -f "$CONTEXT_FILE" ]; then
        context_data=$(cat "$CONTEXT_FILE")
    else
        context_data="{}"
    fi
    
    log "INFO" "Sending context update to MCP server"
    
    if command -v claude >/dev/null 2>&1; then
        if echo "$context_data" | claude mcp call claude_context_server save_context --auto-save 2>/dev/null; then
            log "INFO" "Context sent to MCP server successfully"
            return 0
        else
            log "WARN" "Failed to send context to MCP server"
            return 1
        fi
    else
        log "WARN" "Claude CLI not available, skipping MCP update"
        return 0
    fi
}

# Analyze project changes
analyze_changes() {
    log "INFO" "Analyzing project changes"
    
    # Check for new files
    local new_files
    new_files=$(find . -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.json" -type f -newer "$CONTEXT_FILE" 2>/dev/null | wc -l)
    
    # Check for modified files (in git)
    local modified_files=0
    if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
        modified_files=$(git diff --name-only | wc -l)
    fi
    
    # Update context with change analysis
    if [ -f "$CONTEXT_FILE" ]; then
        local updated_context
        updated_context=$(jq \
            --argjson new_files "$new_files" \
            --argjson modified_files "$modified_files" \
            --arg timestamp "$(date -Iseconds)" \
            '
            .change_analysis = {
                new_files: $new_files,
                modified_files: $modified_files,
                last_analyzed: $timestamp
            }
            ' "$CONTEXT_FILE")
        
        echo "$updated_context" > "$CONTEXT_FILE"
    fi
    
    log "INFO" "Change analysis completed: $new_files new files, $modified_files modified files"
}

# Update progress tracking
update_progress() {
    log "INFO" "Updating progress tracking"
    
    if command -v claude >/dev/null 2>&1; then
        if claude mcp call claude_orchestrator_server track_progress --session-id="${CLAUDE_SESSION_ID:-$(date +%s)}" 2>/dev/null; then
            log "INFO" "Progress updated successfully"
        else
            log "WARN" "Failed to update progress"
        fi
    fi
}

# Main execution
main() {
    log "INFO" "Starting context update"
    
    # Extract context from current operation
    local context_update
    context_update=$(extract_context)
    
    # Update local context file
    if update_context_file "$context_update"; then
        log "INFO" "Local context updated"
    else
        log "ERROR" "Failed to update local context"
        exit 1
    fi
    
    # Analyze project changes
    analyze_changes
    
    # Send to MCP server
    send_to_mcp_server
    
    # Update progress tracking
    update_progress
    
    log "INFO" "Context update completed"
    
    # Output success response
    cat << EOF
{
  "success": true,
  "message": "Context updated successfully",
  "timestamp": "$(date -Iseconds)",
  "context_file": "$CONTEXT_FILE"
}
EOF
}

# Run main function
main "$@"