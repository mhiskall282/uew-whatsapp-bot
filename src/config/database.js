const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'uew_bot',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    
    // Logging
    logging: (msg) => logger.debug(msg),
    
    // Connection pool configuration
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    
    // Model defaults
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    
    // Timezone
    timezone: '+00:00',
  }
);

module.exports = sequelize;
