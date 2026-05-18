require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const roleRoutes= require('./routes/role.routes')
const notRoutes = require('./routes/notification.routes');
const teamRoutes = require('./routes/team.routes');
const { connectDB } = require('./config/database');

const { sequelize, testConnection } = require('./config/database');
const { publishEvent } = require('./utils/eventPublisher');
const initializeSystem = require('./models/initializeSystem');
// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/auth-service.log' })
  ]
});

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes
app.use('/', authRoutes);
// app.use('/user',userRoutes)
app.use('/role', roleRoutes);
app.use('/notification',notRoutes);
app.use('/team', teamRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  
  res.json({
    service: 'auth-service',
    status: 'running',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'connected' : 'disconnected',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found'
//   });
// });

// 404 handler (New Express 5 style)
// 404 handler - simply don't provide a path
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // 1. Initialize Database connection and sync (Logic handled in your DB file)
    // This will run the authenticate() and sync({ alter: true }) you added
    const dbConnected = await connectDB(); 
    
    // Check if connection was successful
    if (dbConnected === false) {
      logger.error('Database initialization failed. Exiting...');
      process.exit(1);
    }

    // 2. Run system seeds (Roles, Admin user, etc.)
    await initializeSystem();
    logger.info('System initialization complete.');

    // 3. Connect to RabbitMQ and announce service start
    try {
      await publishEvent('SERVICE_STARTED', { 
        service: 'auth-service',
        timestamp: new Date().toISOString() 
      });
    } catch (mqError) {
      logger.warn('RabbitMQ publish failed, service will continue starting.');
    }

    // 4. Start the Express Server
    app.listen(PORT, () => {
      logger.info('----------------------------------------------');
      logger.info(`🚀 Auth Service: RUNNING ON PORT ${PORT}`);
      logger.info(`📂 Environment: ${process.env.NODE_ENV}`);
      logger.info(`📊 DB: ${process.env.DB_NAME} at ${process.env.DB_HOST}`);
      logger.info('----------------------------------------------');
    });

  } catch (error) {
    logger.error('CRITICAL: Failed to start Auth Service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  
  try {
    await sequelize.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down...');
  process.exit(0);
});

startServer();