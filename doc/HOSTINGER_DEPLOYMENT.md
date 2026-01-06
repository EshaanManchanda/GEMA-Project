# GEMA - Hostinger KVM1 Quick Deployment Reference

**Fast deployment guide for experienced developers deploying GEMA to Hostinger KVM1 VPS.**

For detailed instructions, see: [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)

---

## ⚡ Quick Start (10 Minutes)

### 1. SSH & Run Automated Setup


```bash
ssh root@YOUR_SERVER_IP
wget https://raw.githubusercontent.com/EshaanManchanda/GEMA-Project/backend_auth/setup-server.sh
chmod +x setup-server.sh
nano setup-server.sh  # Update GIT_REPO, GIT_BRANCH, DOMAIN_NAME
sudo ./setup-server.sh
```

### 2. Configure Environment Variables

```bash
# Backend
nano /var/www/gema/backend/.env
# Add: MONGODB_URI, JWT_SECRET, CLOUDINARY_*, STRIPE_*, FIREBASE_*

# Frontend
nano /var/www/gema/frontend/.env.production
# Add: VITE_API_BASE_URL, VITE_STRIPE_PUBLISHABLE_KEY
```

### 3. Deploy

```bash
cd /var/www/gema
./deploy.sh
```

### 4. Setup SSL

```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

**Done!** Visit `https://your-domain.com`

---

## 📋 Pre-Deployment Checklist

**Required:**
- [ ] Hostinger KVM1 VPS (4GB RAM, Ubuntu 22.04)
- [ ] Domain DNS pointing to server IP
- [ ] MongoDB Atlas cluster + connection string
- [ ] Cloudinary account (cloud name, API key/secret)
- [ ] Stripe account (secret + publishable keys)
- [ ] Firebase project (service account credentials)

---

## 🔧 Environment Variables Quick Reference

### Backend (.env)

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/gema?retryWrites=true&w=majority
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
FRONTEND_URL=https://your-domain.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STRIPE_SECRET_KEY=sk_live_xxxxx
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
```

**Generate JWT secrets:**
```bash
openssl rand -base64 64
```

### Frontend (.env.production)

```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_APP_URL=https://your-domain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_ENABLE_DEVTOOLS=false
VITE_LOG_LEVEL=error
```

---

## 📁 Project Structure on Server

```
/var/www/gema/
├── backend/
│   ├── dist/              # Compiled TypeScript
│   ├── logs/              # PM2 logs
│   ├── .env               # Backend environment (DO NOT COMMIT)
│   └── ecosystem.config.js
├── frontend/
│   ├── dist/              # Built static files (served by NGINX)
│   └── .env.production    # Frontend environment
├── deployment/
│   └── nginx/
│       └── gema.conf      # NGINX configuration
├── deploy.sh              # Deployment script
└── setup-server.sh        # Initial setup script
```

---

## 🚀 Deployment Commands

```bash
# Full deployment
cd /var/www/gema && ./deploy.sh

# Backend only
./deploy.sh --backend-only

# Frontend only
./deploy.sh --frontend-only

# Rollback
./deploy.sh --rollback
```

---

## 🔍 Monitoring & Logs

```bash
# PM2 Status
pm2 status

# Real-time logs
pm2 logs gema-backend

# Last 100 lines
pm2 logs gema-backend --lines 100

# Monitor resources
pm2 monit

# NGINX logs
tail -f /var/log/nginx/gema_error.log
tail -f /var/log/nginx/gema_access.log

# Backend logs
tail -f /var/www/gema/backend/logs/combined.log
```

---

## 🛠️ Common Tasks

### Restart Backend

```bash
pm2 restart gema-backend
# or zero-downtime:
pm2 reload gema-backend
```

### Update Code & Redeploy

```bash
cd /var/www/gema
git pull origin backend_auth
./deploy.sh
```

### Rebuild Frontend

```bash
cd /var/www/gema/frontend
npm run build
systemctl reload nginx
```

### Check Disk Space

```bash
df -h
du -sh /var/www/gema/*
```

### Clear PM2 Logs

```bash
pm2 flush
```

### Renew SSL Certificate

```bash
certbot renew
# or test renewal:
certbot renew --dry-run
```

### View MongoDB Connection

```bash
cat /var/www/gema/backend/.env | grep MONGODB_URI
```

---

## 🐛 Quick Troubleshooting

### Backend Won't Start

```bash
pm2 logs gema-backend --lines 50
# Check for:
# - MongoDB connection errors → verify MONGODB_URI
# - Port in use → check netstat -tuln | grep :5000
# - Environment errors → verify .env file
```

### Frontend 404 Errors

```bash
ls -la /var/www/gema/frontend/dist/
nginx -t
systemctl reload nginx
tail -f /var/log/nginx/gema_error.log
```

### CORS Errors

```bash
# Verify FRONTEND_URL matches domain
cat /var/www/gema/backend/.env | grep FRONTEND_URL

# Should be: FRONTEND_URL=https://your-domain.com

# Restart after changes
pm2 restart gema-backend
```

### MongoDB Connection Failed

```bash
# Test connection
mongo "$(cat /var/www/gema/backend/.env | grep MONGODB_URI | cut -d'=' -f2-)"

# Check:
# 1. IP whitelist in MongoDB Atlas (0.0.0.0/0 or specific IP)
# 2. Username/password correct
# 3. Cluster is running
```

### SSL Not Working

```bash
certbot certificates  # Check expiry
nginx -t              # Test config
systemctl reload nginx
```

---

## 📊 Server Specs (Hostinger KVM1)

| Resource | Specification |
|----------|--------------|
| RAM | 4 GB |
| vCPU | 1 core |
| Storage | 50 GB NVMe SSD |
| Bandwidth | 4 TB/month |
| OS | Ubuntu 22.04 LTS |
| Monthly Cost | ~$5/month |

**Suitable for:**
- ✅ Staging/Testing
- ✅ Low-to-moderate traffic production
- ✅ MVP launches
- ✅ Up to ~1000 concurrent users

**Consider upgrading to KVM2+ if:**
- ⚠️ High traffic (>10,000 requests/hour)
- ⚠️ Complex queries/large database
- ⚠️ Heavy media processing

---

## 🔐 Security Checklist

- [ ] UFW firewall enabled (ports 22, 80, 443 only)
- [ ] SSH key authentication (password auth disabled)
- [ ] Strong passwords for all services
- [ ] MongoDB IP whitelist configured
- [ ] SSL/HTTPS enabled
- [ ] .env files not in git
- [ ] Regular system updates (`apt update && apt upgrade`)
- [ ] PM2 process monitoring
- [ ] MongoDB Atlas backups enabled

---

## 📈 Performance Optimization

```bash
# Enable NGINX gzip (already in config)
# Enable Cloudinary CDN for images
# Add MongoDB indexes (see MONGODB_ATLAS_SETUP.md)

# Monitor performance
pm2 monit

# Check memory usage
free -h

# Check CPU usage
htop
```

---

## 🔄 Backup Strategy

**Automated Backups:**
- MongoDB Atlas: Continuous backups (M10+) or snapshots
- Deployment script: Creates backup before each deploy
- PM2 logs: Rotated automatically (10MB max, 10 files)

**Manual Backups:**

```bash
# Backup database
mongodump --uri="mongodb+srv://..." --out=/backups/mongo-$(date +%Y%m%d)

# Backup code
tar -czf /backups/gema-$(date +%Y%m%d).tar.gz /var/www/gema

# Backup to local machine
scp root@SERVER_IP:/backups/gema-*.tar.gz ./
```

---

## 📞 Emergency Contacts

**Hostinger Support:**
- Website: https://support.hostinger.com
- Live Chat: 24/7 available
- Response Time: Usually < 5 minutes

**MongoDB Atlas Support:**
- Free tier: Community forums
- Paid tier: Email support

**Quick Commands for Support:**

```bash
# Server info
uname -a
cat /etc/os-release
free -h
df -h

# Application status
pm2 status
systemctl status nginx
systemctl status mongodb

# Network info
ip addr show
netstat -tuln | grep LISTEN
```

---

## 🎯 Post-Deployment Tasks

1. ✅ **Test all features:**
   - User registration/login
   - Event creation & ticketing
   - Payment processing (test mode)
   - File uploads
   - Email notifications (if configured)

2. ✅ **Setup monitoring:**
   - UptimeRobot (free tier) for uptime monitoring
   - MongoDB Atlas alerts
   - PM2 Plus (optional, paid)

3. ✅ **Configure Stripe webhooks:**
   ```
   Webhook URL: https://your-domain.com/api/webhooks/stripe
   Events: payment_intent.succeeded, payment_intent.failed, etc.
   ```

4. ✅ **Create admin user:**
   - Use MongoDB Compass or shell
   - Set role to 'admin'

5. ✅ **Performance testing:**
   - Use tools like Apache Bench, k6, or Postman
   - Test concurrent user load

6. ✅ **Setup CDN (optional):**
   - Cloudflare free tier
   - Configure DNS through Cloudflare

---

## 🆘 Emergency Rollback

```bash
# If something goes wrong:
cd /var/www/gema
./deploy.sh --rollback

# Or manual rollback:
pm2 stop gema-backend
cd backups
ls -la  # Find latest backup
cp -r backup-YYYYMMDD-HHMMSS-backend/* ../backend/dist/
cp -r backup-YYYYMMDD-HHMMSS-frontend/* ../frontend/dist/
pm2 start gema-backend
systemctl reload nginx
```

---

## 📚 Additional Resources

- **Detailed Deployment Guide**: [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)
- **MongoDB Setup**: [`MONGODB_ATLAS_SETUP.md`](./MONGODB_ATLAS_SETUP.md)
- **Project README**: [`README.md`](./README.md)
- **TypeScript Errors**: [`TYPESCRIPT_ERRORS.md`](./TYPESCRIPT_ERRORS.md)

---

## 🎉 Success Criteria

**Your deployment is successful when:**

✅ `https://your-domain.com` loads without errors
✅ `https://your-domain.com/api/health` returns `{"status":"ok"}`
✅ User can register and login
✅ Events can be created and viewed
✅ Payments work in test mode
✅ Files can be uploaded
✅ No errors in PM2 logs
✅ No errors in NGINX logs
✅ SSL certificate is valid
✅ MongoDB connection is stable

---

**Deployment Time Estimate:**
- **With automated script**: 30-60 minutes
- **Manual setup**: 1-2 hours
- **First-time deployment**: Add 30-60 minutes for learning

**Need Help?**
- Check [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for detailed walkthrough
- Check logs: `pm2 logs gema-backend`
- Check NGINX: `tail -f /var/log/nginx/gema_error.log`

---

**Version**: 1.0
**Last Updated**: 2025-11-22
**Tested On**: Hostinger KVM1 (Ubuntu 22.04)
