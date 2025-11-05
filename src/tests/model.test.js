const User = require('../models/User');
const dbHandler = require('./setup');
require('dotenv').config();

describe('User Model Tests', () => {
  const validUserData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  // Connect to the in-memory database before all tests
  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
  });

  afterAll(async () => {
    await dbHandler.closeDatabase();
  });

  // ==========================================
  // User Creation Tests
  // ==========================================
  describe('User Creation', () => {
    it('should create a valid user', async () => {
      const user = await User.create(validUserData);

      expect(user._id).toBeDefined();
      expect(user.name).toBe(validUserData.name);
      expect(user.email).toBe(validUserData.email);
      expect(user.password).not.toBe(validUserData.password); // Should be hashed
      expect(user.role).toBe('user'); // Default role
      expect(user.isActive).toBe(true); // Default isActive
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should fail to create user without name', async () => {
      const invalidData = { ...validUserData };
      delete invalidData.name;

      await expect(User.create(invalidData)).rejects.toThrow();
    });

    it('should fail to create user without email', async () => {
      const invalidData = { ...validUserData };
      delete invalidData.email;

      await expect(User.create(invalidData)).rejects.toThrow();
    });

    it('should fail to create user without password', async () => {
      const invalidData = { ...validUserData };
      delete invalidData.password;

      await expect(User.create(invalidData)).rejects.toThrow();
    });

    it('should fail to create user with duplicate email', async () => {
      await User.create(validUserData);
      
      await expect(User.create(validUserData)).rejects.toThrow();
    });

    it('should fail to create user with invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      await expect(User.create(invalidData)).rejects.toThrow();
    });

    it('should fail to create user with name less than 2 characters', async () => {
      const invalidData = { ...validUserData, name: 'A' };

      await expect(User.create(invalidData)).rejects.toThrow();
    });

    it('should fail to create user with name more than 50 characters', async () => {
      const invalidData = { 
        ...validUserData, 
        name: 'A'.repeat(51) 
      };

      await expect(User.create(invalidData)).rejects.toThrow();
    });

    it('should fail to create user with password less than 6 characters', async () => {
      const invalidData = { ...validUserData, password: '12345' };

      await expect(User.create(invalidData)).rejects.toThrow();
    });

    it('should convert email to lowercase', async () => {
      const userData = { ...validUserData, email: 'TEST@EXAMPLE.COM' };
      const user = await User.create(userData);

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from name', async () => {
      const userData = { ...validUserData, name: '  Test User  ' };
      const user = await User.create(userData);

      expect(user.name).toBe('Test User');
    });

    it('should trim whitespace from email', async () => {
      const userData = { ...validUserData, email: '  test@example.com  ' };
      const user = await User.create(userData);

      expect(user.email).toBe('test@example.com');
    });
  });

  // ==========================================
  // Password Hashing Tests
  // ==========================================
  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const user = await User.create(validUserData);
      const savedUser = await User.findById(user._id).select('+password');

      expect(savedUser.password).not.toBe(validUserData.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt pattern
    });

    it('should not hash password if not modified', async () => {
      const user = await User.create(validUserData);
      const originalPassword = (await User.findById(user._id).select('+password')).password;

      // Update user without changing password
      user.name = 'Updated Name';
      await user.save();

      const updatedUser = await User.findById(user._id).select('+password');
      expect(updatedUser.password).toBe(originalPassword);
    });

    it('should hash password when modified', async () => {
      const user = await User.create(validUserData);
      const userWithPassword = await User.findById(user._id).select('+password');
      const originalPassword = userWithPassword.password;

      // Update password
      userWithPassword.password = 'newpassword123';
      await userWithPassword.save();

      const updatedUser = await User.findById(user._id).select('+password');
      expect(updatedUser.password).not.toBe(originalPassword);
      expect(updatedUser.password).not.toBe('newpassword123');
    });
  });

  // ==========================================
  // Password Comparison Tests
  // ==========================================
  describe('Password Comparison', () => {
    it('should correctly compare valid password', async () => {
      const user = await User.create(validUserData);
      const savedUser = await User.findById(user._id).select('+password');

      const isMatch = await savedUser.comparePassword(validUserData.password);
      expect(isMatch).toBe(true);
    });

    it('should correctly reject invalid password', async () => {
      const user = await User.create(validUserData);
      const savedUser = await User.findById(user._id).select('+password');

      const isMatch = await savedUser.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });

    it('should handle case-sensitive passwords', async () => {
      const user = await User.create(validUserData);
      const savedUser = await User.findById(user._id).select('+password');

      const isMatch = await savedUser.comparePassword('PASSWORD123');
      expect(isMatch).toBe(false);
    });
  });

  // ==========================================
  // Role Tests
  // ==========================================
  describe('User Roles', () => {
    it('should have default role as user', async () => {
      const user = await User.create(validUserData);
      expect(user.role).toBe('user');
    });

    it('should allow creating admin user', async () => {
      const adminData = { ...validUserData, role: 'admin' };
      const user = await User.create(adminData);

      expect(user.role).toBe('admin');
    });

    it('should reject invalid role', async () => {
      const invalidData = { ...validUserData, role: 'superadmin' };

      await expect(User.create(invalidData)).rejects.toThrow();
    });
  });

  // ==========================================
  // toJSON Method Tests
  // ==========================================
  describe('toJSON Method', () => {
    it('should not include password in JSON output', async () => {
      const user = await User.create(validUserData);
      const jsonUser = user.toJSON();

      expect(jsonUser).not.toHaveProperty('password');
    });

    it('should not include __v in JSON output', async () => {
      const user = await User.create(validUserData);
      const jsonUser = user.toJSON();

      expect(jsonUser).not.toHaveProperty('__v');
    });

    it('should include all other fields in JSON output', async () => {
      const user = await User.create(validUserData);
      const jsonUser = user.toJSON();

      expect(jsonUser).toHaveProperty('_id');
      expect(jsonUser).toHaveProperty('name');
      expect(jsonUser).toHaveProperty('email');
      expect(jsonUser).toHaveProperty('role');
      expect(jsonUser).toHaveProperty('isActive');
      expect(jsonUser).toHaveProperty('createdAt');
      expect(jsonUser).toHaveProperty('updatedAt');
    });
  });

  // ==========================================
  // Query Tests
  // ==========================================
  describe('User Queries', () => {
    it('should not return password by default', async () => {
      await User.create(validUserData);
      const user = await User.findOne({ email: validUserData.email });

      expect(user.password).toBeUndefined();
    });

    it('should return password when explicitly selected', async () => {
      await User.create(validUserData);
      const user = await User.findOne({ email: validUserData.email }).select('+password');

      expect(user).toHaveProperty('password');
      expect(user.password).toBeDefined();
    });

    it('should find user by email', async () => {
      await User.create(validUserData);
      const user = await User.findOne({ email: validUserData.email });

      expect(user).toBeDefined();
      expect(user.email).toBe(validUserData.email);
    });

    it('should find active users only', async () => {
      await User.create(validUserData);
      await User.create({
        name: 'Inactive User',
        email: 'inactive@example.com',
        password: 'password123',
        isActive: false
      });

      const activeUsers = await User.find({ isActive: true });
      expect(activeUsers.length).toBe(1);
      expect(activeUsers[0].email).toBe(validUserData.email);
    });

    it('should find users by role', async () => {
      await User.create(validUserData);
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      });

      const admins = await User.find({ role: 'admin' });
      expect(admins.length).toBe(1);
      expect(admins[0].email).toBe('admin@example.com');

      const users = await User.find({ role: 'user' });
      expect(users.length).toBe(1);
      expect(users[0].email).toBe(validUserData.email);
    });
  });

  // ==========================================
  // Update Tests
  // ==========================================
  describe('User Updates', () => {
    it('should update user name', async () => {
      const user = await User.create(validUserData);
      
      user.name = 'Updated Name';
      await user.save();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toBe('Updated Name');
    });

    it('should update user email', async () => {
      const user = await User.create(validUserData);
      
      user.email = 'updated@example.com';
      await user.save();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.email).toBe('updated@example.com');
    });

    it('should update timestamps on modification', async () => {
      const user = await User.create(validUserData);
      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      user.name = 'Updated Name';
      await user.save();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should validate email format on update', async () => {
      const user = await User.create(validUserData);
      
      user.email = 'invalid-email';
      
      await expect(user.save()).rejects.toThrow();
    });
  });

  // ==========================================
  // Delete Tests
  // ==========================================
  describe('User Deletion', () => {
    it('should delete user successfully', async () => {
      const user = await User.create(validUserData);
      await User.findByIdAndDelete(user._id);

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should allow email reuse after deletion', async () => {
      const user = await User.create(validUserData);
      await User.findByIdAndDelete(user._id);

      // Create new user with same email
      const newUser = await User.create(validUserData);
      expect(newUser.email).toBe(validUserData.email);
      expect(newUser._id.toString()).not.toBe(user._id.toString());
    });
  });
});
