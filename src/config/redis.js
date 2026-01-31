const Redis = require('ioredis');
const logger = require('../utils/logger');

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Event listeners
redis.on('connect', () => {
  logger.info('Redis client connecting...');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (err) => {
  logger.error('Redis error', { error: err.message });
});

redis.on('close', () => {
  logger.info('Redis connection closed');
});

// Helper functions for caching
const cache = {
  /**
   * Get value from cache
   * @param {string} key 
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  },

  /**
   * Set value in cache with expiry
   * @param {string} key 
   * @param {any} value 
   * @param {number} expirySeconds 
   * @returns {Promise<boolean>}
   */
  async set(key, value, expirySeconds = 3600) {
    try {
      await redis.setex(key, expirySeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Delete key from cache
   * @param {string} key 
   * @returns {Promise<boolean>}
   */
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Check if key exists
   * @param {string} key 
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    try {
      return (await redis.exists(key)) === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Set value with no expiry
   * @param {string} key 
   * @param {any} value 
   * @returns {Promise<boolean>}
   */
  async setPermanent(key, value) {
    try {
      await redis.set(key, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache setPermanent error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Increment counter
   * @param {string} key 
   * @returns {Promise<number>}
   */
  async increment(key) {
    try {
      return await redis.incr(key);
    } catch (error) {
      logger.error('Cache increment error', { key, error: error.message });
      return 0;
    }
  },
};

module.exports = redis;
module.exports.cache = cache;