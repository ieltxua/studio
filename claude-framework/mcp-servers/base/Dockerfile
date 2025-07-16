# Base Dockerfile for CLAUDE Framework MCP Servers
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy base requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy base MCP server code
COPY . .

# Create non-root user
RUN useradd -m -s /bin/bash mcp-user && \
    chown -R mcp-user:mcp-user /app

USER mcp-user

# Expose port
EXPOSE 8000

# Default command (to be overridden by specific servers)
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]