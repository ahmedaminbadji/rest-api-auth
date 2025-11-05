const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../app');
const User = require('../models/User');
const dbHandler = require('./setup');
require('dotenv').config();

// Test data
const testUser = {
  name: 'Regular User',
  email: 'user@example.com',
  password: 'password123'
};

const testAdmin = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'admin123',
  role: 'admin'
};

const otherUser = {
  name: 'Other User',
  email: 'other@example.com',
  password: 'password123'
};

describe('User Management Tests', () => {
  let userToken;
  let adminToken;
  let userId;
  let otherId;

  // Connect to the in-memory database before all tests
  beforeAll(async () => {
    await dbHandler.connect();
  });

  // Clear all test data after each test
  afterEach(async () => {
    await dbHandler.clearDatabase();
  });

  // Teardown: Close database connection after all tests
  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  // Setup: Create users before each test
  beforeEach(async () => {
    // Create regular user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    userToken = userResponse.body.data.token;
    userId = userResponse.body.data.user._id;

    // Create admin user
    const adminUser = await User.create(testAdmin);
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testAdmin.email,
        password: testAdmin.password
      });
    adminToken = adminLoginResponse.body.data.token;

    // Create other user
    const otherResponse = await request(app)
      .post('/api/auth/register')
      .send(otherUser);
    otherId = otherResponse.body.data.user._id;
  });

  // ==========================================
  // GET /api/users - Get All Users Tests
  // ==========================================
  describe('GET /api/users', () => {
    it('should get all users as admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Check that passwords are not included
      response.body.data.forEach(user => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should fail to get all users as regular user', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should fail to get all users without authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // GET /api/users/:id - Get Single User Tests
  // ==========================================
  describe('GET /api/users/:id', () => {
    it('should get user by ID with valid token', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(userId);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should allow admin to get any user', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(userId);
    });

    it('should fail to get user without authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail to get user with invalid ID', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  // ==========================================
  // PUT /api/users/:id - Update User Tests
  // ==========================================
  describe('PUT /api/users/:id', () => {
    it('should allow user to update their own profile', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.email).toBe(updateData.email);
    });

    it('should allow admin to update any user', async () => {
      const updateData = {
        name: 'Admin Updated Name',
        email: 'admin-updated@example.com'
      };

      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should fail when user tries to update another user', async () => {
      const updateData = {
        name: 'Hacker Name'
      };

      const response = await request(app)
        .put(`/api/users/${otherId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not authorized to update this user');
    });

    it('should fail to update without authentication', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send({ name: 'New Name' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should validate email format on update', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'invalid-email' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // DELETE /api/users/:id - Delete User Tests
  // ==========================================
  describe('DELETE /api/users/:id', () => {
    it('should allow admin to delete any user', async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted
      const deletedUser = await User.findById(userId);
      expect(deletedUser).toBeNull();
    });

    it('should fail when regular user tries to delete another user', async () => {
      const response = await request(app)
        .delete(`/api/users/${otherId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should fail when regular user tries to delete themselves', async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail to delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when deleting non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  // ==========================================
  // Additional User Tests
  // ==========================================
  describe('User Model Tests', () => {
    it('should not return password in user object', async () => {
      const user = await User.findById(userId);
      const userObject = user.toJSON();
      
      expect(userObject).not.toHaveProperty('password');
      expect(userObject).not.toHaveProperty('__v');
    });

    it('should have default role as user', async () => {
      const user = await User.findById(userId);
      expect(user.role).toBe('user');
    });

    it('should have isActive as true by default', async () => {
      const user = await User.findById(userId);
      expect(user.isActive).toBe(true);
    });

    it('should have timestamps', async () => {
      const user = await User.findById(userId);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });
  });
});
