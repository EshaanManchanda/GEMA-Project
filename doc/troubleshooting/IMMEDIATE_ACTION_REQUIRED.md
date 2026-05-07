# 🚨 IMMEDIATE ACTION REQUIRED - CORS Fix

## Your CORS errors are happening because environment variables are not set on production!

---

## ⚡ QUICK FIX (5 Minutes)

### Step 1: SSH into your backend server

```bash
ssh your-user@your-server-ip
```

### Step 2: Check current environment variables

```bash
cd /var/www/GEMA-Project/backend
echo "FRONTEND_URL: $FRONTEND_URL"
echo "NODE_ENV: $NODE_ENV"
```

**Expected**: You'll likely see these are EMPTY or UNDEFINED

### Step 3: Set environment variables

Choose ONE method:

#### Method A: Update .env file (if you have one)
```bash
nano .env

# Add these lines:
FRONTEND_URL=https://kidrove.com
ADDITIONAL_ALLOWED_ORIGINS=https://www.kidrove.com
NODE_ENV=production

# Save: Ctrl+X, Y, Enter
```

#### Method B: Restart PM2 with env vars (RECOMMENDED)
```bash
# Stop current process
pm2 stop gema-bac

# Start with environment variables
FRONTEND_URL=https://kidrove.com \
ADDITIONAL_ALLOWED_ORIGINS=https://www.kidrove.com \
NODE_ENV=production \
pm2 start dist/server.js --name gema-bac

# Save the configuration
pm2 save
```

### Step 4: Pull latest code changes (includes trust proxy fix)

```bash
cd /var/www/GEMA-Project/backend

# Pull latest changes
git pull origin main

# Install dependencies (if any changed)
npm install

# Rebuild
npm run build

# Restart
pm2 restart gema-bac
```

### Step 5: Verify it's working

```bash
# Check logs - you should see debug messages
pm2 logs gema-bac --lines 20

# Look for:
# 🔍 CORS Check - Origin: https://kidrove.com | Allowed: [ 'https://kidrove.com', ... ]
# [CORS] Origin allowed: https://kidrove.com
```

### Step 6: Test from browser

Open https://kidrove.com and check browser console - no more CORS errors!

---

## 🔧 What Was Fixed in Code

### 1. Added Trust Proxy Setting
**File**: `backend/src/server.ts` (line 35)

```typescript
app.set('trust proxy', 1); // Trust first proxy only
```

**Why**: Your server is behind nginx/load balancer. This fix:
- ✅ Fixes rate limiter warnings
- ✅ Allows correct client IP identification
- ✅ Enables proper HTTPS detection

### 2. Added CORS Debug Logging
**File**: `backend/src/server.ts` (line 47-50)

```typescript
if (process.env.NODE_ENV === 'production') {
  console.log('🔍 CORS Check - Origin:', origin, '| Allowed:', allowedOrigins);
}
```

**Why**: Helps you see exactly what's being checked in CORS middleware

---

## 📊 Before vs After

### BEFORE (Current - Broken)
```
❌ FRONTEND_URL: undefined
❌ Origin: https://kidrove.com
❌ Allowed origins: []
❌ Result: "Not allowed by CORS"
```

### AFTER (Fixed)
```
✅ FRONTEND_URL: https://kidrove.com
✅ Origin: https://kidrove.com
✅ Allowed origins: ['https://kidrove.com', 'https://www.kidrove.com']
✅ Result: CORS allowed
```

---

## 🆘 If You're Stuck

### Can't SSH into server?
Contact your hosting provider or server administrator.

### Don't have .env file?
Use PM2 method (Method B above) - it sets env vars directly.

### Still seeing errors after following steps?
Check `TROUBLESHOOT_CORS.md` for detailed debugging steps.

### PM2 process name is different?
Find your process name:
```bash
pm2 list
```
Then use that name instead of `gema-bac`.

---

## ✅ Success Indicators

You'll know it's working when:

1. **No more CORS errors in backend logs**
   ```bash
   pm2 logs gema-bac
   # Should NOT see: "Error: Not allowed by CORS"
   # SHOULD see: "Origin allowed: https://kidrove.com"
   ```

2. **No more rate limiter warnings**
   ```bash
   pm2 logs gema-bac
   # Should NOT see: "ValidationError: The 'X-Forwarded-For' header"
   ```

3. **Images load on frontend**
   - Visit https://kidrove.com
   - Check browser console (F12)
   - No CORS errors
   - Images display correctly

4. **API responds with CORS headers**
   ```bash
   curl -I -H "Origin: https://kidrove.com" https://api.kidrove.com/api/health
   # Should see:
   # access-control-allow-origin: https://kidrove.com
   ```

---

## 🎯 Summary

**Problem**: Backend doesn't know which frontend domain to allow

**Root Cause**: `FRONTEND_URL` environment variable not set

**Solution**: Set `FRONTEND_URL=https://kidrove.com` in production environment

**Time to Fix**: ~5 minutes

**Files Changed**: `backend/src/server.ts` (trust proxy + debug logging)

---

Need more help? See `TROUBLESHOOT_CORS.md` for detailed debugging steps!
