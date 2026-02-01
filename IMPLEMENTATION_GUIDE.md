# UEW WhatsApp Bot - Complete Implementation Guide

## 🎯 Two-Day Implementation Roadmap

This guide will help you build the complete WhatsApp bot from scratch in 2 days.

---

## DAY 1: Foundation & Core Features (8 hours)

### Hour 1-2: Setup & Configuration

**1. Create Project Directory**
```bash
mkdir uew-whatsapp-bot
cd uew-whatsapp-bot
```

**2. Initialize Node.js Project**
```bash
npm init -y
```

**3. Install Dependencies**
```bash
npm install express dotenv axios pg sequelize @google/generative-ai @pinecone-database/pinecone cheerio node-cron winston helmet express-rate-limit ioredis joi uuid
npm install --save-dev nodemon
```

**4. Setup Environment Variables**
Create `.env` file:
```env
# Copy from .env.example and fill in your values
PORT=3000
NODE_ENV=development

# WhatsApp (get from Meta Developer Console)
WHATSAPP_API_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_VERIFY_TOKEN=my_secure_token_123

# Gemini AI (get from Google AI Studio)
GEMINI_API_KEY=your_gemini_key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uew_bot
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Pinecone (optional for Day 1)
PINECONE_API_KEY=
PINECONE_INDEX_NAME=uew-knowledge

# Credits
INITIAL_CREDITS=5
CREDITS_PER_QUERY=1
CREDITS_PER_FEEDBACK=3
```

**5. Install PostgreSQL & Redis**

**macOS:**
```bash
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
```

**Ubuntu:**
```bash
sudo apt update
sudo apt install postgresql redis-server
sudo systemctl start postgresql
sudo systemctl start redis
```

**Windows:**
- Install PostgreSQL from: https://www.postgresql.org/download/windows/
- Install Redis: Download from https://github.com/microsoftarchive/redis/releases
  OR use Docker: `docker run -d -p 6379:6379 redis`

**6. Create Database**
```bash
psql -U postgres
CREATE DATABASE uew_bot;
\q
```

---

### Hour 3-4: Database Models & Setup

**1. Copy all model files from the provided code**
- `src/models/User.js`
- `src/models/Conversation.js`
- `src/models/Feedback.js`
- `src/models/Location.js`
- `src/models/KnowledgeBase.js`
- `src/models/index.js`

**2. Copy configuration files**
- `src/config/database.js`
- `src/config/redis.js`
- `src/config/pinecone.js`

**3. Copy utility files**
- `src/utils/logger.js`

**4. Test Database Connection**
Create `test-db.js`:
```javascript
require('dotenv').config();
const { sequelize } = require('./src/models');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');
    
    await sequelize.sync({ force: true }); // Creates tables
    console.log('✓ Tables created');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testConnection();
```

Run it:
```bash
node test-db.js
```

---

### Hour 5-6: WhatsApp Integration

**1. Setup WhatsApp Business API**

Go to https://developers.facebook.com/apps

- Create new app → Business → WhatsApp
- Go to WhatsApp → Getting Started
- Add your phone number as a recipient
- Get temporary access token
- Note Phone Number ID

**2. Create Webhook Route**

Create `src/routes/webhook.js`:
```javascript
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Webhook verification (GET)
router.get('/', webhookController.verifyWebhook);

// Receive messages (POST)
router.post('/', webhookController.handleMessage);

module.exports = router;
```

**3. Create Webhook Controller**

Create `src/controllers/webhook.controller.js`:
```javascript
const logger = require('../utils/logger');
const messageHandler = require('../services/message.handler');

exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed');
    res.sendStatus(403);
  }
};

exports.handleMessage = async (req, res) => {
  // Respond quickly to WhatsApp
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              // Process message asynchronously
              messageHandler.handleIncomingMessage(message, change.value).catch(err => {
                logger.error('Message handling error', { error: err.message });
              });
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error('Webhook error', { error: error.message });
  }
};
```

**4. Setup ngrok for Testing**
```bash
npm install -g ngrok

# In one terminal, start your server
npm run dev

# In another terminal, expose it
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

**5. Configure Webhook in Meta Console**
- Go to WhatsApp → Configuration
- Callback URL: `https://abc123.ngrok.io/webhook`
- Verify Token: `my_secure_token_123`
- Subscribe to: `messages`

---

### Hour 7-8: Message Handler & Intent Classification

**1. Create Message Handler**

Create `src/services/message.handler.js`:
```javascript
const { User, Conversation } = require('../models');
const whatsappService = require('./whatsapp.service');
const geminiService = require('./gemini.service');
const navigationService = require('./navigation.service');
const logger = require('../utils/logger');

class MessageHandler {
  async handleIncomingMessage(message, context) {
    const startTime = Date.now();
    
    try {
      const from = message.from;
      const messageText = message.text?.body || '';
      const messageId = message.id;

      logger.info('Incoming message', { from, text: messageText });

      // Mark as read
      await whatsappService.markAsRead(messageId);

      // Get or create user
      const user = await this.getOrCreateUser(from);

      if (!user.is_active || user.is_blocked) {
        logger.warn('Blocked or inactive user', { from });
        return;
      }

      // Save user message
      await Conversation.create({
        user_id: user.id,
        whatsapp_message_id: messageId,
        message_type: 'user',
        content: messageText,
      });

      // Handle onboarding
      if (!user.onboarding_completed) {
        await this.handleOnboarding(user, messageText);
        return;
      }

      // Check credits
      if (!user.hasEnoughCredits()) {
        await this.handleNoCredits(user);
        return;
      }

      // Classify intent
      const classification = await geminiService.classifyIntent(messageText);

      // Handle based on intent
      let response;
      switch (classification.intent) {
        case 'NAVIGATION':
          response = await this.handleNavigation(classification.entities);
          break;
        case 'FAQ':
          response = await this.handleFAQ(messageText);
          break;
        case 'GREETING':
          response = this.handleGreeting(user);
          break;
        case 'HELP':
          response = this.handleHelp();
          break;
        default:
          response = "I'm not sure how to help with that. Try asking about campus locations or university information!";
      }

      // Deduct credit
      await user.deductCredits(1);

      // Send response
      await whatsappService.sendTextMessage(from, response);

      // Save bot message
      const responseTime = Date.now() - startTime;
      await Conversation.create({
        user_id: user.id,
        message_type: 'bot',
        content: response,
        intent: classification.intent,
        intent_confidence: classification.confidence,
        credits_used: 1,
        response_time_ms: responseTime,
      });

      logger.info('Message handled successfully', {
        from,
        intent: classification.intent,
        responseTime,
      });

    } catch (error) {
      logger.error('Message handling failed', { error: error.message });
    }
  }

  async getOrCreateUser(whatsappNumber) {
    let [user] = await User.findOrCreate({
      where: { whatsapp_number: whatsappNumber },
      defaults: {
        whatsapp_number: whatsappNumber,
        credits: parseInt(process.env.INITIAL_CREDITS) || 5,
      },
    });
    return user;
  }

  async handleOnboarding(user, message) {
    const response = `
👋 Welcome to UEW Campus Assistant!

I'm here to help you with:
📍 Campus navigation & directions
❓ University information & FAQs
📰 Latest news & announcements

You have ${user.credits} free credits to get started!

Each question costs 1 credit. You can earn more credits by:
⭐ Giving feedback after I help you
📝 Completing surveys

Ready to explore? Ask me anything!
Example: "How do I get to the library?"`;

    await whatsappService.sendTextMessage(user.whatsapp_number, response);
    await user.completeOnboarding();
  }

  async handleNoCredits(user) {
    const response = `
😔 You're out of credits!

🌟 Earn ${process.env.CREDITS_PER_FEEDBACK} credits by giving feedback:
Simply rate my last response (1-5 stars) and add a short comment.

Example: "⭐⭐⭐⭐⭐ Very helpful, found the library easily!"

Or just type: FEEDBACK`;

    await whatsappService.sendTextMessage(user.whatsapp_number, response);
  }

  async handleNavigation(entities) {
    const { origin, destination } = entities;
    
    if (!destination) {
      return "I'd love to help you navigate! Please tell me where you want to go.\n\nExample: 'How do I get to the library?'";
    }

    return await navigationService.generateNavigationResponse(origin, destination);
  }

  async handleFAQ(question) {
    // For Day 1, simple FAQ response
    // Day 2 will add RAG system
    const answer = await geminiService.answerQuestion(question);
    return answer;
  }

  handleGreeting(user) {
    return `Hello! 👋 I'm your UEW campus assistant. I have ${user.credits} credits available.\n\nHow can I help you today?`;
  }

  handleHelp() {
    return `
🤖 **How to Use UEW Campus Assistant**

📍 **Navigation:**
- "How do I get to the library?"
- "I'm at Aggrey Hall, need to go to North Campus"
- "Where is the SRC office?"

❓ **Information:**
- "What departments does UEW have?"
- "When does the library close?"
- "Tell me about admissions"

⭐ **Earn Credits:**
- Give feedback: "⭐⭐⭐⭐⭐ Great help!"
- Rate responses after getting help

💡 **Tips:**
- Each question uses 1 credit
- You can earn credits through feedback
- Share your location for better directions

What would you like to know?`;
  }
}

module.exports = new MessageHandler();
```

**2. Test Your Bot!**

Send a message to your WhatsApp test number:
- "Hi" → Should get welcome message
- "How do I get to the library?" → Should attempt navigation

---

## DAY 2: Advanced Features (8 hours)

### Hour 1-2: Seed Location Data

**1. Create seed script**

Create `src/scripts/seedLocations.js`:
```javascript
require('dotenv').config();
const { Location, sequelize } = require('../models');

const locations = [
  {
    name: 'Aggrey Hall',
    aliases: ['aggrey', 'great hall'],
    type: 'hall',
    campus: 'central',
    latitude: 5.5438,
    longitude: -0.3494,
    description: 'Main assembly hall for university events',
    landmarks: 'Near the main gate, opposite the library',
  },
  {
    name: 'University Library',
    aliases: ['library', 'main library', 'sam jonah library'],
    type: 'library',
    campus: 'central',
    latitude: 5.5445,
    longitude: -0.3501,
    description: 'Main university library with study areas and resources',
    opening_hours: 'Mon-Fri: 8am-10pm, Sat-Sun: 9am-6pm',
    landmarks: 'Opposite Aggrey Hall, near the fountain',
  },
  {
    name: 'North Campus (Simpa A)',
    aliases: ['north campus', 'simpa a', 'simpa', 'nc'],
    type: 'landmark',
    campus: 'north',
    latitude: 5.5512,
    longitude: -0.3467,
    description: 'North Campus area with various departments',
    landmarks: 'Near the sports complex',
  },
  {
    name: 'SRC Office',
    aliases: ['src', 'student representative council'],
    type: 'office',
    campus: 'central',
    latitude: 5.5442,
    longitude: -0.3498,
    description: 'Student Representative Council office',
    opening_hours: 'Mon-Fri: 9am-5pm',
  },
  {
    name: 'Main Gate',
    aliases: ['entrance', 'front gate', 'main entrance'],
    type: 'gate',
    campus: 'central',
    latitude: 5.5435,
    longitude: -0.3490,
    description: 'Main university entrance',
  },
  {
    name: 'Faculty of Education Building',
    aliases: ['education building', 'foe', 'education faculty'],
    type: 'department',
    campus: 'central',
    latitude: 5.5448,
    longitude: -0.3505,
    description: 'Faculty of Education main building',
  },
  {
    name: 'ICT Directorate',
    aliases: ['ict', 'computer center', 'it directorate'],
    type: 'office',
    campus: 'central',
    latitude: 5.5440,
    longitude: -0.3496,
    description: 'ICT services and support center',
    opening_hours: 'Mon-Fri: 8am-5pm',
  },
  {
    name: 'University Cafeteria',
    aliases: ['cafeteria', 'canteen', 'dining hall'],
    type: 'cafeteria',
    campus: 'central',
    latitude: 5.5443,
    longitude: -0.3499,
    description: 'Main cafeteria serving breakfast, lunch, and dinner',
    opening_hours: '7am-9pm daily',
  },
];

async function seedLocations() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    await Location.destroy({ where: {} });
    console.log('✓ Cleared existing locations');

    for (const loc of locations) {
      await Location.create(loc);
      console.log(`✓ Added: ${loc.name}`);
    }

    console.log(`\n✓ Successfully seeded ${locations.length} locations!`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

seedLocations();
```

**2. Run seed script**
```bash
node src/scripts/seedLocations.js
```

---

### Hour 3-4: Feedback System

**1. Create feedback service**

Create `src/services/feedback.service.js`:
```javascript
const { Feedback, User } = require('../models');
const logger = require('../utils/logger');

class FeedbackService {
  /**
   * Parse feedback from user message
   * @param {string} message 
   * @returns {Object} {rating, comment}
   */
  parseFeedback(message) {
    // Count stars
    const starCount = (message.match(/⭐/g) || []).length;
    
    // Or look for numbers
    const numberMatch = message.match(/(\d)[\/\s]?5|\b([1-5])\s*(star|out)/i);
    
    const rating = starCount > 0 ? Math.min(starCount, 5) : 
                   numberMatch ? parseInt(numberMatch[1] || numberMatch[2]) : null;

    // Extract comment (remove stars and rating mentions)
    let comment = message
      .replace(/⭐/g, '')
      .replace(/\d[\/\s]?5/g, '')
      .replace(/\b[1-5]\s*(star|out of 5)/gi, '')
      .trim();

    return { rating, comment };
  }

  /**
   * Save feedback and award credits
   * @param {User} user 
   * @param {number} rating 
   * @param {string} comment 
   * @returns {Promise<Feedback>}
   */
  async saveFeedback(user, rating, comment) {
    try {
      const feedback = await Feedback.create({
        user_id: user.id,
        rating,
        comment,
        feedback_type: 'general',
        credits_awarded: parseInt(process.env.CREDITS_PER_FEEDBACK) || 3,
        is_processed: true,
      });

      // Award credits
      await user.addCredits(feedback.credits_awarded);
      user.total_feedback_given += 1;
      await user.save();

      logger.info('Feedback saved', {
        userId: user.id,
        rating,
        creditsAwarded: feedback.credits_awarded,
      });

      return feedback;
    } catch (error) {
      logger.error('Save feedback failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if message is feedback
   * @param {string} message 
   * @returns {boolean}
   */
  isFeedback(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check for star emojis
    if (message.includes('⭐')) {
      return true;
    }

    // Check for rating patterns
    if (/\b[1-5]\s*(star|out of 5|\/5)/i.test(message)) {
      return true;
    }

    // Check for feedback keywords
    if (lowerMessage.includes('feedback') || lowerMessage.includes('rating')) {
      return true;
    }

    return false;
  }
}

module.exports = new FeedbackService();
```

**2. Update message handler to handle feedback**

Add to `src/services/message.handler.js`:

```javascript
const feedbackService = require('./feedback.service');

// In handleIncomingMessage, before intent classification:

// Check if message is feedback
if (feedbackService.isFeedback(messageText)) {
  await this.handleFeedback(user, messageText);
  return;
}

// Add new method:
async handleFeedback(user, message) {
  const { rating, comment } = feedbackService.parseFeedback(message);

  if (!rating) {
    const response = `
Please rate your experience with stars (1-5) and a comment:

Example: ⭐⭐⭐⭐⭐ Very helpful!

Or: 4/5 Good directions but could be clearer`;

    await whatsappService.sendTextMessage(user.whatsapp_number, response);
    return;
  }

  await feedbackService.saveFeedback(user, rating, comment);

  const response = `
🎉 Thank you for your feedback!

Rating: ${'⭐'.repeat(rating)}
Credits earned: +${process.env.CREDITS_PER_FEEDBACK}
Your new balance: ${user.credits} credits

Your feedback helps us improve! 🙏`;

  await whatsappService.sendTextMessage(user.whatsapp_number, response);
}
```

---

### Hour 5-6: Website Scraper & Knowledge Base

**1. Create web scraper**

Create `src/scripts/scrapeWebsite.js`:
```javascript
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
```

**2. Run scraper**
```bash
node src/scripts/scrapeWebsite.js
```

---

### Hour 7-8: Admin Dashboard & Cron Jobs

**1. Create admin routes**

Create `src/routes/admin.js`:
```javascript
const express = require('express');
const router = express.Router();
const { User, Conversation, Feedback, Location, KnowledgeBase } = require('../models');
const { Op } = require('sequelize');

// Analytics
router.get('/analytics', async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const totalConversations = await Conversation.count();
    const avgRating = await Feedback.aggregate('rating', 'avg');

    const topIntents = await Conversation.findAll({
      attributes: [
        'intent',
        [Conversation.sequelize.fn('COUNT', 'id'), 'count'],
      ],
      where: { intent: { [Op.not]: null } },
      group: ['intent'],
      order: [[Conversation.sequelize.fn('COUNT', 'id'), 'DESC']],
      limit: 10,
    });

    res.json({
      totalUsers,
      activeUsers,
      totalConversations,
      avgRating: avgRating ? parseFloat(avgRating).toFixed(2) : null,
      topIntents,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recent feedback
router.get('/feedback', async (req, res) => {
  try {
    const feedback = await Feedback.findAll({
      include: [{ model: User, as: 'user', attributes: ['whatsapp_number'] }],
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User stats
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id',
        'whatsapp_number',
        'credits',
        'total_queries',
        'total_feedback_given',
        'created_at',
        'last_interaction_at',
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**2. Create cron jobs**

Create `src/jobs/cron.js`:
```javascript
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
```

---

## 🧪 Testing Checklist

### Day 1 Tests:
- [ ] Send "Hi" → Get welcome message with credits
- [ ] Send "Help" → Get help menu
- [ ] Send "How do I get to the library?" → Get directions
- [ ] Run out of credits → Get feedback prompt
- [ ] Send feedback "⭐⭐⭐⭐⭐ Great!" → Earn credits

### Day 2 Tests:
- [ ] Check `/admin/analytics` → See stats
- [ ] Check `/admin/feedback` → See recent feedback
- [ ] Locations seeded in database
- [ ] Website content scraped
- [ ] Cron job scheduled

---

## 🚀 Deployment

### Option 1: Railway (Easiest)

1. Create account at https://railway.app
2. Create new project
3. Add PostgreSQL service
4. Add Redis service
5. Deploy from GitHub
6. Set environment variables
7. Get production URL
8. Update WhatsApp webhook

### Option 2: Render

1. Create account at https://render.com
2. Create Web Service from GitHub
3. Add PostgreSQL database
4. Add Redis instance
5. Set environment variables
6. Deploy

---

## 🎯 What You Built

✅ WhatsApp chatbot with AI
✅ Campus navigation with Google Maps
✅ Credit system with feedback
✅ Knowledge base from website
✅ Admin analytics
✅ Scalable architecture

---

## 📈 Next Steps

1. Add more locations to database
2. Improve intent classification
3. Add Pinecone for RAG
4. Create web dashboard
5. Add multi-language support
6. Implement user referrals
7. Add voice message support

---

## 🆘 Troubleshooting

**Database connection fails:**
```bash
# Check PostgreSQL is running
pg_isready

# Check credentials
psql -U postgres -d uew_bot
```

**Webhook not receiving messages:**
- Check ngrok is running
- Verify webhook URL in Meta console
- Check verify token matches

**Gemini API errors:**
- Verify API key is valid
- Check rate limits
- Review request format

---

## 📞 Resources

- WhatsApp API: https://developers.facebook.com/docs/whatsapp
- Gemini AI: https://ai.google.dev/docs
- Sequelize: https://sequelize.org/docs
- Express: https://expressjs.com

---

Good luck! 🚀
