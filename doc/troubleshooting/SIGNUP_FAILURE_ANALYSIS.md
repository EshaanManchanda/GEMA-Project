# Sign-Up (Create Your Account) Failure - Root Cause Analysis

## 🔴 Primary Issues Identified

### Issue #1: **API URL Mismatch in Development**
**Severity: CRITICAL**

#### Problem:
The frontend API configuration (`[api.ts](frontend/src/config/api.ts)`) is pointing to **production URLs** by default:

```typescript
// From frontend/src/config/api.ts
const getApiBaseUrl = (): string => {
  const hostname = window.location.hostname;

  if (hostname.includes('kidrove.com')) {
    return 'https://api.kidrove.com/api';  // ❌ Production
  } else if (hostname.includes('kidrove.in')) {
    return 'https://api.kidrove.in/api';   // ❌ Production
  } else if (hostname.includes('kidrove.ae')) {
    return 'https://api.kidrove.ae/api';   // ❌ Production
  }

  // Fallback only triggers if hostname is NOT one of the above
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
};
```

#### Why This Breaks Sign-Up in Development:
When you access the frontend on `localhost:3000`:
- ✅ The hostname check returns `'localhost'`
- ✅ Falls back to `import.meta.env.VITE_API_BASE_URL` 
- ✅ From [frontend/.env](frontend/.env) line 3: `VITE_API_BASE_URL=http://localhost:5001/api` ✅ **Correct**

**BUT WAIT** - Let me check the actual environment file...

#### Actual Issue in .env:
Looking at [frontend/.env](frontend/.env#L1-L4):
```dotenv
VITE_API_BASE_URL=http://localhost:5001/api
# VITE_API_BASE_URL=https://gema-project.onrender.com/api
# VITE_API_BASE_URL=https://api.kidrove.com/api
```

✅ This looks correct. So the issue is elsewhere...

---

### Issue #2: **Rate Limiting on Sign-Up Endpoint** 
**Severity: HIGH**

From [backend/src/server.ts](backend/src/server.ts#L132-L136):

```typescript
// Auth endpoints - moderate limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // ❌ 10 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true // Don't count successful logins
});

// Apply auth limiter
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);  // ❌ APPLIED TO REGISTER TOO!
```

**Impact:** If you've tried signing up multiple times during testing, you'll hit this limit!

---

### Issue #3: **Missing Backend URL Configuration**
**Severity: MEDIUM**

From [backend/.env](backend/.env#L1-L3):
```dotenv
PORT=5001
BASE_URL=http://localhost:5001
NODE_ENV=development
```

The `BASE_URL` doesn't include `/api` prefix. Check [backend/src/config/env.ts](backend/src/config/env.ts) to see if this is properly handled.

---

### Issue #4: **CORS Configuration May Be Too Restrictive**
**Severity: MEDIUM**

From [backend/src/server.ts](backend/src/server.ts#L41-L87):

```typescript
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      config.frontendUrl,  // ❌ Where is this defined?
      ...(process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(',').map(url => url.trim()) || [])
    ].filter(Boolean);

    // In development, allow localhost origins
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173' // ✅ Good
      );
    }
```

**Question:** What is `config.frontendUrl`? Need to verify it's set correctly in [backend/src/config/index.ts](backend/src/config/index.ts).

---

### Issue #5: **Missing Error Context**
**Severity: HIGH**

The registration error is being silently caught. From [frontend/src/pages/auth/RegisterPage.tsx](frontend/src/pages/auth/RegisterPage.tsx#L195-L205):

```typescript
try {
  await dispatch(registerUser({
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    password: formData.password,
    confirmPassword: formData.confirmPassword,
    phone: `${formData.countryCode}${formData.phoneNumber}`,
    role: formData.role,
    acceptTerms: formData.agreeToTerms
  })).unwrap();

  setCurrentStep(2);
} catch (error: any) {
  console.error('Registration error:', error);
  // ❌ Error handling is done by Redux thunk with toast notifications
  // But no guarantee the toast is shown!
}
```

**The error is logged to console but may not be visible!**

---

## 🔍 Diagnostic Steps to Identify the Actual Problem

### Step 1: Check Browser Console
Open browser DevTools → Console → Look for:
- Network errors (CORS, 404, 500)
- Validation errors (400)
- Rate limit errors (429)

### Step 2: Check Backend Logs
Look for server-side errors at port 5001:
```bash
# Check what error the backend is returning for sign-up
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "phone": "+971501234567",
    "role": "customer",
    "acceptTerms": true
  }'
```

### Step 3: Check for Rate Limiting
Look for `429 Too Many Requests` errors. If you see this:
```bash
# Clear rate limit by restarting the server or waiting 15 minutes
```

---

## 🛠️ Recommended Fixes

### Fix #1: Increase Rate Limit for Sign-Up (Temporary)
```typescript
// In backend/src/server.ts - Modify auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,  // ✅ Increase from 10 to 50 for development
  skipSuccessfulRequests: false // Let successful requests count
});
```

### Fix #2: Add Better Error Feedback
In [frontend/src/pages/auth/RegisterPage.tsx](frontend/src/pages/auth/RegisterPage.tsx#L195-L205):

```typescript
} catch (error: any) {
  console.error('Registration error:', error);
  const errorMsg = error?.response?.data?.message || 
                   error?.message || 
                   'Registration failed. Please try again.';
  setErrors({ email: errorMsg });
}
```

### Fix #3: Verify Backend Configuration
Create a new file or check [backend/src/config/env.ts](backend/src/config/env.ts) to ensure:
```typescript
export const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
export const apiBaseUrl = process.env.BASE_URL || 'http://localhost:5001';
```

---

## 📋 Checklist to Resolve

- [ ] **Check browser console for actual error message**
- [ ] **Verify backend is running** on `http://localhost:5001`
- [ ] **Check if rate limit (429) is being hit** - restart server if needed
- [ ] **Test with curl** to isolate frontend vs backend issue
- [ ] **Enable debug logging** in both frontend and backend
- [ ] **Check CORS headers** in response (should include `Access-Control-Allow-Origin`)
- [ ] **Verify email service** is configured (sign-up sends verification email)
- [ ] **Check MongoDB connection** - user creation requires database

---

## 🚀 Quick Fix Steps

1. **Restart the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Clear browser cache and localStorage:**
   ```javascript
   // In browser console:
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **Reduce rate limit for testing:**
   Comment out the auth limiter temporarily in [backend/src/server.ts](backend/src/server.ts#L137):
   ```typescript
   // app.use('/api/auth/register', authLimiter);  // Temporarily disabled
   ```

4. **Try signing up again and check the actual error in DevTools**

---

## 📝 Additional Notes

- **Email Service:** The sign-up flow sends a verification OTP. Check if email service is properly configured with Hostinger SMTP settings in [backend/.env](backend/.env#L37-L43).
- **Phone Validation:** Sign-up requires a phone number in E.164 format. Make sure the phone input includes the country code.
- **Password Requirements:** Password must be 8+ chars with uppercase, lowercase, number, and special character (verified at [frontend/src/pages/auth/RegisterPage.tsx](frontend/src/pages/auth/RegisterPage.tsx#L77-L79)).

