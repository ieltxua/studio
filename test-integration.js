#!/usr/bin/env node

const http = require('http');

// Create a test task via API
const taskData = JSON.stringify({
  type: 'code_generation',
  priority: 'high',
  projectId: 'ieltxua/studio',
  githubIssueId: 2,
  payload: {
    description: 'Implement user authentication feature',
    requirements: [
      'Email/password login',
      'OAuth integration',
      'JWT token management',
      'Password reset',
      'Remember me option'
    ]
  }
});

const options = {
  hostname: 'localhost',
  port: 9917,
  path: '/api/v1/tasks',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': taskData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', JSON.parse(data));
    
    // Now fetch the stats
    http.get('http://localhost:9917/api/v1/organizations/current/stats', (statsRes) => {
      let statsData = '';
      
      statsRes.on('data', (chunk) => {
        statsData += chunk;
      });
      
      statsRes.on('end', () => {
        const stats = JSON.parse(statsData);
        console.log('\nOrganization Stats:');
        console.log('- Total tasks:', stats.data.stats.tasks.total);
        console.log('- Active agents:', stats.data.stats.agents.active);
        console.log('- Completion rate:', stats.data.stats.tasks.completionRate + '%');
      });
    });
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(taskData);
req.end();