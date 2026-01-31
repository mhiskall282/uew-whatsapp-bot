require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { KnowledgeBase, sequelize } = require('../models');
const geminiService = require('../services/gemini.service');
const logger = require('../utils/logger');
const crypto = require('crypto');

class WebsiteScraper {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || process.env.UEW_WEBSITE_URL;
  }

  async scrapePage(url) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const $ = cheerio.load(response.data);

      // Remove scripts, styles, and navigation
      $('script, style, nav, header, footer').remove();

      // Extract title
      const title = $('h1').first().text().trim() || $('title').text().trim();

      // Extract main content
      const content = $('article, main, .content, #content, .main')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      if (!content || content.length < 50) {
        return null;
      }

      // Generate hash for change detection
      const contentHash = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');

      return {
        title,
        content,
        url,
        contentHash,
      };
    } catch (error) {
      logger.error('Scraping failed', { url, error: error.message });
      return null;
    }
  }

  async scrapeAndStore() {
    try {
      await sequelize.authenticate();
      logger.info('Starting website scraping...');

      // Define pages to scrape
      const pagesToScrape = [
        `${this.baseUrl}/about`,
        `${this.baseUrl}/admissions`,
        `${this.baseUrl}/academics`,
        `${this.baseUrl}/faculties`,
        `${this.baseUrl}/contact`,
        `${this.baseUrl}/news`,
      ];

      let scrapedCount = 0;

      for (const url of pagesToScrape) {
        const pageData = await this.scrapePage(url);

        if (!pageData) {
          continue;
        }

        // Check if content already exists
        const existing = await KnowledgeBase.findOne({
          where: { url: pageData.url },
        });

        if (existing && existing.content_hash === pageData.contentHash) {
          logger.info('Content unchanged, skipping', { url });
          continue;
        }

        // Generate summary
        const summary = await geminiService.generateSummary(
          pageData.content.substring(0, 1000)
        );

        // Save or update
        await KnowledgeBase.upsert({
          ...pageData,
          summary,
          content_type: 'page',
          last_scraped_at: new Date(),
          is_active: true,
        });

        scrapedCount++;
        logger.info('Page scraped and saved', { url: pageData.url });

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      logger.info(`Scraping complete. ${scrapedCount} pages processed.`);
      return scrapedCount;
    } catch (error) {
      logger.error('Scraping job failed', { error: error.message });
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const scraper = new WebsiteScraper();
  scraper
    .scrapeAndStore()
    .then(count => {
      console.log(`✓ Scraped ${count} pages`);
      process.exit(0);
    })
    .catch(error => {
      console.error('✗ Error:', error.message);
      process.exit(1);
    });
}

module.exports = WebsiteScraper;