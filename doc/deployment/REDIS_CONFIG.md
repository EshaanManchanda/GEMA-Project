# Redis Configuration Guide for GEMA Backend

## Critical: BullMQ Eviction Policy Requirement

BullMQ (background job queue system) requires Redis to use the `noeviction` policy. Using other policies like `volatile-lru` or `allkeys-lru` can cause job data corruption and worker failures.

## Current Issue

If you're seeing these errors in production:
```
IMPORTANT! Eviction policy is volatile-lru. It should be "noeviction"
Stream isn't writeable and enableOfflineQueue options is false
```

Your Redis server is configured with the wrong eviction policy.

## Quick Fix (Immediate - No Restart Required)

Connect to your Redis server and run:

```bash
# Connect to Redis
redis-cli -h <REDIS_HOST> -p <REDIS_PORT> -a <REDIS_PASSWORD>

# Check current policy
CONFIG GET maxmemory-policy
# Output: 1) "maxmemory-policy"  2) "volatile-lru"  <-- Wrong!

# Fix: Set to noeviction
CONFIG SET maxmemory-policy noeviction

# Verify the change
CONFIG GET maxmemory-policy
# Output: 1) "maxmemory-policy"  2) "noeviction"  <-- Correct!
```

**This change takes effect immediately** without restarting Redis.

## Make Fix Permanent

To ensure the fix persists after Redis restarts:

### Option 1: Edit redis.conf directly

1. Find your Redis configuration file:
   ```bash
   # Common locations:
   # /etc/redis/redis.conf
   # /etc/redis.conf
   # /usr/local/etc/redis.conf

   # Or find it:
   redis-cli CONFIG GET dir
   redis-cli CONFIG GET config_file
   ```

2. Edit the file:
   ```bash
   sudo nano /etc/redis/redis.conf
   ```

3. Find and change the line:
   ```conf
   # FROM:
   maxmemory-policy volatile-lru

   # TO:
   maxmemory-policy noeviction
   ```

4. Save and restart Redis:
   ```bash
   sudo systemctl restart redis
   # OR
   sudo service redis restart
   ```

### Option 2: Use Redis CONFIG REWRITE

```bash
redis-cli -h <REDIS_HOST> -p <REDIS_PORT> -a <REDIS_PASSWORD>
CONFIG SET maxmemory-policy noeviction
CONFIG REWRITE
```

This automatically updates the redis.conf file (if Redis has write permissions).

## Using Managed Redis Services

### Redis Cloud (RedisLabs)
1. Log into Redis Cloud console
2. Select your database
3. Go to Configuration → Advanced Options
4. Set "Eviction Policy" to "noeviction"
5. Save changes

### AWS ElastiCache
1. Open ElastiCache console
2. Select your Redis cluster
3. Click "Modify"
4. Find "Parameter Group"
5. Create/modify parameter group with `maxmemory-policy = noeviction`
6. Apply changes

### DigitalOcean Managed Redis
1. Open DigitalOcean control panel
2. Select your Redis cluster
3. Go to Settings → Advanced
4. Set "Maxmemory Policy" to "noeviction"
5. Save

### Upstash
1. Log into Upstash console
2. Select your database
3. Go to Settings
4. Set "Eviction Policy" to "noeviction"

## Why noeviction?

BullMQ stores job data, state, and metadata in Redis. With eviction policies like `volatile-lru` or `allkeys-lru`:
- Redis may evict job data when memory is low
- Evicted jobs are permanently lost
- Queue state becomes corrupted
- Workers fail with "Stream isn't writeable" errors

With `noeviction`:
- Redis returns errors when memory is full instead of evicting data
- Job data integrity is guaranteed
- Application can handle memory errors gracefully

## Memory Management with noeviction

If you're concerned about memory usage:

1. **Set maxmemory limit** (recommended):
   ```bash
   CONFIG SET maxmemory 256mb  # Adjust based on your needs
   ```

2. **Configure job retention** (already optimized in code):
   - Completed jobs: 1 hour retention
   - Failed jobs: 24 hour retention
   - Max 100 recent completed jobs kept

3. **Monitor memory usage**:
   ```bash
   redis-cli INFO memory
   ```

4. **Manual cleanup if needed**:
   ```bash
   # Clean old completed jobs
   redis-cli --scan --pattern "bull:*:completed" | xargs redis-cli DEL
   ```

## Verification

After applying the fix, verify in your application logs:

```bash
# You should see:
BullMQ Redis: Connected and ready

# You should NOT see:
IMPORTANT! Eviction policy is volatile-lru. It should be "noeviction"
```

## Environment Variables

Ensure these are set in your `.env` file:

```env
REDIS_HOST=localhost          # Your Redis host
REDIS_PORT=6379               # Your Redis port
REDIS_PASSWORD=               # Your Redis password (if any)
REDIS_DB=0                    # Database number
REDIS_TLS=false               # Set to true for TLS connections
DISABLE_REDIS=false           # Keep false for production
```

## Troubleshooting

### Still seeing errors after fix?

1. **Verify config applied**:
   ```bash
   redis-cli CONFIG GET maxmemory-policy
   ```

2. **Restart workers**:
   ```bash
   pm2 restart gema-backend
   pm2 restart gema-worker
   ```

3. **Check Redis connectivity**:
   ```bash
   redis-cli -h <HOST> -p <PORT> PING
   # Should return: PONG
   ```

4. **Check Redis logs**:
   ```bash
   # Ubuntu/Debian
   sudo tail -f /var/log/redis/redis-server.log

   # CentOS/RHEL
   sudo tail -f /var/log/redis/redis.log
   ```

### Connection issues?

Check backend logs for:
```
BullMQ Redis: Reconnecting... Attempt X
```

If reconnection attempts exceed 50, there's a persistent connection issue. Check:
- Redis server is running
- Firewall allows connections
- Credentials are correct
- Network connectivity

## Additional Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Eviction Policies](https://redis.io/docs/manual/eviction/)
- [Redis Configuration](https://redis.io/docs/management/config/)

## Need Help?

Contact your system administrator or check:
- Backend logs: `pm2 logs gema-backend`
- Worker logs: `pm2 logs gema-worker`
- Redis logs: `/var/log/redis/`
