"""
CLAUDE Context MCP Server

Provides persistent project context and memory management for Claude Code agents.
Maintains project state, decision records, code patterns, and learning insights.
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional
from pathlib import Path

from ..base.mcp_server import BaseMCPServer, MCPResource, MCPTool, MCPPrompt, DatabaseMixin, CacheMixin, VectorDBMixin


class ContextMCPServer(BaseMCPServer, DatabaseMixin, CacheMixin, VectorDBMixin):
    """
    Context MCP Server for persistent project memory and state management
    """
    
    def __init__(self):
        super().__init__("context", "1.0.0")
        DatabaseMixin.__init__(self)
        CacheMixin.__init__(self)
        VectorDBMixin.__init__(self)
        
        self.context_path = Path(os.getenv('CLAUDE_CONTEXT_PATH', '/workspace/.claude'))
        self.context_path.mkdir(exist_ok=True)
        
        self._register_resources()
        self._register_tools()
        self._register_prompts()
    
    def _register_resources(self):
        """Register available resources"""
        
        # Project state resource
        self.register_resource(MCPResource(
            uri="project-state",
            name="Project State",
            description="Current project state including active tasks, context, and metadata",
            mimeType="application/json"
        ))
        
        # Decision records resource
        self.register_resource(MCPResource(
            uri="decision-records",
            name="Decision Records",
            description="Architectural decisions and rationale made during development",
            mimeType="application/json"
        ))
        
        # Code patterns resource
        self.register_resource(MCPResource(
            uri="code-patterns",
            name="Code Patterns",
            description="Identified code patterns and best practices from the project",
            mimeType="application/json"
        ))
        
        # Learning insights resource
        self.register_resource(MCPResource(
            uri="learning-insights",
            name="Learning Insights",
            description="Accumulated learning and insights from development sessions",
            mimeType="application/json"
        ))
    
    def _register_tools(self):
        """Register available tools"""
        
        # Save context tool
        self.register_tool(MCPTool(
            name="save_context",
            description="Save current project context and state",
            inputSchema={
                "type": "object",
                "properties": {
                    "context_data": {
                        "type": "object",
                        "description": "Context data to save"
                    },
                    "session_id": {
                        "type": "string",
                        "description": "Current session identifier"
                    },
                    "auto_save": {
                        "type": "boolean",
                        "description": "Whether this is an automatic save",
                        "default": False
                    }
                },
                "required": ["context_data"]
            }
        ))
        
        # Restore context tool
        self.register_tool(MCPTool(
            name="restore_context",
            description="Restore project context from saved state",
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "Session to restore (latest if not specified)"
                    },
                    "include_patterns": {
                        "type": "boolean",
                        "description": "Include learned code patterns",
                        "default": True
                    }
                }
            }
        ))
        
        # Track decision tool
        self.register_tool(MCPTool(
            name="track_decision",
            description="Record an architectural or development decision",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Decision title"
                    },
                    "description": {
                        "type": "string", 
                        "description": "Detailed description of the decision"
                    },
                    "rationale": {
                        "type": "string",
                        "description": "Why this decision was made"
                    },
                    "alternatives": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Alternative options considered"
                    },
                    "consequences": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "Expected consequences of this decision"
                    }
                },
                "required": ["title", "description", "rationale"]
            }
        ))
        
        # Query knowledge tool
        self.register_tool(MCPTool(
            name="query_knowledge",
            description="Query the project knowledge base",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Natural language query"
                    },
                    "categories": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Knowledge categories to search in",
                        "default": ["patterns", "decisions", "insights"]
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results",
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        ))
        
        # Suggest next action tool
        self.register_tool(MCPTool(
            name="suggest_next_action",
            description="Analyze current project state and suggest the optimal next action",
            inputSchema={
                "type": "object",
                "properties": {
                    "context_scope": {
                        "type": "string",
                        "enum": ["immediate", "sprint", "milestone", "strategic"],
                        "description": "Time horizon for the suggestion",
                        "default": "immediate"
                    },
                    "consider_blockers": {
                        "type": "boolean",
                        "description": "Consider current blockers and dependencies",
                        "default": True
                    },
                    "include_rationale": {
                        "type": "boolean", 
                        "description": "Include detailed rationale for the suggestion",
                        "default": True
                    }
                }
            }
        ))
        
        # Initialize project tool
        self.register_tool(MCPTool(
            name="initialize_project",
            description="Initialize context for a new project",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_name": {
                        "type": "string",
                        "description": "Name of the project"
                    },
                    "project_description": {
                        "type": "string",
                        "description": "Description of the project"
                    },
                    "tech_stack": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Technologies used in the project"
                    }
                },
                "required": ["project_name"]
            }
        ))
    
    def _register_prompts(self):
        """Register available prompts"""
        
        # Resume project prompt
        self.register_prompt(MCPPrompt(
            name="resume-project",
            description="Resume development on the current project with full context"
        ))
        
        # Explain codebase prompt
        self.register_prompt(MCPPrompt(
            name="explain-codebase",
            description="Explain the current state and structure of the codebase"
        ))
        
        # Suggest next task prompt
        self.register_prompt(MCPPrompt(
            name="suggest-next-task",
            description="Suggest the next development task based on current context"
        ))
    
    async def initialize(self):
        """Initialize the context server"""
        await self.init_database()
        await self.init_cache()
        await self.init_vector_db()
        
        # Create context files if they don't exist
        self._ensure_context_files()
        
        self.logger.info("Context MCP Server initialized")
    
    def _ensure_context_files(self):
        """Ensure all context files exist"""
        context_files = [
            'project_state.json',
            'decision_records.json', 
            'code_patterns.json',
            'learning_insights.json',
            'session_history.json'
        ]
        
        for filename in context_files:
            filepath = self.context_path / filename
            if not filepath.exists():
                filepath.write_text('{}')
    
    async def get_resource_content(self, uri: str) -> Dict[str, Any]:
        """Get the content of a resource"""
        
        resource_files = {
            "project-state": "project_state.json",
            "decision-records": "decision_records.json", 
            "code-patterns": "code_patterns.json",
            "learning-insights": "learning_insights.json"
        }
        
        if uri in resource_files:
            filepath = self.context_path / resource_files[uri]
            if filepath.exists():
                with open(filepath, 'r') as f:
                    content = json.load(f)
                return {
                    "contents": [{
                        "uri": uri,
                        "mimeType": "application/json",
                        "text": json.dumps(content, indent=2)
                    }]
                }
        
        return {"error": "Resource not found"}
    
    async def call_tool_impl(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Implementation for tool calls"""
        
        if tool_name == "save_context":
            return await self._save_context(arguments)
        elif tool_name == "restore_context":
            return await self._restore_context(arguments)
        elif tool_name == "track_decision":
            return await self._track_decision(arguments)
        elif tool_name == "query_knowledge":
            return await self._query_knowledge(arguments)
        elif tool_name == "suggest_next_action":
            return await self._suggest_next_action(arguments)
        elif tool_name == "initialize_project":
            return await self._initialize_project(arguments)
        
        return {"error": "Tool not implemented"}
    
    async def get_prompt_impl(self, prompt_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Implementation for prompt requests"""
        
        if prompt_name == "resume-project":
            return await self._resume_project_prompt()
        elif prompt_name == "explain-codebase":
            return await self._explain_codebase_prompt()
        elif prompt_name == "suggest-next-task":
            return await self._suggest_next_task_prompt()
        
        return {"error": "Prompt not implemented"}
    
    async def _save_context(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Save current project context"""
        try:
            context_data = arguments.get("context_data", {})
            session_id = arguments.get("session_id", datetime.utcnow().isoformat())
            auto_save = arguments.get("auto_save", False)
            
            # Save to project state file
            state_file = self.context_path / "project_state.json"
            context_data.update({
                "last_updated": datetime.utcnow().isoformat(),
                "session_id": session_id,
                "auto_save": auto_save
            })
            
            with open(state_file, 'w') as f:
                json.dump(context_data, f, indent=2)
            
            # Add to session history
            history_file = self.context_path / "session_history.json"
            with open(history_file, 'r') as f:
                history = json.load(f)
            
            if "sessions" not in history:
                history["sessions"] = []
            
            history["sessions"].append({
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                "auto_save": auto_save,
                "context_summary": context_data.get("summary", "")
            })
            
            # Keep only last 100 sessions
            history["sessions"] = history["sessions"][-100:]
            
            with open(history_file, 'w') as f:
                json.dump(history, f, indent=2)
            
            self.logger.info(f"Context saved for session {session_id}")
            return {"success": True, "session_id": session_id}
            
        except Exception as e:
            self.logger.error(f"Error saving context: {e}")
            return {"success": False, "error": str(e)}
    
    async def _restore_context(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Restore project context"""
        try:
            session_id = arguments.get("session_id")
            include_patterns = arguments.get("include_patterns", True)
            
            # Load project state
            state_file = self.context_path / "project_state.json"
            if not state_file.exists():
                return {"success": False, "error": "No context found"}
            
            with open(state_file, 'r') as f:
                context_data = json.load(f)
            
            result = {
                "success": True,
                "context": context_data
            }
            
            # Include patterns if requested
            if include_patterns:
                patterns_file = self.context_path / "code_patterns.json"
                if patterns_file.exists():
                    with open(patterns_file, 'r') as f:
                        patterns = json.load(f)
                    result["patterns"] = patterns
            
            self.logger.info(f"Context restored for session {session_id or 'latest'}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error restoring context: {e}")
            return {"success": False, "error": str(e)}
    
    async def _track_decision(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Track an architectural decision"""
        try:
            decision = {
                "id": datetime.utcnow().isoformat(),
                "title": arguments["title"],
                "description": arguments["description"],
                "rationale": arguments["rationale"],
                "alternatives": arguments.get("alternatives", []),
                "consequences": arguments.get("consequences", []),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Load existing decisions
            decisions_file = self.context_path / "decision_records.json"
            with open(decisions_file, 'r') as f:
                decisions = json.load(f)
            
            if "decisions" not in decisions:
                decisions["decisions"] = []
            
            decisions["decisions"].append(decision)
            
            with open(decisions_file, 'w') as f:
                json.dump(decisions, f, indent=2)
            
            self.logger.info(f"Decision tracked: {decision['title']}")
            return {"success": True, "decision_id": decision["id"]}
            
        except Exception as e:
            self.logger.error(f"Error tracking decision: {e}")
            return {"success": False, "error": str(e)}
    
    async def _query_knowledge(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Query the knowledge base"""
        # This would implement semantic search using ChromaDB
        # For now, return a simple response
        return {
            "success": True,
            "results": [],
            "message": "Knowledge query functionality coming soon"
        }
    
    async def _suggest_next_action(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest the optimal next action based on current project state"""
        try:
            context_scope = arguments.get("context_scope", "immediate")
            consider_blockers = arguments.get("consider_blockers", True)
            include_rationale = arguments.get("include_rationale", True)
            
            # Load current project state
            state_file = self.context_path / "project_state.json"
            if not state_file.exists():
                return {"success": False, "error": "No project context found"}
            
            with open(state_file, 'r') as f:
                project_state = json.load(f)
            
            # Load task progress
            progress_file = self.context_path / "task_progress.json"
            task_progress = {}
            if progress_file.exists():
                with open(progress_file, 'r') as f:
                    task_progress = json.load(f)
            
            # Load epic breakdown
            epic_file = self.context_path / "epic_breakdown.json"
            epic_breakdown = {}
            if epic_file.exists():
                with open(epic_file, 'r') as f:
                    epic_breakdown = json.load(f)
            
            # Analyze current state and suggest next action
            suggestion = await self._analyze_and_suggest(
                project_state, task_progress, epic_breakdown, 
                context_scope, consider_blockers
            )
            
            result = {
                "success": True,
                "suggestion": suggestion,
                "timestamp": datetime.utcnow().isoformat(),
                "context_scope": context_scope
            }
            
            if include_rationale:
                result["rationale"] = suggestion.get("rationale", "")
                result["alternative_options"] = suggestion.get("alternatives", [])
                result["risk_assessment"] = suggestion.get("risks", [])
            
            self.logger.info(f"Generated next action suggestion: {suggestion.get('title', 'Unknown')}")
            return result
            
        except Exception as e:
            self.logger.error(f"Error generating next action suggestion: {e}")
            return {"success": False, "error": str(e)}
    
    async def _analyze_and_suggest(self, project_state: Dict, task_progress: Dict, 
                                 epic_breakdown: Dict, context_scope: str, 
                                 consider_blockers: bool) -> Dict[str, Any]:
        """Analyze project state and generate intelligent suggestions"""
        
        # Get current task information
        current_task = task_progress.get("current_task", {})
        completed_tasks = task_progress.get("completed_tasks", [])
        
        # Get available tasks from epic breakdown
        available_tasks = epic_breakdown.get("tasks", [])
        
        # Determine next logical task
        if current_task.get("status") == "in_progress":
            # Current task in progress - suggest continuing or handling blockers
            task_id = current_task.get("id")
            task_title = current_task.get("title", "Current task")
            
            return {
                "action_type": "continue_current_task",
                "title": f"Continue with {task_title}",
                "description": f"Complete the current task: {task_title}",
                "priority": "high",
                "estimated_effort": "30-60 minutes",
                "rationale": f"Task {task_id} is in progress and should be completed before starting new work to maintain momentum and avoid context switching.",
                "next_steps": [
                    "Review current task requirements",
                    "Complete remaining implementation",
                    "Test the implemented functionality",
                    "Update task status to completed"
                ],
                "alternatives": [
                    "Pause current task if blocked and work on parallel task",
                    "Break current task into smaller subtasks if too complex"
                ],
                "risks": [
                    "Context switching may reduce efficiency",
                    "Incomplete tasks create technical debt"
                ]
            }
        
        else:
            # Find next task in sequence
            completed_task_ids = [t.get("id") for t in completed_tasks]
            
            # Find next available task with dependencies satisfied
            for task in available_tasks:
                task_id = task.get("id")
                dependencies = task.get("dependencies", [])
                
                # Skip if already completed
                if task_id in completed_task_ids:
                    continue
                
                # Check if dependencies are satisfied
                dependencies_satisfied = all(dep_id in completed_task_ids for dep_id in dependencies)
                
                if dependencies_satisfied:
                    return {
                        "action_type": "start_next_task",
                        "title": f"Start {task.get('title', 'Next Task')}",
                        "description": task.get("description", ""),
                        "priority": task.get("priority", "medium"),
                        "estimated_effort": f"{task.get('estimated_duration', 60)} minutes",
                        "task_id": task_id,
                        "task_type": task.get("type", "implementation"),
                        "rationale": f"This task is next in the dependency chain and all prerequisites are completed. It's critical for enabling subsequent work.",
                        "next_steps": [
                            f"Review task requirements: {task.get('title')}",
                            "Plan implementation approach",
                            "Begin implementation",
                            "Create tests as needed"
                        ],
                        "alternatives": [
                            "Work on parallel track if this task is blocked",
                            "Break task down further if complexity is high"
                        ],
                        "risks": [
                            "Task dependencies may have changed",
                            "Requirements may need clarification"
                        ],
                        "acceptance_criteria": task.get("acceptance_criteria", [])
                    }
            
            # If no specific task found, suggest strategic next steps
            return {
                "action_type": "strategic_planning",
                "title": "Plan Next Development Phase",
                "description": "Current epic is complete or blocked. Plan next strategic development phase.",
                "priority": "medium",
                "estimated_effort": "30-45 minutes",
                "rationale": "All available tasks are either completed or blocked. Time to reassess project direction and plan next phase.",
                "next_steps": [
                    "Review completed work and achievements",
                    "Identify any blockers or issues",
                    "Plan next epic or milestone",
                    "Update project timeline and priorities"
                ],
                "alternatives": [
                    "Focus on testing and quality assurance of completed work",
                    "Begin integration work between completed components",
                    "Start working on frontend components"
                ],
                "risks": [
                    "Planning without clear direction may waste time",
                    "Missing critical dependencies"
                ]
            }
    
    async def _initialize_project(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize a new project context"""
        try:
            project_data = {
                "name": arguments["project_name"],
                "description": arguments.get("project_description", ""),
                "tech_stack": arguments.get("tech_stack", []),
                "created_at": datetime.utcnow().isoformat(),
                "status": "active"
            }
            
            # Save project state
            state_file = self.context_path / "project_state.json"
            with open(state_file, 'w') as f:
                json.dump({"project": project_data}, f, indent=2)
            
            self.logger.info(f"Project initialized: {project_data['name']}")
            return {"success": True, "project": project_data}
            
        except Exception as e:
            self.logger.error(f"Error initializing project: {e}")
            return {"success": False, "error": str(e)}
    
    async def _resume_project_prompt(self) -> Dict[str, Any]:
        """Generate resume project prompt"""
        return {
            "messages": [{
                "role": "user", 
                "content": {
                    "type": "text",
                    "text": "Based on the current project context, please resume development where we left off. Review the project state, recent decisions, and suggest the next steps."
                }
            }]
        }
    
    async def _explain_codebase_prompt(self) -> Dict[str, Any]:
        """Generate explain codebase prompt"""
        return {
            "messages": [{
                "role": "user",
                "content": {
                    "type": "text", 
                    "text": "Please analyze and explain the current codebase structure, key components, and overall architecture based on the saved context and patterns."
                }
            }]
        }
    
    async def _suggest_next_task_prompt(self) -> Dict[str, Any]:
        """Generate suggest next task prompt"""
        return {
            "messages": [{
                "role": "user",
                "content": {
                    "type": "text",
                    "text": "Based on the current project state and recent development activity, suggest the next development task that should be prioritized."
                }
            }]
        }


# Create the server instance
app = ContextMCPServer().app

if __name__ == "__main__":
    server = ContextMCPServer()
    server.run()