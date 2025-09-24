# Vercel Environment Variables Setup Guide

This document provides the complete list of environment variables that need to be configured in your Vercel deployment dashboard to fix the Firebase authentication errors and ensure proper production functionality.

## Critical Environment Variables (Fix Firebase Auth Errors)

### Firebase Configuration
Add these environment variables in your Vercel project settings:

```bash
# Firebase Configuration - Get from Firebase Console > Project Settings > General > Firebase SDK snippet
VITE_FIREBASE_API_KEY=YOUR_ACTUAL_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456ghi789
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123DEF4
```

### API Configuration
```bash
# Production API URL - Replace with your actual backend URL
VITE_API_BASE_URL=https://your-backend-domain.vercel.app/api
VITE_API_TIMEOUT=30000
```

## Steps to Configure Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - Navigate to your project in Vercel dashboard
   - Go to Settings > Environment Variables

2. **Add Firebase Variables**
   - For each variable above, click "Add New"
   - Enter the variable name (e.g., `VITE_FIREBASE_API_KEY`)
   - Enter the actual value from your Firebase project
   - Select environments: Production, Preview, Development (as needed)

3. **Get Firebase Configuration Values**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings (gear icon)
   - Scroll to "Your apps" section
   - Select "Config" under Firebase SDK snippet
   - Copy the values from the config object

4. **Configure Firebase Project for Production**
   - In Firebase Console > Authentication > Settings > Authorized domains
   - Add your Vercel production domain (e.g., `your-app.vercel.app`)
   - Add any custom domains you're using

## Additional Recommended Environment Variables

### App Configuration
```bash
VITE_APP_NAME=Gema
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Event Management and Booking Platform
VITE_APP_URL=https://your-app.vercel.app
```

### Payment Configuration
```bash
# Use live Stripe keys for production
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
VITE_ENABLE_STRIPE_PAYMENTS=true
VITE_PAYMENT_ENVIRONMENT=production
VITE_USE_LIVE_KEYS=true
VITE_FORCE_TEST_MODE=false
```

### File Upload (if using Cloudinary)
```bash
VITE_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
VITE_CLOUDINARY_API_KEY=your_actual_api_key
VITE_CLOUDINARY_UPLOAD_PRESET=your_actual_preset
```

### SEO and Branding
```bash
VITE_SITE_NAME=Gema - UAE Events & Activities Platform
VITE_SITE_DESCRIPTION=Discover and book amazing family events and kids activities across the UAE
VITE_SITE_IMAGE=https://your-domain.com/og-image.jpg
VITE_CONTACT_EMAIL=contact@gema.ae
VITE_SUPPORT_EMAIL=support@gema.ae
```

## Verification Steps

After setting up the environment variables:

1. **Redeploy your Vercel project** to pick up the new variables
2. **Check browser console** in production for Firebase errors
3. **Test Firebase authentication** (login/signup)
4. **Verify PWA manifest** loads without 401 errors
5. **Test critical user flows** (booking, payment, etc.)

## Troubleshooting

### Firebase Auth Errors
- Verify all Firebase environment variables are set correctly
- Check Firebase project authorized domains
- Ensure Firebase project is active and billing is set up if needed

### Manifest.json 401 Errors
- Should be resolved after fixing Firebase auth
- Verify manifest.json is accessible at `https://your-domain/manifest.json`

### Build Issues
- Make sure all required environment variables are set
- Check that variable names match exactly (case-sensitive)
- Verify no extra spaces in variable values

## Environment Variable Checklist

- [ ] VITE_FIREBASE_API_KEY
- [ ] VITE_FIREBASE_AUTH_DOMAIN
- [ ] VITE_FIREBASE_PROJECT_ID
- [ ] VITE_FIREBASE_STORAGE_BUCKET
- [ ] VITE_FIREBASE_MESSAGING_SENDER_ID
- [ ] VITE_FIREBASE_APP_ID
- [ ] VITE_FIREBASE_MEASUREMENT_ID
- [ ] VITE_API_BASE_URL
- [ ] Firebase authorized domains configured
- [ ] Production deployment tested
- [ ] Console errors resolved

## Note

This setup addresses the specific errors reported:
- `Firebase: Error (auth/invalid-api-key)` → Fixed by setting correct Firebase env vars
- `manifest.json:1 Failed to load resource: 401` → Fixed by resolving auth issues and icon paths

Remember to keep your Firebase API keys secure and never commit them to version control.