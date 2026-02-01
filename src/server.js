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
const PORT = process.env.PORT || 4000; // Render uses PORT env var

// ==============================================
// SECURITY & PROXY SETTINGS (Critical for Render)
// ==============================================
app.set('trust proxy', 1); // Trust Render's proxy → fixes X-Forwarded-For rate-limit warning

app.use(helmet());

// Rate limiting - apply globally or per-route
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // higher for general routes
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const webhookLimiter = rateLimit({
  windowMs: 60000,
  max: 50, // WhatsApp can send bursts
  message: { error: 'Webhook rate limit exceeded' },
});

app.use(globalLimiter); // Global default
app.use('/webhook', webhookLimiter); // Tighter for webhook

// ==============================================
// BODY PARSING
// ==============================================
app.use(express.json({ limit: '10mb' })); // WhatsApp payloads can be large
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==============================================
// REQUEST LOGGING
// ==============================================
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    forwardedFor: req.get('x-forwarded-for'),
    userAgent: req.get('user-agent'),
  });
  next();
});

// ==============================================
// ROUTES
// ==============================================

// Health check (simple)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'UEW WhatsApp Bot API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    dbConnected: false,
    redisConnected: false,
  };

  try {
    await sequelize.authenticate();
    health.dbConnected = true;
  } catch (err) {
    health.dbConnected = false;
  }

  try {
    await redis.ping();
    health.redisConnected = true;
  } catch (err) {
    health.redisConnected = false;
  }

  res.json(health);
});

// Main routes
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);

// ==============================================
// ERROR HANDLERS
// ==============================================

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ==============================================
// GRACEFUL SHUTDOWN
// ==============================================
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  const shutdownPromises = [];

  // Close DB
  shutdownPromises.push(
    sequelize.close().then(() => logger.info('Database connection closed'))
      .catch(err => logger.error('Error closing DB', { error: err.message }))
  );

  // Close Redis
  shutdownPromises.push(
    redis.quit().then(() => logger.info('Redis connection closed'))
      .catch(err => logger.error('Error closing Redis', { error: err.message }))
  );

  // Stop cron
  try {
    cron.stopAll();
    logger.info('Cron jobs stopped');
  } catch (err) {
    logger.error('Error stopping cron', { error: err.message });
  }

  // Wait for closures
  await Promise.all(shutdownPromises);

  logger.info('Graceful shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==============================================
// START SERVER
// ==============================================
const startServer = async () => {
  try {
    // Database
    await sequelize.authenticate();
    logger.info('✓ PostgreSQL connection established');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('✓ Database models synced (dev mode)');
    }

    // Redis
    await redis.ping();
    logger.info('✓ Redis connection established');

    // Cron jobs
    cron.startAll();
    logger.info(`✓ Cron jobs started (${cron.getJobCount() || 0} jobs)`);

    // Express server
    app.listen(PORT, () => {
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const host = process.env.RENDER_EXTERNAL_HOSTNAME || `localhost:${PORT}`;
      const webhookUrl = `${protocol}://${host}/webhook`;

      logger.info('='.repeat(60));
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 Webhook URL: ${webhookUrl}`);
      logger.info(`🔗 Public URL: ${protocol}://${host}`);
      logger.info('='.repeat(60));
    });
  } catch (error) {
    logger.error('❌ Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Run startup
startServer();

module.exports = app;