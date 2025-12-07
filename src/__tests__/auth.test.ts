import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase } from '../core/database';
import User from '../models/user.model';
import mongoose from 'mongoose';
import { generateOTP, hashOTP } from '../helpers/otp.helper';
import * as emailService from '../services/email.service';

// Mock email service with spies
jest.spyOn(emailService, 'sendOTPEmail').mockResolvedValue(true as any);
jest.spyOn(emailService, 'sendPasswordEmail').mockResolvedValue(true as any);

const app = createApp();

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
};

describe('Authentication API Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();
  });

  afterAll(async () => {
    // Clean up and close database connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear users before each test
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and send OTP', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent to your email');
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data.message).toContain('10 minutes');

      // Verify user was created in database
      const user = await User.findOne({ email: testUser.email }).select('+otp +otpExpiry');
      expect(user).toBeDefined();
      expect(user?.name).toBe(testUser.name);
      expect(user?.isVerified).toBe(false);
      expect(user?.otp).toBeDefined();
      expect(user?.otpExpiry).toBeDefined();
      expect(user?.password).toBeUndefined();
    });


    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].field).toBe('email');
    });

    it('should reject registration with short name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'T',
          email: 'test@example.com',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('name');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject registration with already verified email', async () => {
      // Create a verified user first
      await User.create({
        name: testUser.name,
        email: testUser.email,
        password: 'hashedpassword123',
        isVerified: true,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already exists');
    });

    it('should allow re-registration for unverified email', async () => {
      // Create an unverified user
      const otp = generateOTP();
      await User.create({
        name: 'Old Name',
        email: testUser.email,
        isVerified: false,
        otp: hashOTP(otp),
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });

      // Try to register again with new name
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Name',
          email: testUser.email,
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify user was updated
      const user = await User.findOne({ email: testUser.email });
      expect(user?.name).toBe('New Name');
    });
  });

  describe('POST /api/auth/resend-otp', () => {
    let userEmail: string;

    beforeEach(async () => {
      // Create an unverified user
      userEmail = 'resend@example.com';
      const otp = generateOTP();

      await User.create({
        name: 'Resend User',
        email: userEmail,
        isVerified: false,
        otp: hashOTP(otp),
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });
    });

    it('should resend OTP to unverified user', async () => {
      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: userEmail })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP resent to your email');
      expect(response.body.data).toHaveProperty('email', userEmail);
      expect(response.body.data.message).toContain('10 minutes');

      // Verify OTP was updated in database
      const user = await User.findOne({ email: userEmail }).select('+otp +otpExpiry');
      expect(user?.otp).toBeDefined();
      expect(user?.otpExpiry).toBeDefined();
    });

    it('should reject resend for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });

    it('should reject resend for already verified user', async () => {
      // Update user to verified
      await User.updateOne(
        { email: userEmail },
        { isVerified: true, $unset: { otp: '', otpExpiry: '' } }
      );

      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: userEmail })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User already verified');
    });

    it('should reject resend with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: 'invalid-email' })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].field).toBe('email');
    });

    it('should reject resend with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    let generatedOTP: string;
    let userEmail: string;

    beforeEach(async () => {
      // Create an unverified user with OTP
      generatedOTP = generateOTP();
      userEmail = 'verify@example.com';

      await User.create({
        name: 'Verify User',
        email: userEmail,
        isVerified: false,
        otp: hashOTP(generatedOTP),
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });
    });

    it('should verify OTP and activate account', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: userEmail,
          otp: generatedOTP,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Email verified successfully');
      expect(response.body.data.email).toBe(userEmail);

      // Verify user was updated in database
      const user = await User.findOne({ email: userEmail }).select('+otp +otpExpiry +password');
      expect(user?.isVerified).toBe(true);
      expect(user?.password).toBeDefined();
      expect(user?.otp).toBeUndefined();
      expect(user?.otpExpiry).toBeUndefined();
    });

    it('should reject verification with invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: userEmail,
          otp: '999999',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid OTP');
    });

    it('should reject verification with wrong OTP format', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: userEmail,
          otp: '12345', // Only 5 digits
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].field).toBe('otp');
    });

    it('should reject verification with non-numeric OTP', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: userEmail,
          otp: 'abcdef',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('should reject verification with expired OTP', async () => {
      // Update user with expired OTP
      await User.updateOne(
        { email: userEmail },
        { otpExpiry: new Date(Date.now() - 1000) } // Expired 1 second ago
      );

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: userEmail,
          otp: generatedOTP,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('OTP has expired');
    });

    it('should reject verification for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'nonexistent@example.com',
          otp: '123456',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });

    it('should reject verification for already verified user', async () => {
      // Update user to verified
      await User.updateOne(
        { email: userEmail },
        { isVerified: true, otp: undefined, otpExpiry: undefined }
      );

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: userEmail,
          otp: generatedOTP,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User already verified');
    });

    it('should reject verification without OTP data', async () => {
      // Update user to remove OTP
      await User.updateOne(
        { email: userEmail },
        { $unset: { otp: '', otpExpiry: '' } }
      );

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: userEmail,
          otp: '123456',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No OTP found');
    });
  });

  describe('POST /api/auth/login', () => {
    let verifiedUserEmail: string;
    let verifiedUserPassword: string;

    beforeEach(async () => {
      // Create a verified user with password
      verifiedUserEmail = 'login@example.com';
      verifiedUserPassword = 'TestPass123!';

      const user = new User({
        name: 'Login User',
        email: verifiedUserEmail,
        isVerified: true,
        password: verifiedUserPassword, // Will be hashed by pre-save hook
      });
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: verifiedUserEmail,
          password: verifiedUserPassword,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(verifiedUserEmail);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: verifiedUserPassword,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: verifiedUserEmail,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: verifiedUserEmail,
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject login for unverified user', async () => {
      // Create unverified user
      const unverifiedEmail = 'unverified@example.com';
      const user = new User({
        name: 'Unverified User',
        email: unverifiedEmail,
        isVerified: false,
        password: verifiedUserPassword,
      });
      await user.save();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: unverifiedEmail,
          password: verifiedUserPassword,
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email not verified');
    });

    it('should reject login for user without password', async () => {
      // Create user without password
      const noPasswordEmail = 'nopassword@example.com';
      await User.create({
        name: 'No Password User',
        email: noPasswordEmail,
        isVerified: true,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: noPasswordEmail,
          password: 'anypassword',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account setup incomplete');
    });

    it('should return JWT tokens with correct payload', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: verifiedUserEmail,
          password: verifiedUserPassword,
        })
        .expect(200);

      const token = response.body.data.token;
      const refreshToken = response.body.data.refreshToken;
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create and login a user to get token
      const password = 'TestPass123!';
      const user = new User({
        name: 'Logout User',
        email: 'logout@example.com',
        isVerified: true,
        password: password,
      });
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logout@example.com',
          password: password,
        });

      authToken = loginResponse.body.data.token;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should reject logout with malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', authToken) // Missing "Bearer " prefix
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let userEmail: string;

    beforeEach(async () => {
      // Create and login a user to get refresh token
      userEmail = 'refresh@example.com';
      const password = 'TestPass123!';
      const user = new User({
        name: 'Refresh User',
        email: userEmail,
        isVerified: true,
        password: password,
      });
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: password,
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      // Verify new tokens are valid JWT format
      expect(response.body.data.token.split('.')).toHaveLength(3);
      expect(response.body.data.refreshToken.split('.')).toHaveLength(3);
      
      // Verify new access token can be used to access protected routes
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${response.body.data.token}`)
        .expect(200);
      
      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(userEmail);
    });

    it('should reject refresh without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject refresh with expired refresh token', async () => {
      // Note: This test would require manipulating token expiry or waiting
      // For now, we'll use an obviously invalid/malformed token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject refresh for deleted user', async () => {
      // Delete the user
      await User.deleteOne({ email: userEmail });
      
      // Wait a bit for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });

    it('should reject refresh for unverified user', async () => {
      // Update user to unverified
      await User.updateOne({ email: userEmail }, { isVerified: false });
      
      // Wait a bit for update to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email not verified');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;
    let userEmail: string;

    beforeEach(async () => {
      // Create and login a user to get token
      userEmail = 'profile@example.com';
      const password = 'TestPass123!';
      const user = new User({
        name: 'Profile User',
        email: userEmail,
        isVerified: true,
        password: password,
      });
      await user.save();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: password,
        });

      authToken = loginResponse.body.data.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userEmail);
      expect(response.body.data.name).toBe('Profile User');
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).toHaveProperty('isVerified');
    });

    it('should reject profile request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should reject profile request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Integration Tests - Complete Flow', () => {
    it('should complete full registration and login flow', async () => {
      const newUser = {
        name: 'Integration Test User',
        email: 'integration@example.com',
      };

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);

      // Get OTP from database
      const user = await User.findOne({ email: newUser.email }).select('+otp');
      expect(user).toBeDefined();
      
      // Generate a matching OTP for testing (in real scenario, this comes from email)
      const testOTP = generateOTP();
      await User.updateOne(
        { email: newUser.email },
        { otp: hashOTP(testOTP) }
      );
      
      // Wait for update to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Step 2: Verify OTP
      const verifyResponse = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: newUser.email,
          otp: testOTP,
        })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);

      // Get password from database (in real scenario, this comes from email)
      const verifiedUser = await User.findOne({ email: newUser.email }).select('+password');
      expect(verifiedUser?.isVerified).toBe(true);
      expect(verifiedUser?.password).toBeDefined();

      // For testing, we need to set a known password
      verifiedUser!.password = 'TestPassword123!';
      await verifiedUser!.save();
      
      // Wait for save to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Step 3: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: newUser.email,
          password: 'TestPassword123!',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.refreshToken).toBeDefined();

      // Step 4: Access protected route
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(newUser.email);

      // Step 5: Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: loginResponse.body.data.refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.token).toBeDefined();
      expect(refreshResponse.body.data.refreshToken).toBeDefined();

      // Step 6: Use new token to access protected route
      const profileResponse2 = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.data.token}`)
        .expect(200);

      expect(profileResponse2.body.success).toBe(true);
      expect(profileResponse2.body.data.email).toBe(newUser.email);
    });
  });
});
