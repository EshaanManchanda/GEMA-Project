# GEMA - Quick Deployment Reference
## Hostinger KVM: root@93.127.185.245

**⚡ Fast track guide - For when you need quick commands**

---

## 🚀 Complete Deployment (From Scratch)

### 1. Connect to Server
```bash
ssh root@93.127.185.245
```

### 2. Upload & Run Setup Script
```bash
# Upload setup script from local machine
scp E:\coding\gema\setup-server.sh root@93.127.185.245:/root/

# On server: Run setup
chmod +x setup-server.sh
./setup-server.sh
```

**Wait ~15 minutes for setup to complete**

### 3. Configure Environment Variables

**Backend:**
```bash
nano /var/www/gema/backend/.env
```
Copy-paste your production `.env` content, save with `Ctrl+X`, `Y`, `Enter`

**Frontend:**
```bash
nano /var/www/gema/frontend/.env.production
```
Copy-paste your production `.env.production` content, save

### 4. Update NGINX with Your Domain
```bash
nano /etc/nginx/sites-available/gema
# Replace all "your-domain.com" with actual domain
# Save: Ctrl+X, Y, Enter

nginx -t
systemctl reload nginx
```

### 5. Setup SSL Certificate
```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
# Follow prompts, choose option 2 (redirect HTTP to HTTPS)
```

### 6. Deploy Application
```bash
cd /var/www/gema
chmod +x deploy.sh
./deploy.sh
```

### 7. Verify Deployment
```bash
pm2 status
curl https://your-domain.com/api/health
```

**Expected:** Backend online ✅, API returns `{"status":"healthy"}`

---

## 🔄 Update Existing Deployment

### Simple Update (Code Changes Only)
```bash
ssh root@93.127.185.245
cd /var/www/gema
./deploy.sh
```

### Update with Environment Changes
```bash
ssh root@93.127.185.245
nano /var/www/gema/backend/.env
# Make changes, save

cd /var/www/gema
./deploy.sh
```

### Rollback to Previous Version
```bash
ssh root@93.127.185.245
cd /var/www/gema
./deploy.sh --rollback
```

---

## 🔍 Essential Monitoring Commands

### Check Status
```bash
# All services status
pm2 status && systemctl status nginx && redis-cli ping

# Backend logs (live)
pm2 logs gema-backend

# NGINX error logs
tail -f /var/log/nginx/gema_error.log

# Resource usage
pm2 monit
```

### Quick Health Check
```bash
# API health
curl https://your-domain.com/api/health

# Frontend loads
curl -I https://your-domain.com

# Redis working
redis-cli ping
```

---

## 🛠️ Common Operations

### Restart Services
```bash
# Backend (zero downtime)
pm2 reload gema-backend

# Backend (force restart)
pm2 restart gema-backend

# NGINX
systemctl reload nginx

# Redis
systemctl restart redis-server
```

### View Logs
```bash
# Backend logs (last 100 lines)
pm2 logs gema-backend --lines 100

# Backend errors only
pm2 logs gema-backend --err

# NGINX access log
tail -f /var/log/nginx/gema_access.log

# All system logs
journalctl -xe
```

### Update Environment Variables
```bash
# Edit backend .env
nano /var/www/gema/backend/.env

# Edit frontend .env
nano /var/www/gema/frontend/.env.production

# Rebuild frontend
cd /var/www/gema/frontend
npm run build

# Restart backend
pm2 restart gema-backend
```

---

## 🔧 Troubleshooting Quick Fixes

### Backend Not Starting
```bash
# Check logs for error
pm2 logs gema-backend --err --lines 50

# Common fixes:
# 1. MongoDB connection issue
nano /var/www/gema/backend/.env  # Check MONGODB_URI
pm2 restart gema-backend

# 2. Port already in use
sudo lsof -i :5000
pm2 restart gema-backend

# 3. Redis not running
systemctl start redis-server
pm2 restart gema-backend
```

### Frontend Not Loading
```bash
# Check if built
ls /var/www/gema/frontend/dist

# If missing, rebuild
cd /var/www/gema/frontend
npm run build
systemctl reload nginx

# Check NGINX errors
tail -f /var/log/nginx/gema_error.log
```

### CORS Errors
```bash
# Update backend FRONTEND_URL
nano /var/www/gema/backend/.env
# Set: FRONTEND_URL=https://your-actual-domain.com

pm2 restart gema-backend
```

### SSL Issues
```bash
# Renew certificate
certbot renew --force-renewal
systemctl reload nginx

# Check certificate status
certbot certificates
```

### High Memory Usage
```bash
# Check memory
free -h
pm2 list  # Look at memory column

# Restart if needed
pm2 restart gema-backend
```

---

## 📋 Pre-Deployment Checklist

**Local Preparation:**
- [ ] Domain DNS configured → `93.127.185.245`
- [ ] MongoDB Atlas connection string ready
- [ ] Stripe LIVE keys obtained
- [ ] Cloudinary credentials ready
- [ ] Firebase service account JSON downloaded
- [ ] Email SMTP credentials ready
- [ ] JWT secrets generated: `openssl rand -base64 64` (x3)
- [ ] `backend/.env.production` filled out
- [ ] `frontend/.env.production` filled out
- [ ] Tested local builds: `npm run build` (both folders)

**Server Configuration:**
- [ ] Connected via SSH
- [ ] Setup script uploaded and executed
- [ ] Environment files uploaded to server
- [ ] NGINX config updated with domain
- [ ] SSL certificate obtained
- [ ] Deployment script executed
- [ ] Health check passes
- [ ] Stripe webhook configured
- [ ] Initial admin user created
- [ ] Monitoring setup (UptimeRobot)

---

## 🔐 Important File Locations

**Application:**
- Project root: `/var/www/gema`
- Backend: `/var/www/gema/backend`
- Frontend: `/var/www/gema/frontend`
- Backend dist: `/var/www/gema/backend/dist`
- Frontend dist: `/var/www/gema/frontend/dist`

**Configuration:**
- Backend .env: `/var/www/gema/backend/.env`
- Frontend .env: `/var/www/gema/frontend/.env.production`
- NGINX config: `/etc/nginx/sites-available/gema`
- PM2 config: `/var/www/gema/backend/ecosystem.config.js`
- Redis config: `/etc/redis/redis.conf`

**Logs:**
- Backend logs: `/var/www/gema/backend/logs/`
- PM2 logs: `~/.pm2/logs/`
- NGINX logs: `/var/log/nginx/gema_*.log`
- System logs: `/var/log/syslog`

**SSL Certificates:**
- Certificates: `/etc/letsencrypt/live/your-domain.com/`

---

## 📞 Critical Environment Variables

**Backend (.env) - Must Configure:**
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ADMIN_SECRET_KEY=...
FRONTEND_URL=https://your-domain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
EMAIL_HOST=smtp.hostinger.com
EMAIL_USERNAME=noreply@your-domain.com
EMAIL_PASSWORD=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY="..."
FIREBASE_CLIENT_EMAIL=...
```

**Frontend (.env.production) - Must Configure:**
```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_APP_URL=https://your-domain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 🎯 Post-Deployment Tasks

### 1. Configure Stripe Webhook
```bash
# 1. Go to: https://dashboard.stripe.com/webhooks
# 2. Add endpoint: https://your-domain.com/api/webhooks/stripe
# 3. Select events: payment_intent.succeeded, checkout.session.completed
# 4. Copy webhook secret (whsec_...)
# 5. Update backend .env:
nano /var/www/gema/backend/.env
# Add: STRIPE_WEBHOOK_SECRET=whsec_...
pm2 restart gema-backend
```

### 2. Create Admin User
```bash
# Via API (if admin registration endpoint exists)
curl -X POST https://your-domain.com/api/v1/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@your-domain.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "adminSecret": "YOUR_ADMIN_SECRET_KEY"
  }'

# Or create directly in MongoDB Atlas
```

### 3. Setup Monitoring
- **UptimeRobot:** https://uptimerobot.com (monitor website + API health)
- **MongoDB Atlas:** Configure alerts for high usage
- **Email alerts:** Configure in UptimeRobot

### 4. Test Complete Flow
- [ ] User registration → Email sent
- [ ] User login → JWT received
- [ ] Event creation → Saved to DB
- [ ] File upload → Uploaded to Cloudinary
- [ ] Payment → Stripe test payment
- [ ] Webhook → Check PM2 logs for webhook events

---

## 🚨 Emergency Commands

**Backend is down:**
```bash
pm2 restart gema-backend && pm2 logs gema-backend --lines 20
```

**Website not loading:**
```bash
systemctl restart nginx && nginx -t
```

**Database connection issues:**
```bash
# Check MongoDB Atlas IP whitelist
# Add 0.0.0.0/0 or server IP: 93.127.185.245
nano /var/www/gema/backend/.env  # Verify MONGODB_URI
pm2 restart gema-backend
```

**Out of memory:**
```bash
pm2 restart gema-backend
# If persists, check: pm2 list
# Consider upgrading server or optimizing code
```

**SSL expired:**
```bash
certbot renew
systemctl reload nginx
```

**Everything is broken:**
```bash
# Nuclear option - restart everything
pm2 restart gema-backend
systemctl restart nginx
systemctl restart redis-server
# Then check logs
pm2 logs gema-backend
```

---

## 📚 Full Documentation

For detailed explanations, troubleshooting guides, and advanced configuration:

**👉 See: `HOSTINGER_KVM_DEPLOYMENT.md`** (Complete step-by-step guide)

---

## 🔗 Quick Links

- **MongoDB Atlas:** https://cloud.mongodb.com
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Cloudinary Console:** https://console.cloudinary.com
- **Firebase Console:** https://console.firebase.google.com
- **Let's Encrypt:** https://letsencrypt.org
- **UptimeRobot:** https://uptimerobot.com

---

**Last Updated:** 2025-01-23
**Server:** root@93.127.185.245
**Version:** 1.0
