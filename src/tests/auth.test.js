const request = require('supertest');
const { app } = require('../../app');
const User = require('../models/User');
const dbHandler = require('./setup');

// Mock data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

describe('Authentication Tests', () => {
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

  // ==========================================
  // POST /api/auth/register - Registration Tests
  // ==========================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);
      expect(response.body.data.user.role).toBe('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      
      // Password should not be in response
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail to register with missing name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should fail to register with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          password: 'password123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should fail to register with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should fail to register with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should fail to register with password less than 6 characters', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '12345'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should fail to register with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Attempt duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should hash password before saving', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const user = await User.findOne({ email: testUser.email }).select('+password');
      expect(user.password).not.toBe(testUser.password);
      expect(user.password).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt hash pattern
    });
  });

  // ==========================================
  // POST /api/auth/login - Login Tests
  // ==========================================
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user before login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      
      // Password should not be in response
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should fail to login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail to login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail to login without email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please provide email and password');
    });

    it('should fail to login without password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please provide email and password');
    });

    it('should fail to login if user account is inactive', async () => {
      // Set user as inactive
      await User.updateOne({ email: testUser.email }, { isActive: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account is inactive. Please contact support.');
    });
  });

  // ==========================================
  // GET /api/auth/me - Get Current User Tests
  // ==========================================
  describe('GET /api/auth/me', () => {
    let token;
    let userId;

    beforeEach(async () => {
      // Register and login to get token
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      token = response.body.data.token;
      userId = response.body.data.user._id;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(userId);
      expect(response.body.data.email).toBe(testUser.email);
      
      // Password should not be in response
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not authorized, token failed');
    });

    it('should fail with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', token) // Missing "Bearer" prefix
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail if user is deleted after token issuance', async () => {
      // Delete the user
      await User.findByIdAndDelete(userId);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should fail if user is inactive', async () => {
      // Set user as inactive
      await User.findByIdAndUpdate(userId, { isActive: false });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User account is inactive');
    });
  });

  // ==========================================
  // POST /api/auth/logout - Logout Tests
  // ==========================================
  describe('POST /api/auth/logout', () => {
    let token;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      token = response.body.data.token;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should fail to logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
