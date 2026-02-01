# Complete File Structure & Descriptions

## 📁 Project Structure

```
uew-whatsapp-bot/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # PostgreSQL Sequelize setup
│   │   ├── redis.js         # Redis client & cache helpers
│   │   └── pinecone.js      # Pinecone vector DB setup
│   │
│   ├── models/              # Database models (Sequelize)
│   │   ├── index.js         # Model exports & relationships
│   │   ├── User.js          # User model (WhatsApp users)
│   │   ├── Conversation.js  # Message history
│   │   ├── Feedback.js      # User feedback & ratings
│   │   ├── Location.js      # Campus locations
│   │   └── KnowledgeBase.js # Scraped website content
│   │
│   ├── services/            # Business logic
│   │   ├── message.handler.js    # CORE: Main message processor
│   │   ├── whatsapp.service.js   # WhatsApp API wrapper
│   │   ├── gemini.service.js     # Gemini AI integration
│   │   └── navigation.service.js # Location & directions logic
│   │
│   ├── routes/              # Express routes
│   │   ├── webhook.js       # WhatsApp webhook endpoint
│   │   └── admin.js         # Admin API endpoints
│   │
│   ├── utils/               # Utilities
│   │   └── logger.js        # Winston logger setup
│   │
│   ├── jobs/                # Scheduled tasks
│   │   └── cron.js          # Cron job definitions
│   │
│   ├── scripts/             # Utility scripts
│   │   └── (add later)      # seedLocations.js, scrapeWebsite.js
│   │
│   └── server.js            # Main Express app
│
├── logs/                    # Application logs (auto-created)
│   ├── combined.log         # All logs
│   └── error.log            # Error logs only
│
├── .env                     # Environment variables (DO NOT COMMIT)
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies
├── README.md                # Project overview
├── QUICK_START.md           # 30-min quick start guide
└── IMPLEMENTATION_GUIDE.md  # Full 2-day implementation
```

---

## 📄 File Descriptions

### Core Application Files

**`src/server.js`**
- Main Express application entry point
- Sets up middleware (helmet, rate limiting)
- Configures routes
- Handles graceful shutdown
- Initializes database, Redis, cron jobs

**`src/routes/webhook.js`**
- WhatsApp webhook endpoints
- GET: Webhook verification
- POST: Receive messages & statuses
- Delegates to message.handler.js

**`src/routes/admin.js`**
- Admin analytics endpoints
- `/admin/analytics` - User stats, ratings, intents
- `/admin/users` - User list
- `/admin/feedback` - Recent feedback
- `/admin/conversations/:userId` - Chat history

---

### Services (Business Logic)

**`src/services/message.handler.js`** ⭐ **MOST IMPORTANT**
- Main message processing logic
- User management (get/create)
- Onboarding flow
- Intent routing (navigation, FAQ, feedback, etc.)
- Credit management
- Response generation

**`src/services/whatsapp.service.js`**
- WhatsApp Cloud API wrapper
- Send text messages
- Send button/list messages
- Mark messages as read
- Error handling & retries

**`src/services/gemini.service.js`**
- Gemini AI integration
- Intent classification
- FAQ answering
- Text summarization
- Embedding generation

**`src/services/navigation.service.js`**
- Location search & matching
- Google Maps URL generation
- Distance calculation (Haversine formula)
- Navigation response formatting

---

### Database Models

**`src/models/User.js`**
```javascript
// Stores WhatsApp users
{
  id: UUID,
  whatsapp_number: String (unique),
  name: String,
  credits: Integer,
  total_queries: Integer,
  total_feedback_given: Integer,
  is_active: Boolean,
  is_blocked: Boolean,
  last_interaction_at: Date,
  onboarding_completed: Boolean
}

// Methods:
user.hasEnoughCredits(amount)
user.deductCredits(amount)
user.addCredits(amount)
user.completeOnboarding()
```

**`src/models/Conversation.js`**
```javascript
// Stores message history
{
  id: UUID,
  user_id: UUID (foreign key),
  whatsapp_message_id: String,
  message_type: 'user' | 'bot',
  content: Text,
  intent: String,
  intent_confidence: Float,
  metadata: JSONB,
  credits_used: Integer,
  response_time_ms: Integer
}
```

**`src/models/Feedback.js`**
```javascript
// Stores user feedback
{
  id: UUID,
  user_id: UUID (foreign key),
  conversation_id: UUID (foreign key),
  rating: Integer (1-5),
  comment: Text,
  feedback_type: Enum,
  credits_awarded: Integer,
  is_processed: Boolean
}
```

**`src/models/Location.js`**
```javascript
// Stores campus locations
{
  id: UUID,
  name: String,
  aliases: Array<String>,
  type: Enum (hall, library, office, etc.),
  campus: Enum (central, north, south, ajumako),
  latitude: Decimal,
  longitude: Decimal,
  description: Text,
  landmarks: Text,
  opening_hours: String,
  is_active: Boolean
}

// Methods:
location.getGoogleMapsUrl()
Location.findByNameOrAlias(searchTerm)
```

**`src/models/KnowledgeBase.js`**
```javascript
// Stores website content
{
  id: UUID,
  title: String,
  content: Text,
  url: String (unique),
  content_type: Enum,
  category: String,
  summary: Text,
  embedding_id: String,
  last_scraped_at: Date,
  content_hash: String,
  metadata: JSONB,
  is_active: Boolean,
  access_count: Integer
}
```

---

### Configuration Files

**`src/config/database.js`**
- Sequelize PostgreSQL setup
- Connection pooling
- Logging configuration
- Model defaults (timestamps, underscored)

**`src/config/redis.js`**
- Redis client setup
- Event listeners (connect, error, ready)
- Cache helper methods:
  - `cache.get(key)`
  - `cache.set(key, value, ttl)`
  - `cache.del(key)`
  - `cache.exists(key)`
  - `cache.increment(key)`

**`src/config/pinecone.js`**
- Pinecone vector DB client
- Index creation/management
- Vector operations:
  - `upsertVectors(vectors)`
  - `queryVectors(vector, topK)`
  - `deleteVectors(ids)`

---

### Utilities

**`src/utils/logger.js`**
- Winston logger configuration
- Console + file logging
- Log levels: error, warn, info, debug
- Auto-creates `logs/` directory
- Rotating file logs (5MB max, 5 files)

**`src/jobs/cron.js`**
- Cron job scheduler
- Placeholder for scheduled tasks
- Example: Daily website scraping
- Methods: `startAll()`, `stopAll()`

---

## 🔑 Environment Variables

**Required:**
```env
# WhatsApp (from Meta Developer Console)
WHATSAPP_API_TOKEN=          # Temporary or permanent access token
WHATSAPP_PHONE_NUMBER_ID=    # Phone number ID from WhatsApp settings
WHATSAPP_VERIFY_TOKEN=       # Your custom verification token

# Gemini AI (from Google AI Studio)
GEMINI_API_KEY=              # API key for Gemini Pro

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uew_bot
DB_USER=postgres
DB_PASSWORD=                 # Your PostgreSQL password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Optional:**
```env
# Pinecone (for advanced RAG)
PINECONE_API_KEY=
PINECONE_INDEX_NAME=uew-knowledge

# Credits Configuration
INITIAL_CREDITS=5
CREDITS_PER_QUERY=1
CREDITS_PER_FEEDBACK=3
MIN_FEEDBACK_LENGTH=10
```

---

## 🚀 Running the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

**Database Setup:**
```bash
# Create tables
node init-db.js

# Seed locations
node seed.js
```

---

## 📊 API Endpoints

### Public Endpoints

**`GET /`**
- Health check
- Returns: Status, version, timestamp

**`GET /health`**
- Server health
- Returns: Status, uptime, environment

### Webhook Endpoints

**`GET /webhook`**
- WhatsApp webhook verification
- Query params: hub.mode, hub.verify_token, hub.challenge

**`POST /webhook`**
- Receive WhatsApp messages
- Body: WhatsApp webhook payload

### Admin Endpoints

**`GET /admin/analytics`**
- Overall statistics
- Returns: Total users, conversations, avg rating, top intents

**`GET /admin/users?limit=50&offset=0`**
- User list with pagination
- Returns: User array with stats

**`GET /admin/feedback?limit=50`**
- Recent feedback
- Returns: Feedback array with user info

**`GET /admin/conversations/:userId`**
- User's chat history
- Returns: Conversation array

---

## 🔄 Message Flow

```
1. WhatsApp sends message to /webhook
2. Webhook validates and extracts message
3. message.handler.js receives message
4. Get/create user in database
5. Check onboarding status
6. Check credits
7. Classify intent with Gemini
8. Route to appropriate handler:
   - Navigation → navigation.service.js
   - FAQ → gemini.service.js
   - Feedback → feedback processing
9. Generate response
10. Deduct credits
11. Send response via whatsapp.service.js
12. Log conversation in database
```

---

## 🎯 Intent Classification

The bot classifies messages into these intents:

1. **NAVIGATION** - Directions, locations
   - Example: "How do I get to the library?"
   - Handler: `navigation.service.js`

2. **FAQ** - General university questions
   - Example: "What departments does UEW have?"
   - Handler: `gemini.service.js`

3. **WEBSITE_SEARCH** - Website-specific info
   - Example: "Latest news about admissions"
   - Handler: Knowledge base search

4. **FEEDBACK** - User feedback/ratings
   - Example: "⭐⭐⭐⭐⭐ Great help!"
   - Handler: Feedback processing

5. **GREETING** - Hi, hello, etc.
   - Handler: Simple greeting response

6. **HELP** - Help requests
   - Handler: Help menu

7. **OTHER** - Unclassified
   - Handler: Clarification request

---

## 📝 Adding New Features

### Add New Location:
```javascript
// In seed.js
{
  name: 'New Building',
  aliases: ['nb', 'new bldg'],
  type: 'office',
  campus: 'central',
  latitude: 5.5440,
  longitude: -0.3495,
  description: 'Description here',
}
```

### Add New Intent:
1. Update `gemini.service.js` classification prompt
2. Add case in `message.handler.js` switch statement
3. Create handler method

### Add New Admin Endpoint:
```javascript
// In src/routes/admin.js
router.get('/new-endpoint', async (req, res) => {
  // Your logic here
});
```

---

## 🐛 Debugging

**View Logs:**
```bash
# All logs
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# Live server output
npm run dev
```

**Test Endpoints:**
```bash
# Health check
curl http://localhost:3000/health

# Analytics
curl http://localhost:3000/admin/analytics

# Test webhook verification
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
```

---

## 📚 Key Dependencies

- **express** - Web framework
- **sequelize** - PostgreSQL ORM
- **ioredis** - Redis client
- **@google/generative-ai** - Gemini AI
- **@pinecone-database/pinecone** - Vector database
- **axios** - HTTP requests
- **winston** - Logging
- **node-cron** - Scheduled tasks
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting

---

This structure provides a solid foundation that's:
✅ Scalable
✅ Maintainable
✅ Secure
✅ Well-organized
✅ Production-ready
