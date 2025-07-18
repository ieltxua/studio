import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { db } from './database';

export interface ClaudeCodeSession {
  id: string;
  agentId: string;
  taskId: string;
  repositoryPath: string;
  process?: ChildProcess;
  status: 'initializing' | 'active' | 'completed' | 'failed' | 'terminated';
  createdAt: Date;
  completedAt?: Date;
  result?: ClaudeCodeResult;
  error?: string;
}

export interface ClaudeCodeResult {
  success: boolean;
  filesModified: string[];
  filesCreated: string[];
  filesDeleted: string[];
  branchCreated?: string | undefined;
  commitHash?: string | undefined;
  pullRequestUrl?: string | undefined;
  summary: string;
  error?: string;
}

export interface ExecuteTaskRequest {
  taskId: string;
  agentId: string;
  repository: {
    owner: string;
    name: string;
    cloneUrl: string;
    defaultBranch: string;
  };
  issue: {
    number: number;
    title: string;
    body: string;
    labels: string[];
  };
  agent: {
    id: string;
    name: string;
    type: string;
    configuration: any;
  };
}

export class ClaudeCodeExecutor {
  private sessions: Map<string, ClaudeCodeSession> = new Map();
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = process.env['CLAUDE_WORKSPACE_ROOT'] || '/tmp/studio-workspaces';
    this.ensureWorkspaceRoot();
  }

  /**
   * Execute a task using Claude Code
   */
  async executeTask(request: ExecuteTaskRequest): Promise<ClaudeCodeResult> {
    const sessionId = `session_${Date.now()}_${request.taskId}`;
    
    console.log(`🚀 Starting Claude Code execution for task ${request.taskId}`);

    try {
      // Create session
      const session = await this.createSession(sessionId, request);
      
      // Clone/update repository
      await this.setupRepository(session, request.repository);
      
      // Execute Claude Code
      const result = await this.runClaudeCode(session, request);
      
      // Complete session
      session.status = result.success ? 'completed' : 'failed';
      session.completedAt = new Date();
      session.result = result;
      
      // Update database
      await this.updateTaskResult(request.taskId, result);
      
      console.log(`✅ Claude Code execution completed for task ${request.taskId}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Claude Code execution failed for task ${request.taskId}:`, error);
      
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'failed';
        session.error = error instanceof Error ? error.message : 'Unknown error';
        session.completedAt = new Date();
      }
      
      const failureResult: ClaudeCodeResult = {
        success: false,
        filesModified: [],
        filesCreated: [],
        filesDeleted: [],
        summary: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      await this.updateTaskResult(request.taskId, failureResult);
      return failureResult;
    } finally {
      // Cleanup session
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Create a new Claude Code session
   */
  private async createSession(sessionId: string, request: ExecuteTaskRequest): Promise<ClaudeCodeSession> {
    const repositoryPath = path.join(
      this.workspaceRoot,
      request.agentId,
      `${request.repository.owner}-${request.repository.name}`
    );

    const session: ClaudeCodeSession = {
      id: sessionId,
      agentId: request.agentId,
      taskId: request.taskId,
      repositoryPath,
      status: 'initializing',
      createdAt: new Date()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Setup repository workspace
   */
  private async setupRepository(session: ClaudeCodeSession, repository: any): Promise<void> {
    const { repositoryPath } = session;
    
    try {
      await fs.mkdir(path.dirname(repositoryPath), { recursive: true });
      
      // Check if repository already exists
      const repoExists = await fs.access(repositoryPath).then(() => true).catch(() => false);
      
      if (repoExists) {
        console.log(`📂 Repository exists, updating: ${repositoryPath}`);
        // Update existing repository
        await this.execCommand('git', ['fetch', 'origin'], repositoryPath);
        await this.execCommand('git', ['checkout', repository.defaultBranch], repositoryPath);
        await this.execCommand('git', ['pull', 'origin', repository.defaultBranch], repositoryPath);
      } else {
        console.log(`📥 Cloning repository: ${repository.cloneUrl}`);
        // Clone repository
        await this.execCommand('git', ['clone', repository.cloneUrl, repositoryPath]);
      }
      
      // Create a new branch for this task
      const branchName = `studio/task-${session.taskId}-${Date.now()}`;
      await this.execCommand('git', ['checkout', '-b', branchName], repositoryPath);
      
      console.log(`🌿 Created branch: ${branchName}`);
      
    } catch (error) {
      throw new Error(`Failed to setup repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Run Claude Code with the task context
   */
  private async runClaudeCode(session: ClaudeCodeSession, request: ExecuteTaskRequest): Promise<ClaudeCodeResult> {
    const { repositoryPath } = session;
    
    // Create task context file
    const taskContext = this.generateTaskContext(request);
    const contextFile = path.join(repositoryPath, '.studio-task-context.md');
    await fs.writeFile(contextFile, taskContext);
    
    console.log(`📝 Created task context file: ${contextFile}`);
    
    // Prepare Claude Code command
    const claudeCodePath = process.env['CLAUDE_CODE_PATH'] || 'claude-code';
    
    // Create the prompt for Claude Code
    const prompt = this.generateClaudeCodePrompt(request);
    
    try {
      // Start Claude Code session
      session.status = 'active';
      
      console.log(`🎯 Starting Claude Code in: ${repositoryPath}`);
      console.log(`📋 Task: ${request.issue.title}`);
      
      // Execute Claude Code with the task prompt
      const claudeResult = await this.execClaudeCode(claudeCodePath, prompt, repositoryPath);
      
      // Analyze changes made
      const changes = await this.analyzeChanges(repositoryPath);
      
      // Commit changes if any
      let commitHash: string | undefined;
      let branchName: string | undefined;
      
      if (changes.filesModified.length > 0 || changes.filesCreated.length > 0 || changes.filesDeleted.length > 0) {
        commitHash = await this.commitChanges(repositoryPath, request);
        branchName = await this.getCurrentBranch(repositoryPath);
        
        console.log(`💾 Committed changes: ${commitHash}`);
      }
      
      // Create pull request (if configured)
      let pullRequestUrl: string | undefined;
      if (commitHash && process.env['CREATE_AUTO_PRS'] === 'true') {
        pullRequestUrl = await this.createPullRequest(request, branchName!, commitHash);
      }
      
      return {
        success: true,
        filesModified: changes.filesModified,
        filesCreated: changes.filesCreated,
        filesDeleted: changes.filesDeleted,
        branchCreated: branchName || undefined,
        commitHash: commitHash || undefined,
        pullRequestUrl: pullRequestUrl || undefined,
        summary: `Successfully completed task: ${request.issue.title}. Modified ${changes.filesModified.length} files, created ${changes.filesCreated.length} files.`
      };
      
    } catch (error) {
      throw new Error(`Claude Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up context file
      await fs.unlink(contextFile).catch(() => {});
    }
  }

  /**
   * Generate task context for Claude Code
   */
  private generateTaskContext(request: ExecuteTaskRequest): string {
    return `# Studio AI Task Context

## Task Information
- **Task ID**: ${request.taskId}
- **Agent**: ${request.agent.name} (${request.agent.type})
- **Repository**: ${request.repository.owner}/${request.repository.name}

## GitHub Issue
- **Number**: #${request.issue.number}
- **Title**: ${request.issue.title}
- **Labels**: ${request.issue.labels.join(', ')}

### Description
${request.issue.body}

## Agent Configuration
- **Type**: ${request.agent.type}
- **Capabilities**: ${JSON.stringify(request.agent.configuration.capabilities, null, 2)}
- **Preferred Languages**: ${JSON.stringify(request.agent.configuration.workspaceConfig?.preferredLanguages, null, 2)}
- **Code Style**: ${request.agent.configuration.workspaceConfig?.codeStyleGuide}

## Instructions
This task has been assigned to you by the Studio AI platform. Please:

1. Analyze the GitHub issue requirements carefully
2. Implement the requested changes following best practices
3. Ensure code quality and maintainability
4. Add appropriate tests if needed
5. Update documentation if necessary

The changes will be automatically committed and a pull request may be created.
`;
  }

  /**
   * Generate Claude Code prompt
   */
  private generateClaudeCodePrompt(request: ExecuteTaskRequest): string {
    const agentType = request.agent.type.toLowerCase();
    
    return `I'm working on GitHub issue #${request.issue.number}: "${request.issue.title}"

${request.issue.body}

This task has been assigned to me as a ${agentType} specialist agent. I need to implement the requested changes following best practices for ${agentType} development.

Key requirements:
- Follow the coding standards specified in the project
- Ensure the implementation is maintainable and well-documented
- Add appropriate tests if needed
- Make atomic, focused changes that address the issue

Please analyze the codebase, understand the requirements, and implement the necessary changes.`;
  }

  /**
   * Execute Claude Code
   */
  private async execClaudeCode(claudeCodePath: string, prompt: string, workingDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(claudeCodePath, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Claude Code exited with code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Send the prompt to Claude Code
      process.stdin?.write(prompt);
      process.stdin?.end();
    });
  }

  /**
   * Execute shell command
   */
  private async execCommand(command: string, args: string[] = [], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Command "${command} ${args.join(' ')}" failed: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Analyze changes made to the repository
   */
  private async analyzeChanges(repositoryPath: string): Promise<{
    filesModified: string[];
    filesCreated: string[];
    filesDeleted: string[];
  }> {
    try {
      // Get git status
      const status = await this.execCommand('git', ['status', '--porcelain'], repositoryPath);
      
      const filesModified: string[] = [];
      const filesCreated: string[] = [];
      const filesDeleted: string[] = [];
      
      for (const line of status.split('\n')) {
        if (!line.trim()) continue;
        
        const status = line.substring(0, 2);
        const filename = line.substring(3);
        
        if (status.includes('M')) {
          filesModified.push(filename);
        } else if (status.includes('A') || status.includes('??')) {
          filesCreated.push(filename);
        } else if (status.includes('D')) {
          filesDeleted.push(filename);
        }
      }
      
      return { filesModified, filesCreated, filesDeleted };
      
    } catch (error) {
      console.warn('Failed to analyze changes:', error);
      return { filesModified: [], filesCreated: [], filesDeleted: [] };
    }
  }

  /**
   * Commit changes
   */
  private async commitChanges(repositoryPath: string, request: ExecuteTaskRequest): Promise<string> {
    try {
      // Add all changes
      await this.execCommand('git', ['add', '.'], repositoryPath);
      
      // Create commit message
      const commitMessage = `feat: ${request.issue.title}

Implemented changes for GitHub issue #${request.issue.number}

Agent: ${request.agent.name} (${request.agent.type})
Task ID: ${request.taskId}

Co-authored-by: Studio AI <studio@ai.com>`;

      // Commit changes
      await this.execCommand('git', ['commit', '-m', commitMessage], repositoryPath);
      
      // Get commit hash
      const commitHash = await this.execCommand('git', ['rev-parse', 'HEAD'], repositoryPath);
      
      return commitHash;
      
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current branch name
   */
  private async getCurrentBranch(repositoryPath: string): Promise<string> {
    return await this.execCommand('git', ['branch', '--show-current'], repositoryPath);
  }

  /**
   * Create pull request (placeholder - would integrate with GitHub API)
   */
  private async createPullRequest(request: ExecuteTaskRequest, branchName: string, commitHash: string): Promise<string> {
    // This would use the GitHub API to create a PR
    // For now, return a placeholder URL
    return `https://github.com/${request.repository.owner}/${request.repository.name}/pull/new/${branchName}`;
  }

  /**
   * Update task result in database
   */
  private async updateTaskResult(taskId: string, result: ClaudeCodeResult): Promise<void> {
    try {
      await db.prisma.task.update({
        where: { id: taskId },
        data: {
          status: result.success ? 'COMPLETED' : 'CANCELLED',
          completedAt: new Date(),
          progress: result.success ? 1.0 : 0.0,
          ...(result.commitHash && {
            blockers: {
              result: {
                commitHash: result.commitHash,
                branchCreated: result.branchCreated,
                pullRequestUrl: result.pullRequestUrl,
                filesModified: result.filesModified,
                filesCreated: result.filesCreated,
                summary: result.summary
              }
            }
          })
        }
      });
    } catch (error) {
      console.error('Failed to update task result:', error);
    }
  }

  /**
   * Ensure workspace root directory exists
   */
  private async ensureWorkspaceRoot(): Promise<void> {
    try {
      await fs.mkdir(this.workspaceRoot, { recursive: true });
    } catch (error) {
      console.error('Failed to create workspace root:', error);
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): ClaudeCodeSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.status === 'active' || session.status === 'initializing'
    );
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.process) {
        session.process.kill();
      }
      session.status = 'terminated';
      session.completedAt = new Date();
    }
  }
}

export const claudeCodeExecutor = new ClaudeCodeExecutor();