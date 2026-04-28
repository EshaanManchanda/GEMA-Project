# Sign-Up Debugging Guide - Find the Exact Error

## 🎯 Quick Test Protocol

### Step 1: Enable Detailed Logging (Frontend)

Add this to your browser console BEFORE trying to sign up:

```javascript
// Enable detailed logging for auth requests
window.DEBUG_API = true;

// Log all Redux actions
window.addEventListener('__REDUX_DEVTOOLS_EXTENSION__', (action) => {
  if (action.type.includes('auth')) {
    console.log('🔴 Redux Auth Action:', action);
  }
});

// Intercept all network errors
window.addEventListener('error', (event) => {
  console.error('❌ Global Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled Promise Rejection:', event.reason);
});
```

---

### Step 2: Test Sign-Up with Curl (Backend)

**From your terminal**, test if the backend API works directly:

```powershell
# PowerShell - Test Registration Endpoint
$body = @{
    firstName = "Test"
    lastName = "User"
    email = "testuser@example.com"
    password = "TestPass123!"
    phone = "+971501234567"
    role = "customer"
    acceptTerms = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5001/api/auth/register" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -Verbose
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Auth cookies have been set.",
  "data": {
    "user": {
      "id": "...",
      "firstName": "Test",
      "email": "testuser@example.com"
    }
  }
}
```

**If it fails**, you'll see:
- `400` - Validation error (check the message field)
- `409` - Email already exists
- `429` - Rate limited
- `500` - Server error (check backend logs)
- Connection refused - Backend not running

---

### Step 3: Check Backend Server Status

```powershell
# Test if backend is running
Test-NetConnection -ComputerName localhost -Port 5001

# If running, you should see:
# TcpTestSucceeded : True
```

If NOT running:
```bash
cd backend
npm run dev
```

---

### Step 4: Monitor Backend Logs

While the backend is running, look for these log patterns when you attempt sign-up:

```
✅ Good signs:
[REGISTER] Function entered
[REGISTER] Request body received
[REGISTER] User created successfully
[SET_COOKIES] Cookies set successfully

❌ Bad signs:
[REGISTER] Existing user check - User found: true  (Email already registered)
[CORS] Origin rejected: ...
Error: Not allowed by CORS
Too many requests ... (Rate limit)
Email verification failed ... (SMTP error)
```

---

## 🔍 Common Failure Scenarios & Solutions

### Scenario 1: "Email already exists" (409 Conflict)

**Error Message:**
```
User with this email already exists
```

**Solution:**
```javascript
// Check if email is already in your database
// Try with a different email:
// testuser123@example.com
// or use temp email service: https://temp-mail.io
```

---

### Scenario 2: "Rate Limited" (429)

**Error Message:**
```
Too many login attempts. Please try again in 15 minutes.
```

**Solution:**
1. **Restart backend to reset rate limiter:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Or temporarily disable rate limiting for testing:**
   
   Edit [backend/src/server.ts](backend/src/server.ts#L137):
   ```typescript
   // Temporarily comment this out:
   // app.use('/api/auth/register', authLimiter);
   ```

---

### Scenario 3: "CORS Error"

**Error in Browser Console:**
```
Access to XMLHttpRequest at 'http://localhost:5001/api/auth/register' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
Verify [backend/src/server.ts](backend/src/server.ts#L56-L59) has localhost:3000:
```typescript
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push(
    'http://localhost:3000',  // ✅ This must be here
    'http://localhost:3001',
    'http://localhost:5173'
  );
}
```

If missing, add it and restart the backend.

---

### Scenario 4: "Network Error" (ECONNREFUSED)

**Error in Browser Console:**
```
request failed: connect ECONNREFUSED
```

**Cause:** Backend is not running

**Solution:**
```bash
cd backend
npm install  # If dependencies missing
npm run dev  # Start the server
```

Wait 10-15 seconds for the server to fully start, then try sign-up again.

---

### Scenario 5: "Email Verification Failed"

**Sign-up succeeds but you don't receive verification email**

**Possible causes:**
1. SMTP credentials wrong in [backend/.env](backend/.env#L37-L43)
2. Email service not responding
3. Email marked as spam

**Solution:**
```bash
# Check email configuration in backend/.env:
# EMAIL_SERVICE=hostinger
# EMAIL_HOST=smtp.hostinger.com
# EMAIL_PORT=587
# EMAIL_USERNAME=contact@kidrove.com
# EMAIL_PASSWORD=h@y@GEMA2  (should be your password)

# Test email service:
# Add this to backend logs to verify it's trying to send
```

**For now, skip email verification:**
- Look for "Skip Verification" button on the email verification screen
- Or request OTP resend if you missed it

---

### Scenario 6: "Invalid Password"

**Error:**
```
Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character
```

**Solution:**
Create password with: `TestPass123!`
- Uppercase: T, P
- Lowercase: est, ass
- Number: 1, 2, 3
- Special: !

---

## 🎬 Step-by-Step Test Flow

### Test 1: Check Network Request

1. Open browser DevTools (F12)
2. Go to Network tab
3. Clear all requests
4. **Fill in sign-up form with valid data:**
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john.doe.TIMESTAMP@example.com` (use unique timestamp)
   - Password: `TestPass123!`
   - Phone: `+971 50 123 4567` (or just `+971501234567`)
   - Accept Terms: ✓

5. Click "Create Your Account"

6. **Look for POST request to `/api/auth/register`**
   - **Status should be:** `201 Created` or `200 OK`
   - **If status is 4xx or 5xx:** Click on it to see response body with error details

### Test 2: Check Browser Console

1. Open DevTools Console tab
2. Look for messages starting with:
   - `[API Interceptor] Request:` - Shows URL and credentials
   - `Registration error:` - Shows the actual error
   - Any red error messages

---

## 📊 Debug Checklist

Before attempting sign-up, verify:

- [ ] Backend running: `http://localhost:5001` (check terminal)
- [ ] Frontend running: `http://localhost:3000` (should load)
- [ ] MongoDB connected: Check backend logs for "Connected to MongoDB"
- [ ] Email service active: Check [backend/.env](backend/.env#L37-L43)
- [ ] Rate limiter not triggered: First attempt should work
- [ ] No validation errors: Password meets requirements, phone has country code

---

## 🐛 If Still Failing - Provide This Info

When asking for help, provide:

1. **Screenshot of browser console** showing the error
2. **Response body from failed request** (Network tab → Response)
3. **Backend console output** when you attempted sign-up
4. **The exact form data you used**
5. **Which step fails:** Registration form submission or OTP verification?

Example:
```
❌ Failed at: Registration form submission
Error Type: 429 Too Many Requests
Response: "Too many login attempts. Please try again in 15 minutes."
Form Data Used:
- Email: john@example.com
- Password: TestPass123!
- Phone: +971501234567
- First Name: John
- Last Name: Doe
```

---

## 🚀 Quick Restart Script

**Save this as `restart-dev.bat` in project root:**

```batch
@echo off
echo Killing existing processes...
taskkill /F /IM node.exe 2>nul

echo Clearing rate limiter cache...
REM Add sleep if needed
timeout /t 2

echo Starting backend...
cd backend
npm run dev

echo Backend should be running at http://localhost:5001
echo Frontend should be running at http://localhost:3000
pause
```

Then just run: `./restart-dev.bat`

