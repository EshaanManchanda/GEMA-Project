# GEMA - Hostinger KVM Deployment Guide
## Complete Step-by-Step Instructions

**Server:** `root@93.127.185.245`
**Estimated Time:** 45-60 minutes
**Difficulty:** Intermediate

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Phase 1: Pre-Deployment Preparation (Local)](#phase-1-pre-deployment-preparation-local)
3. [Phase 2: Initial Server Setup](#phase-2-initial-server-setup)
4. [Phase 3: Application Configuration](#phase-3-application-configuration)
5. [Phase 4: SSL Certificate Setup](#phase-4-ssl-certificate-setup)
6. [Phase 5: Deployment](#phase-5-deployment)
7. [Phase 6: Verification & Testing](#phase-6-verification--testing)
8. [Phase 7: Post-Deployment Tasks](#phase-7-post-deployment-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

### ✓ Checklist - Before You Start

- [ ] Domain name configured with DNS pointing to `93.127.185.245`
  - **A Record:** `@` → `93.127.185.245`
  - **A Record:** `www` → `93.127.185.245`
  - **DNS Propagation:** Wait 1-24 hours (check with `nslookup your-domain.com`)

- [ ] **MongoDB Atlas** cluster created and configured
  - [ ] Cluster created at https://cloud.mongodb.com
  - [ ] Database user created with read/write permissions
  - [ ] Network access: Add `0.0.0.0/0` (all IPs) or server IP `93.127.185.245`
  - [ ] Connection string ready: `mongodb+srv://username:password@cluster.mongodb.net/gema`

- [ ] **Stripe** account setup (LIVE keys for production)
  - [ ] Account at https://dashboard.stripe.com
  - [ ] API Keys: `sk_live_...` and `pk_live_...`
  - [ ] Webhook ready (will configure endpoint after deployment)

- [ ] **Cloudinary** account configured
  - [ ] Account at https://console.cloudinary.com
  - [ ] Cloud name, API key, and API secret ready
  - [ ] Upload preset created (Settings → Upload)

- [ ] **Firebase** project setup
  - [ ] Project at https://console.firebase.google.com
  - [ ] Service account JSON downloaded (Project Settings → Service Accounts)
  - [ ] Web app registered with Firebase credentials

- [ ] **Email Service** configured
  - [ ] Hostinger email account created (recommended for Hostinger VPS)
  - [ ] SMTP credentials ready
  - [ ] OR Gmail App Password / SendGrid API key ready

- [ ] **SSH Access** to server
  - [ ] Can connect: `ssh root@93.127.185.245`
  - [ ] SSH key configured (optional but recommended)

---

## Phase 1: Pre-Deployment Preparation (Local)

### Step 1.1: Generate Secure Secrets

Open terminal/command prompt on your local machine:

```bash
# Generate JWT Secret (run this command)
openssl rand -base64 64

# Generate JWT Refresh Secret (run this command again)
openssl rand -base64 64

# Generate Admin Secret Key (run once more)
openssl rand -base64 32
```

**Save these three values** - you'll need them in Step 3.

---

### Step 1.2: Prepare Backend Environment File

1. **Navigate to backend directory:**
   ```bash
   cd E:\coding\gema\backend
   ```

2. **Open `.env.production`** in your text editor

3. **Fill in all production values:**

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database - MongoDB Atlas
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/gema?retryWrites=true&w=majority

# JWT Configuration - Use generated secrets from Step 1.1
JWT_SECRET=paste_first_generated_secret_here
JWT_REFRESH_SECRET=paste_second_generated_secret_here
ADMIN_SECRET_KEY=paste_third_generated_secret_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Firebase Admin SDK - From Firebase service account JSON
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_KEY_HERE\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# CORS - Your actual domain
FRONTEND_URL=https://your-domain.com

# Stripe - LIVE keys (pk_live_... and sk_live_...)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Email - Hostinger SMTP
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USERNAME=noreply@your-domain.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=GEMA Events <noreply@your-domain.com>

# Redis - Local (defaults are OK)
REDIS_HOST=localhost
REDIS_PORT=6379
DISABLE_REDIS=false
ENABLE_JOBS=true

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
UPLOAD_PROVIDER=cloudinary
```

4. **Save the file**

---

### Step 1.3: Prepare Frontend Environment File

1. **Navigate to frontend directory:**
   ```bash
   cd E:\coding\gema\frontend
   ```

2. **Open `.env.production`** in your text editor

3. **Update these critical values:**

```env
# API Configuration - Your actual domain
VITE_API_BASE_URL=https://your-domain.com/api

# App Configuration - Your actual domain
VITE_APP_URL=https://your-domain.com

# Stripe - LIVE publishable key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Firebase - From Firebase project settings
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your_app_id
# ... (rest of Firebase config)

# SEO - Update with your domain
VITE_SITE_IMAGE=https://your-domain.com/og-image.jpg

# Contact Info - Your actual contact details
VITE_CONTACT_EMAIL=contact@your-domain.com
VITE_SUPPORT_EMAIL=support@your-domain.com
```

4. **Save the file**

---

### Step 1.4: Update Setup Script (Optional)

If you want to automate domain configuration:

1. Open `setup-server.sh`
2. Update line 37:
   ```bash
   DOMAIN_NAME="your-actual-domain.com"  # Replace with your domain
   ```

---

### Step 1.5: Test Local Builds (Recommended)

**Test backend build:**
```bash
cd E:\coding\gema\backend
npm install
npm run build
```

**Test frontend build:**
```bash
cd E:\coding\gema\frontend
npm install
npm run build
```

If both build successfully, you're ready to deploy!

---

## Phase 2: Initial Server Setup

### Step 2.1: Connect to Server

```bash
ssh root@93.127.185.245
```

Enter your password when prompted.

---

### Step 2.2: Upload Setup Script

**Option A: If your code is on GitHub (Recommended)**

The setup script will clone from GitHub automatically. Just verify the repo URL:

```bash
# Check git repository
echo "https://github.com/EshaanManchanda/GEMA-Project.git"
```

**Option B: Upload setup script manually**

From your **local machine** (new terminal):

```bash
# Upload setup script to server
scp E:\coding\gema\setup-server.sh root@93.127.185.245:/root/
```

---

### Step 2.3: Run Automated Setup Script

Back on the **server**:

```bash
# Make script executable
chmod +x setup-server.sh

# Run setup script
./setup-server.sh
```

**What this script does:**
- Updates Ubuntu system packages
- Installs Node.js 20.x, npm, PM2
- Installs NGINX web server
- Installs Redis server
- Installs Certbot (Let's Encrypt SSL)
- Configures firewall (UFW)
- Clones your Git repository to `/var/www/gema`
- Builds backend and frontend
- Starts backend with PM2

**Duration:** ~10-15 minutes

**Expected output:** Green checkmarks and "Setup Complete" message

⚠️ **Note:** Setup will create default `.env` files. You'll replace these in Phase 3.

---

## Phase 3: Application Configuration

### Step 3.1: Upload Backend Environment File

**Option A: Copy-paste via nano (Easiest)**

On the **server**:

```bash
# Edit backend .env file
nano /var/www/gema/backend/.env
```

- **Paste** the contents of your local `backend/.env.production` file
- Press `Ctrl+X`, then `Y`, then `Enter` to save

**Option B: Upload via SCP**

From your **local machine**:

```bash
scp E:\coding\gema\backend\.env.production root@93.127.185.245:/var/www/gema/backend/.env
```

---

### Step 3.2: Upload Frontend Environment File

**Option A: Copy-paste via nano**

On the **server**:

```bash
# Edit frontend .env.production file
nano /var/www/gema/frontend/.env.production
```

- **Paste** the contents of your local `frontend/.env.production` file
- Press `Ctrl+X`, then `Y`, then `Enter` to save

**Option B: Upload via SCP**

From your **local machine**:

```bash
scp E:\coding\gema\frontend\.env.production root@93.127.185.245:/var/www/gema/frontend/.env.production
```

---

### Step 3.3: Update NGINX Configuration

On the **server**:

```bash
# Edit NGINX config
nano /etc/nginx/sites-available/gema
```

**Find and replace** all instances of `your-domain.com` with your actual domain:

- Press `Ctrl+W` then `Ctrl+R` (search and replace in nano)
- Search for: `your-domain.com`
- Replace with: `youractualdomain.com`
- Press `A` to replace all

Press `Ctrl+X`, then `Y`, then `Enter` to save.

**Test NGINX configuration:**

```bash
nginx -t
```

Expected output: `syntax is ok` and `test is successful`

**Reload NGINX:**

```bash
systemctl reload nginx
```

---

### Step 3.4: Verify Redis is Running

```bash
# Check Redis status
systemctl status redis-server

# Test Redis connection
redis-cli ping
```

Expected output: `PONG`

If Redis is not running:

```bash
systemctl start redis-server
systemctl enable redis-server
```

---

## Phase 4: SSL Certificate Setup

### Step 4.1: Verify DNS Propagation

Before requesting SSL certificate, ensure DNS is propagated:

```bash
# Check DNS resolution
nslookup your-domain.com
```

Expected output should show your server IP: `93.127.185.245`

If not, **wait** for DNS propagation (can take 1-24 hours).

---

### Step 4.2: Obtain SSL Certificate

```bash
# Request SSL certificate from Let's Encrypt
certbot --nginx -d your-domain.com -d www.your-domain.com
```

**Follow prompts:**
1. Enter email address (for renewal notifications)
2. Agree to Terms of Service (press `A`)
3. Choose whether to share email with EFF (optional)
4. **IMPORTANT:** Select option `2` - Redirect all HTTP to HTTPS

**Expected output:** "Successfully received certificate" and "Congratulations!"

---

### Step 4.3: Verify SSL Configuration

```bash
# Test NGINX config after SSL
nginx -t

# Reload NGINX
systemctl reload nginx
```

---

### Step 4.4: Test HTTPS Access

From your **local machine** browser or terminal:

```bash
# Test HTTPS access
curl -I https://your-domain.com

# Test API health endpoint
curl https://your-domain.com/api/health
```

Expected: `200 OK` and `{"status":"healthy"}`

---

## Phase 5: Deployment

### Step 5.1: Run Deployment Script

On the **server**:

```bash
cd /var/www/gema

# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

**What this does:**
1. Creates backup of current deployment
2. Pulls latest code from Git (if needed)
3. Installs backend dependencies
4. Builds backend TypeScript
5. Installs frontend dependencies
6. Builds frontend (Vite production build)
7. Reloads PM2 (zero-downtime restart)
8. Reloads NGINX

**Duration:** 5-10 minutes

---

### Step 5.2: Verify Deployment

**Check PM2 status:**

```bash
pm2 status
```

Expected output:
```
┌────┬────────────────┬─────────┬─────────┬─────────┬──────────┐
│ id │ name           │ status  │ restart │ uptime  │ cpu      │
├────┼────────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0  │ gema-backend   │ online  │ 0       │ 2m      │ 0%       │
└────┴────────────────┴─────────┴─────────┴─────────┴──────────┘
```

**Check PM2 logs:**

```bash
pm2 logs gema-backend --lines 50
```

Look for:
- ✅ "Server is running on port 5000"
- ✅ "Connected to MongoDB"
- ✅ "Redis connected successfully"
- ❌ No errors

---

## Phase 6: Verification & Testing

### Step 6.1: Test Backend API

```bash
# Health check
curl https://your-domain.com/api/health

# Test API response
curl https://your-domain.com/api/v1/events
```

Expected: JSON responses without errors

---

### Step 6.2: Test Frontend

Open browser and visit:
- ✅ `https://your-domain.com` - Homepage loads
- ✅ `https://www.your-domain.com` - Redirects to non-www
- ✅ Check browser console (F12) - No errors
- ✅ Check Network tab - API calls return 200 OK

---

### Step 6.3: Test Core Features

1. **User Registration**
   - Create new account
   - Verify email sent (check email service logs)

2. **User Login**
   - Login with created account
   - Check JWT token is stored

3. **File Upload** (if applicable)
   - Try uploading profile picture
   - Verify upload to Cloudinary

4. **Payment Flow** (test mode first)
   - Create test event or booking
   - Process test payment
   - Check Stripe dashboard for payment

---

### Step 6.4: Check Server Resources

```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check CPU usage
top
# Press 'q' to quit

# Check PM2 monitoring
pm2 monit
```

---

## Phase 7: Post-Deployment Tasks

### Step 7.1: Configure Stripe Webhook

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://your-domain.com/api/webhooks/stripe`
4. **Events to listen:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
   - `charge.succeeded`
   - `charge.failed`
5. Click **"Add endpoint"**
6. **Copy webhook signing secret** (starts with `whsec_...`)
7. **Update backend .env on server:**
   ```bash
   nano /var/www/gema/backend/.env
   ```
   Update `STRIPE_WEBHOOK_SECRET=whsec_...`
8. **Restart backend:**
   ```bash
   pm2 restart gema-backend
   ```

---

### Step 7.2: Test Stripe Webhook

```bash
# Send test webhook from Stripe dashboard
# Then check logs
pm2 logs gema-backend --lines 50
```

Look for webhook events being received.

---

### Step 7.3: Create Initial Admin User

**Option A: Via MongoDB Compass**

1. Connect to MongoDB Atlas
2. Navigate to `gema` database → `users` collection
3. Create new document:
   ```json
   {
     "email": "admin@your-domain.com",
     "firstName": "Admin",
     "lastName": "User",
     "password": "$2a$10$...", // Use bcrypt hash
     "role": "admin",
     "isVerified": true
   }
   ```

**Option B: Via API (if admin registration endpoint exists)**

```bash
curl -X POST https://your-domain.com/api/v1/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@your-domain.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "adminSecret": "YOUR_ADMIN_SECRET_KEY"
  }'
```

---

### Step 7.4: Setup Monitoring (Recommended)

**UptimeRobot (Free):**
1. Create account at https://uptimerobot.com
2. Add monitor for `https://your-domain.com`
3. Add monitor for `https://your-domain.com/api/health`
4. Configure alert email

**MongoDB Atlas Alerts:**
1. MongoDB Atlas → Project → Alerts
2. Configure alerts for:
   - High connection count
   - Storage > 80%
   - CPU > 80%

---

### Step 7.5: Setup Automated Backups

**Create backup script:**

```bash
nano /root/backup-mongodb.sh
```

**Paste:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Backup MongoDB (use mongodump if self-hosted)
# For Atlas, use Atlas automated backups

# Backup application files
tar -czf $BACKUP_DIR/gema-backup-$DATE.tar.gz /var/www/gema

# Keep only last 7 days
find $BACKUP_DIR -name "gema-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Make executable and schedule:**
```bash
chmod +x /root/backup-mongodb.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /root/backup-mongodb.sh >> /var/log/backup.log 2>&1
```

---

### Step 7.6: Configure Automatic SSL Renewal

Certbot automatically configures renewal. Verify:

```bash
# Test renewal (dry run)
certbot renew --dry-run
```

Expected: "Congratulations, all simulated renewals succeeded"

Certbot will automatically renew certificates before expiry.

---

## Troubleshooting

### Issue: Backend Not Starting

**Check logs:**
```bash
pm2 logs gema-backend --err --lines 100
```

**Common causes:**
- ❌ MongoDB connection failed → Check `MONGODB_URI` in `.env`
- ❌ Port 5000 already in use → `sudo lsof -i :5000`
- ❌ Redis connection failed → `systemctl status redis-server`
- ❌ Missing environment variables → Check `.env` file

**Solution:**
```bash
# Fix .env file
nano /var/www/gema/backend/.env

# Restart backend
pm2 restart gema-backend
```

---

### Issue: Frontend Shows 404 or Blank Page

**Check NGINX error logs:**
```bash
tail -f /var/log/nginx/gema_error.log
```

**Common causes:**
- ❌ Frontend not built → Check `/var/www/gema/frontend/dist` exists
- ❌ NGINX config error → `nginx -t`
- ❌ API URL wrong in frontend → Check `VITE_API_BASE_URL`

**Solution:**
```bash
# Rebuild frontend
cd /var/www/gema/frontend
npm run build

# Reload NGINX
systemctl reload nginx
```

---

### Issue: API Calls Failing (CORS Error)

**Check backend logs:**
```bash
pm2 logs gema-backend --lines 50
```

**Solution:**
```bash
# Update FRONTEND_URL in backend .env
nano /var/www/gema/backend/.env
# Set: FRONTEND_URL=https://your-actual-domain.com

# Restart backend
pm2 restart gema-backend
```

---

### Issue: SSL Certificate Not Working

**Check certificate status:**
```bash
certbot certificates
```

**Renew certificate:**
```bash
certbot renew --force-renewal
systemctl reload nginx
```

---

### Issue: High Memory Usage

**Check PM2 memory:**
```bash
pm2 list
```

If memory > 500MB, restart:
```bash
pm2 restart gema-backend
```

**Adjust PM2 max memory:**
```bash
nano /var/www/gema/backend/ecosystem.config.js
# Change: max_memory_restart: '750M'
pm2 restart gema-backend
```

---

### Issue: Payment Webhook Not Working

**Test webhook endpoint:**
```bash
curl -X POST https://your-domain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Check logs:**
```bash
pm2 logs gema-backend --lines 50 | grep webhook
```

**Verify webhook secret in Stripe dashboard matches .env**

---

## Maintenance & Updates

### Deploy New Code Changes

```bash
ssh root@93.127.185.245
cd /var/www/gema
./deploy.sh
```

---

### Rollback to Previous Version

```bash
cd /var/www/gema
./deploy.sh --rollback
```

---

### Update Dependencies

```bash
cd /var/www/gema/backend
npm update
npm run build

cd /var/www/gema/frontend
npm update
npm run build

pm2 restart gema-backend
```

---

### Monitor Application

```bash
# Real-time logs
pm2 logs gema-backend

# CPU & Memory monitoring
pm2 monit

# System resources
htop
# (Install: apt install htop)
```

---

### View Logs

```bash
# Backend logs
pm2 logs gema-backend --lines 100

# NGINX access logs
tail -f /var/log/nginx/gema_access.log

# NGINX error logs
tail -f /var/log/nginx/gema_error.log

# System logs
tail -f /var/log/syslog
```

---

### Restart Services

```bash
# Restart backend (zero downtime)
pm2 reload gema-backend

# Restart backend (force)
pm2 restart gema-backend

# Restart NGINX
systemctl restart nginx

# Restart Redis
systemctl restart redis-server
```

---

### Update Node.js Version

```bash
# Install new Node.js version
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Verify version
node -v

# Rebuild application
cd /var/www/gema
./deploy.sh
```

---

## Security Best Practices

### ✓ Security Checklist

- [ ] **Firewall (UFW)** enabled with only ports 22, 80, 443 open
- [ ] **SSH key authentication** configured (disable password auth)
- [ ] **Fail2ban** installed to prevent brute force attacks
- [ ] **Regular updates** scheduled (`apt update && apt upgrade`)
- [ ] **Strong passwords** for all accounts (MongoDB, email, etc.)
- [ ] **Environment variables** never committed to Git
- [ ] **HTTPS** enforced (HTTP redirects to HTTPS)
- [ ] **Security headers** configured in NGINX
- [ ] **Rate limiting** enabled in backend
- [ ] **MongoDB Atlas IP whitelist** configured (or use specific IP)
- [ ] **Backup strategy** implemented
- [ ] **Monitoring** setup (UptimeRobot, MongoDB Atlas alerts)
- [ ] **Webhook secrets** properly configured

---

## Performance Optimization

### Enable Redis Caching

Already enabled in setup! Verify:

```bash
redis-cli ping
# Should return: PONG

# Check Redis stats
redis-cli INFO stats
```

---

### Monitor Database Performance

1. **MongoDB Atlas Console**
   - Check connection count
   - Monitor slow queries
   - Check indexes

2. **Add Database Indexes** (if needed)
   - See `backend/src/models/` for schema definitions
   - Add indexes for frequently queried fields

---

### Optimize NGINX

Already optimized in configuration! Features:
- ✅ Gzip compression
- ✅ Static asset caching (1 year)
- ✅ HTTP/2 enabled
- ✅ Connection pooling

---

## Additional Resources

### Useful Commands Reference

```bash
# PM2
pm2 status                    # View all processes
pm2 logs                      # View all logs
pm2 logs gema-backend         # View specific app logs
pm2 monit                     # Monitor CPU/memory
pm2 restart gema-backend      # Restart app
pm2 reload gema-backend       # Zero-downtime restart
pm2 stop gema-backend         # Stop app
pm2 start gema-backend        # Start app
pm2 save                      # Save PM2 process list

# NGINX
nginx -t                      # Test configuration
systemctl status nginx        # Check status
systemctl restart nginx       # Restart NGINX
systemctl reload nginx        # Reload config (no downtime)
tail -f /var/log/nginx/gema_error.log  # View error logs

# Redis
redis-cli ping                # Test connection
redis-cli INFO               # Server info
redis-cli FLUSHALL           # Clear all data (careful!)
systemctl status redis-server # Check status

# System
free -h                       # Memory usage
df -h                         # Disk usage
top                          # CPU/memory processes
htop                         # Better top (install: apt install htop)
netstat -tulpn               # Network ports
systemctl list-units         # All services

# Git
cd /var/www/gema
git status                    # Check status
git pull                      # Pull latest changes
git log --oneline -10        # Recent commits

# Database
# MongoDB Compass - GUI tool
# Download: https://www.mongodb.com/products/compass
```

---

### Documentation Links

- **MongoDB Atlas:** https://docs.atlas.mongodb.com/
- **Stripe API:** https://stripe.com/docs/api
- **Cloudinary:** https://cloudinary.com/documentation
- **Firebase:** https://firebase.google.com/docs
- **PM2:** https://pm2.keymetrics.io/docs/
- **NGINX:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Redis:** https://redis.io/documentation

---

## Support & Contact

### Issue Reporting

- **GitHub Issues:** https://github.com/EshaanManchanda/GEMA-Project/issues
- **Documentation:** See `DEPLOYMENT_GUIDE.md` for detailed info

### Server Access

- **SSH:** `ssh root@93.127.185.245`
- **Application:** `/var/www/gema`
- **Logs:** `/var/www/gema/backend/logs`

---

## Conclusion

🎉 **Congratulations!** Your GEMA application is now deployed on Hostinger KVM!

### Quick Status Check

```bash
# Check everything is running
pm2 status && systemctl status nginx && redis-cli ping
```

Expected: All services **online** ✅

### Access Your Application

- **Website:** https://your-domain.com
- **API Health:** https://your-domain.com/api/health
- **Admin Panel:** https://your-domain.com/admin

---

**Next Steps:**
1. Test all features thoroughly
2. Configure Stripe webhooks
3. Create admin user
4. Setup monitoring
5. Train your team

**Need Help?** Refer to the [Troubleshooting](#troubleshooting) section or check logs.

---

*Last Updated: 2025-01-23*
*Version: 1.0*
*Server: Hostinger KVM - root@93.127.185.245*
