#!/usr/bin/env node

/**
 * Test the meta-development workflow:
 * 1. Create specialized agents
 * 2. Create a test project and connect repository
 * 3. Create GitHub issues with 'ai-ready' labels
 * 4. Verify agent assignment and task execution
 */

const http = require('http');

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9917,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testMetaDevelopment() {
  console.log('🚀 Testing Studio Meta-Development System\n');

  try {
    // Test 1: Check backend health
    console.log('1️⃣  Testing backend health...');
    const health = await makeRequest('GET', '/health');
    console.log('✅ Backend health:', health.data.status);

    // Test 2: Create specialized agents
    console.log('\n2️⃣  Creating specialized agents...');
    
    const agentTypes = [
      { name: 'Backend Specialist', type: 'BACKEND' },
      { name: 'Frontend Expert', type: 'FRONTEND' },
      { name: 'DevOps Engineer', type: 'DEVOPS' },
      { name: 'Testing Specialist', type: 'TESTING' },
      { name: 'Documentation Writer', type: 'DOCUMENTATION' }
    ];

    const createdAgents = [];
    for (const agentConfig of agentTypes) {
      try {
        const response = await makeRequest('POST', '/api/v1/agents', agentConfig);
        if (response.status === 201) {
          createdAgents.push(response.data.data.agent);
          console.log(`  ✅ Created ${agentConfig.name} (${agentConfig.type})`);
        } else {
          console.log(`  ⚠️  Failed to create ${agentConfig.name}:`, response.data);
        }
      } catch (error) {
        console.log(`  ❌ Error creating ${agentConfig.name}:`, error.message);
      }
    }

    // Test 3: List available agents
    console.log('\n3️⃣  Listing available agents...');
    const agentsResponse = await makeRequest('GET', '/api/v1/agents');
    if (agentsResponse.status === 200) {
      const agents = agentsResponse.data.data.agents;
      console.log(`  ✅ Found ${agents.length} agents:`);
      agents.forEach(agent => {
        console.log(`    - ${agent.name} (${agent.type}) - Status: ${agent.status}`);
      });
    } else {
      console.log('  ❌ Failed to get agents:', agentsResponse.data);
    }

    // Test 4: Test task queue and stats
    console.log('\n4️⃣  Testing task queue...');
    
    // Create a test task
    const testTask = {
      type: 'code_generation',
      priority: 'high',
      projectId: 'test-project',
      githubIssueId: 123,
      payload: {
        issue: {
          number: 123,
          title: 'Test: Implement user authentication',
          body: 'Add JWT-based authentication with login/logout functionality',
          labels: [{ name: 'ai-ready' }, { name: 'feature' }]
        },
        repository: {
          owner: 'ieltxua',
          name: 'studio',
          full_name: 'ieltxua/studio'
        }
      }
    };

    const taskResponse = await makeRequest('POST', '/api/v1/tasks', testTask);
    if (taskResponse.status === 200) {
      console.log('  ✅ Created test task:', taskResponse.data.data.task.id);
    } else {
      console.log('  ⚠️  Test task creation response:', taskResponse.data);
    }

    // Check task stats
    const statsResponse = await makeRequest('GET', '/api/v1/tasks/stats');
    if (statsResponse.status === 200) {
      const stats = statsResponse.data.data;
      console.log(`  📊 Task Stats: ${stats.total} total, ${stats.processing} processing, ${stats.completed} completed`);
    }

    // Test 5: Test organization stats with real agent data
    console.log('\n5️⃣  Testing organization stats...');
    const orgStatsResponse = await makeRequest('GET', '/api/v1/organizations/current/stats');
    if (orgStatsResponse.status === 200) {
      const stats = orgStatsResponse.data.data.stats;
      console.log('  📈 Organization Stats:');
      console.log(`    - Projects: ${stats.projects.total} total, ${stats.projects.active} active`);
      console.log(`    - Agents: ${stats.agents.total} total, ${stats.agents.active} active, ${stats.agents.idle} idle`);
      console.log(`    - Tasks: ${stats.tasks.total} total, ${stats.tasks.completionRate}% completion rate`);
      console.log(`    - Members: ${stats.members.total} total`);
    }

    console.log('\n🎉 Meta-Development System Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('  1. Set up PostgreSQL database for persistent storage');
    console.log('  2. Connect real GitHub repositories');
    console.log('  3. Create GitHub issues with "ai-ready" labels');
    console.log('  4. Watch agents automatically process issues');
    console.log('  5. Configure Claude Code path for actual code execution');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMetaDevelopment();