import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { connectDatabase } from '../core/database';
import User from '../models/user.model';
import Team from '../models/team.model';
import Project from '../models/project.model';
import Task from '../models/task.model';
import { TaskPriority, TaskStatus } from '../interfaces/task.interface';

const app = createApp();

describe('Task Management API Tests', () => {
  let authToken: string;
  let userId: string;
  let teamId: string;
  let projectId: string;
  let taskId: string;
  let assigneeId: string;
  let assigneeToken: string;

  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();
  }, 45000);

  afterAll(async () => {
    // Clean up and close database connection
    await User.deleteMany({});
    await Team.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear all data before each test (in correct order - dependencies first)
    await Task.deleteMany({});
    await Project.deleteMany({});
    await Team.deleteMany({});
    await User.deleteMany({});
    
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Reset variables
    authToken = '';
    userId = '';
    teamId = '';
    projectId = '';
    taskId = '';
    assigneeId = '';
    assigneeToken = '';

    // Create and login a test user (team owner)
    const user = new User({
      name: 'Test User',
      email: 'testuser@example.com',
      isVerified: true,
      password: 'testPassword123',
    });
    await user.save();
    userId = (user as any)._id.toString();

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'testPassword123',
      });

    if (!loginResponse.body || !loginResponse.body.data || !loginResponse.body.data.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = loginResponse.body.data.token;

    // Create a second user (assignee)
    const assigneeUser = new User({
      name: 'Assignee User',
      email: 'assignee@example.com',
      isVerified: true,
      password: 'password123',
    });
    await assigneeUser.save();
    assigneeId = (assigneeUser as any)._id.toString();

    // Login assignee
    const assigneeLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'assignee@example.com',
        password: 'password123',
      });
    
    if (!assigneeLogin.body || !assigneeLogin.body.data || !assigneeLogin.body.data.token) {
      throw new Error(`Assignee login failed: ${JSON.stringify(assigneeLogin.body)}`);
    }
    
    assigneeToken = assigneeLogin.body.data.token;

    // Create a team
    const teamResponse = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Team',
        description: 'A test team for task tests',
      });

    if (!teamResponse.body || !teamResponse.body.data || !teamResponse.body.data.id) {
      throw new Error(`Team creation failed: ${JSON.stringify(teamResponse.body)}`);
    }

    teamId = teamResponse.body.data.id;

    // Add assignee to team
    const addMemberResponse = await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: 'assignee@example.com',
      });

    if (!addMemberResponse.body || !addMemberResponse.body.success) {
      throw new Error(`Add member failed: ${JSON.stringify(addMemberResponse.body)}`);
    }

    // Create a project
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Project',
        description: 'A test project for task tests',
        teamId: teamId,
      });

    if (!projectResponse.body || !projectResponse.body.data || !projectResponse.body.data.id) {
      throw new Error(`Project creation failed: ${JSON.stringify(projectResponse.body)}`);
    }

    projectId = projectResponse.body.data.id;
  });

  describe('POST /api/tasks', () => {
    it('should create a new task without assignee', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          description: 'A test task description',
          priority: TaskPriority.HIGH,
          status: TaskStatus.TODO,
          projectId: projectId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task created successfully');
      expect(response.body.data.title).toBe('Test Task');
      expect(response.body.data.description).toBe('A test task description');
      expect(response.body.data.priority).toBe(TaskPriority.HIGH);
      expect(response.body.data.status).toBe(TaskStatus.TODO);
      expect(response.body.data).toHaveProperty('project');
      expect(response.body.data.project.id).toBe(projectId);
      expect(response.body.data).toHaveProperty('createdBy');
      expect(response.body.data.createdBy.id).toBe(userId);
      expect(response.body.data.assignee).toBeNull();

      taskId = response.body.data.id;
    });

    it('should create a task with assignee', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task with Assignee',
          description: 'Task assigned to someone',
          priority: TaskPriority.MEDIUM,
          assignee: assigneeId,
          projectId: projectId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignee).toBeDefined();
      expect(response.body.data.assignee.id).toBe(assigneeId);
      expect(response.body.data.assignee).toHaveProperty('name');
      expect(response.body.data.assignee).toHaveProperty('email');
    });

    it('should create a task with due date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task with Due Date',
          priority: TaskPriority.URGENT,
          dueDate: futureDate.toISOString(),
          projectId: projectId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dueDate).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          projectId: projectId,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid title (too short)', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'T', // Too short
          projectId: projectId,
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('title');
    });

    it('should fail with missing projectId', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('projectId');
    });

    it('should fail with invalid priority', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          priority: 'invalid-priority',
          projectId: projectId,
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('priority');
    });

    it('should fail with non-existent project', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          projectId: fakeProjectId,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail if user is not a team member', async () => {
      // Create another user not in the team
      const outsider = new User({
        name: 'Outsider',
        email: 'outsider@example.com',
        isVerified: true,
        password: 'password123',
      });
      await outsider.save();

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'outsider@example.com',
          password: 'password123',
        });

      const outsiderToken = loginRes.body.data.token;

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          title: 'Test Task',
          projectId: projectId,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-team member assignee', async () => {
      // Create another user not in the team
      const outsider = new User({
        name: 'Outsider',
        email: 'outsider@example.com',
        isVerified: true,
        password: 'password123',
      });
      await outsider.save();
      const outsiderId = (outsider as any)._id.toString();

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          assignee: outsiderId,
          projectId: projectId,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/project/:projectId', () => {
    beforeEach(async () => {
      // Create test tasks
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task 1',
          priority: TaskPriority.HIGH,
          status: TaskStatus.TODO,
          projectId: projectId,
        });

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task 2',
          priority: TaskPriority.LOW,
          status: TaskStatus.IN_PROGRESS,
          assignee: assigneeId,
          projectId: projectId,
        });

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task 3',
          priority: TaskPriority.URGENT,
          status: TaskStatus.DONE,
          projectId: projectId,
        });
    });

    it('should get all tasks for a project', async () => {
      const response = await request(app)
        .get(`/api/tasks/project/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(3);
      expect(response.body.data.count).toBe(3);
      expect(response.body.data.tasks[0]).toHaveProperty('title');
      expect(response.body.data.tasks[0]).toHaveProperty('priority');
      expect(response.body.data.tasks[0]).toHaveProperty('status');
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get(`/api/tasks/project/${projectId}?status=${TaskStatus.TODO}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].status).toBe(TaskStatus.TODO);
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get(`/api/tasks/project/${projectId}?priority=${TaskPriority.HIGH}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].priority).toBe(TaskPriority.HIGH);
    });

    it('should filter tasks by assignee', async () => {
      const response = await request(app)
        .get(`/api/tasks/project/${projectId}?assignee=${assigneeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].assignee.id).toBe(assigneeId);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/tasks/project/${projectId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-team members', async () => {
      // Create another user not in the team
      const outsider = new User({
        name: 'Outsider',
        email: 'outsider@example.com',
        isVerified: true,
        password: 'password123',
      });
      await outsider.save();

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'outsider@example.com',
          password: 'password123',
        });

      const outsiderToken = loginRes.body.data.token;

      const response = await request(app)
        .get(`/api/tasks/project/${projectId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/my-tasks', () => {
    beforeEach(async () => {
      // Create tasks assigned to assignee
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Assigned Task 1',
          assignee: assigneeId,
          projectId: projectId,
        });

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Assigned Task 2',
          assignee: assigneeId,
          status: TaskStatus.IN_PROGRESS,
          projectId: projectId,
        });

      // Create task not assigned to anyone
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Unassigned Task',
          projectId: projectId,
        });
    });

    it('should get all tasks assigned to authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks/my-tasks')
        .set('Authorization', `Bearer ${assigneeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      response.body.data.tasks.forEach((task: any) => {
        expect(task.assignee.id).toBe(assigneeId);
      });
    });

    it('should return empty array if user has no tasks', async () => {
      const response = await request(app)
        .get('/api/tasks/my-tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/tasks/my-tasks')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/:taskId', () => {
    beforeEach(async () => {
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          description: 'Test description',
          priority: TaskPriority.MEDIUM,
          projectId: projectId,
        });

      taskId = taskResponse.body.data.id;
    });

    it('should get task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.title).toBe('Test Task');
      expect(response.body.data).toHaveProperty('project');
      expect(response.body.data).toHaveProperty('createdBy');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent task', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/tasks/${fakeTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:taskId', () => {
    beforeEach(async () => {
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          description: 'Test description',
          priority: TaskPriority.LOW,
          status: TaskStatus.TODO,
          projectId: projectId,
        });

      taskId = taskResponse.body.data.id;
    });

    it('should update task details', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Task Title',
          description: 'Updated description',
          priority: TaskPriority.HIGH,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task updated successfully');
      expect(response.body.data.title).toBe('Updated Task Title');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.priority).toBe(TaskPriority.HIGH);
    });

    it('should update task assignee', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignee: assigneeId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignee).toBeDefined();
      expect(response.body.data.assignee.id).toBe(assigneeId);
    });

    it('should update task status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: TaskStatus.IN_PROGRESS,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({
          title: 'Updated Title',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid data', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'T', // Too short
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('title');
    });
  });

  describe('PATCH /api/tasks/:taskId/status', () => {
    beforeEach(async () => {
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          status: TaskStatus.TODO,
          projectId: projectId,
        });

      taskId = taskResponse.body.data.id;
    });

    it('should update task status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: TaskStatus.DONE,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(TaskStatus.DONE);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .send({
          status: TaskStatus.DONE,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'invalid-status',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('status');
    });

    it('should fail with missing status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:taskId', () => {
    beforeEach(async () => {
      const taskResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          projectId: projectId,
        });

      taskId = taskResponse.body.data.id;
    });

    it('should delete task', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task deleted successfully');

      // Verify task is deleted
      const task = await Task.findById(taskId);
      expect(task).toBeNull();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent task', async () => {
      const fakeTaskId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/tasks/${fakeTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Integration Tests - Complete Task Flow', () => {
    it('should complete full task lifecycle', async () => {
      // Step 1: Create a task
      const createResponse = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Task',
          description: 'A task for integration testing',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          projectId: projectId,
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const newTaskId = createResponse.body.data.id;

      // Step 2: Get the task
      const getResponse = await request(app)
        .get(`/api/tasks/${newTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.title).toBe('Integration Task');

      // Step 3: Assign the task
      const assignResponse = await request(app)
        .put(`/api/tasks/${newTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignee: assigneeId,
        })
        .expect(200);

      expect(assignResponse.body.success).toBe(true);
      expect(assignResponse.body.data.assignee.id).toBe(assigneeId);

      // Step 4: Update task status to in progress
      const progressResponse = await request(app)
        .patch(`/api/tasks/${newTaskId}/status`)
        .set('Authorization', `Bearer ${assigneeToken}`)
        .send({
          status: TaskStatus.IN_PROGRESS,
        })
        .expect(200);

      expect(progressResponse.body.success).toBe(true);
      expect(progressResponse.body.data.status).toBe(TaskStatus.IN_PROGRESS);

      // Step 5: Verify in my-tasks
      const myTasksResponse = await request(app)
        .get('/api/tasks/my-tasks')
        .set('Authorization', `Bearer ${assigneeToken}`)
        .expect(200);

      expect(myTasksResponse.body.success).toBe(true);
      expect(myTasksResponse.body.data.tasks).toHaveLength(1);
      expect(myTasksResponse.body.data.tasks[0].id).toBe(newTaskId);

      // Step 6: Update task status to done
      const doneResponse = await request(app)
        .patch(`/api/tasks/${newTaskId}/status`)
        .set('Authorization', `Bearer ${assigneeToken}`)
        .send({
          status: TaskStatus.DONE,
        })
        .expect(200);

      expect(doneResponse.body.success).toBe(true);
      expect(doneResponse.body.data.status).toBe(TaskStatus.DONE);

      // Step 7: Delete the task
      const deleteResponse = await request(app)
        .delete(`/api/tasks/${newTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/tasks/${newTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(verifyResponse.body.success).toBe(false);
    });
  });
});
