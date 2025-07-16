# Studio - AI Project Automation Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue)](https://www.typescriptlang.org/)

## 🚀 Overview

Studio is the **mother of all projects** - an intelligent automation platform that transforms how organizations manage software development through AI-powered agents, seamless integrations, and executive-level oversight.

### Key Capabilities
- 🤖 **AI Agent Automation**: Autonomous development agents that build features and fix bugs
- 💼 **Executive Dashboard**: Real-time project oversight with financial controls
- 🔗 **Smart Integrations**: Slack → GitHub issue automation and workflow management
- 💰 **Budget Management**: Token usage tracking and cost optimization
- 📊 **Multi-Project Orchestration**: Manage multiple development initiatives simultaneously

## 🏗️ Architecture

```
studio/
├── backend/          # Node.js/TypeScript API server
├── frontend/         # React/TypeScript dashboard
├── shared/           # Shared types and utilities
├── deployments/      # Docker, Kubernetes, Terraform configs
├── scripts/          # Development and deployment scripts
└── docs/            # Additional documentation
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with Fastify consideration
- **Database**: PostgreSQL + Redis
- **AI Integration**: OpenAI API, Anthropic Claude API
- **Authentication**: OAuth 2.0 (GitHub, Slack)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: Zustand + React Query

### Infrastructure
- **Containerization**: Docker + Kubernetes
- **Cloud**: AWS (primary), with multi-cloud support
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry, Prometheus, Grafana

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- Docker and Docker Compose
- PostgreSQL (local or Docker)
- Redis (local or Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/studio.git
   cd studio
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit the environment files with your configurations
   ```

4. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis with Docker
   docker-compose up -d postgres redis
   
   # Run database migrations
   cd backend && npm run migrate
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1: Start backend
   cd backend && npm run dev
   
   # Terminal 2: Start frontend
   cd frontend && npm run dev
   ```

6. **Access the Application**
   - Frontend Dashboard: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🔧 Development

### Available Scripts

#### Backend
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
```

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run test suite
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/studio
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret

# AI Services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Application
NODE_ENV=development
PORT=8000
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Studio
VITE_ENABLE_ANALYTICS=false
```

## 🐳 Docker Development

### Quick Start with Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Services
- **app**: Main application (frontend + backend)
- **postgres**: PostgreSQL database
- **redis**: Redis cache
- **nginx**: Reverse proxy (production)

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm run test                 # Run all tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # End-to-end tests
npm run test:coverage      # Test coverage report
```

### Frontend Testing
```bash
cd frontend
npm run test                # Run all tests
npm run test:unit          # Unit tests only
npm run test:e2e           # End-to-end tests with Playwright
npm run test:coverage      # Test coverage report
```

## 📦 Deployment

### Production Build
```bash
# Build both frontend and backend
./scripts/build.sh

# Or build individually
cd backend && npm run build
cd frontend && npm run build
```

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment
```bash
# Apply Kubernetes configurations
kubectl apply -f deployments/kubernetes/

# Check deployment status
kubectl get pods -l app=studio
```

## 🔒 Security

### Authentication Flow
1. OAuth 2.0 with GitHub/Slack
2. JWT token generation
3. Role-based access control
4. API rate limiting

### Data Protection
- Encryption at rest and in transit
- Secrets management with environment variables
- Input validation and sanitization
- CORS and CSP configuration

## 📊 Monitoring & Analytics

### Application Monitoring
- **Sentry**: Error tracking and performance monitoring
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Winston**: Structured logging

### Business Analytics
- Token usage tracking
- Cost optimization metrics
- Project success rates
- User engagement analytics

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Use conventional commit messages
- Ensure all linters pass before committing

### Pull Request Guidelines
- Include a clear description of changes
- Add tests for new functionality
- Update documentation as needed
- Ensure CI/CD pipeline passes

## 📚 Documentation

- [Product Requirements Document](./PRD.md) - Complete product specifications
- [Technology Stack](./TECH_STACK.md) - Detailed technology choices
- [API Documentation](./docs/api.md) - REST API reference
- [Deployment Guide](./docs/deployment.md) - Production deployment instructions
- [Contributing Guide](./docs/contributing.md) - Development guidelines

## 🎯 Roadmap

### Phase 1: Foundation (Months 1-3)
- ✅ Core platform architecture
- ✅ Basic Slack and GitHub integrations
- 🔄 Simple AI agent framework
- 🔄 Basic dashboard with project overview

### Phase 2: Intelligence (Months 4-6)
- 📋 Advanced AI agents for code generation
- 📋 Financial tracking and budget management
- 📋 Enhanced dashboard with analytics
- 📋 Multi-project support

### Phase 3: Scale (Months 7-9)
- 📋 Advanced integrations and webhooks
- 📋 Sophisticated agent orchestration
- 📋 Comprehensive financial analytics
- 📋 Enterprise security features

### Phase 4: Optimization (Months 10-12)
- 📋 Performance optimization
- 📋 Advanced AI capabilities
- 📋 Custom workflow builder
- 📋 Enterprise deployment options

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/your-org/studio/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/your-org/studio/discussions)
- **Security Issues**: [Security Policy](./SECURITY.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT API access
- Anthropic for Claude API integration
- The open-source community for excellent tools and libraries
- All contributors who make this project possible

---

**Built with ❤️ by the RyzLabs team**

For more information, visit our [documentation](./docs/) or contact us at [support@ryzlabs.com](mailto:support@ryzlabs.com).