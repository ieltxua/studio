"""
Base MCP Server Implementation for CLAUDE Framework

This module provides the base class and common functionality for all
CLAUDE framework MCP servers.
"""

import asyncio
import json
import logging
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union
from datetime import datetime

from pydantic import BaseModel
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


class MCPResource(BaseModel):
    """Base class for MCP resources"""
    uri: str
    name: str
    description: Optional[str] = None
    mimeType: Optional[str] = None


class MCPTool(BaseModel):
    """Base class for MCP tools"""
    name: str
    description: str
    inputSchema: Dict[str, Any]


class MCPPrompt(BaseModel):
    """Base class for MCP prompts"""
    name: str
    description: str
    arguments: Optional[List[Dict[str, Any]]] = None


class BaseMCPServer(ABC):
    """
    Base class for all CLAUDE framework MCP servers
    
    Provides common functionality including:
    - Server initialization and configuration
    - Resource, tool, and prompt management
    - Logging and error handling
    - Database and cache connections
    """
    
    def __init__(self, name: str, version: str = "1.0.0"):
        self.name = name
        self.version = version
        self.app = FastAPI(title=f"CLAUDE {name} MCP Server", version=version)
        self.logger = self._setup_logging()
        self.resources: Dict[str, MCPResource] = {}
        self.tools: Dict[str, MCPTool] = {}
        self.prompts: Dict[str, MCPPrompt] = {}
        
        self._setup_middleware()
        self._setup_routes()
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logging.basicConfig(
            level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        return logging.getLogger(f"claude-{self.name}")
    
    def _setup_middleware(self):
        """Setup FastAPI middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup standard MCP routes"""
        
        @self.app.get("/")
        async def root():
            return {
                "name": self.name,
                "version": self.version,
                "status": "running",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        @self.app.get("/health")
        async def health():
            return {"status": "healthy"}
        
        @self.app.get("/resources")
        async def list_resources():
            return {"resources": list(self.resources.values())}
        
        @self.app.get("/resources/{uri:path}")
        async def get_resource(uri: str):
            if uri not in self.resources:
                raise HTTPException(status_code=404, detail="Resource not found")
            return await self.get_resource_content(uri)
        
        @self.app.get("/tools")
        async def list_tools():
            return {"tools": list(self.tools.values())}
        
        @self.app.post("/tools/{tool_name}")
        async def call_tool(tool_name: str, arguments: Dict[str, Any]):
            if tool_name not in self.tools:
                raise HTTPException(status_code=404, detail="Tool not found")
            return await self.call_tool_impl(tool_name, arguments)
        
        @self.app.get("/prompts")
        async def list_prompts():
            return {"prompts": list(self.prompts.values())}
        
        @self.app.post("/prompts/{prompt_name}")
        async def get_prompt(prompt_name: str, arguments: Optional[Dict[str, Any]] = None):
            if prompt_name not in self.prompts:
                raise HTTPException(status_code=404, detail="Prompt not found")
            return await self.get_prompt_impl(prompt_name, arguments or {})
    
    def register_resource(self, resource: MCPResource):
        """Register a new resource"""
        self.resources[resource.uri] = resource
        self.logger.info(f"Registered resource: {resource.name}")
    
    def register_tool(self, tool: MCPTool):
        """Register a new tool"""
        self.tools[tool.name] = tool
        self.logger.info(f"Registered tool: {tool.name}")
    
    def register_prompt(self, prompt: MCPPrompt):
        """Register a new prompt"""
        self.prompts[prompt.name] = prompt
        self.logger.info(f"Registered prompt: {prompt.name}")
    
    @abstractmethod
    async def initialize(self):
        """Initialize the server (called during startup)"""
        pass
    
    @abstractmethod
    async def get_resource_content(self, uri: str) -> Dict[str, Any]:
        """Get the content of a resource"""
        pass
    
    @abstractmethod
    async def call_tool_impl(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Implementation for tool calls"""
        pass
    
    @abstractmethod
    async def get_prompt_impl(self, prompt_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Implementation for prompt requests"""
        pass
    
    async def startup(self):
        """Startup sequence for the server"""
        self.logger.info(f"Starting CLAUDE {self.name} MCP Server v{self.version}")
        await self.initialize()
        self.logger.info(f"CLAUDE {self.name} MCP Server ready")
    
    async def shutdown(self):
        """Shutdown sequence for the server"""
        self.logger.info(f"Shutting down CLAUDE {self.name} MCP Server")
    
    def run(self, host: str = "0.0.0.0", port: int = 8000):
        """Run the server"""
        uvicorn.run(
            self.app,
            host=host,
            port=port,
            log_level=os.getenv('LOG_LEVEL', 'info').lower()
        )


class DatabaseMixin:
    """Mixin for database connectivity"""
    
    def __init__(self):
        self.db_url = os.getenv('DATABASE_URL')
        self.db_pool = None
    
    async def init_database(self):
        """Initialize database connection"""
        # Implementation depends on database choice
        pass
    
    async def close_database(self):
        """Close database connection"""
        if self.db_pool:
            await self.db_pool.close()


class CacheMixin:
    """Mixin for Redis cache connectivity"""
    
    def __init__(self):
        self.redis_url = os.getenv('REDIS_URL')
        self.redis_client = None
    
    async def init_cache(self):
        """Initialize Redis connection"""
        # Implementation with redis-py
        pass
    
    async def close_cache(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()


class VectorDBMixin:
    """Mixin for ChromaDB connectivity"""
    
    def __init__(self):
        self.chromadb_url = os.getenv('CHROMADB_URL')
        self.chroma_client = None
    
    async def init_vector_db(self):
        """Initialize ChromaDB connection"""
        # Implementation with chromadb
        pass