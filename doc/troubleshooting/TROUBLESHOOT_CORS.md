# CORS Troubleshooting Guide - IMMEDIATE FIXES NEEDED

## 🔴 Critical Issues Found in Logs

Your backend logs show:
1. **CORS rejecting all requests** - "Not allowed by CORS"
2. **Rate limiter warning** - Express 'trust proxy' is false but receiving X-Forwarded-For headers

---

## ✅ IMMEDIATE FIX #1: Check Environment Variables

### SSH into your backend server and run:

```bash
# Check if FRONTEND_URL is set
echo "FRONTEND_URL: $FRONTEND_URL"

# Check all CORS-related env vars
env | grep -E "(FRONTEND_URL|ADDITIONAL_ALLOWED_ORIGINS|NODE_ENV)"
```

### Expected Output:
```
FRONTEND_URL=https://kidrove.com
ADDITIONAL_ALLOWED_ORIGINS=https://www.kidrove.com
NODE_ENV=production
```

### If Variables Are Missing:

**Option A: Update .env file (if using .env)**
```bash
cd /var/www/GEMA-Project/backend
nano .env

# Add these lines:
FRONTEND_URL=https://kidrove.com
ADDITIONAL_ALLOWED_ORIGINS=https://www.kidrove.com
NODE_ENV=production

# Save and exit (Ctrl+X, Y, Enter)
```

**Option B: Update PM2 ecosystem file**
```bash
cd /var/www/GEMA-Project/backend
nano ecosystem.config.js

# Find the env section and add:
env: {
  FRONTEND_URL: 'https://kidrove.com',
  ADDITIONAL_ALLOWED_ORIGINS: 'https://www.kidrove.com',
  NODE_ENV: 'production',
  // ... other env vars
}
```

**Option C: Set directly in PM2**
```bash
# Stop the app
pm2 stop gema-bac

# Delete the app
pm2 delete gema-bac

# Start with env vars
cd /var/www/GEMA-Project/backend
FRONTEND_URL=https://kidrove.com \
ADDITIONAL_ALLOWED_ORIGINS=https://www.kidrove.com \
NODE_ENV=production \
pm2 start dist/server.js --name gema-bac

# Save PM2 config
pm2 save
```

---

## ✅ IMMEDIATE FIX #2: Restart Backend

After updating environment variables:

```bash
# Option A: Restart PM2 process
pm2 restart gema-bac

# Option B: Reload PM2 (zero-downtime)
pm2 reload gema-bac

# Check logs to verify
pm2 logs gema-bac --lines 50
```

Look for these log messages after restart:
```
[CORS] Origin allowed: https://kidrove.com
```

If you still see:
```
[CORS] Origin rejected: https://kidrove.com
```

Then the env vars aren't being loaded correctly.

---

## ✅ FIX #3: Add Trust Proxy Setting (Code Change Required)

The rate limiter warning indicates your backend is behind a reverse proxy (nginx, etc.) but Express doesn't know it.

### Update backend/src/server.ts

**Find this line** (around line 28):
```typescript
const app: Application = express();
```

**Add immediately after it**:
```typescript
const app: Application = express();

// Trust proxy - REQUIRED when behind reverse proxy/load balancer
// This allows Express to trust X-Forwarded-* headers
app.set('trust proxy', 1); // Trust first proxy
```

### Why this matters:
- Your server is behind nginx or a load balancer
- The proxy adds `X-Forwarded-For` headers
- Rate limiting needs this to identify users correctly
- Without it, all requests appear to come from the proxy IP

### After making this change:

```bash
# Rebuild backend
cd /var/www/GEMA-Project/backend
npm run build

# Restart PM2
pm2 restart gema-bac

# Check logs
pm2 logs gema-bac --lines 50
```

---

## 🔍 DEBUGGING STEP: Add Temporary CORS Logging

To see what origin is being received, temporarily add this to your backend:

### SSH into server:

```bash
cd /var/www/GEMA-Project/backend/src
nano server.ts
```

### Find the CORS configuration (around line 33) and add logging:

```typescript
app.use(cors({
  origin: function (origin, callback) {
    // ===== ADD THIS LOGGING =====
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 CORS Debug Info:');
    console.log('   Origin received:', origin);
    console.log('   FRONTEND_URL:', config.frontendUrl);
    console.log('   ADDITIONAL_ALLOWED_ORIGINS:', process.env.ADDITIONAL_ALLOWED_ORIGINS);
    console.log('   NODE_ENV:', process.env.NODE_ENV);
    // ===== END LOGGING =====

    const allowedOrigins = [
      config.frontendUrl,
      ...(process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(',').map(url => url.trim()) || [])
    ].filter(Boolean);

    // ===== ADD THIS LOGGING =====
    console.log('   Allowed origins:', allowedOrigins);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // ===== END LOGGING =====

    // Rest of CORS logic...
```

### Rebuild and restart:
```bash
npm run build
pm2 restart gema-bac
pm2 logs gema-bac
```

### Look for the debug output in logs
This will show you EXACTLY what the CORS middleware is seeing.

---

## 🧪 TESTING COMMANDS

### From your local machine, test CORS:

```bash
# Test 1: Check if CORS headers are present
curl -I -H "Origin: https://kidrove.com" \
  https://api.kidrove.com/api/health

# Should see:
# access-control-allow-origin: https://kidrove.com
# access-control-allow-credentials: true

# Test 2: Check media endpoint
curl -I -H "Origin: https://kidrove.com" \
  https://api.kidrove.com/api/media/file/35caf6df-cba4-4c92-8395-125afd64331c

# Test 3: Check without origin (should fail in production)
curl -I https://api.kidrove.com/api/health
```

---

## 📋 CHECKLIST

Run through these in order:

1. **[ ]** SSH into backend server
2. **[ ]** Check environment variables (`env | grep FRONTEND_URL`)
3. **[ ]** If missing, add `FRONTEND_URL=https://kidrove.com`
4. **[ ]** If missing, add `ADDITIONAL_ALLOWED_ORIGINS=https://www.kidrove.com`
5. **[ ]** Ensure `NODE_ENV=production`
6. **[ ]** Restart backend (`pm2 restart gema-bac`)
7. **[ ]** Check logs (`pm2 logs gema-bac`)
8. **[ ]** Look for "Origin allowed" messages
9. **[ ]** Test with curl commands above
10. **[ ]** Add trust proxy setting (code change)
11. **[ ]** Rebuild backend (`npm run build`)
12. **[ ]** Restart again (`pm2 restart gema-bac`)
13. **[ ]** Verify no more rate limiter warnings

---

## ❓ Common Issues & Solutions

### Issue: "FRONTEND_URL is empty in logs"
**Solution**: The .env file isn't being loaded by PM2. Use ecosystem.config.js or set env vars directly in PM2 start command.

### Issue: "Origin rejected: https://kidrove.com"
**Solution**:
1. Check for trailing slashes: `https://kidrove.com/` vs `https://kidrove.com`
2. Check for www: `https://www.kidrove.com` vs `https://kidrove.com`
3. Make sure the origin in the request EXACTLY matches FRONTEND_URL

### Issue: "Still seeing rate limiter warnings"
**Solution**: Add `app.set('trust proxy', 1)` right after creating the Express app.

### Issue: "Favicon.ico CORS error"
**Solution**: This is normal - browsers request favicon from the API domain. The CORS error won't affect functionality, but fix the FRONTEND_URL to stop the error logs.

---

## 🆘 If Still Not Working

1. **Get the debug logs**:
   ```bash
   pm2 logs gema-bac --lines 100 > cors-debug.log
   cat cors-debug.log
   ```

2. **Check the compiled server.js**:
   ```bash
   cd /var/www/GEMA-Project/backend
   grep -A 10 "Origin received" dist/server.js
   ```

3. **Verify environment in running process**:
   ```bash
   pm2 show gema-bac
   # Look at the "env" section
   ```

4. **Nuclear option - Full rebuild**:
   ```bash
   cd /var/www/GEMA-Project/backend
   pm2 stop gema-bac
   rm -rf dist/
   npm run build
   pm2 start dist/server.js --name gema-bac
   pm2 save
   ```

---

## 📞 Quick Reference

**Your Setup:**
- Frontend: https://kidrove.com
- Backend API: https://api.kidrove.com
- Backend Path: /var/www/GEMA-Project/backend
- PM2 Process: gema-bac

**Required Env Vars:**
```bash
FRONTEND_URL=https://kidrove.com
ADDITIONAL_ALLOWED_ORIGINS=https://www.kidrove.com
NODE_ENV=production
```

**Critical Commands:**
```bash
# Check env vars
env | grep FRONTEND_URL

# Restart backend
pm2 restart gema-bac

# Watch logs
pm2 logs gema-bac

# Rebuild
npm run build
```
