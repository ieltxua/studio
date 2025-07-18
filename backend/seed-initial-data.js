#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function seed() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🌱 Seeding initial data...');

    // Create default organization
    const org = await prisma.organization.upsert({
      where: { id: 'default-org' },
      update: {},
      create: {
        id: 'default-org',
        name: 'Studio Development',
        slug: 'studio-dev',
        description: 'AI-powered project automation platform',
        planType: 'FREE',
        maxProjects: 10,
        maxAgents: 20,
        maxUsers: 5
      }
    });
    console.log('✅ Created organization:', org.name);

    // Create default project
    const project = await prisma.project.upsert({
      where: { id: 'studio-project' },
      update: {},
      create: {
        id: 'studio-project',
        name: 'Studio Development',
        description: 'The Studio AI project automation platform',
        status: 'ACTIVE',
        organizationId: org.id,
        settings: {
          enableAIAgents: true,
          autoCreatePRs: false,
          requireCodeReview: true
        }
      }
    });
    console.log('✅ Created project:', project.name);

    // Create initial agents
    const agentTypes = [
      { name: 'Backend Specialist', type: 'BACKEND', description: 'Specializes in API development, database design, and server architecture' },
      { name: 'Frontend Expert', type: 'FRONTEND', description: 'Expert in React, UI components, and user experience' },
      { name: 'DevOps Engineer', type: 'DEVOPS', description: 'Manages CI/CD, deployment, and infrastructure' },
      { name: 'Testing Specialist', type: 'TESTING', description: 'Creates and maintains automated tests and quality assurance' },
      { name: 'Documentation Writer', type: 'DOCUMENTATION', description: 'Creates comprehensive documentation and guides' },
      { name: 'Code Reviewer', type: 'REVIEW', description: 'Performs security analysis and code quality reviews' }
    ];

    for (const agentConfig of agentTypes) {
      const agentId = `${agentConfig.type.toLowerCase()}-agent-${org.id}`;
      const agent = await prisma.agent.upsert({
        where: { id: agentId },
        update: {},
        create: {
          id: agentId,
          name: agentConfig.name,
          type: agentConfig.type,
          status: 'IDLE',
          organizationId: org.id,
          projectId: project.id,
          capabilities: JSON.stringify([]),
          configuration: JSON.stringify({
            agentType: agentConfig.type,
            description: agentConfig.description,
            capabilities: [],
            skillKeywords: [],
            defaultModel: 'claude-3-sonnet',
            maxTokens: 4000,
            temperature: 0.5,
            maxConcurrentTasks: 2,
            workspaceConfig: {
              preferredLanguages: ['typescript', 'javascript'],
              toolPreferences: ['claude-code'],
              codeStyleGuide: 'standard'
            }
          }),
          model: 'claude-3-sonnet',
          maxTokens: 4000,
          temperature: 0.5
        }
      });
      console.log(`✅ Created agent: ${agent.name} (${agent.type})`);
    }

    console.log('\n🎉 Initial data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Organization: ${org.name}`);
    console.log(`  - Project: ${project.name}`);
    console.log(`  - Agents: ${agentTypes.length} specialized agents`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});