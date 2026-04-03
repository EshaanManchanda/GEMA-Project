# 🎯 Sign-Up Failure - Most Likely Causes & Quick Fixes

## The 3 Most Common Reasons Sign-Up Fails

### 1️⃣ **Rate Limiter (60% Probability)**

If you've been testing sign-up multiple times, you hit the rate limit!

**Symptoms:**
- ✅ Everything was working
- ❌ Now every sign-up attempt fails
- Error message: "Too many login attempts" or no error, just fails silently

**Fix (30 seconds):**
```powershell
# Option A: Restart the backend to reset rate limiter
cd backend
npm run dev

# Option B: Wait 15 minutes for the rate limiter window to pass
```

**Or temporarily disable it:**

Edit `backend/src/server.ts` line ~137:
```typescript
// Comment out this line:
// app.use('/api/auth/register', authLimiter);

// Then restart: npm run dev
```

---

### 2️⃣ **Backend Not Running (25% Probability)**

The backend server (`port 5001`) is not responding.

**Symptoms:**
- ❌ Network error: "connect ECONNREFUSED"
- ❌ "Backend server is starting up" message
- ❌ 30-60 second timeout

**Fix (10 seconds):**
```bash
cd backend
npm install  # Only needed if first time
npm run dev
```

Wait for logs to show:
```
✅ Server running on port 5001
✅ Connected to MongoDB
```

---

### 3️⃣ **Email Already Registered (10% Probability)**

You're using an email that already exists in the database.

**Symptoms:**
- Error: "User with this email already exists"
- Status: 400 or 409

**Fix (2 seconds):**
Use a different email. Try:
```
john.doe.TEST-1234@example.com
```

Or use a temporary email service:
- [temp-mail.io](https://temp-mail.io)
- [10minutemail.com](https://10minutemail.com)

---

## Quick Diagnostic: One Command

**Run this to check backend status:**

```powershell
# Check if backend is accessible
$response = try {
    Invoke-WebRequest -Uri "http://localhost:5001/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"test":"data"}' `
        -TimeoutSec 5 `
        -ErrorAction Stop
    "✅ Backend is running (got response)"
} catch {
    if ($_.Exception.Message -like "*connect*refused*") {
        "❌ Backend NOT running - Port 5001 not responding"
    } else {
        "⚠️ Backend responded but request failed: $($_.Exception.Message)"
    }
}

Write-Host $response
```

---

## 📋 Sign-Up Success Checklist

Before you sign up, make sure:

- [ ] **Backend is running**
  ```bash
  cd backend && npm run dev
  ```
  Should show: `Server running on port 5001`

- [ ] **Frontend loads correctly**
  - Navigate to: `http://localhost:3000`
  - Should see sign-up page

- [ ] **You're using correct email format**
  - ✅ `user@example.com`
  - ✅ `john.doe@example.com`
  - ❌ `john.doe@` (missing domain)
  - ❌ `@example.com` (missing user)

- [ ] **Password is strong enough**
  - Min 8 characters
  - At least one UPPERCASE letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (!@#$%^&*)
  - ✅ Example: `TestPass123!`
  - ❌ Example: `password123` (missing uppercase and special char)

- [ ] **Phone has country code**
  - ✅ `+971501234567` (with country code)
  - ✅ `+1-555-0123456` (US format)
  - ❌ `501234567` (missing country code)

- [ ] **Terms & Conditions are checked**
  - ✅ Click the checkbox to agree

- [ ] **This is your first attempt** (or server was restarted)
  - If you've tried 10+ times, the rate limiter is blocking you
  - Restart the server: `cd backend && npm run dev`

---

## 🔴 If Sign-Up STILL Fails

### Step 1: Capture the exact error

Open browser DevTools (F12):
1. Network tab
2. Fill sign-up form
3. Click "Create Your Account"
4. Look for the `register` request
5. Click on it
6. Click "Response" tab
7. **Copy the entire response message**

### Step 2: Check backend logs

Look at the terminal where backend is running. Should see something like:

```
✅ SUCCESS:
[REGISTER] Function entered
[REGISTER] Request body received
[REGISTER] User created successfully

❌ FAILURE:
[REGISTER] Existing user check - User found: true
or
[CORS] Origin rejected: ...
or
Too many requests...
```

### Step 3: Clear everything and retry

```powershell
# 1. Stop backend (Ctrl+C in the terminal)

# 2. Clear cache and stored data
cd backend
rm node_modules\.cache -Recurse -Force 2>$null
# Or just restart Node process

# 3. Restart backend
npm run dev

# 4. In browser:
# - Open DevTools (F12)
# - Clear localStorage: localStorage.clear()
# - Reload page (F5)
# - Try sign-up with NEW email address
```

---

## 💡 Pro Tips

### Tip 1: Use Console Logging
The sign-up form logs errors to the browser console. Open DevTools (F12) and look for:
```
[API Interceptor] Request: ...
[API] Connection error ...
Registration error: ...
```

### Tip 2: Watch Network Requests
In DevTools → Network tab:
- Filter by "Fetch/XHR"
- Look for `register` request
- Check the `Status Code`:
  - ✅ `201` = Success
  - ❌ `400` = Validation error (check Response)
  - ❌ `409` = Email exists
  - ❌ `429` = Rate limited
  - ❌ `500` = Server error

### Tip 3: Test with Curl First
If you're tech-savvy, test the API directly:

```powershell
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    firstName = "John"
    lastName = "Doe"
    email = "john.doe@example.com"
    password = "TestPass123!"
    phone = "+971501234567"
    role = "customer"
    acceptTerms = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5001/api/auth/register" `
    -Method POST `
    -Headers $headers `
    -Body $body `
    -Verbose
```

This bypasses the frontend and tests the backend directly!

### Tip 4: Use Unique Emails for Testing
Instead of:
```
test@example.com  (might already exist)
```

Use:
```
test-2024-12-29-14-30-45@example.com  (unique timestamp)
```

Or use real temp email services that generate unique addresses.

---

## 🆘 Emergency: Complete Server Reset

If nothing works, do a complete reset:

```powershell
# 1. Kill all Node processes
taskkill /F /IM node.exe

# 2. Clean node modules and cache
cd backend
rm -r node_modules
rm package-lock.json

# 3. Reinstall everything
npm install

# 4. Start fresh
npm run dev

# 5. In another terminal, test endpoint:
# Wait 10 seconds for server to fully start, then:
curl -X POST http://localhost:5001/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"TestPass123!","phone":"+971501234567","acceptTerms":true}'
```

---

## ✅ Sign-Up Working? You Should See:

1. **Form submission succeeds** without error
2. **You're redirected to OTP verification page**
3. **Check your email for verification code**
4. **Enter OTP and complete registration**

If you see all of these ✅, sign-up is working!

---

## 📞 Need Help?

Provide these details:
1. Exact error message (from DevTools Network tab)
2. Backend console output when you attempted sign-up
3. Response status code (from Network tab)
4. Screenshot of the error

