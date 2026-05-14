# GEMA CI/CD Pipeline — Detailed Plan

> Auto-deploy from GitHub → VPS using GitHub Actions + PM2

---

## Architecture Overview

```
Local ──► GitHub ──► GitHub Actions ──► VPS ──► PM2 ──► Live

Branches:
• dev ──► staging (auto-deploy)
• main ──► production (manual approval)
```

---

## Phase 1: VPS Setup

### 1.1 SSH into server
```bash
ssh root@YOUR_VPS_IP
```

### 1.2 Create project directories
```bash
mkdir -p /var/www/gema
cd /var/www/gema
git clone https://github.com/YOUR_USERNAME/GEMA-Project-aditya.git .
```

### 1.3 Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 1.4 Install PM2 & dependencies
```bash
npm install -g pm2

cd /var/www/gema/backend
npm install

cd /var/www/gema/frontend
npm install
```

### 1.5 Setup environment files
```bash
cp /var/www/gema/backend/.env.example /var/www/gema/backend/.env
nano /var/www/gema/backend/.env

cp /var/www/gema/frontend/.env.example /var/www/gema/frontend/.env
nano /var/www/gema/frontend/.env
```

### 1.6 Start with PM2
```bash
cd /var/www/gema/backend
pm2 start npm --name "gema-backend" -- start
pm2 start npm --name "gema-worker" -- start:worker

cd /var/www/gema/frontend
pm2 start npm --name "gema-frontend" -- run preview -- --port 3000

pm2 save
pm2 startup
```

---

## Phase 2: SSH Deploy Key

### 2.1 Generate SSH key on VPS
```bash
ssh-keygen -t ed25519 -C "github-deploy-gema" -f ~/.ssh/gema_deploy
```

### 2.2 Get public key
```bash
cat ~/.ssh/gema_deploy.pub
```

### 2.3 Add to GitHub
1. Repo → Settings → Deploy Keys → Add deploy key
2. Paste public key (grant read access)

### 2.4 Add private key to GitHub Secrets
1. Repo → Settings → Secrets → Actions → New repository secret
2. Name: `VPS_SSH_KEY`
3. Value: Contents of `~/.ssh/gema_deploy` (private key)

---

## Phase 3: GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches:
      - main
      - dev
  workflow_dispatch:

env:
  NODE_VERSION: '20'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Backend lint
        working-directory: ./backend
        run: |
          npm ci
          npm run lint

      - name: Frontend type-check
        working-directory: ./frontend
        run: |
          npm ci
          npm run type-check

  build:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Build backend
        working-directory: ./backend
        run: |
          npm ci
          npm run build

      - name: Build frontend
        working-directory: ./frontend
        run: |
          npm ci
          npm run build

      - name: Upload backend artifacts
        uses: actions/upload-artifact@v4
        with:
          name: backend-dist
          path: backend/dist
          retention-days: 1

      - name: Upload frontend artifacts
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist
          retention-days: 1

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/dev'
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          merge-multiple: true

      - name: Deploy to Staging VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST_STAGING }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT || 22 }}
          script: |
            cd /var/www/gema
            git fetch origin dev
            git checkout dev
            git pull origin dev
            
            cd backend && npm install --production && cd ..
            cd frontend && npm install --production && cd ..
            
            pm2 restart gema-backend || pm2 start npm --name "gema-backend" -- start
            pm2 restart gema-frontend || pm2 start npm --name "gema-frontend" -- run preview
            pm2 save
            pm2 status

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          merge-multiple: true

      - name: Deploy to Production VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST_PROD }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT || 22 }}
          script: |
            cd /var/www/gema
            sudo cp -r backend/dist backend/dist.backup.$(date +%Y%m%d_%H%M%S)
            sudo cp -r frontend/dist frontend/dist.backup.$(date +%Y%m%d_%H%M%S)
            
            git fetch origin main
            git checkout main
            git pull origin main
            
            cd backend && npm install --production && cd ..
            cd frontend && npm install --production && cd ..
            
            pm2 reload gema-backend
            pm2 reload gema-frontend
            pm2 save
            pm2 status

  health-check:
    needs: deploy-production
    runs-on: ubuntu-latest
    steps:
      - name: Wait for deployment
        run: sleep 30

      - name: Check backend health
        run: |
          curl -f https://${{ secrets.VPS_HOST_PROD }}/health || exit 1
```

---

## Phase 4: GitHub Secrets

Add in **Repo → Settings → Secrets → Actions**:

| Secret | Value |
|--------|-------|
| `VPS_HOST_PROD` | Production server IP |
| `VPS_HOST_STAGING` | Staging server IP |
| `VPS_USER` | SSH user (e.g., `root`) |
| `VPS_SSH_KEY` | Private key from `~/.ssh/gema_deploy` |
| `VPS_PORT` | SSH port (default: 22) |

---

## Branch Strategy

```
dev (push) ──► staging (auto-deploy)
main (push) ──► production (manual)

Commands:
git checkout -b feature/my-feature
git push origin dev  # → Auto-deploys to staging

# Production:
git checkout main
git merge dev
git push origin main
```

---

## Deployment Flow

**dev branch:**
1. GitHub Actions triggers
2. Lint + Type-check
3. Build backend + frontend
4. Deploy to staging VPS
5. PM2 restarts

**main branch:**
1. All above steps
2. Deploy to production VPS
3. Backup current version
4. PM2 reload (zero-downtime)
5. Health check

---

## Rollback

```bash
# Option A: PM2 history
pm2 restart gema-backend

# Option B: Manual
cd /var/www/gema
git checkout main
git pull origin main
pm2 restart all
```

---

## Nginx Config (Optional)

For reverse proxy setup:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```