# Deployment Guide

Complete guide for deploying Gema Backend to production environments.

## 🚀 Production Deployment to Render

### Prerequisites Checklist

Before deploying, ensure you have:

- ✅ **MongoDB Atlas** cluster ([create here](https://cloud.mongodb.com/))
- ✅ **Firebase project** with Auth enabled ([setup guide](https://console.firebase.google.com/))
- ✅ **Stripe account** with API keys ([get keys](https://dashboard.stripe.com/))  
- ✅ **Cloudinary account** for file storage ([sign up](https://cloudinary.com/))
- ✅ **Email service** (Gmail App Password or SendGrid)
- ✅ **GitHub repository** forked or cloned

### Step 1: Service Setup

#### MongoDB Atlas Configuration
1. Create a new cluster or use existing
2. Create database user with read/write permissions
3. Whitelist IP addresses (or `0.0.0.0/0` for all IPs)
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/gema?retryWrites=true&w=majority`

#### Firebase Project Setup
1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → Choose providers (Email/Password, Google, etc.)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key** → Download JSON file
5. Extract values for environment variables

#### Stripe Configuration
1. Create account at [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get API keys from **Developers** → **API keys**
3. Set up webhooks (configured in Step 3)

#### Cloudinary Setup
1. Create account at [Cloudinary](https://cloudinary.com/)
2. Get cloud name, API key, and API secret from dashboard

### Step 2: Render Deployment

1. **Connect Repository**
   - Go to [Render Dashboard](https://render.com/)
   - Click **New** → **Web Service**
   - Connect your GitHub repository
   - Select the repository containing your backend

2. **Service Configuration**
   - **Name**: `gema-backend` (or your preferred name)
   - **Root Directory**: `backend`
   - **Environment**: `Node`  
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your production branch)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

3. **Environment Variables**
   
   Add all required environment variables in Render dashboard:

   ```env
   # Server Configuration
   NODE_ENV=production
   PORT=10000
   
   # Database
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gema?retryWrites=true&w=majority
   
   # JWT Configuration (Generate strong secrets!)
   JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters_long_random_string
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_SECRET=your_super_secure_refresh_secret_minimum_32_characters_long_random
   JWT_REFRESH_EXPIRES_IN=30d
   
   # Frontend URL (Update with your actual frontend domain)
   FRONTEND_URL=https://your-frontend-domain.com
   
   # Firebase Authentication
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_FULL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   
   # Stripe Payment Processing  
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   
   # Email Service (Gmail Example)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USERNAME=your-email@gmail.com
   EMAIL_PASSWORD=your-16-character-app-password
   EMAIL_FROM=noreply@your-domain.com
   
   # File Storage
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key  
   CLOUDINARY_API_SECRET=your-api-secret
   CLOUDINARY_SECURE=true
   UPLOAD_PROVIDER=cloudinary
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100
   ```

4. **Deploy**
   - Click **Create Web Service**
   - Render will automatically build and deploy
   - Monitor build logs for any issues

### Step 3: Post-Deployment Configuration

#### Stripe Webhook Setup
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://your-app.onrender.com/api/payments/webhook`
4. **Events to send**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copy **Signing Secret** and add to `STRIPE_WEBHOOK_SECRET` environment variable

#### Domain and SSL
- Render automatically provides HTTPS
- Custom domains can be configured in service settings
- SSL certificates are managed automatically

### Step 4: Verification

Test your deployment:

```bash
# Health check
curl https://your-app.onrender.com/api/health

# Test public endpoint
curl https://your-app.onrender.com/api/events/categories

# Test authentication
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"TestPass123!"}'
```

---

## 🐳 Docker Deployment

For containerized deployments:

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      # Add other environment variables
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

volumes:
  mongo-data:
```

### Deploy with Docker
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f backend

# Scale services
docker-compose up -d --scale backend=3
```

---

## ☁️ AWS Deployment

### EC2 Instance Setup

1. **Launch EC2 Instance**
   - AMI: Ubuntu 22.04 LTS
   - Instance type: t3.medium (minimum)
   - Security groups: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Install Dependencies**
   ```bash
   # Connect to instance
   ssh -i your-key.pem ubuntu@your-instance-ip
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx -y
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd gema/backend
   
   # Install dependencies
   npm install
   
   # Build application
   npm run build
   
   # Create environment file
   sudo nano .env
   # Add your production environment variables
   
   # Start with PM2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/gema-backend
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Enable SSL with Certbot**
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx -y
   
   # Get SSL certificate
   sudo certbot --nginx -d your-domain.com
   ```

### PM2 Ecosystem Configuration
Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'gema-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

---

## 🔧 Environment-Specific Notes

### Development
- Uses local MongoDB
- File uploads to local storage
- Development Firebase config
- Debug logging enabled

### Staging
- MongoDB Atlas (staging cluster)
- Cloudinary for file storage
- Staging Firebase project
- Enhanced logging

### Production
- MongoDB Atlas (production cluster)
- All external services configured
- Production Firebase project
- Optimized logging and monitoring

---

## 📊 Monitoring and Maintenance

### Health Monitoring
```bash
# Set up monitoring endpoint checks
curl -f https://your-app.onrender.com/api/health || echo "Service down!"
```

### Log Management
```bash
# View Render logs
render logs -s your-service-name

# Download logs
render logs -s your-service-name --download
```

### Performance Monitoring
- Use Render's built-in metrics
- Set up external monitoring (e.g., Datadog, New Relic)
- Monitor database performance in MongoDB Atlas

### Backup Strategy
1. **Database**: MongoDB Atlas automatic backups
2. **Files**: Cloudinary has built-in redundancy  
3. **Code**: Git repository backups
4. **Environment**: Document all configuration

---

## 🚨 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Issues
```bash
# Test MongoDB connection
curl -X GET https://your-app.onrender.com/api/health
# Check database status in response
```

#### Environment Variable Issues
- Verify all required variables are set
- Check for typos in variable names
- Ensure secrets are properly escaped

#### Memory Issues
- Upgrade Render plan if needed
- Optimize queries and caching
- Monitor memory usage

### Performance Issues
- Enable database indexing
- Implement caching strategies
- Optimize image processing
- Use CDN for static assets

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        cd backend
        npm ci
        
    - name: Run tests
      run: |
        cd backend
        npm test
        
    - name: Build application
      run: |
        cd backend
        npm run build
        
    - name: Deploy to Render
      # Render will automatically deploy on git push
      run: echo "Deployment triggered automatically"
```

---

**Next Steps:**
- [Monitoring Setup →](monitoring.md) - Set up application monitoring
- [Performance Optimization →](performance.md) - Optimize for production
- [Security Hardening →](security.md) - Additional security measures