#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function updateProject() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Updating project with GitHub repository information...');

    // Update the studio project with GitHub repo details
    const project = await prisma.project.update({
      where: { id: 'studio-project' },
      data: {
        githubRepoId: '67890',
        githubRepoName: 'studio',
        githubOwner: 'ieltxualganaras'
      }
    });

    console.log('✅ Updated project with GitHub repository:', {
      id: project.id,
      name: project.name,
      githubOwner: project.githubOwner,
      githubRepoName: project.githubRepoName,
      githubRepoId: project.githubRepoId
    });

  } catch (error) {
    console.error('❌ Error updating project:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateProject().catch((e) => {
  console.error(e);
  process.exit(1);
});