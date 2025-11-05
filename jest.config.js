// jest.config.js
module.exports = {
  testEnvironment: 'node',
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    // Include only the source files that need testing
    'app.js',
    'server.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    // Exclude test files, config files, and other non-source files
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!jest.config.js',
    '!mongo-init.js',
    '!Dockerfile',
    '!docker-compose.yml',
    '!package*.json',
    '!README.md',
    '!DEPLOYMENT.md',
    '!docs/**'
  ],
  // Coverage thresholds to ensure quality
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 70,
      lines: 80,
      statements: 80
    }
  },
  // Add this line:
  testTimeout: 150000, // 15 seconds
};