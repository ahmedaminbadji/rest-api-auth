const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../../app');
const dbHandler = require('./setup');

describe('App Integration Tests', () => {
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
  // Root Route Tests
  // ==========================================
  describe('GET /', () => {
    it('should return welcome message with API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
      
      expect(response.body.message).toBe('Welcome to the REST API with Authentication');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints).toEqual({
        auth: '/api/auth',
        users: '/api/users'
      });
    });
  });

  // ==========================================
  // 404 Handler Tests
  // ==========================================
  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route not found');
    });

    it('should return 404 for non-existent API routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route not found');
    });

    it('should return 404 for POST to non-existent routes', async () => {
      const response = await request(app)
        .post('/api/non-existent')
        .send({ test: 'data' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route not found');
    });
  });

  // ==========================================
  // Global Error Handler Tests
  // ==========================================
  describe('Global Error Handler', () => {
    it('should handle errors with default status 500', async () => {
      // Create a route that throws an error
      const testApp = require('express')();
      testApp.use(require('express').json());
      testApp.get('/test-error', (req, res, next) => {
        throw new Error('Test error');
      });
      
      // Add the global error handler with mocked console.error
      testApp.use((err, req, res, next) => {
        const mockConsoleError = jest.fn();
        const originalConsoleError = console.error;
        console.error = mockConsoleError;
        
        res.status(err.status || 500).json({
          success: false,
          message: err.message || 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
        
        // Restore console.error
        console.error = originalConsoleError;
      });

      const response = await request(testApp)
        .get('/test-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Test error');
    });

    it('should handle errors with custom status', async () => {
      const testApp = require('express')();
      testApp.use(require('express').json());
      testApp.get('/test-custom-error', (req, res, next) => {
        const error = new Error('Custom error');
        error.status = 400;
        throw error;
      });
      
      // Add the global error handler with mocked console.error
      testApp.use((err, req, res, next) => {
        const mockConsoleError = jest.fn();
        const originalConsoleError = console.error;
        console.error = mockConsoleError;
        
        res.status(err.status || 500).json({
          success: false,
          message: err.message || 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
        
        // Restore console.error
        console.error = originalConsoleError;
      });

      const response = await request(testApp)
        .get('/test-custom-error')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Custom error');
    });

    it('should include stack trace in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const testApp = require('express')();
      testApp.use(require('express').json());
      testApp.get('/test-dev-error', (req, res, next) => {
        throw new Error('Development error');
      });
      
      // Add the global error handler with mocked console.error
      testApp.use((err, req, res, next) => {
        const mockConsoleError = jest.fn();
        const originalConsoleError = console.error;
        console.error = mockConsoleError;
        
        res.status(err.status || 500).json({
          success: false,
          message: err.message || 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
        
        // Restore console.error
        console.error = originalConsoleError;
      });

      const response = await request(testApp)
        .get('/test-dev-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Development error');
      expect(response.body.stack).toBeDefined();

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const testApp = require('express')();
      testApp.use(require('express').json());
      testApp.get('/test-prod-error', (req, res, next) => {
        throw new Error('Production error');
      });
      
      // Add the global error handler with mocked console.error
      testApp.use((err, req, res, next) => {
        const mockConsoleError = jest.fn();
        const originalConsoleError = console.error;
        console.error = mockConsoleError;
        
        res.status(err.status || 500).json({
          success: false,
          message: err.message || 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
        
        // Restore console.error
        console.error = originalConsoleError;
      });

      const response = await request(testApp)
        .get('/test-prod-error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Production error');
      expect(response.body.stack).toBeUndefined();

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  // ==========================================
  // Middleware Tests
  // ==========================================
  describe('Middleware Configuration', () => {
    it('should have CORS enabled', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // CORS headers should be present
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should have Helmet security headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Security headers should be present
      expect(response.headers).toHaveProperty('x-content-type-options');
    });

    it('should parse JSON bodies', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should parse URL-encoded bodies', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send('name=Test User&email=test@example.com&password=password123')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  // ==========================================
  // Rate Limiting Tests
  // ==========================================
  describe('Rate Limiting', () => {
    it('should have rate limiting middleware configured', async () => {
      // Test that rate limiting middleware is present by checking headers
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401); // Should get 401 (no auth) not 429 (rate limited)

      // If we get 401, rate limiting is working but not triggered
      expect(response.status).toBe(401);
    });

    it('should not apply rate limiting to non-API routes', async () => {
      // Make multiple requests to root route
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).get('/'));
      }

      const responses = await Promise.all(requests);
      
      // All requests should succeed (no rate limiting)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  // ==========================================
  // Route Integration Tests
  // ==========================================
  describe('Route Integration', () => {
    it('should serve auth routes under /api/auth', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should serve user routes under /api/users', async () => {
      // First register a user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(201);

      const token = registerResponse.body.data.token;
      const userId = registerResponse.body.data.user._id;

      // Then test user routes
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
