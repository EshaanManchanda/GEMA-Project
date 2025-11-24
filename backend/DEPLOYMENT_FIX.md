# Production Deployment Fix Guide

## Issue Summary
The backend server is failing to start because:
1. PM2 configuration had incorrect directory paths (`/var/www/gema` vs `/var/www/GEMA-Project`)
2. The TypeScript code needs to be compiled to JavaScript before running
3. PM2 is trying to run TypeScript files directly instead of compiled JavaScript files

## What Was Fixed
- Updated `ecosystem.config.js` to use correct paths: `/var/www/GEMA-Project/backend`
- Both main app and worker paths have been corrected

## Steps to Fix Production Server

### 1. SSH into your production server
```bash
ssh root@your-server-ip
```

### 2. Navigate to the project directory
```bash
cd /var/www/GEMA-Project
```

### 3. Pull the latest code
```bash
git fetch origin
git checkout backend_auth  # or your main branch
git pull origin backend_auth
```

### 4. Navigate to backend directory
```bash
cd backend
```

### 5. Install dependencies (if needed)
```bash
npm install
```

### 6. Build the TypeScript code
```bash
npm run build
```
This compiles TypeScript files from `src/` to JavaScript in `dist/`

### 7. Stop and delete the current PM2 process
```bash
pm2 stop kidrove
pm2 delete kidrove
```

### 8. Start the server with the correct ecosystem config
```bash
pm2 start ecosystem.config.js --env production
```

### 9. Save the PM2 configuration
```bash
pm2 save
```

### 10. Check the server status
```bash
pm2 status
pm2 logs gema-backend --lines 50
```

## Expected Result
You should see:
- Two processes running: `gema-backend` and `gema-worker`
- Both should be in "online" status
- No module resolution errors in the logs

## Alternative: Quick Restart (if paths are already correct)
If you just need to rebuild and restart:
```bash
cd /var/www/GEMA-Project/backend
npm run build
pm2 reload ecosystem.config.js --env production
```

## Verification
Test the API is working:
```bash
curl http://localhost:5001/health
```

Should return a healthy status response.

## Common Issues

### If build fails
- Check Node.js version: `node --version` (should be >= 20.0.0)
- Check npm version: `npm --version` (should be >= 10.0.0)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### If PM2 won't start
- Check logs: `pm2 logs`
- Verify .env file exists in backend directory
- Check port 5001 isn't already in use: `lsof -i :5001`

### If module errors persist
- Ensure you're in the correct directory: `/var/www/GEMA-Project/backend`
- Verify dist folder exists and has content: `ls -la dist/`
- Check dist/config/index.js exists: `ls -la dist/config/`
