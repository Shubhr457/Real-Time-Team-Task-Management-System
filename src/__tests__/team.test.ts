import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { connectDatabase } from '../core/database';
import User from '../models/user.model';
import Team from '../models/team.model';

const app = createApp();

describe('Team Management', () => {
  let authToken: string;
  let teamId: string;

  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.deleteMany({});
    await Team.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Team.deleteMany({});
    await User.deleteMany({});
    
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    // Create and verify a test user
    const testUser = {
      name: 'Test User',
      email: 'testuser@example.com',
      isVerified: true,
      password: 'testPassword123',
    };

    await User.create(testUser);

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
  });

  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Team',
          description: 'A test team description',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team created successfully');
      expect(response.body.data.name).toBe('Test Team');
      expect(response.body.data.description).toBe('A test team description');
      expect(response.body.data.memberCount).toBe(1);
      expect(response.body.data).toHaveProperty('owner');
      expect(response.body.data.owner).toHaveProperty('id');
      expect(response.body.data.owner).toHaveProperty('name');
      expect(response.body.data.owner).toHaveProperty('email');

      teamId = response.body.data.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({
          name: 'Test Team',
        });

      expect(response.status).toBe(401);
    });

    it('should fail with invalid data', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'T', // Too short
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].field).toBe('name');
    });
  });

  describe('GET /api/teams', () => {
    beforeEach(async () => {
      // Create a test team
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Team',
          description: 'Test description',
        });

      teamId = response.body.data.id;
    });

    it('should get all teams for user', async () => {
      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Teams fetched successfully');
      expect(response.body.data.teams).toHaveLength(1);
      expect(response.body.data.teams[0].name).toBe('Test Team');
      expect(response.body.data.teams[0]).toHaveProperty('members');
      expect(response.body.data.teams[0]).toHaveProperty('owner');
      expect(response.body.data.count).toBe(1);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/teams')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/teams/:teamId', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Team',
        });

      teamId = response.body.data.id;
    });

    it('should get team by ID with members', async () => {
      const response = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team fetched successfully');
      expect(response.body.data.name).toBe('Test Team');
      expect(response.body.data.members).toHaveLength(1);
      expect(response.body.data).toHaveProperty('owner');
      expect(response.body.data).toHaveProperty('userRole');
      expect(response.body.data.userRole).toBe('owner');
    });

    it('should fail for non-member', async () => {
      // Create another user
      await User.create({
        name: 'Another User',
        email: 'another@example.com',
        isVerified: true,
        password: 'password123',
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another@example.com',
          password: 'password123',
        });

      const anotherToken = loginResponse.body.data.token;

      const response = await request(app)
        .get(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/teams/:teamId/members', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Team',
        });

      teamId = response.body.data.id;

      // Create second user
      await User.create({
        name: 'Second User',
        email: 'second@example.com',
        isVerified: true,
        password: 'password123',
      });
    });

    it('should invite member to team', async () => {
      const response = await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'second@example.com',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('member');
      expect(response.body.data.member.email).toBe('second@example.com');
      expect(response.body.data.member).toHaveProperty('role');
    });

    it('should fail to invite non-existent user', async () => {
      const response = await request(app)
        .post(`/api/teams/${teamId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/teams/:teamId', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Team',
        });

      teamId = response.body.data.id;
    });

    it('should update team details', async () => {
      const response = await request(app)
        .put(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Team Name',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team updated successfully');
      expect(response.body.data.name).toBe('Updated Team Name');
      expect(response.body.data.description).toBe('Updated description');
    });
  });

  describe('DELETE /api/teams/:teamId', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Team',
        });

      teamId = response.body.data.id;
    });

    it('should delete team', async () => {
      const response = await request(app)
        .delete(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team deleted successfully');

      // Verify team is deleted
      const team = await Team.findById(teamId);
      expect(team).toBeNull();
    });
  });
});

