// MongoDB initialization script
// This script runs when MongoDB container starts for the first time

db = db.getSiblingDB('restapi');

// Create the database and a default collection
db.createCollection('users');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });

// Optional: Create a default admin user (comment out if not needed)
// Note: Password will be hashed by the API when first admin registers
print('MongoDB initialization complete for restapi database');
print('Users collection created with email index');
print('Ready to accept connections from the API');