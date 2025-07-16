import { PrismaClient, Role, ProjectRole, AgentType, TaskType, Priority } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting database seed...');

  // Create demo organization
  const organization = await prisma.organization.create({
    data: {
      name: 'RyzLabs',
      slug: 'ryzlabs',
      description: 'AI-powered development automation company',
      planType: 'PROFESSIONAL',
      maxProjects: 50,
      maxAgents: 20,
      maxUsers: 100,
    },
  });

  console.log('✅ Created organization:', organization.name);

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ryzlabs.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: hashedPassword,
      emailVerified: new Date(),
    },
  });

  const devUser = await prisma.user.create({
    data: {
      email: 'developer@ryzlabs.com',
      username: 'developer',
      firstName: 'Developer',
      lastName: 'User',
      passwordHash: hashedPassword,
      emailVerified: new Date(),
    },
  });

  console.log('✅ Created users:', adminUser.email, devUser.email);

  // Add users to organization
  await prisma.organizationUser.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: adminUser.id,
        role: Role.OWNER,
      },
      {
        organizationId: organization.id,
        userId: devUser.id,
        role: Role.MEMBER,
      },
    ],
  });

  console.log('✅ Added users to organization');

  // Create Studio project
  const studioProject = await prisma.project.create({
    data: {
      name: 'Studio AI Platform',
      description: 'The mother of all projects - AI automation platform for development',
      organizationId: organization.id,
      githubRepoName: 'studio',
      githubOwner: 'ryzlabs',
      budgetLimit: 10000.00,
      tokenLimit: 1000000,
      settings: {
        autoCreateIssues: true,
        slackNotifications: true,
        aiCodeReview: true,
      },
    },
  });

  console.log('✅ Created Studio project');

  // Add users to project
  await prisma.projectUser.createMany({
    data: [
      {
        projectId: studioProject.id,
        userId: adminUser.id,
        role: ProjectRole.OWNER,
        permissions: ['all'],
      },
      {
        projectId: studioProject.id,
        userId: devUser.id,
        role: ProjectRole.DEVELOPER,
        permissions: ['read', 'write', 'execute'],
      },
    ],
  });

  console.log('✅ Added users to Studio project');

  // Create demo agents
  const agents = await prisma.agent.createMany({
    data: [
      {
        name: 'Backend Development Agent',
        type: AgentType.BACKEND,
        organizationId: organization.id,
        projectId: studioProject.id,
        capabilities: ['nodejs', 'typescript', 'api-design', 'database'],
        configuration: {
          preferredFramework: 'express',
          testingFramework: 'jest',
          ormPreference: 'prisma',
        },
        model: 'claude-3-sonnet',
        maxTokens: 4000,
        temperature: 0.7,
      },
      {
        name: 'Frontend Development Agent',
        type: AgentType.FRONTEND,
        organizationId: organization.id,
        projectId: studioProject.id,
        capabilities: ['react', 'typescript', 'ui-design', 'responsive'],
        configuration: {
          preferredFramework: 'react',
          stateManagement: 'zustand',
          stylingFramework: 'tailwind',
        },
        model: 'claude-3-sonnet',
        maxTokens: 4000,
        temperature: 0.8,
      },
      {
        name: 'DevOps Agent',
        type: AgentType.DEVOPS,
        organizationId: organization.id,
        capabilities: ['docker', 'kubernetes', 'ci-cd', 'monitoring'],
        configuration: {
          cloudProvider: 'aws',
          containerOrchestration: 'kubernetes',
          cicdPlatform: 'github-actions',
        },
        model: 'claude-3-sonnet',
        maxTokens: 3000,
        temperature: 0.6,
      },
      {
        name: 'QA Testing Agent',
        type: AgentType.TESTING,
        organizationId: organization.id,
        projectId: studioProject.id,
        capabilities: ['unit-testing', 'integration-testing', 'e2e-testing', 'performance'],
        configuration: {
          testingFrameworks: ['jest', 'playwright', 'cypress'],
          coverageThreshold: 80,
          performanceBudget: '2s',
        },
        model: 'claude-3-haiku',
        maxTokens: 2000,
        temperature: 0.5,
      },
    ],
  });

  console.log('✅ Created demo agents');

  // Create milestone
  const backendMilestone = await prisma.milestone.create({
    data: {
      title: 'Backend API Foundation',
      description: 'Complete backend API with authentication, database, and core endpoints',
      projectId: studioProject.id,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  console.log('✅ Created backend milestone');

  // Create demo tasks
  const tasks = [
    {
      title: 'Setup Backend Project Structure',
      description: 'Initialize Node.js/TypeScript backend with proper project structure',
      type: TaskType.FEATURE,
      priority: Priority.HIGH,
      estimatedDuration: 60,
      acceptanceCriteria: [
        'TypeScript configured with strict mode',
        'ESLint and Prettier setup',
        'Jest testing framework configured',
        'Docker development environment',
      ],
      status: 'COMPLETED' as const,
      progress: 100,
      completedAt: new Date(),
    },
    {
      title: 'Database Schema Design and Setup',
      description: 'Design and implement PostgreSQL database schema for users, projects, agents, tasks',
      type: TaskType.FEATURE,
      priority: Priority.HIGH,
      estimatedDuration: 90,
      acceptanceCriteria: [
        'User management tables with roles',
        'Project and organization structure',
        'Agent and task tracking tables',
        'Audit logging for all operations',
        'Database migrations system',
      ],
      status: 'IN_PROGRESS' as const,
      progress: 75,
      startedAt: new Date(),
    },
    {
      title: 'Authentication and Authorization System',
      description: 'Implement JWT-based authentication with role-based access control',
      type: TaskType.FEATURE,
      priority: Priority.HIGH,
      estimatedDuration: 120,
      acceptanceCriteria: [
        'JWT token generation and validation',
        'Password hashing with bcrypt',
        'Role-based permissions system',
        'OAuth integration (GitHub, Google)',
      ],
      status: 'PENDING' as const,
      dependencies: ['task-002'],
    },
    {
      title: 'Core API Endpoints',
      description: 'Implement RESTful API endpoints for projects, users, agents, and tasks',
      type: TaskType.FEATURE,
      priority: Priority.MEDIUM,
      estimatedDuration: 180,
      acceptanceCriteria: [
        'User management endpoints',
        'Project CRUD operations',
        'Agent registration and management',
        'Task creation and tracking',
      ],
      status: 'PENDING' as const,
      dependencies: ['task-003'],
    },
  ];

  for (const [index, taskData] of tasks.entries()) {
    await prisma.task.create({
      data: {
        ...taskData,
        projectId: studioProject.id,
        milestoneId: backendMilestone.id,
        assigneeId: index % 2 === 0 ? adminUser.id : devUser.id,
        acceptanceCriteria: taskData.acceptanceCriteria,
        dependencies: taskData.dependencies || [],
      },
    });
  }

  console.log('✅ Created demo tasks');

  // Create audit log entries
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'project.created',
        resource: 'project',
        resourceId: studioProject.id,
        userId: adminUser.id,
        organizationId: organization.id,
        details: { projectName: studioProject.name },
      },
      {
        action: 'user.invited',
        resource: 'user',
        resourceId: devUser.id,
        userId: adminUser.id,
        organizationId: organization.id,
        projectId: studioProject.id,
        details: { invitedEmail: devUser.email, role: 'DEVELOPER' },
      },
      {
        action: 'agent.created',
        resource: 'agent',
        userId: adminUser.id,
        organizationId: organization.id,
        projectId: studioProject.id,
        details: { agentType: 'BACKEND', agentName: 'Backend Development Agent' },
      },
    ],
  });

  console.log('✅ Created audit log entries');

  // Update project statistics
  await prisma.project.update({
    where: { id: studioProject.id },
    data: {
      currentSpent: 45.67,
      currentTokens: 15432,
    },
  });

  console.log('✅ Updated project statistics');

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - Organization: ${organization.name}`);
  console.log(`  - Users: ${adminUser.email}, ${devUser.email}`);
  console.log(`  - Project: ${studioProject.name}`);
  console.log(`  - Agents: 4 specialized agents`);
  console.log(`  - Tasks: ${tasks.length} development tasks`);
  console.log(`  - Milestone: ${backendMilestone.title}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });