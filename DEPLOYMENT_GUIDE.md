# GEMA Deployment Guide - Hostinger KVM1 VPS

Complete step-by-step guide for deploying the GEMA Event Management Platform to a Hostinger KVM1 VPS server.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Server Setup](#server-setup)
5. [MongoDB Atlas Configuration](#mongodb-atlas-configuration)
6. [Backend Deployment](#backend-deployment)
7. [Frontend Deployment](#frontend-deployment)
8. [SSL Certificate Setup](#ssl-certificate-setup)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Procedure](#rollback-procedure)

---

## Overview

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet (HTTPS)                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────▼──────────┐
                │   Hostinger KVM1      │
                │   Ubuntu 22.04        │
                │   4GB RAM / 1 vCPU    │
                └──────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    ┌───▼────┐      ┌──────▼──────┐    ┌─────▼────┐
    │ NGINX  │      │ PM2 Process  │    │  Files   │
    │ :80/443│      │   Manager    │    │ Storage  │
    └───┬────┘      └──────┬───────┘    └──────────┘
        │                  │
    ┌───▼────┐      ┌──────▼──────┐
    │Frontend│      │   Backend    │
    │ Static │      │   Node.js    │
    │  Files │      │   :5000      │
    └────────┘      └──────┬───────┘
                           │
                    ┌──────▼──────┐
                    │ MongoDB     │
                    │   Atlas     │
                    │  (Cloud)    │
                    └─────────────┘
```

### Technology Stack

- **Server**: Hostinger KVM1 (Ubuntu 22.04, 4GB RAM, 1 vCPU)
- **Web Server**: NGINX (reverse proxy + static file serving)
- **Backend**: Node.js 20.x + Express + TypeScript
- **Process Manager**: PM2 (auto-restart, monitoring)
- **Frontend**: React 18 + Vite (built to static files)
- **Database**: MongoDB Atlas (cloud-hosted)
- **SSL**: Let's Encrypt (via Certbot)
- **Services**: Cloudinary (media), Stripe (payments), Firebase (auth)

---

## Prerequisites

### 1. Server Requirements

- ✅ Hostinger KVM1 VPS or equivalent
  - 4GB RAM minimum
  - 50GB SSD minimum
  - 1 vCPU (sufficient for moderate traffic)
  - Ubuntu 22.04 LTS (recommended)
- ✅ Root or sudo access
- ✅ Server IP address
- ✅ SSH access configured

### 2. Domain & DNS

- ✅ Domain name registered (e.g., `kidrove.com`)
- ✅ DNS A record pointing to server IP
  - `kidrove.com` → `YOUR_SERVER_IP`
  - `www.kidrove.com` → `YOUR_SERVER_IP`
- ✅ DNS propagation completed (check with `nslookup kidrove.com`)

### 3. External Services

#### MongoDB Atlas (Database)
- ✅ MongoDB Atlas account created
- ✅ Cluster configured (M0 free tier or M10 production)
- ✅ Database user created
- ✅ IP whitelist configured
- ✅ Connection string obtained

**See**: [`MONGODB_ATLAS_SETUP.md`](./MONGODB_ATLAS_SETUP.md) for detailed setup

#### Cloudinary (Media Storage)
- ✅ Cloudinary account created
- ✅ Cloud name, API key, API secret obtained

#### Stripe (Payments)
- ✅ Stripe account created
- ✅ API keys obtained (secret key for backend, publishable key for frontend)
- ✅ Webhooks configured (will do after deployment)

#### Firebase (Authentication & Notifications)
- ✅ Firebase project created
- ✅ Service account JSON downloaded
- ✅ Private key, project ID, client email obtained

### 4. Local Development

- ✅ Git repository accessible
- ✅ All environment variables documented
- ✅ Code tested locally
- ✅ No uncommitted critical changes

---

## Pre-Deployment Checklist

Print this checklist and check off each item:

### Code Preparation
- [ ] Latest code committed to git
- [ ] All tests passing locally
- [ ] TypeScript builds without errors (backend)
- [ ] Vite builds successfully (frontend)
- [ ] No hardcoded credentials in code
- [ ] .env.example files up to date

### Environment Variables Ready
- [ ] MongoDB connection string
- [ ] JWT secrets (generate 2 different 64-char strings)
- [ ] Cloudinary credentials
- [ ] Stripe secret key & publishable key
- [ ] Firebase service account credentials
- [ ] Frontend URL for CORS

### External Services
- [ ] MongoDB Atlas cluster running
- [ ] Database user created with read/write access
- [ ] Server IP whitelisted in MongoDB Atlas
- [ ] Cloudinary account active
- [ ] Stripe account in test mode (or live mode ready)
- [ ] Firebase project configured

### Server Access
- [ ] SSH access to Hostinger server working
- [ ] Root or sudo privileges confirmed
- [ ] Server firewall rules understood
- [ ] Domain DNS pointing to server IP

### Deployment Files
- [ ] `deployment/nginx/kidrove.conf` reviewed
- [ ] `backend/ecosystem.config.js` configured
- [ ] `frontend/.env.production` template ready
- [ ] `deploy.sh` script reviewed
- [ ] `setup-server.sh` script ready

---

## Server Setup

### Option 1: Automated Setup (Recommended)

Use the automated setup script for initial configuration:

#### Step 1: SSH into Server

```bash
ssh root@93.127.185.245
```

#### Step 2: Download and Run Setup Script

```bash
# Download setup script
cd ~
wget https://raw.githubusercontent.com/EshaanManchanda/GEMA-Project/backend_auth/setup-server.sh

# Or if repository is private, manually copy the script content to:
nano setup-server.sh
# Paste the content from your local setup-server.sh

# Make executable
chmod +x setup-server.sh

# Edit configuration variables at the top of the script
nano setup-server.sh
# Update GIT_REPO, GIT_BRANCH, DOMAIN_NAME

# Run setup
sudo ./setup-server.sh
```

This script will:
- ✅ Update system packages
- ✅ Install Node.js 20.x
- ✅ Install PM2, NGINX, Git, Certbot
- ✅ Configure firewall (UFW)
- ✅ Clone repository
- ✅ Install dependencies
- ✅ Build backend and frontend
- ✅ Configure NGINX
- ✅ Start backend with PM2
- ✅ Setup SSL (if domain configured)
- ✅ Configure PM2 log rotation
- ✅ Enable automatic security updates

**Estimated Time**: 15-20 minutes

#### Skip to [MongoDB Atlas Configuration](#mongodb-atlas-configuration) after automated setup

---

### Option 2: Manual Setup (Step-by-Step)

Follow these steps if you prefer manual control:

#### Step 1: Update System

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Update package lists and upgrade
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git build-essential software-properties-common
```

#### Step 2: Install Node.js 20.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js
apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x
```

#### Step 3: Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Configure PM2 to start on system boot
pm2 startup systemd -u root --hp /root

# Run the command it outputs (copy and paste)
```

#### Step 4: Install NGINX

```bash
# Install NGINX
apt install -y nginx

# Start and enable NGINX
systemctl start nginx
systemctl enable nginx

# Verify NGINX is running
systemctl status nginx

# Test by visiting http://YOUR_SERVER_IP in browser
# You should see "Welcome to nginx" page
```

#### Step 5: Install Certbot (SSL)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx
```

#### Step 6: Configure Firewall

```bash
# Install UFW if not present
apt install -y ufw

# Allow SSH (CRITICAL - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status verbose
```

#### Step 7: Clone Repository

```bash
# Create project directory
mkdir -p /var/www
cd /var/www

# Clone repository
# If public:
git clone -b backend_auth https://github.com/EshaanManchanda/GEMA-Project.git gema

# If private (you'll need to authenticate):
git clone -b backend_auth https://username:personal_access_token@github.com/EshaanManchanda/GEMA-Project.git gema

cd gema
```

---

## MongoDB Atlas Configuration

Follow the comprehensive guide: **[MONGODB_ATLAS_SETUP.md](./MONGODB_ATLAS_SETUP.md)**

Quick checklist:
1. ✅ Create MongoDB Atlas account
2. ✅ Create cluster (M0 for staging, M10+ for production)
3. ✅ Whitelist server IP
4. ✅ Create database user
5. ✅ Get connection string
6. ✅ Test connection

**Connection String Format**:
```
mongodb+srv://gema-app:PASSWORD@cluster.mongodb.net/gema?retryWrites=true&w=majority
```

---

## Backend Deployment

### Step 1: Configure Environment Variables

```bash
cd /var/www/gema/backend

# Copy example environment file
cp .env.example .env

# Edit .env with production values
nano .env
```

**Required environment variables**:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://gema-app:YOUR_PASSWORD@cluster.mongodb.net/gema?retryWrites=true&w=majority

# JWT Secrets (generate with: openssl rand -base64 64)
JWT_SECRET=your_64_character_jwt_secret_here
JWT_REFRESH_SECRET=your_64_character_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://your-domain.com
ADDITIONAL_ALLOWED_ORIGINS=https://www.your-domain.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Email (optional - configure later)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-app-password

# Redis (optional - disable if not using)
DISABLE_REDIS=true

# Job Processing (optional)
ENABLE_JOBS=false
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

### Step 2: Install Dependencies

```bash
cd /var/www/gema/backend

# Install dependencies
npm install --production=false

# This may take 2-3 minutes
```

### Step 3: Build Backend

```bash
# Build TypeScript to JavaScript
npm run build

# Verify build succeeded
ls -la dist/
# You should see server.js and other compiled files
```

### Step 4: Create Logs Directory

```bash
mkdir -p /var/www/Gema-Project/backend/logs
```

### Step 5: Start with PM2

```bash
cd /var/www/gema/backend

# Start backend using ecosystem config
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Verify it's running
pm2 status

# View logs
pm2 logs gema-backend --lines 50
```

### Step 6: Test Backend Health

```bash
# Test health endpoint
curl http://localhost:5000/health

# Should return: {"status":"ok"}

# If you get connection refused:
# Check logs: pm2 logs gema-backend
# Check environment variables in .env
```

---

## Frontend Deployment

### Step 1: Configure Production Environment

```bash
cd /var/www/gema/frontend

# Edit production environment file
nano .env.production
```

**Required variables**:

```env
# API Configuration
VITE_API_BASE_URL=https://your-domain.com/api
VITE_API_TIMEOUT=30000

# App Configuration
VITE_APP_NAME=Gema
VITE_APP_URL=https://your-domain.com

# Payment
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

# Cloudinary (if frontend uploads directly)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Firebase (for push notifications)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Production Settings
VITE_ENABLE_DEVTOOLS=false
VITE_LOG_LEVEL=error
```

**Save and exit**: `Ctrl+X`, `Y`, `Enter`

### Step 2: Install Dependencies

```bash
cd /var/www/gema/frontend

# Install dependencies
npm install

# This may take 3-5 minutes
```

### Step 3: Build Frontend

```bash
# Build for production (uses .env.production automatically)
npm run build

# Verify build
ls -la dist/
# You should see index.html, assets/, etc.

# Check build size
du -sh dist/
# Should be around 5-15 MB
```

---

## NGINX Configuration

### Step 1: Copy NGINX Config

```bash
# Copy NGINX configuration
cp /var/www/GEMA-Project/deployment/nginx/gema.conf /etc/nginx/sites-available/gema

# Update domain name in config
nano /etc/nginx/sites-available/gema

# Replace all instances of 'your-domain.com' with your actual domain
# Use Ctrl+W to search and replace
```

### Step 2: Enable Site

```bash
# Create symbolic link to enable site
ln -s /etc/nginx/sites-available/gema /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test NGINX configuration
nginx -t

# Should output:
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 3: Reload NGINX

```bash
systemctl reload nginx

# Check status
systemctl status nginx
```

### Step 4: Test HTTP Access

Visit `http://your-domain.com` in browser
- You should see your React app (but without HTTPS yet)
- API calls might fail (CORS) until SSL is configured

---

## SSL Certificate Setup

### Prerequisites
- ✅ Domain DNS pointing to server IP
- ✅ Ports 80 and 443 open in firewall
- ✅ NGINX running and serving site on port 80

### Step 1: Obtain SSL Certificate

```bash
# Request SSL certificate from Let's Encrypt
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# - Enter email address
# - Agree to terms (A)
# - Choose whether to redirect HTTP to HTTPS (2 - recommended)
```

Certbot will:
1. Verify domain ownership
2. Obtain SSL certificate
3. Automatically update NGINX config
4. Configure auto-renewal

### Step 2: Verify SSL

Visit `https://your-domain.com` in browser
- ✅ Should show secure padlock icon
- ✅ Frontend loads correctly
- ✅ No certificate warnings

### Step 3: Test Auto-Renewal

```bash
# Dry run certificate renewal
certbot renew --dry-run

# Should output: Congratulations, all renewals succeeded
```

### SSL Certificate Files Location

Certificates are stored at:
```
/etc/letsencrypt/live/your-domain.com/
  ├── fullchain.pem  # Certificate chain
  ├── privkey.pem    # Private key
  ├── cert.pem       # Domain certificate
  └── chain.pem      # Intermediate certificates
```

---

## Post-Deployment Verification

### 1. Backend Health Check

```bash
# From server
curl https://your-domain.com/api/health

# Should return: {"status":"ok","timestamp":"2025-11-22T..."}

# If error:
pm2 logs gema-backend
```

### 2. Frontend Loading

Visit `https://your-domain.com` in browser:
- ✅ Page loads without errors
- ✅ Assets load (check browser DevTools Network tab)
- ✅ No console errors (check browser DevTools Console)

### 3. API Connectivity

Test a simple API call:
```bash
curl https://your-domain.com/api/events

# Or from browser console:
fetch('/api/events').then(r => r.json()).then(console.log)
```

### 4. Database Connection

```bash
# Check backend logs for MongoDB connection
pm2 logs gema-backend | grep -i mongo

# Should see: "MongoDB connected successfully"
```

### 5. PM2 Status

```bash
pm2 status

# Should show:
# │ gema-backend │ 0 │ fork │ running │ ...
```

### 6. NGINX Logs

```bash
# Access logs
tail -f /var/log/nginx/gema_access.log

# Error logs
tail -f /var/log/nginx/gema_error.log

# Should see no errors
```

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Logs (real-time)
pm2 logs gema-backend

# Logs (last 100 lines)
pm2 logs gema-backend --lines 100

# Error logs only
pm2 logs gema-backend --err

# Clear logs
pm2 flush
```

### Log Rotation

PM2 log rotation is configured automatically by setup script:

```bash
# Check log rotation status
pm2 conf pm2-logrotate

# Settings:
# - max_size: 10M (rotate when log reaches 10MB)
# - retain: 10 (keep 10 old logs)
# - compress: true (gzip old logs)
```

### NGINX Logs

```bash
# Access logs
tail -f /var/log/nginx/gema_access.log

# Error logs
tail -f /var/log/nginx/gema_error.log

# Analyze logs with goaccess (optional)
apt install goaccess
goaccess /var/log/nginx/gema_access.log -o report.html
```

### System Monitoring

```bash
# CPU and Memory usage
htop

# Disk usage
df -h

# Disk usage by directory
du -sh /var/www/gema/*

# Network connections
netstat -tuln | grep :5000
```

### Database Monitoring

Monitor via MongoDB Atlas dashboard:
1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Click **"Metrics"** tab
4. Monitor:
   - Connections
   - Operations per second
   - Query performance
   - Disk usage

---

## Troubleshooting

### Backend Won't Start

**Symptom**: PM2 shows status as "errored" or constantly restarting

**Solutions**:

```bash
# 1. Check logs
pm2 logs gema-backend --lines 100

# 2. Check environment variables
cat /var/www/gema/backend/.env

# 3. Verify MongoDB connection
mongo "mongodb+srv://your-connection-string"

# 4. Check port availability
netstat -tuln | grep :5000

# 5. Restart with fresh logs
pm2 delete gema-backend
pm2 start /var/www/gema/backend/ecosystem.config.js --env production
pm2 logs gema-backend
```

### Frontend Not Loading

**Symptom**: 404 error or blank page

**Solutions**:

```bash
# 1. Verify frontend files exist
ls -la /var/www/gema/frontend/dist/

# 2. Check NGINX config
nginx -t

# 3. Check NGINX error logs
tail -f /var/log/nginx/gema_error.log

# 4. Verify NGINX is serving correct directory
cat /etc/nginx/sites-available/gema | grep root

# 5. Rebuild frontend
cd /var/www/gema/frontend
npm run build
systemctl reload nginx
```

### API Calls Failing (CORS)

**Symptom**: Browser console shows CORS errors

**Solutions**:

```bash
# 1. Check FRONTEND_URL in backend .env
cat /var/www/gema/backend/.env | grep FRONTEND_URL

# Should match your domain: https://your-domain.com

# 2. Check ADDITIONAL_ALLOWED_ORIGINS
cat /var/www/gema/backend/.env | grep ADDITIONAL_ALLOWED_ORIGINS

# 3. Restart backend after .env changes
pm2 restart gema-backend

# 4. Check backend logs for CORS errors
pm2 logs gema-backend | grep -i cors
```

### SSL Certificate Issues

**Symptom**: Certificate warnings in browser

**Solutions**:

```bash
# 1. Check certificate expiry
certbot certificates

# 2. Renew certificate
certbot renew

# 3. Verify NGINX is using correct certificates
cat /etc/nginx/sites-available/gema | grep ssl_certificate

# 4. Test SSL configuration
curl -I https://your-domain.com
```

### MongoDB Connection Failed

**Symptom**: Backend logs show MongoDB connection errors

**Solutions**:

```bash
# 1. Test connection string
mongo "your-mongodb-connection-string"

# 2. Check IP whitelist in MongoDB Atlas
# Go to Network Access and verify server IP is whitelisted

# 3. Verify credentials
# Check username and password in connection string

# 4. Check MongoDB Atlas cluster status
# Go to https://cloud.mongodb.com and check cluster status
```

### High Memory Usage

**Symptom**: PM2 shows high memory, server running slow

**Solutions**:

```bash
# 1. Check memory usage
free -h

# 2. Restart backend
pm2 restart gema-backend

# 3. Check for memory leaks in logs
pm2 logs gema-backend | grep -i memory

# 4. Reduce max_memory_restart in ecosystem.config.js
nano /var/www/gema/backend/ecosystem.config.js
# Set max_memory_restart: '400M' (from 500M)
pm2 reload gema-backend
```

---

## Rollback Procedure

If deployment fails or critical issues arise:

### Quick Rollback with Deploy Script

```bash
cd /var/www/gema
./deploy.sh --rollback

# This restores the last backup
```

### Manual Rollback

```bash
# 1. Stop current version
pm2 stop gema-backend

# 2. Restore from backup
cd /var/www/gema/backups
ls -la  # Find latest backup

# Restore backend
rm -rf /var/www/gema/backend/dist
cp -r backup-YYYYMMDD-HHMMSS-backend /var/www/gema/backend/dist

# Restore frontend
rm -rf /var/www/gema/frontend/dist
cp -r backup-YYYYMMDD-HHMMSS-frontend /var/www/gema/frontend/dist

# 3. Restart backend
pm2 start gema-backend

# 4. Reload NGINX
systemctl reload nginx
```

### Git Rollback

```bash
cd /var/www/gema

# View commit history
git log --oneline -10

# Rollback to specific commit
git reset --hard COMMIT_HASH

# Redeploy
./deploy.sh
```

---

## Continuous Deployment

### Automated Updates

Add to cron for automatic updates (use cautiously):

```bash
# Edit crontab
crontab -e

# Add line to deploy every day at 3 AM
0 3 * * * cd /var/www/gema && ./deploy.sh >> /var/www/gema/deployment.log 2>&1
```

### Manual Deployment

When you push new code:

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Run deployment script
cd /var/www/gema
./deploy.sh

# The script will:
# 1. Create backup
# 2. Pull latest code
# 3. Install dependencies
# 4. Build backend and frontend
# 5. Restart PM2
# 6. Reload NGINX
# 7. Verify deployment
```

---

## Security Best Practices

1. ✅ **Regular Updates**
   ```bash
   apt update && apt upgrade -y
   ```

2. ✅ **Firewall Configuration**
   - Only ports 22, 80, 443 open
   - Consider changing SSH port from 22

3. ✅ **SSH Key Authentication**
   - Disable password authentication
   - Use SSH keys only

4. ✅ **Environment Variables**
   - Never commit .env files
   - Use strong, unique secrets

5. ✅ **SSL/TLS**
   - Always use HTTPS
   - Auto-renewal enabled

6. ✅ **Database Security**
   - IP whitelist in MongoDB Atlas
   - Strong database passwords
   - Separate users for dev/prod

7. ✅ **Regular Backups**
   - MongoDB Atlas automatic backups
   - PM2 creates deployment backups
   - Consider full server snapshots (Hostinger offers this)

8. ✅ **Monitoring**
   - Setup uptime monitoring (UptimeRobot, Pingdom)
   - Configure MongoDB Atlas alerts
   - Monitor PM2 logs regularly

---

## Next Steps After Deployment

1. ✅ **Configure Stripe Webhooks**
   - Add webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Add webhook secret to backend .env

2. ✅ **Setup Email Service**
   - Configure EMAIL_* variables in backend .env
   - Test email sending

3. ✅ **Configure Firebase Cloud Messaging**
   - Add web push certificates
   - Test push notifications

4. ✅ **Setup Analytics**
   - Add Google Analytics ID to frontend .env.production

5. ✅ **Create Admin User**
   - Use MongoDB Compass or shell to create first admin

6. ✅ **Test All Features**
   - User registration/login
   - Event creation
   - Ticket booking
   - Payment processing
   - File uploads

7. ✅ **Performance Optimization**
   - Enable CDN (Cloudflare free tier)
   - Optimize images with Cloudinary
   - Enable GZIP compression (already in NGINX config)

---

## Useful Commands Reference

```bash
# PM2
pm2 status                    # View all processes
pm2 restart gema-backend      # Restart backend
pm2 reload gema-backend       # Zero-downtime restart
pm2 logs gema-backend         # View logs
pm2 monit                     # Monitor resources
pm2 flush                     # Clear logs

# NGINX
nginx -t                      # Test configuration
systemctl reload nginx        # Reload NGINX
systemctl restart nginx       # Restart NGINX
systemctl status nginx        # Check status

# Git
git pull origin backend_auth  # Pull latest code
git log --oneline -10         # View commits

# Logs
tail -f /var/log/nginx/gema_error.log
tail -f /var/www/gema/backend/logs/combined.log
pm2 logs gema-backend --lines 100

# Deployment
cd /var/www/gema
./deploy.sh                   # Full deployment
./deploy.sh --backend-only    # Backend only
./deploy.sh --frontend-only   # Frontend only
./deploy.sh --rollback        # Rollback

# MongoDB
mongo "mongodb+srv://..."     # Connect to MongoDB
```

---

## Support & Resources

- **MongoDB Atlas**: https://cloud.mongodb.com
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/usage/quick-start/
- **NGINX Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/getting-started/
- **Hostinger Support**: https://support.hostinger.com

---

**Deployment Guide Version**: 1.0
**Last Updated**: 2025-11-22
**Tested On**: Hostinger KVM1 (Ubuntu 22.04)
**Estimated Deployment Time**: 1-2 hours (first time)

---

**Congratulations on deploying GEMA! 🎉**
