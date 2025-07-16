import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { hashPassword } from '../src/utils/password';

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany();
    await prisma.organizationUser.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should register user with organization', async () => {
      const userData = {
        email: 'admin@testorg.com',
        password: 'SecurePassword123!',
        firstName: 'Admin',
        lastName: 'User',
        organizationName: 'Test Organization',
        organizationSlug: 'test-org'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.organization).toBeDefined();
      expect(response.body.data.organization.name).toBe(userData.organizationName);
      expect(response.body.data.organization.slug).toBe(userData.organizationSlug);
      expect(response.body.data.organization.role).toBe('OWNER');
    });

    it('should reject weak passwords', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123', // Too weak
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toContain('Password validation failed');
    });

    it('should reject duplicate email', async () => {
      // Create first user
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        firstName: 'First',
        lastName: 'User'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to create second user with same email
      const duplicateData = {
        ...userData,
        firstName: 'Second'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body.error).toBe('Conflict');
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: any;
    let testOrganization: any;

    beforeEach(async () => {
      // Create test user and organization
      const hashedPassword = await hashPassword('SecurePassword123!');
      
      testOrganization = await prisma.organization.create({
        data: {
          name: 'Test Organization',
          slug: 'test-org'
        }
      });

      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          emailVerified: new Date()
        }
      });

      await prisma.organizationUser.create({
        data: {
          userId: testUser.id,
          organizationId: testOrganization.id,
          role: 'MEMBER'
        }
      });
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.organization).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should validate email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      // Register a user to get auth token
      const userData = {
        email: 'profile@example.com',
        password: 'SecurePassword123!',
        firstName: 'Profile',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.tokens.accessToken;
      testUser = registerResponse.body.data.user;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.organizations).toBeDefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register a user to get auth token
      const userData = {
        email: 'changepass@example.com',
        password: 'OldPassword123!',
        firstName: 'Change',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      authToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should change password successfully', async () => {
      const changeData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should reject incorrect current password', async () => {
      const changeData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(400);

      expect(response.body.error).toBe('Invalid password');
      expect(response.body.message).toContain('Current password is incorrect');
    });

    it('should reject weak new password', async () => {
      const changeData = {
        currentPassword: 'OldPassword123!',
        newPassword: '123' // Too weak
      };

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });
});