# Optimization Setup Guide

This guide covers setting up Redis, caching, queues, and workers for optimal performance of the Gema backend.

## Prerequisites

- Node.js >= 18.0.0
- Redis server (local or cloud)

## 1. Redis Setup

### Local Development (Windows)

**Option A: Using Windows Subsystem for Linux (WSL)**
```bash
# Install WSL and Ubuntu
wsl --install

# Inside WSL, install Redis
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

**Option B: Using Docker**
```bash
# Pull and run Redis container
docker run -d -p 6379:6379 --name gema-redis redis:latest

# Verify Redis is running
docker exec -it gema-redis redis-cli ping
# Should return: PONG
```

**Option C: Using Memurai (Windows native)**
1. Download from https://www.memurai.com/
2. Install and run
3. Default port: 6379

### Production (Cloud Options)

**Redis Cloud (Recommended)**
1. Sign up at https://redis.com/try-free/
2. Create a database
3. Copy connection details

**Upstash (Serverless Redis)**
1. Sign up at https://upstash.com/
2. Create a database
3. Copy connection URL

**AWS ElastiCache**
1. Create Redis cluster in AWS Console
2. Configure security groups
3. Use cluster endpoint

## 2. Environment Variables

Add these to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost           # or your cloud Redis host
REDIS_PORT=6379
REDIS_PASSWORD=                # leave empty for local, add for production
REDIS_DB=0
REDIS_TLS=false               # set to true for Redis Cloud/Upstash

# Cache Settings
CACHE_TTL=3600                # Default cache TTL in seconds (1 hour)
CACHE_ENABLED=true            # Enable/disable caching

# Queue Settings
QUEUE_ENABLED=true            # Enable/disable background jobs
QUEUE_CONCURRENCY=5           # Number of concurrent jobs per worker

# Performance Settings
ENABLE_COMPRESSION=true       # Enable response compression
ENABLE_RATE_LIMITING=true    # Enable API rate limiting
```

### Production Environment Variables

For production, also add:

```env
NODE_ENV=production

# Redis (example for Redis Cloud)
REDIS_HOST=redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your_secure_password_here
REDIS_TLS=true

# Tighter cache/performance settings
CACHE_TTL=7200
QUEUE_CONCURRENCY=10
```

## 3. Install Dependencies

All required dependencies are already in `package.json`:

```bash
npm install
```

Key packages installed:
- `ioredis` - Redis client
- `bullmq` - Queue/job processing
- `redlock` - Distributed locks

## 4. Running the Application

### Development Mode

**Terminal 1 - Main API Server:**
```bash
npm run dev
```

**Terminal 2 - Background Worker (Optional but Recommended):**
```bash
npm run dev:worker
```

### Production Mode

**Option A: Using PM2 (Recommended)**

Install PM2:
```bash
npm install -g pm2
```

Start all services:
```bash
# Build first
npm run build

# Start API server
pm2 start dist/server.js --name gema-api -i max

# Start worker
pm2 start dist/workers/index.js --name gema-worker -i 2

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

**Option B: Manual**

```bash
# Terminal 1 - API Server
npm run start:prod

# Terminal 2 - Worker
npm run start:worker:prod
```

## 5. Verify Setup

### Check Redis Connection

```bash
# If using local Redis
redis-cli ping

# If using cloud Redis with auth
redis-cli -h your-host -p your-port -a your-password ping
```

### Check Application Health

Visit or curl:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-05T...",
  "uptime": 123.456,
  "redis": {
    "status": "connected",
    "responseTime": "2ms"
  },
  "database": {
    "status": "connected"
  }
}
```

## 6. Features Enabled

With Redis and workers running, you get:

### Caching
- Event listings cached for faster response
- Category and collection data cached
- Vendor profiles cached
- Automatic cache invalidation on updates

### Background Jobs
- Email sending (welcome, booking confirmations)
- Image processing and optimization
- Notification delivery
- Analytics aggregation
- Cleanup tasks

### Rate Limiting
- Per-IP rate limits on API endpoints
- Protection against abuse
- Configurable limits per endpoint

### Session Management
- Distributed session storage
- Scalable across multiple servers
- Automatic session cleanup

## 7. Monitoring

### Queue Dashboard (BullBoard)

If you want a UI to monitor queues:

```bash
npm install @bull-board/express @bull-board/api
```

Add to your server (optional):
```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullMQAdapter(emailQueue), new BullMQAdapter(imageQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Then visit: `http://localhost:5000/admin/queues`

### Redis Commander (Redis GUI)

```bash
npm install -g redis-commander
redis-commander
```

Visit: `http://localhost:8081`

## 8. Performance Tuning

### Redis Memory Optimization

For production, set Redis maxmemory policy in `redis.conf` or via CLI:

```bash
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Worker Concurrency

Adjust based on your server resources in `.env`:

```env
# For small VPS (1-2 CPU cores)
QUEUE_CONCURRENCY=2

# For medium server (4 CPU cores)
QUEUE_CONCURRENCY=5

# For large server (8+ CPU cores)
QUEUE_CONCURRENCY=10
```

### Cache Strategy

Adjust TTL based on data update frequency:

```env
# Frequently updated data (events, bookings)
CACHE_TTL=300     # 5 minutes

# Moderately updated data (categories, vendors)
CACHE_TTL=3600    # 1 hour

# Rarely updated data (static content)
CACHE_TTL=86400   # 24 hours
```

## 9. Troubleshooting

### Redis Connection Issues

**Error: "ECONNREFUSED"**
```bash
# Check if Redis is running
redis-cli ping

# On WSL, restart Redis
sudo service redis-server restart

# On Docker
docker restart gema-redis
```

**Error: "NOAUTH Authentication required"**
- Add `REDIS_PASSWORD` to your `.env` file

**Error: "Connection timeout"**
- Check firewall settings
- Verify `REDIS_HOST` and `REDIS_PORT`
- For cloud Redis, try both TLS settings (see TLS error below)

**Error: "SSL routines:ssl3_get_record:wrong version number" or TLS errors**

This is a common Redis Cloud TLS configuration issue. Try these solutions in order:

1. **First, try without TLS** (simplest solution):
   ```env
   REDIS_TLS=false
   ```
   Many Redis Cloud instances work without TLS on certain ports.

2. **If TLS is required**, enable it with proper settings:
   ```env
   REDIS_TLS=true
   REDIS_TLS_REJECT_UNAUTHORIZED=false
   ```

3. **For production with valid certificates**:
   ```env
   REDIS_TLS=true
   REDIS_TLS_REJECT_UNAUTHORIZED=true
   ```

After changing these settings, restart your application.

### Worker Not Processing Jobs

1. Check worker is running:
   ```bash
   ps aux | grep worker
   # or with PM2
   pm2 list
   ```

2. Check queue connection:
   ```bash
   # In your application logs
   tail -f logs/combined.log | grep -i queue
   ```

3. Verify Redis connection in worker

### High Memory Usage

1. Check Redis memory:
   ```bash
   redis-cli INFO memory
   ```

2. Set maxmemory limit:
   ```bash
   redis-cli CONFIG SET maxmemory 512mb
   ```

3. Clear cache if needed:
   ```bash
   redis-cli FLUSHDB
   ```

## 10. Scaling Recommendations

### Horizontal Scaling

With Redis + BullMQ, you can run multiple instances:

```bash
# Run 4 API servers on different ports
pm2 start dist/server.js -i 4

# Run 2 dedicated workers
pm2 start dist/workers/index.js -i 2
```

Use a load balancer (nginx, AWS ALB) to distribute traffic.

### Vertical Scaling

- **Small**: 1 API server + 1 worker (1-2 CPU cores, 1-2GB RAM)
- **Medium**: 2-4 API servers + 2 workers (4 CPU cores, 4-8GB RAM)
- **Large**: 8+ API servers + 4+ workers (8+ CPU cores, 16GB+ RAM)

### Database Optimization

The optimization setup works best with:
- MongoDB with proper indexes (see `OPTIMIZATION_SUMMARY.md`)
- Connection pooling enabled
- Read replicas for heavy read operations

## 11. Cost Considerations

### Free Tier Options

- **Redis**: Upstash free tier (10K commands/day) or Redis Cloud (30MB)
- **Hosting**: Render.com, Railway, Fly.io free tiers
- **MongoDB**: MongoDB Atlas free tier (512MB)

### Production Costs (Monthly Estimates)

- **Redis Cloud**: $5-50 depending on size
- **Server**: $5-100 (DigitalOcean, AWS, etc.)
- **MongoDB Atlas**: Free - $57
- **Total**: ~$10-200/month depending on scale

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review `OPTIMIZATION_SUMMARY.md` for feature details
- Open an issue in the project repository
