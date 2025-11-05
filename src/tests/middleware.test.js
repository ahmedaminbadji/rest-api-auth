const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const dbHandler = require('./setup');
require('dotenv').config();

// Mock Express request and response
const mockRequest = () => {
  return {
    headers: {},
    user: null
  };
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Authentication Middleware Tests', () => {
  let testUser;
  let token;

  // Connect to the in-memory database before all tests
  beforeAll(async () => {
    await dbHandler.connect();
  });

  // Create test user before each test (not beforeAll)
  beforeEach(async () => {
    // Clear database
    await dbHandler.clearDatabase();
    
    // Create a test user
    testUser = await User.create({
      name: 'Middleware Test User',
      email: 'middleware@example.com',
      password: 'password123'
    });
    
    token = generateToken(testUser._id);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  // ==========================================
  // protect Middleware Tests
  // ==========================================
  describe('protect middleware', () => {
    it('should allow access with valid Bearer token', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${token}`;

      await protect(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe('middleware@example.com');
      expect(req.user.password).toBeUndefined();
    });

    it('should reject request without authorization header', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await protect(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this route. Please provide a valid token.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = token; // Missing "Bearer" prefix

      await protect(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = 'Bearer invalid_token_here';

      await protect(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Create expired token
      const expiredToken = jwt.sign(
        { id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );
      
      // Wait a moment to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));
      
      req.headers.authorization = `Bearer ${expiredToken}`;

      await protect(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject if user does not exist', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Create token for non-existent user
      const fakeUserId = new mongoose.Types.ObjectId();
      const fakeToken = generateToken(fakeUserId);
      
      req.headers.authorization = `Bearer ${fakeToken}`;

      await protect(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject if user account is inactive', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      // Set user as inactive
      await User.findByIdAndUpdate(testUser._id, { isActive: false });
      
      req.headers.authorization = `Bearer ${token}`;

      await protect(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User account is inactive'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not include password in req.user', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${token}`;

      await protect(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.password).toBeUndefined();
    });
  });

  // ==========================================
  // authorize Middleware Tests
  // ==========================================
  describe('authorize middleware', () => {
    it('should allow access for authorized role (admin)', () => {
      const req = mockRequest();
      const res = mockResponse();
      req.user = { role: 'admin' };

      const middleware = authorize('admin');
      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for multiple authorized roles', () => {
      const req = mockRequest();
      const res = mockResponse();
      req.user = { role: 'admin' };

      const middleware = authorize('admin', 'user');
      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      const req = mockRequest();
      const res = mockResponse();
      req.user = { role: 'user' };

      const middleware = authorize('admin');
      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User role 'user' is not authorized to access this route"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should work with user role', () => {
      const req = mockRequest();
      const res = mockResponse();
      req.user = { role: 'user' };

      const middleware = authorize('user');
      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Integration: protect + authorize
  // ==========================================
  describe('protect + authorize integration', () => {
    it('should work together for admin access', async () => {
      // Create admin user
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin-middleware@example.com',
        password: 'admin123',
        role: 'admin'
      });
      const adminToken = generateToken(adminUser._id);

      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${adminToken}`;

      // First apply protect middleware
      await protect(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('admin');

      // Then apply authorize middleware
      jest.clearAllMocks();
      const authorizeMiddleware = authorize('admin');
      authorizeMiddleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny user trying to access admin route', async () => {
      const req = mockRequest();
      const res = mockResponse();
      req.headers.authorization = `Bearer ${token}`;

      // First apply protect middleware
      await protect(req, res, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('user');

      // Then apply authorize middleware for admin only
      jest.clearAllMocks();
      const authorizeMiddleware = authorize('admin');
      authorizeMiddleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // Token Generation Tests
  // ==========================================
  describe('Token generation and validation', () => {
    it('should generate valid JWT token', () => {
      const userId = testUser._id.toString();
      const generatedToken = generateToken(userId);

      expect(generatedToken).toBeDefined();
      expect(typeof generatedToken).toBe('string');

      // Verify token
      const decoded = jwt.verify(generatedToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(userId);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should generate token with correct expiration', () => {
      const userId = testUser._id.toString();
      const generatedToken = generateToken(userId);

      const decoded = jwt.verify(generatedToken, process.env.JWT_SECRET);
      
      // Check expiration (default is 7 days)
      const expectedExpiration = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
      const timeDifference = Math.abs(decoded.exp - expectedExpiration);
      
      // Allow 5 seconds difference for test execution time
      expect(timeDifference).toBeLessThan(5);
    });

    it('should include user ID in token payload', () => {
      const userId = testUser._id.toString();
      const generatedToken = generateToken(userId);

      const decoded = jwt.verify(generatedToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe(userId);
    });
  });
});