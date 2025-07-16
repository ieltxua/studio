# Studio AI Executive Dashboard

A modern, real-time executive dashboard for the Studio AI platform, providing comprehensive insights into AI-powered development operations.

## Features

### Core Functionality
- **Real-time Metrics**: Live updates via WebSocket for immediate visibility
- **Project Overview**: Track progress, status, and resource allocation
- **AI Agent Monitoring**: Monitor agent activity, performance, and utilization
- **Cost Analytics**: Detailed cost tracking and budget management
- **Token Usage**: Track AI model token consumption and trends
- **Team Productivity**: Measure automation effectiveness and task completion

### Technical Features
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Interactive Visualizations**: Charts and graphs using Chart.js and Recharts
- **Material-UI Components**: Consistent, professional UI design
- **Type Safety**: Full TypeScript implementation
- **Real-time Updates**: WebSocket integration for live data
- **Performance Optimized**: React Query for efficient data fetching and caching

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Material-UI (MUI)** for component library
- **React Query** for server state management
- **React Router** for navigation
- **Chart.js & Recharts** for data visualization
- **Socket.io Client** for real-time updates
- **Axios** for API communication

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Studio backend API running on port 8080

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration

### Development

Start the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── MetricCard.tsx   # KPI display cards
│   ├── CostChart.tsx    # Cost trend visualization
│   ├── AgentActivityTable.tsx # Agent monitoring table
│   └── ...
├── contexts/           # React contexts
│   ├── AuthContext.tsx # Authentication state
│   └── WebSocketContext.tsx # Real-time connections
├── hooks/              # Custom React hooks
│   └── useDashboardData.ts # Data fetching hooks
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Projects.tsx    # Project management
│   ├── Agents.tsx      # Agent monitoring
│   └── ...
├── services/           # API services
│   └── api.ts         # API client configuration
├── styles/            # Theme and global styles
│   └── theme.ts       # MUI theme configuration
└── types/             # TypeScript type definitions
    └── index.ts       # Shared interfaces
```

## Key Components

### Dashboard Overview
The main dashboard provides:
- Key performance indicators (KPIs)
- Cost and token usage trends
- Active project progress
- Agent activity monitoring
- Real-time updates

### Project Management
- View all projects with status
- Track progress and resource allocation
- Monitor costs per project
- Manage project settings

### Agent Monitoring
- Real-time agent status
- Performance metrics
- Task completion rates
- Cost tracking per agent

### Analytics
- Detailed cost analysis
- Token usage patterns
- Productivity metrics
- Customizable time ranges

## API Integration

The dashboard integrates with the Studio backend API:
- Authentication via JWT tokens
- RESTful API endpoints for data fetching
- WebSocket for real-time updates
- Automatic token refresh

## Deployment

The dashboard can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- nginx

Build the project and deploy the `dist` folder.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT