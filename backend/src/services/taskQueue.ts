import { EventEmitter } from 'events';
import { claudeCodeExecutor, ExecuteTaskRequest } from './claudeCodeExecutor';
import { db } from './database';

export interface Task {
  id: string;
  type: 'code_generation' | 'bug_fix' | 'code_review' | 'documentation' | 'testing';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  projectId: string;
  agentId?: string;
  githubIssueId?: number;
  githubPullRequestId?: number;
  payload: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

class TaskQueue extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private pendingQueue: Task[] = [];
  private processingTasks: Map<string, Task> = new Map();
  private maxConcurrentTasks = 3;

  /**
   * Add a task to the queue
   */
  async addTask(task: Omit<Task, 'id' | 'status' | 'createdAt'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date()
    };

    this.tasks.set(newTask.id, newTask);
    this.pendingQueue.push(newTask);
    
    // Sort by priority
    this.pendingQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.emit('task:added', newTask);
    
    // Try to process tasks
    this.processNextTask();

    return newTask;
  }

  /**
   * Process the next task in queue
   */
  private async processNextTask() {
    if (this.processingTasks.size >= this.maxConcurrentTasks) {
      return;
    }

    const task = this.pendingQueue.shift();
    if (!task) {
      return;
    }

    task.status = 'in_progress';
    task.startedAt = new Date();
    this.processingTasks.set(task.id, task);

    this.emit('task:started', task);

    try {
      const result = await this.executeTask(task);
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;
      
      this.emit('task:completed', task);
    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.emit('task:failed', task);
    } finally {
      this.processingTasks.delete(task.id);
      this.processNextTask(); // Process next task
    }
  }

  /**
   * Execute a task using Claude Code
   */
  private async executeTask(task: Task): Promise<any> {
    console.log(`🎯 Executing task ${task.id} of type ${task.type}`);
    
    // Check if this task has the required context for Claude Code execution
    const payload = task.payload;
    if (payload && payload.agent && payload.issue && payload.repository) {
      try {
        console.log(`🚀 Starting Claude Code execution for task ${task.id}`);
        
        // Prepare execution request
        const executeRequest: ExecuteTaskRequest = {
          taskId: payload.dbTaskId || task.id,
          agentId: task.agentId || payload.agent.id,
          repository: {
            owner: payload.repository.owner,
            name: payload.repository.name,
            cloneUrl: payload.repository.clone_url || `https://github.com/${payload.repository.owner}/${payload.repository.name}.git`,
            defaultBranch: payload.repository.default_branch || 'main'
          },
          issue: {
            number: payload.issue.number,
            title: payload.issue.title,
            body: payload.issue.body || '',
            labels: payload.issue.labels?.map((l: any) => l.name) || []
          },
          agent: payload.agent
        };
        
        // Execute with Claude Code
        const result = await claudeCodeExecutor.executeTask(executeRequest);
        
        console.log(`✅ Claude Code execution completed for task ${task.id}:`, result.summary);
        
        return result;
        
      } catch (error) {
        console.error(`❌ Claude Code execution failed for task ${task.id}:`, error);
        throw error;
      }
    } else {
      // Fallback for tasks without Claude Code context
      console.log(`⚠️  Task ${task.id} missing Claude Code context, using fallback execution`);
      
      // Simple simulation for backwards compatibility
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      switch (task.type) {
        case 'code_generation':
          return { 
            success: true,
            summary: 'Code generation completed (simulated)',
            filesModified: [],
            filesCreated: ['example.ts']
          };
        case 'bug_fix':
          return { 
            success: true,
            summary: 'Bug fix completed (simulated)',
            filesModified: ['src/buggyFile.ts'],
            filesCreated: []
          };
        case 'code_review':
          return { 
            success: true,
            summary: 'Code review completed (simulated)',
            review: 'Code looks good!'
          };
        case 'documentation':
          return { 
            success: true,
            summary: 'Documentation updated (simulated)',
            filesModified: ['README.md'],
            filesCreated: []
          };
        case 'testing':
          return { 
            success: true,
            summary: 'Tests added (simulated)',
            filesCreated: ['tests/example.test.ts'],
            filesModified: []
          };
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    }
  }

  /**
   * Get task by ID
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: Task['status']): Task[] {
    return this.getAllTasks().filter(task => task.status === status);
  }

  /**
   * Get tasks by project
   */
  getTasksByProject(projectId: string): Task[] {
    return this.getAllTasks().filter(task => task.projectId === projectId);
  }

  /**
   * Cancel a task
   */
  async cancelTask(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'pending') {
      return false;
    }

    const index = this.pendingQueue.findIndex(t => t.id === id);
    if (index > -1) {
      this.pendingQueue.splice(index, 1);
      task.status = 'failed';
      task.error = 'Task cancelled';
      this.emit('task:cancelled', task);
      return true;
    }

    return false;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const tasks = this.getAllTasks();
    return {
      total: tasks.length,
      pending: this.pendingQueue.length,
      processing: this.processingTasks.size,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      averageProcessingTime: this.calculateAverageProcessingTime()
    };
  }

  /**
   * Calculate average processing time
   */
  private calculateAverageProcessingTime(): number {
    const completedTasks = this.getAllTasks().filter(
      t => t.status === 'completed' && t.startedAt && t.completedAt
    );

    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const duration = task.completedAt!.getTime() - task.startedAt!.getTime();
      return sum + duration;
    }, 0);

    return totalTime / completedTasks.length;
  }
}

// Export singleton instance
export const taskQueue = new TaskQueue();

// Listen to task events for logging
taskQueue.on('task:added', (task: Task) => {
  console.log(`Task added: ${task.id} (${task.type})`);
});

taskQueue.on('task:started', (task: Task) => {
  console.log(`Task started: ${task.id}`);
});

taskQueue.on('task:completed', (task: Task) => {
  console.log(`Task completed: ${task.id}`);
});

taskQueue.on('task:failed', (task: Task) => {
  console.error(`Task failed: ${task.id} - ${task.error}`);
});