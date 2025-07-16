FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy base MCP server files
COPY ../base/mcp_server.py /app/base/
COPY ../base/requirements.txt /app/base/

# Copy GitHub MCP server files
COPY . /app/github/

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/github/requirements.txt

# Set environment variables
ENV PYTHONPATH=/app
ENV MCP_SERVER_NAME=github-integration
ENV LOG_LEVEL=INFO

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8002/health || exit 1

# Run the server
CMD ["python", "-m", "github.main"]