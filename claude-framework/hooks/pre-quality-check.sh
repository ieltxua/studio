#!/bin/bash
# CLAUDE Framework - Pre-Quality Check Hook
# Runs quality checks before code modifications

set -euo pipefail

# Configuration
LOG_LEVEL="${LOG_LEVEL:-INFO}"
PROJECT_ROOT="${CLAUDE_PROJECT_ROOT:-/workspace}"

# Logging function
log() {
    local level="$1"
    shift
    echo "$(date -Iseconds) [$level] pre-quality-check: $*" >&2
}

# Check if file exists and is readable
check_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        log "ERROR" "File not found: $file"
        return 1
    fi
    
    if [ ! -r "$file" ]; then
        log "ERROR" "File not readable: $file"
        return 1
    fi
    
    return 0
}

# Run linting checks
run_linting() {
    log "INFO" "Running linting checks"
    
    local has_errors=false
    
    # Check for package.json (Node.js project)
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        log "INFO" "Detected Node.js project, running ESLint"
        
        if command -v npm >/dev/null 2>&1; then
            if npm run lint --silent 2>/dev/null; then
                log "INFO" "ESLint checks passed"
            else
                log "WARN" "ESLint found issues"
                has_errors=true
            fi
        else
            log "WARN" "npm not available, skipping ESLint"
        fi
    fi
    
    # Check for Python files
    if find "$PROJECT_ROOT" -name "*.py" -type f | head -1 | read; then
        log "INFO" "Detected Python files, running pylint"
        
        if command -v pylint >/dev/null 2>&1; then
            if find "$PROJECT_ROOT" -name "*.py" -exec pylint {} + 2>/dev/null; then
                log "INFO" "Pylint checks passed"
            else
                log "WARN" "Pylint found issues"
                has_errors=true
            fi
        else
            log "WARN" "pylint not available, skipping Python linting"
        fi
    fi
    
    return $( [ "$has_errors" = true ] && echo 1 || echo 0 )
}

# Run security checks
run_security_checks() {
    log "INFO" "Running security checks"
    
    # Check for common security issues
    local security_issues=()
    
    # Look for hardcoded secrets
    if grep -r -i "password.*=" "$PROJECT_ROOT" --include="*.js" --include="*.ts" --include="*.py" 2>/dev/null | head -5; then
        security_issues+=("Potential hardcoded passwords found")
    fi
    
    # Look for API keys
    if grep -r -E "(api.key|apikey)" "$PROJECT_ROOT" --include="*.js" --include="*.ts" --include="*.py" 2>/dev/null | head -3; then
        security_issues+=("Potential API keys found in code")
    fi
    
    # Check for .env files in git
    if [ -f "$PROJECT_ROOT/.env" ] && git check-ignore "$PROJECT_ROOT/.env" 2>/dev/null; then
        security_issues+=("Environment file might be tracked in git")
    fi
    
    if [ ${#security_issues[@]} -gt 0 ]; then
        log "WARN" "Security issues found:"
        for issue in "${security_issues[@]}"; do
            log "WARN" "  - $issue"
        done
        return 1
    fi
    
    log "INFO" "No security issues detected"
    return 0
}

# Run format checks
run_format_checks() {
    log "INFO" "Running format checks"
    
    # Check for Prettier (JavaScript/TypeScript)
    if [ -f "$PROJECT_ROOT/package.json" ] && command -v npx >/dev/null 2>&1; then
        if npx prettier --check . 2>/dev/null; then
            log "INFO" "Code formatting is consistent"
        else
            log "WARN" "Code formatting issues found"
            return 1
        fi
    fi
    
    # Check for Black (Python)
    if find "$PROJECT_ROOT" -name "*.py" -type f | head -1 | read && command -v black >/dev/null 2>&1; then
        if black --check "$PROJECT_ROOT" 2>/dev/null; then
            log "INFO" "Python code formatting is consistent"
        else
            log "WARN" "Python formatting issues found"
            return 1
        fi
    fi
    
    return 0
}

# Call MCP quality server if available
call_mcp_quality_server() {
    log "INFO" "Calling MCP quality server"
    
    if command -v claude >/dev/null 2>&1; then
        if claude mcp call claude_quality_server run_quality_checks --pre-commit 2>/dev/null; then
            log "INFO" "MCP quality checks passed"
            return 0
        else
            log "WARN" "MCP quality checks failed"
            return 1
        fi
    else
        log "WARN" "Claude CLI not available, skipping MCP quality checks"
        return 0
    fi
}

# Main execution
main() {
    log "INFO" "Running pre-quality checks"
    
    local exit_code=0
    local warnings=()
    local errors=()
    
    # Run linting
    if ! run_linting; then
        warnings+=("Linting issues found")
        exit_code=1
    fi
    
    # Run security checks
    if ! run_security_checks; then
        errors+=("Security issues detected")
        exit_code=1
    fi
    
    # Run format checks
    if ! run_format_checks; then
        warnings+=("Formatting issues found")
    fi
    
    # Call MCP quality server
    if ! call_mcp_quality_server; then
        warnings+=("MCP quality checks failed")
    fi
    
    # Generate response
    if [ $exit_code -eq 0 ] && [ ${#warnings[@]} -eq 0 ]; then
        log "INFO" "All quality checks passed"
        cat << EOF
{
  "approved": true,
  "message": "All quality checks passed",
  "checks": {
    "linting": "passed",
    "security": "passed", 
    "formatting": "passed",
    "mcp_quality": "passed"
  }
}
EOF
    elif [ $exit_code -eq 0 ]; then
        log "WARN" "Quality checks passed with warnings"
        cat << EOF
{
  "approved": true,
  "message": "Quality checks passed with warnings",
  "warnings": $(printf '%s\n' "${warnings[@]}" | jq -R . | jq -s .),
  "recommendation": "Consider fixing warnings before proceeding"
}
EOF
    else
        log "ERROR" "Quality checks failed"
        cat << EOF
{
  "approved": false,
  "message": "Quality checks failed",
  "errors": $(printf '%s\n' "${errors[@]}" | jq -R . | jq -s .),
  "warnings": $(printf '%s\n' "${warnings[@]}" | jq -R . | jq -s .),
  "recommendation": "Please fix errors before proceeding"
}
EOF
    fi
    
    exit $exit_code
}

# Run main function
main "$@"