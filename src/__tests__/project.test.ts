import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { connectDatabase } from '../core/database';
import User from '../models/user.model';
import Team from '../models/team.model';
import Project from '../models/project.model';

const app = createApp();

describe('Project Management API Tests', () => {
  let authToken: string;
  let userId: string;
  let teamId: string;
  let projectId: string;

  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.deleteMany({});
    await Team.deleteMany({});
    await Project.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear all data before each test - in reverse dependency order
    await Project.deleteMany({});
    await Team.deleteMany({});
    await User.deleteMany({});
    
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    // Create and login a test user
    const testUser = {
      name: 'Test User',
      email: 'testuser@example.com',
      isVerified: true,
      password: 'testPassword123',
    };

    const user = new User(testUser);
    await user.save();
    userId = (user as any)._id.toString();

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    // Verify login succeeded
    if (!loginResponse.body || !loginResponse.body.data || !loginResponse.body.data.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
    }

    authToken = loginResponse.body.data.token;

    // Create a team for testing
    const teamResponse = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Team',
        description: 'A test team for project tests',
      });

    // Verify team creation succeeded
    if (!teamResponse.body || !teamResponse.body.data || !teamResponse.body.data.id) {
      throw new Error(`Team creation failed: ${JSON.stringify(teamResponse.body)}`);
    }

    teamId = teamResponse.body.data.id;
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          description: 'A test project description',
          teamId: teamId,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project created successfully');
      expect(response.body.data.name).toBe('Test Project');
      expect(response.body.data.description).toBe('A test project description');
      expect(response.body.data).toHaveProperty('team');
      expect(response.body.data.team.id).toBe(teamId);
      expect(response.body.data).toHaveProperty('creator');
      expect(response.body.data.creator.id).toBe(userId);
      expect(response.body.data).toHaveProperty('createdAt');

      projectId = response.body.data.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          teamId: teamId,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid project name', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'T', // Too short
          teamId: teamId,
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].field).toBe('name');
    });

    it('should fail with missing teamId', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].field).toBe('teamId');
    });

    it('should fail with invalid teamId format', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          teamId: 'invalid-id',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('teamId');
    });

    it('should fail with non-existent team', async () => {
      const fakeTeamId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          teamId: fakeTeamId,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail if user is not a team member', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@example.com',
        isVerified: true,
        password: 'password123',
      });
      await anotherUser.save();

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another@example.com',
          password: 'password123',
        });

      const anotherToken = loginRes.body.data.token;

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({
          name: 'Test Project',
          teamId: teamId,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/team/:teamId', () => {
    beforeEach(async () => {
      // Create test projects
      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Project 1',
          description: 'First project',
          teamId: teamId,
        });

      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Project 2',
          description: 'Second project',
          teamId: teamId,
        });
    });

    it('should get all projects for a team', async () => {
      const response = await request(app)
        .get(`/api/projects/team/${teamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.projects[0]).toHaveProperty('name');
      expect(response.body.data.projects[0]).toHaveProperty('team');
      expect(response.body.data.projects[0]).toHaveProperty('creator');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/projects/team/${teamId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-team members', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@example.com',
        isVerified: true,
        password: 'password123',
      });
      await anotherUser.save();

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another@example.com',
          password: 'password123',
        });

      const anotherToken = loginRes.body.data.token;

      const response = await request(app)
        .get(`/api/projects/team/${teamId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent team', async () => {
      const fakeTeamId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/projects/team/${fakeTeamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/:projectId', () => {
    beforeEach(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          description: 'Test description',
          teamId: teamId,
        });

      projectId = projectResponse.body.data.id;
    });

    it('should get project by ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(projectId);
      expect(response.body.data.name).toBe('Test Project');
      expect(response.body.data).toHaveProperty('team');
      expect(response.body.data).toHaveProperty('creator');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent project', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/projects/${fakeProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail for non-team members', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@example.com',
        isVerified: true,
        password: 'password123',
      });
      await anotherUser.save();

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another@example.com',
          password: 'password123',
        });

      const anotherToken = loginRes.body.data.token;

      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/projects/:projectId', () => {
    beforeEach(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          description: 'Test description',
          teamId: teamId,
        });

      projectId = projectResponse.body.data.id;
    });

    it('should update project details', async () => {
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Project Name',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project updated successfully');
      expect(response.body.data.name).toBe('Updated Project Name');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update only name', async () => {
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Only Name Updated',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Only Name Updated');
      expect(response.body.data.description).toBe('Test description');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .send({
          name: 'Updated Name',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid data', async () => {
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'T', // Too short
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('name');
    });

    it('should fail with non-existent project', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/projects/${fakeProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    beforeEach(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Project',
          description: 'Test description',
          teamId: teamId,
        });

      projectId = projectResponse.body.data.id;
    });

    it('should delete project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project deleted successfully');

      // Verify project is deleted
      const project = await Project.findById(projectId);
      expect(project).toBeNull();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/projects/${projectId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with non-existent project', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/projects/${fakeProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Integration Tests - Complete Project Flow', () => {
    it('should complete full project lifecycle', async () => {
      // Step 1: Create a project
      const createResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Project',
          description: 'A project for integration testing',
          teamId: teamId,
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const newProjectId = createResponse.body.data.id;

      // Step 2: Get the project
      const getResponse = await request(app)
        .get(`/api/projects/${newProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.name).toBe('Integration Project');

      // Step 3: Get all team projects
      const listResponse = await request(app)
        .get(`/api/projects/team/${teamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.projects).toHaveLength(1);

      // Step 4: Update the project
      const updateResponse = await request(app)
        .put(`/api/projects/${newProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Integration Project',
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.name).toBe('Updated Integration Project');

      // Step 5: Delete the project
      const deleteResponse = await request(app)
        .delete(`/api/projects/${newProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      const verifyResponse = await request(app)
        .get(`/api/projects/${newProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(verifyResponse.body.success).toBe(false);
    });
  });
});
