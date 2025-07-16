# CLAUDE Framework Development Container
FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install Python and development tools
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    postgresql-client \
    redis-tools \
    curl \
    wget \
    jq \
    vim \
    htop \
    tree \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for MCP servers
RUN pip3 install \
    fastapi \
    uvicorn \
    pydantic \
    psycopg2-binary \
    redis \
    chromadb \
    sqlalchemy \
    alembic \
    pytest \
    black \
    pylint \
    requests \
    aiohttp \
    python-multipart \
    python-jose[cryptography] \
    passlib[bcrypt]

# Install Node.js packages globally
RUN npm install -g \
    typescript \
    ts-node \
    nodemon \
    prettier \
    eslint \
    @types/node \
    concurrently

# Create MCP server directories
RUN mkdir -p /usr/local/bin /usr/local/mcp-data

# Copy MCP server executables (will be built during setup)
COPY scripts/install-mcp-servers.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/install-mcp-servers.sh

# Create Claude framework user
RUN useradd -m -s /bin/bash claude-dev && \
    usermod -aG sudo claude-dev && \
    echo "claude-dev ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Setup firewall rules for security
COPY scripts/init-firewall.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/init-firewall.sh

# Install Claude CLI (if available)
RUN curl -fsSL https://claude.ai/install.sh | bash || echo "Claude CLI not available, will use existing installation"

# Set working directory
WORKDIR /workspace

# Set default user
USER claude-dev

# Initialize shell configuration
RUN echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc && \
    echo 'export CLAUDE_FRAMEWORK_ROOT="/workspace"' >> ~/.bashrc && \
    echo 'alias ll="ls -la"' >> ~/.bashrc && \
    echo 'alias gs="git status"' >> ~/.bashrc && \
    echo 'alias claude-status="docker-compose ps"' >> ~/.bashrc

EXPOSE 3000 8000 5432 6379 8080

CMD ["sleep", "infinity"]