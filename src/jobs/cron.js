const cron = require('node-cron');
const logger = require('../utils/logger');
const WebsiteScraper = require('../scripts/scrapeWebsite');

const jobs = [];

// Daily website scraping at 2 AM
const scraperJob = cron.schedule('0 2 * * *', async () => {
  logger.info('Running scheduled website scraping...');
  const scraper = new WebsiteScraper();
  try {
    await scraper.scrapeAndStore();
    logger.info('Scheduled scraping completed');
  } catch (error) {
    logger.error('Scheduled scraping failed', { error: error.message });
  }
}, {
  scheduled: false,
});

jobs.push(scraperJob);

module.exports = {
  startAll: () => {
    jobs.forEach(job => job.start());
    logger.info('Cron jobs started');
  },
  stopAll: () => {
    jobs.forEach(job => job.stop());
    logger.info('Cron jobs stopped');
  },
};