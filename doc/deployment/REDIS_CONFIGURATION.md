# Redis Configuration Guide

## Critical: Fix Redis Eviction Policy for BullMQ

### Problem
Your backend logs show the following warning 8 times on startup:
```
IMPORTANT! Eviction policy is volatile-lru. It should be "noeviction"
```

This warning comes from BullMQ (the job queue system used for background tasks like email sending, ticket generation, etc.). The current eviction policy `volatile-lru` can cause job data to be unexpectedly deleted from memory, potentially breaking background jobs mid-processing.

### Why This Matters
- **Current Policy:** `volatile-lru` - Redis will evict keys with expiration set when memory is full
- **Required Policy:** `noeviction` - Redis will refuse new writes when memory is full (better for job queues)
- **Impact:** Without `noeviction`, BullMQ jobs might lose data mid-processing, causing failures

### How to Fix (Redis Cloud Dashboard)

#### Step 1: Login to Redis Cloud
1. Go to: https://app.redislabs.com/
2. Login with your credentials

#### Step 2: Navigate to Your Database
1. Find your database: `redis-15338.c212.ap-south-1-1.ec2.cloud.redislabs.com:15338`
2. Click on the database name to view details

#### Step 3: Change Eviction Policy
1. Look for "Configuration" or "Settings" tab
2. Find the **Eviction Policy** setting (also called `maxmemory-policy`)
3. Change from `volatile-lru` to **`noeviction`**
4. Save/Apply the changes

#### Step 4: Verify the Fix
1. Restart your backend application
2. Check the logs - the warning should disappear
3. If you still see warnings, double-check the policy was saved correctly

### Alternative: Using Redis CLI
If you have direct Redis access via CLI:

```bash
# Connect to Redis
redis-cli -h redis-15338.c212.ap-south-1-1.ec2.cloud.redislabs.com -p 15338 -a YOUR_PASSWORD --tls

# Check current policy
CONFIG GET maxmemory-policy

# Change to noeviction (requires admin privileges)
CONFIG SET maxmemory-policy noeviction

# Verify the change
CONFIG GET maxmemory-policy
```

**Note:** The CLI change is temporary unless you use `CONFIG REWRITE`. It's better to change it through the Redis Cloud dashboard for persistence.

### What is Eviction Policy?

| Policy | Description | Good For | Bad For |
|--------|-------------|----------|---------|
| `volatile-lru` | Evicts least recently used keys with TTL set | Caching | Job queues |
| `allkeys-lru` | Evicts least recently used keys (any key) | Pure cache | Persistent data |
| `volatile-ttl` | Evicts keys with shortest TTL | Time-based cache | Job queues |
| **`noeviction`** | Refuses writes when memory full | **Job queues** | High-write loads |

### Expected Behavior After Fix
✅ No more "IMPORTANT! Eviction policy" warnings in logs
✅ BullMQ jobs will run reliably without data loss
✅ Background tasks (emails, QR codes, ticket generation) will work correctly

### If You Can't Change It
If you don't have permission to change the Redis Cloud configuration:

1. Contact your Redis Cloud administrator
2. Explain that BullMQ requires `noeviction` policy for job queue reliability
3. Provide them with this documentation

### Current Redis Configuration (from .env)
```env
REDIS_HOST=redis-15338.c212.ap-south-1-1.ec2.cloud.redislabs.com
REDIS_PORT=15338
REDIS_USERNAME=default
REDIS_PASSWORD=1IZNk41n0L3zF9n8ic5Z7BB10niUrWUu
REDIS_DB=0
```

---

**Last Updated:** 2025-11-23
**Status:** ⚠️ Action Required
**Priority:** High (affects job queue reliability)
