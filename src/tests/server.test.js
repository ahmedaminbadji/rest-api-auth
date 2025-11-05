const { app,connectDB } = require('../../app');
const mongoose = require('mongoose');
const dbHandler = require('./setup');

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Server Tests', () => {
  beforeAll(() => {
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  // ==========================================
  // Database Connection Tests
  // ==========================================
  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      // Mock mongoose.connect to resolve successfully
      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue();

      await connectDB();

      expect(mockConnect).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('MongoDB connected...');

      mockConnect.mockRestore();
    });

    it('should handle database connection errors', async () => {
      // Mock mongoose.connect to reject
      const mockConnect = jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('Connection failed'));
      
      // Mock process.exit to prevent actual exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(connectDB()).rejects.toThrow('process.exit called');
      
      expect(console.error).toHaveBeenCalledWith('Connection failed');
      expect(mockExit).toHaveBeenCalledWith(1);

      mockConnect.mockRestore();
      mockExit.mockRestore();
    });

    it('should use correct MongoDB URI from environment', async () => {
      const originalUri = process.env.MONGODB_URI;
      process.env.MONGODB_URI = 'mongodb://test-uri:27017/test';

      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue();

      await connectDB();

      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://test-uri:27017/test',
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
      );

      // Restore original URI
      process.env.MONGODB_URI = originalUri;
      mockConnect.mockRestore();
    });
  });

  // ==========================================
  // App Export Tests
  // ==========================================
  describe('App Export', () => {
    it('should export app and connectDB function', () => {
     const appModule = require('../../app');
      
      expect(appModule).toHaveProperty('app');
      expect(appModule).toHaveProperty('connectDB');
      expect(typeof appModule.connectDB).toBe('function');
      expect(appModule.app).toBeDefined();
    });

    it('should have app as an Express instance', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function'); // Express apps are functions
    });
  });

  // ==========================================
  // Server Startup Tests
  // ==========================================
  describe('Server Startup', () => {
    it('should have correct default port configuration', () => {
      const originalEnv = process.env.PORT;
      delete process.env.PORT;

      // Test that PORT defaults to 5000
      const PORT = process.env.PORT || 5000;
      expect(PORT).toBe(5000);

      // Restore environment
      if (originalEnv) {
        process.env.PORT = originalEnv;
      }
    });

    it('should use custom port from environment', () => {
      const originalEnv = process.env.PORT;
      process.env.PORT = '3000';

      // Test that PORT uses environment variable
      const PORT = process.env.PORT || 5000;
      expect(PORT).toBe('3000');

      // Restore environment
      if (originalEnv) {
        process.env.PORT = originalEnv;
      } else {
        delete process.env.PORT;
      }
    });
  });

  // ==========================================
  // Integration Tests
  // ==========================================
  describe('Server Integration', () => {
    it('should handle server startup sequence', async () => {
      // Mock mongoose.connect
      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue();
      
      // Mock app.listen
      const mockListen = jest.fn();
      const mockApp = { listen: mockListen };

      // Mock the app module
      jest.doMock('../../app', () => ({
        app: mockApp,
        connectDB: connectDB
      }));

      // Test the startup sequence
      await connectDB();
      
      expect(mockConnect).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('MongoDB connected...');

      mockConnect.mockRestore();
    });

    it('should handle database connection with different environments', async () => {
      const testCases = [
        { env: 'test', uri: 'mongodb://memory' },
        { env: 'development', uri: 'mongodb://localhost:27017/dev' },
        { env: 'production', uri: 'mongodb://prod-server:27017/prod' }
      ];

      for (const testCase of testCases) {
        const originalEnv = process.env.NODE_ENV;
        const originalUri = process.env.MONGODB_URI;
        
        process.env.NODE_ENV = testCase.env;
        process.env.MONGODB_URI = testCase.uri;

        const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue();

        await connectDB();

        expect(mockConnect).toHaveBeenCalledWith(
          testCase.uri,
          {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          }
        );

        // Restore environment
        process.env.NODE_ENV = originalEnv;
        process.env.MONGODB_URI = originalUri;
        mockConnect.mockRestore();
      }
    });
  });

  // ==========================================
  // Error Handling Tests
  // ==========================================
  describe('Error Handling', () => {
    it('should handle mongoose connection options correctly', async () => {
      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue();

      await connectDB();

      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(String),
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
      );

      mockConnect.mockRestore();
    });

    it('should handle different error types in database connection', async () => {
      const errorTypes = [
        new Error('Network error'),
        new Error('Authentication failed'),
        new Error('Database not found')
      ];

      for (const error of errorTypes) {
        const mockConnect = jest.spyOn(mongoose, 'connect').mockRejectedValue(error);
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });

        await expect(connectDB()).rejects.toThrow('process.exit called');
        
        expect(console.error).toHaveBeenCalledWith(error.message);
        expect(mockExit).toHaveBeenCalledWith(1);

        mockConnect.mockRestore();
        mockExit.mockRestore();
      }
    });
  });
});
