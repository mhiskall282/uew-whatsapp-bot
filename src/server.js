require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const webhookRoutes = require('./routes/webhook');
const adminRoutes = require('./routes/admin');
const { sequelize } = require('./models');
const redis = require('./config/redis');
const cron = require('./jobs/cron');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// SECURITY MIDDLEWARE
// ==============================================
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/webhook', limiter);

// ==============================================
// BODY PARSING
// ==============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================================
// REQUEST LOGGING
// ==============================================
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ==============================================
// ROUTES
// ==============================================

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'UEW WhatsApp Bot API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV
  });
});

// Main routes
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);

// ==============================================
// ERROR HANDLERS
// ==============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==============================================
// GRACEFUL SHUTDOWN
// ==============================================
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  try {
    // Close database connection
    await sequelize.close();
    logger.info('Database connection closed');
    
    // Close Redis connection
    await redis.quit();
    logger.info('Redis connection closed');
    
    // Stop cron jobs
    cron.stopAll();
    logger.info('Cron jobs stopped');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==============================================
// START SERVER
// ==============================================
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✓ Database connection established');
    
    // Sync database models (only in development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('✓ Database models synced');
    }
    
    // Test Redis connection
    await redis.ping();
    logger.info('✓ Redis connection established');
    
    // Start cron jobs
    cron.startAll();
    logger.info('✓ Cron jobs started');
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 Webhook URL: http://localhost:${PORT}/webhook`);
      logger.info('='.repeat(50));
    });
    
  } catch (error) {
    logger.error('❌ Failed to start server', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;