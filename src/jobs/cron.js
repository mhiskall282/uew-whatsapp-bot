const cron = require('node-cron');
const logger = require('../utils/logger');

const jobs = [];

// Example: Daily website scraping at 2 AM
// Uncomment when you have the scraper ready
/*
const scraperJob = cron.schedule('0 2 * * *', async () => {
  logger.info('Running scheduled website scraping...');
  // Add scraper logic here
}, {
  scheduled: false,
});
jobs.push(scraperJob);
*/

module.exports = {
  startAll: () => {
    jobs.forEach(job => job.start());
    logger.info(`Started ${jobs.length} cron jobs`);
  },
  stopAll: () => {
    jobs.forEach(job => job.stop());
    logger.info(`Stopped ${jobs.length} cron jobs`);
  },
};
