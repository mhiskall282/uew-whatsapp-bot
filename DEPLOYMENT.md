# Deployment Guide - UEW WhatsApp Bot

## 🚀 Production Deployment Options

This guide covers deploying your bot to production.

---

## Option 1: Railway (Recommended - Easiest)

### Why Railway?
- ✅ Easy PostgreSQL + Redis setup
- ✅ Free $5 credit monthly
- ✅ GitHub auto-deployment
- ✅ Simple environment variables
- ✅ Good for 100-1000 users
- 💰 Cost: $5-15/month

### Step-by-Step:

**1. Create Railway Account**
- Go to https://railway.app
- Sign up with GitHub

**2. Create New Project**
```
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your repository
4. Railway will detect Node.js automatically
```

**3. Add PostgreSQL**
```
1. In your project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway auto-configures DATABASE_URL
```

**4. Add Redis**
```
1. Click "New" again
2. Select "Database" → "Redis"
3. Auto-configures REDIS_URL
```

**5. Configure Environment Variables**
```
1. Click on your web service
2. Go to "Variables" tab
3. Add all variables from .env:
   - WHATSAPP_API_TOKEN
   - WHATSAPP_PHONE_NUMBER_ID
   - WHATSAPP_VERIFY_TOKEN
   - GEMINI_API_KEY
   - INITIAL_CREDITS
   - CREDITS_PER_QUERY
   - CREDITS_PER_FEEDBACK
   - etc.
```

**6. Deploy**
```
1. Railway auto-deploys on git push
2. Get your deployment URL (e.g., https://your-app.railway.app)
3. Update WhatsApp webhook with this URL
```

**7. Run Database Migrations**
```bash
# From Railway CLI or project logs
railway run node init-db.js
railway run node seed.js
```

---

## Option 2: Render

### Why Render?
- ✅ Free tier available
- ✅ PostgreSQL + Redis included
- ✅ Auto-deploy from GitHub
- ✅ Good documentation
- 💰 Cost: $0-10/month (free tier available)

### Step-by-Step:

**1. Create Render Account**
- Go to https://render.com
- Sign up with GitHub

**2. Create Web Service**
```
1. Dashboard → "New" → "Web Service"
2. Connect GitHub repository
3. Configure:
   - Name: uew-whatsapp-bot
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
   - Instance Type: Free (or Starter $7/mo)
```

**3. Add PostgreSQL**
```
1. Dashboard → "New" → "PostgreSQL"
2. Name: uew-bot-db
3. Instance Type: Free
4. Copy Internal Database URL
```

**4. Add Redis**
```
1. Dashboard → "New" → "Redis"
2. Name: uew-bot-redis
3. Copy Internal Redis URL
```

**5. Environment Variables**
```
In Web Service → Environment:
- DATABASE_URL: [from PostgreSQL]
- REDIS_URL: [from Redis]
- WHATSAPP_API_TOKEN: [your token]
- WHATSAPP_PHONE_NUMBER_ID: [your ID]
- WHATSAPP_VERIFY_TOKEN: [your verify token]
- GEMINI_API_KEY: [your Gemini key]
- NODE_ENV: production
- All other .env variables
```

**6. Deploy**
- Render auto-deploys on git push
- Get URL: `https://uew-whatsapp-bot.onrender.com`
- Update WhatsApp webhook

---

## Option 3: DigitalOcean (Advanced)

### Why DigitalOcean?
- ✅ Full control
- ✅ Scalable
- ✅ Good for large deployments
- ❌ More complex setup
- 💰 Cost: $15-30/month

### Quick Setup:

**1. Create Droplet**
```bash
# Choose:
- Ubuntu 22.04 LTS
- $6/month plan (1GB RAM)
- Datacenter close to Ghana
```

**2. Install Dependencies**
```bash
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Redis
apt install -y redis-server

# Install PM2 (process manager)
npm install -g pm2
```

**3. Setup Database**
```bash
# Create database user
sudo -u postgres createuser --interactive
sudo -u postgres createdb uew_bot

# Set password
sudo -u postgres psql
ALTER USER your_user WITH PASSWORD 'your_password';
```

**4. Deploy Application**
```bash
# Clone repository
cd /var/www
git clone https://github.com/yourusername/uew-whatsapp-bot.git
cd uew-whatsapp-bot

# Install dependencies
npm install

# Create .env file
nano .env
# Add all environment variables

# Initialize database
node init-db.js
node seed.js

# Start with PM2
pm2 start src/server.js --name uew-bot
pm2 save
pm2 startup
```

**5. Setup Nginx**
```bash
# Install Nginx
apt install -y nginx

# Configure
nano /etc/nginx/sites-available/uew-bot

# Add:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
ln -s /etc/nginx/sites-available/uew-bot /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

**6. Setup SSL (HTTPS)**
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d your-domain.com

# Auto-renewal
certbot renew --dry-run
```

---

## WhatsApp Webhook Configuration

### Update Webhook URL

**1. Go to Meta Developer Console**
- https://developers.facebook.com/apps
- Your App → WhatsApp → Configuration

**2. Update Webhook**
```
Callback URL: https://your-deployment-url.com/webhook
Verify Token: [your WHATSAPP_VERIFY_TOKEN from .env]
```

**3. Subscribe to Webhooks**
```
☑ messages
```

**4. Test**
- Send message to your WhatsApp number
- Check deployment logs for incoming webhook

---

## Environment Variables Checklist

Make sure all these are set in production:

```env
# Required
✅ NODE_ENV=production
✅ PORT=3000
✅ WHATSAPP_API_TOKEN
✅ WHATSAPP_PHONE_NUMBER_ID
✅ WHATSAPP_VERIFY_TOKEN
✅ GEMINI_API_KEY
✅ DATABASE_URL (or DB_HOST, DB_PORT, etc.)
✅ REDIS_URL (or REDIS_HOST, REDIS_PORT)

# Optional but recommended
✅ INITIAL_CREDITS
✅ CREDITS_PER_QUERY
✅ CREDITS_PER_FEEDBACK
✅ MIN_FEEDBACK_LENGTH
✅ LOG_LEVEL=info
✅ PINECONE_API_KEY (if using RAG)
```

---

## Database Migration

### Initial Setup
```bash
# SSH into your server or use platform CLI

# Initialize database
node init-db.js

# Seed locations
node seed.js

# Verify
psql $DATABASE_URL
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM locations;
```

### Backup Strategy
```bash
# Automated daily backup (cron)
0 2 * * * pg_dump $DATABASE_URL > /backups/uew_bot_$(date +\%Y\%m\%d).sql

# Restore from backup
psql $DATABASE_URL < backup_file.sql
```

---

## Monitoring & Logging

### View Logs

**Railway:**
```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# View logs
railway logs
```

**Render:**
```bash
# In dashboard
Service → Logs tab
```

**DigitalOcean:**
```bash
# PM2 logs
pm2 logs uew-bot

# Application logs
tail -f /var/www/uew-whatsapp-bot/logs/combined.log
```

### Set Up Monitoring

**1. Error Tracking (Optional)**
```bash
# Install Sentry
npm install @sentry/node

# In server.js
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

**2. Uptime Monitoring**
- Use: UptimeRobot, Pingdom, or BetterUptime
- Monitor: `https://your-url.com/health`
- Alert on: downtime, slow response

**3. Database Monitoring**
```bash
# Check database size
SELECT pg_size_pretty(pg_database_size('uew_bot'));

# Check connection count
SELECT count(*) FROM pg_stat_activity;
```

---

## Scaling Considerations

### When to Scale

**Indicators:**
- 🔴 Response time > 2 seconds
- 🔴 CPU usage > 80%
- 🔴 Memory usage > 90%
- 🔴 Database connections maxed out
- 🔴 Redis memory full

### Scaling Options

**Vertical Scaling (Increase Resources):**
```
Railway: Upgrade plan
Render: Switch to Starter/Pro
DigitalOcean: Resize droplet
```

**Horizontal Scaling (Add Instances):**
```
- Add load balancer
- Deploy multiple instances
- Use Redis for session storage
- Implement message queue (Bull/BullMQ)
```

**Database Scaling:**
```
- Add read replicas
- Connection pooling (already done in config)
- Move to managed database (Railway/Render PostgreSQL)
```

---

## Security Checklist

✅ **HTTPS enabled** (SSL certificate)
✅ **Environment variables secure** (not in code)
✅ **Rate limiting enabled** (express-rate-limit)
✅ **Helmet middleware** (security headers)
✅ **Database credentials strong**
✅ **Webhook signature verification** (recommended)
✅ **Redis password set** (production)
✅ **Logs don't contain sensitive data**
✅ **CORS configured** (if needed)
✅ **Regular dependency updates** (npm audit)

---

## Performance Optimization

### Caching Strategy
```javascript
// In message.handler.js
const cacheKey = `user:${from}:onboarding`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

// ... process ...

await cache.set(cacheKey, result, 3600); // 1 hour TTL
```

### Database Optimization
```sql
-- Add indexes (already in models)
CREATE INDEX idx_users_whatsapp ON users(whatsapp_number);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_created ON conversations(created_at);
```

### Redis Usage
```javascript
// Cache frequent queries
// Cache user states
// Rate limiting
// Session management
```

---

## Troubleshooting

### Webhook Not Receiving Messages

**Check:**
```bash
# 1. Webhook URL is correct and HTTPS
curl https://your-url.com/health

# 2. Verify token matches
echo $WHATSAPP_VERIFY_TOKEN

# 3. Check server logs
railway logs
# or
pm2 logs uew-bot

# 4. Test webhook manually
curl -X POST https://your-url.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Database Connection Issues

**Fix:**
```bash
# Check connection
psql $DATABASE_URL

# Test from Node.js
node -e "const {sequelize} = require('./src/models'); sequelize.authenticate().then(() => console.log('OK'))"

# Check environment variables
echo $DATABASE_URL
```

### Memory Leaks

**Monitor:**
```bash
# PM2 monitoring
pm2 monit

# Check memory usage
free -h

# Restart if needed
pm2 restart uew-bot
```

---

## Cost Estimation

### Small Scale (< 500 users)
```
Railway/Render Free Tier:     $0/month
Upgrade when needed:           $7-15/month
Domain (optional):             $12/year
Total:                         $0-15/month
```

### Medium Scale (500-5000 users)
```
Railway/Render Starter:        $7-15/month
PostgreSQL:                    Included or $5/month
Redis:                         Included or $5/month
Pinecone (optional):           $70/month or free tier
Total:                         $15-100/month
```

### Large Scale (5000+ users)
```
DigitalOcean Droplet:          $12-24/month
Managed PostgreSQL:            $15/month
Managed Redis:                 $10/month
Load Balancer (optional):      $10/month
Total:                         $47-60/month
```

---

## Maintenance

### Regular Tasks

**Daily:**
- ✅ Check error logs
- ✅ Monitor response times

**Weekly:**
- ✅ Review user feedback
- ✅ Check database size
- ✅ Update location data if needed

**Monthly:**
- ✅ Update dependencies (`npm update`)
- ✅ Review analytics
- ✅ Backup database
- ✅ Security audit (`npm audit`)

**Quarterly:**
- ✅ Major dependency updates
- ✅ Review and optimize database
- ✅ Evaluate scaling needs

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Render Docs**: https://render.com/docs
- **DigitalOcean Docs**: https://docs.digitalocean.com
- **WhatsApp API**: https://developers.facebook.com/docs/whatsapp
- **Sequelize**: https://sequelize.org/docs
- **PM2**: https://pm2.keymetrics.io/docs

---

Your bot is now production-ready! 🚀
