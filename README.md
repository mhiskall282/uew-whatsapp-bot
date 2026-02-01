# UEW WhatsApp AI Agent Bot - Complete Implementation Guide

## 🎯 Project Overview

A WhatsApp AI chatbot for University of Education, Winneba (UEW) that provides:
- **Campus Navigation**: Turn-by-turn directions with Google Maps integration
- **School Information**: Answers about departments, facilities, schedules
- **Website Knowledge**: Scraped and indexed UEW website content
- **Credit System**: Users earn credits through feedback
- **Admin Dashboard**: Analytics and monitoring

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Day 1: Core Setup](#day-1-core-setup)
3. [Day 2: Advanced Features](#day-2-advanced-features)
4. [System Architecture](#system-architecture)
5. [Deployment](#deployment)

---

## ✅ Prerequisites

### Required Accounts & Services

1. **WhatsApp Business Account**
   - Meta Business Account
   - WhatsApp Business API access
   - Phone number verification

2. **Database & Infrastructure**
   - PostgreSQL database (local or cloud)
   - Redis instance (local or cloud)
   - Pinecone account (vector database)

3. **AI Service**
   - Google Gemini API key

4. **Development Tools**
   - Node.js 18+ installed
   - PostgreSQL installed locally
   - Redis installed locally
   - Git
   - Postman or similar for API testing

### Estimated Costs (Monthly)

**Option 1: Minimal Setup (Development)**
- Supabase (PostgreSQL): Free tier
- Redis Cloud: Free tier (30MB)
- Pinecone: Free tier (100K vectors)
- Gemini API: Free tier (60 requests/min)
- **Total: $0/month**

**Option 2: Production Setup (100-500 users)**
- Railway/Render PostgreSQL: $5-10
- Redis Cloud: $5
- Pinecone Starter: $70 (or use free tier)
- Gemini API: Free tier sufficient
- Server hosting: $5-15
- **Total: $15-100/month**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WHATSAPP USERS                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         META WHATSAPP CLOUD API (Webhook)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               YOUR NODE.JS SERVER                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express.js API                                       │  │
│  │  ├── Webhook Handler (/webhook)                       │  │
│  │  ├── Message Router                                   │  │
│  │  └── Admin API (/admin/*)                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Core Services                                        │  │
│  │  ├── Intent Classifier (Gemini)                       │  │
│  │  ├── Navigation Service                               │  │
│  │  ├── Knowledge Service (RAG)                          │  │
│  │  ├── Credit Manager                                   │  │
│  │  └── Feedback Handler                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┬──────────────┐
         ▼           ▼           ▼              ▼
    ┌────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐
    │PostgreSQL│ │ Redis  │  │Pinecone │  │  Gemini  │
    │  Users  │  │ Cache  │  │ Vectors │  │   API    │
    │ Credits │  │Sessions│  │   KB    │  │          │
    │Feedback │  │        │  │         │  │          │
    └────────┘  └────────┘  └─────────┘  └──────────┘
```

---

## 🚀 Day 1: Core Setup (MVP)

### Step 1: WhatsApp Business API Setup (30 mins)

1. **Create Meta Business Account**
   - Go to https://business.facebook.com
   - Create a new business account
   - Verify your business

2. **Set up WhatsApp Business API**
   - Go to https://developers.facebook.com
   - Create a new app → Business → WhatsApp
   - Add WhatsApp product
   - Note down:
     - `WHATSAPP_API_TOKEN` (temporary, will be permanent later)
     - `WHATSAPP_PHONE_NUMBER_ID`
     - `WHATSAPP_BUSINESS_ACCOUNT_ID`

3. **Get a Test Number**
   - Meta provides a test number
   - Add your personal number as a recipient
   - Send a test message from the API console

4. **Set up Webhook** (we'll configure this later)

---

### Step 2: Local Development Setup (20 mins)

```bash
# Create project directory
mkdir uew-whatsapp-bot
cd uew-whatsapp-bot

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express dotenv axios pg sequelize @google/generative-ai
npm install @pinecone-database/pinecone cheerio node-cron winston
npm install helmet express-rate-limit ioredis joi uuid

# Install dev dependencies
npm install --save-dev nodemon

# Create folder structure
mkdir -p src/{routes,controllers,services,models,utils,jobs,scripts,config}
mkdir -p logs data
```

---

### Step 3: Environment Configuration (10 mins)

Create `.env` file in root:

```env
# Server
PORT=3000
NODE_ENV=development

# WhatsApp Cloud API
WHATSAPP_API_TOKEN=your_temporary_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=uew_bot_verify_token_12345

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uew_bot
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Pinecone
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=uew-knowledge

# Credits
INITIAL_CREDITS=5
CREDITS_PER_QUERY=1
CREDITS_PER_FEEDBACK=3
MIN_FEEDBACK_LENGTH=10
```

---

### Step 4: Database Setup (30 mins)

**Install PostgreSQL locally:**

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Run installer
- Remember the password you set for postgres user

**Create database:**
```bash
# Access PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE uew_bot;

# Exit
\q
```

**Install Redis locally:**

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Linux:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Windows:**
- Download from https://github.com/microsoftarchive/redis/releases
- Or use Docker: `docker run -d -p 6379:6379 redis`

---

### Step 5: Create Database Models (45 mins)

I'll provide you with all the model files next.

---

### Step 6: Core Services Implementation (90 mins)

After models, we'll create:
1. WhatsApp Service (send/receive messages)
2. Intent Classifier (detect what user wants)
3. Navigation Service (directions + Google Maps)
4. Credit Manager (manage user credits)
5. Feedback Handler

---

### Step 7: Webhook Setup (30 mins)

1. **Use ngrok for local testing:**

```bash
# Install ngrok
npm install -g ngrok

# Run your server
npm run dev

# In another terminal, expose it
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io
```

2. **Configure webhook in Meta Developer Console:**
   - Callback URL: `https://abc123.ngrok.io/webhook`
   - Verify token: `uew_bot_verify_token_12345`
   - Subscribe to: `messages`

3. **Test webhook:**
   - Send a message to your WhatsApp test number
   - Check your server logs

---

## 🎨 Day 2: Advanced Features

### Step 8: Pinecone Vector Database Setup (45 mins)

1. Create account at https://www.pinecone.io
2. Create index: `uew-knowledge`
3. Dimension: 768 (Gemini embedding size)
4. Metric: cosine

### Step 9: Website Scraper (60 mins)

Build scraper for UEW website content

### Step 10: RAG System (60 mins)

Implement Retrieval-Augmented Generation

### Step 11: Admin Dashboard (90 mins)

Create admin endpoints for analytics

### Step 12: Production Deployment (60 mins)

Deploy to Railway, Render, or similar

---

## 📁 Project Structure

```
uew-whatsapp-bot/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── pinecone.js
│   ├── models/
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Conversation.js
│   │   ├── Feedback.js
│   │   ├── Location.js
│   │   └── KnowledgeBase.js
│   ├── services/
│   │   ├── whatsapp.service.js
│   │   ├── gemini.service.js
│   │   ├── intent.service.js
│   │   ├── navigation.service.js
│   │   ├── knowledge.service.js
│   │   ├── credit.service.js
│   │   └── feedback.service.js
│   ├── controllers/
│   │   ├── webhook.controller.js
│   │   └── admin.controller.js
│   ├── routes/
│   │   ├── webhook.js
│   │   └── admin.js
│   ├── jobs/
│   │   ├── cron.js
│   │   └── scraper.job.js
│   ├── scripts/
│   │   ├── seedLocations.js
│   │   └── scrapeWebsite.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validators.js
│   │   └── helpers.js
│   └── server.js
├── data/
│   └── uew_locations.json
├── logs/
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🔐 Security Best Practices

1. **Never commit .env file**
2. **Use environment variables** for all secrets
3. **Implement rate limiting** on webhook
4. **Validate webhook signatures** from Meta
5. **Sanitize user inputs** before AI processing
6. **Hash sensitive data** in database
7. **Use HTTPS** in production
8. **Implement request timeouts**

---

## 📊 Monitoring & Logging

```javascript
// Winston logger setup
const logger = require('./utils/logger');

logger.info('User message received', { userId, message });
logger.error('API call failed', { error: err.message });
```

---

## 🧪 Testing Strategy

**Manual Testing Checklist:**
- [ ] User sends "hi" → gets welcome message
- [ ] User with 0 credits → gets feedback prompt
- [ ] Navigation query → returns directions + map link
- [ ] FAQ query → returns knowledge base answer
- [ ] Feedback submission → credits added
- [ ] Admin endpoints return analytics

---

## 🚢 Deployment Options

### Option 1: Railway (Recommended)
- Easy PostgreSQL + Redis setup
- Free $5 credit
- GitHub integration
- Cost: ~$10-15/month

### Option 2: Render
- Free tier available
- Good for small projects
- Cost: $0-10/month

### Option 3: DigitalOcean
- More control
- Droplet + Managed DB
- Cost: $15-30/month

---

## 📚 Next Steps After MVP

1. **Analytics Dashboard** - Web interface for admins
2. **Multi-language Support** - Twi, Ga, etc.
3. **Voice Messages** - Transcribe and respond
4. **Image Support** - Send campus maps
5. **Scheduled Messages** - Reminders, announcements
6. **Referral System** - Earn credits by inviting friends

---

## 🆘 Troubleshooting

**Webhook not receiving messages:**
- Check ngrok is running
- Verify webhook URL in Meta console
- Check verify token matches

**Database connection errors:**
- Ensure PostgreSQL is running: `pg_isready`
- Check credentials in .env
- Test connection: `psql -U postgres -d uew_bot`

**Gemini API errors:**
- Check API key is valid
- Verify rate limits not exceeded
- Review request format

---

## 📞 Support Resources

- WhatsApp Cloud API Docs: https://developers.facebook.com/docs/whatsapp
- Gemini API Docs: https://ai.google.dev/docs
- Pinecone Docs: https://docs.pinecone.io
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices

---

Now let's create all the code files...
