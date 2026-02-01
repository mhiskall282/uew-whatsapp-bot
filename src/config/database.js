// const { Sequelize } = require('sequelize');
// const logger = require('../utils/logger');

// // Create Sequelize instance
// const sequelize = new Sequelize(
//   // process.env.DB_NAME || 'uew_bot',
//   // process.env.DB_USER || 'postgres',
//   // process.env.DB_PASSWORD || '',
//   process.env.DATABASE_URL,
//   {
//     host: process.env.DATABASE_URL || 'postgresql://uew_bot_user:HfoKaQSbqGxCASvHgSzXXXw0xHvZQSAE@dpg-d5vc5qcr85hc73e404b0-a/uew_bot',
//     port: parseInt(process.env.DB_PORT) || 5432,
//     dialect: 'postgres',
    
//     // Logging
//     logging: (msg) => logger.debug(msg),
    
//     // Connection pool configuration
//     pool: {
//       max: 10,
//       min: 0,
//       acquire: 30000,
//       idle: 10000,
//     },
    
//     // Model defaults
//     define: {
//       timestamps: true,
//       underscored: true,
//       createdAt: 'created_at',
//       updatedAt: 'updated_at',
//     },
    
//     // Timezone
//     timezone: '+00:00',
//   }
// );

// module.exports = sequelize;


const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Determine connection string with fallback for local dev
const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'uew_bot'}`;

// Create Sequelize instance
const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',

  // IMPORTANT: Required for Render PostgreSQL (both internal & external URLs use SSL)
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,   // Render uses self-signed certs → disable strict verification
    },
  },

  // Logging – use your logger instead of console
  logging: (msg) => logger.debug(msg),

  // Connection pool configuration (good defaults – adjust if you get many connections)
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

  // Timezone (UTC is usually best for servers)
  timezone: '+00:00',
});

// Optional: Test connection on startup (helps debug deploys)
(async () => {
  try {
    await sequelize.authenticate();
    logger.info('✓ PostgreSQL connection has been established successfully');
  } catch (error) {
    logger.error('❌ Unable to connect to the PostgreSQL database', {
      error: error.message,
      stack: error.stack,
      connectionString: connectionString.replace(/:.*@/, ':***@'), // mask password in logs
    });
    // Optional: process.exit(1); if you want to crash on failed DB connection
  }
})();

module.exports = sequelize;