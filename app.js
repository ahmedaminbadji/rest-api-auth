const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    // The MONGO_URI will be different for dev (Docker) vs. test (in-memory)
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API with Authentication',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users'
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rest API auth',
      version: '1.0.0',
      description: 'API docs for Rest API auth',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT}`, 
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Files containing annotations for API docs
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
console.log(swaggerSpec);
// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});



module.exports = { app, connectDB };