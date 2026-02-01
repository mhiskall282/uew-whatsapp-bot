# Quick Start Guide - UEW WhatsApp Bot

## 🚀 Get Started in 30 Minutes

This is a streamlined guide to get your bot running quickly.

---

## Step 1: Clone/Download Files (2 mins)

Download all the files I've provided and organize them like this:

```
uew-whatsapp-bot/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── pinecone.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Conversation.js
│   │   ├── Feedback.js
│   │   ├── Location.js
│   │   ├── KnowledgeBase.js
│   │   └── index.js
│   ├── services/
│   │   ├── whatsapp.service.js
│   │   ├── gemini.service.js
│   │   └── navigation.service.js
│   ├── routes/
│   │   ├── webhook.js
│   │   └── admin.js
│   ├── utils/
│   │   └── logger.js
│   ├── jobs/
│   │   └── cron.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Step 2: Install Dependencies (5 mins)

```bash
cd uew-whatsapp-bot

# Install Node.js packages
npm install

# Install PostgreSQL (choose your OS)
# macOS:
brew install postgresql@15
brew services start postgresql@15

# Ubuntu:
sudo apt install postgresql
sudo systemctl start postgresql

# Windows: Download from postgresql.org

# Install Redis
# macOS:
brew install redis
brew services start redis

# Ubuntu:
sudo apt install redis-server
sudo systemctl start redis

# Windows: Use Docker
docker run -d -p 6379:6379 redis
```

---

## Step 3: Setup Database (3 mins)

```bash
# Create database
 

CREATE DATABASE uew_bot;
\q
```

---

## Step 4: Configure Environment (5 mins)

Copy `.env.example` to `.env` and fill in:

```env
PORT=3000
NODE_ENV=development

# WhatsApp - Get from Meta Developer Console
WHATSAPP_API_TOKEN=YOUR_TOKEN_HERE
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_ID
WHATSAPP_VERIFY_TOKEN=any_random_string_123

# Gemini - Get from Google AI Studio
GEMINI_API_KEY=YOUR_GEMINI_KEY

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uew_bot
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Credits
INITIAL_CREDITS=5
CREDITS_PER_QUERY=1
CREDITS_PER_FEEDBACK=3
```

### Where to Get API Keys:

**WhatsApp:**
1. Go to https://developers.facebook.com/apps
2. Create New App → Business → WhatsApp
3. Go to WhatsApp → Getting Started
4. Copy the temporary access token and phone number ID

**Gemini:**
1. Go to https://makersuite.google.com/app/apikey
2. Create API key
3. Copy it

---

## Step 5: Initialize Database (2 mins)

Create `init-db.js`:

```javascript
require('dotenv').config();
const { sequelize } = require('./src/models');

async function init() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');
    
    await sequelize.sync({ force: true });
    console.log('✓ Tables created');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

init();
```

Run it:
```bash
node init-db.js
```

---

## Step 6: Add Sample Locations (3 mins)

Create `seed.js`:

```javascript
require('dotenv').config();
const { Location } = require('./src/models');

const locations = [
  {
    name: 'University Library',
    aliases: ['library', 'main library'],
    type: 'library',
    campus: 'central',
    latitude: 5.5445,
    longitude: -0.3501,
    description: 'Main university library',
    opening_hours: 'Mon-Fri: 8am-10pm',
  },
  {
    name: 'Aggrey Hall',
    aliases: ['aggrey', 'great hall'],
    type: 'hall',
    campus: 'central',
    latitude: 5.5438,
    longitude: -0.3494,
    description: 'Main assembly hall',
  },
  {
    name: 'SRC Office',
    aliases: ['src', 'student council'],
    type: 'office',
    campus: 'central',
    latitude: 5.5442,
    longitude: -0.3498,
    description: 'Student Representative Council office',
  },
];

async function seed() {
  for (const loc of locations) {
    await Location.create(loc);
    console.log(`✓ Added: ${loc.name}`);
  }
  console.log('Done!');
  process.exit(0);
}

seed();
```

Run it:
```bash
node seed.js
```

---

## Step 7: Setup ngrok for Testing (2 mins)

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run dev

# In another terminal
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

---

## Step 8: Configure WhatsApp Webhook (3 mins)

1. Go to Meta Developer Console
2. Your App → WhatsApp → Configuration
3. Click "Edit" next to Webhook
4. Callback URL: `https://abc123.ngrok.io/webhook`
5. Verify Token: Your `WHATSAPP_VERIFY_TOKEN` from .env
6. Click "Verify and Save"
7. Subscribe to: `messages`

---

## Step 9: Test Your Bot! (5 mins)

Send messages to your WhatsApp test number:

1. **"Hi"** - Should get welcome message
2. **"How do I get to the library?"** - Should get navigation
3. **"Help"** - Should get help menu
4. **"⭐⭐⭐⭐⭐ Great bot!"** - Should earn credits

Check your server logs to see what's happening!

---

## 🎉 You're Done!

Your bot is now running locally. Here's what works:

✅ WhatsApp message receiving  
✅ User registration with credits  
✅ Basic navigation  
✅ Feedback system  
✅ Admin analytics at `http://localhost:3000/admin/analytics`

---

## 🔧 Common Issues

**"Database connection failed"**
```bash
# Check PostgreSQL is running
pg_isready

# Fix connection
psql -U postgres
ALTER USER postgres WITH PASSWORD 'your_password';
```

**"Webhook verification failed"**
- Make sure ngrok is running
- Check WHATSAPP_VERIFY_TOKEN matches in .env and Meta console
- Look at server logs for errors

**"Cannot find module"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Check Admin Dashboard

Open in browser:
```
http://localhost:3000/admin/analytics
http://localhost:3000/admin/users
http://localhost:3000/admin/feedback
```

---

## 🚀 Next Steps

1. **Add More Locations**: Edit `seed.js` with UEW locations
2. **Improve Responses**: Customize messages in services
3. **Deploy to Production**: Use Railway or Render (see IMPLEMENTATION_GUIDE.md)
4. **Add Website Scraping**: See Day 2 in IMPLEMENTATION_GUIDE.md
5. **Setup Pinecone**: For advanced RAG search

---

## 📚 Files to Customize

**Most Important:**
- `src/services/message.handler.js` - Message processing logic (you'll create this)
- `seed.js` - Add your UEW locations
- `.env` - Your configuration

**For Advanced Features:**
- `src/services/gemini.service.js` - AI prompts
- `src/services/navigation.service.js` - Navigation logic
- `src/routes/webhook.js` - WhatsApp message handling

---

## 🆘 Need Help?

Check the logs:
```bash
# Server logs
tail -f logs/combined.log

# Error logs
tail -f logs/error.log
```

Test endpoints:
```bash
# Health check
curl http://localhost:3000/health

# Analytics
curl http://localhost:3000/admin/analytics
```

---

Happy coding! 🎉
