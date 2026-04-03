#!/bin/bash

###############################################################################
# kidrove Server Setup Script
# Initial server configuration for Hostinger KVM1 VPS
#
# Usage:
#   wget https://raw.githubusercontent.com/YourRepo/kidrove/main/setup-server.sh
#   chmod +x setup-server.sh
#   sudo ./setup-server.sh
#
# This script will:
#   - Update system packages
#   - Install Node.js 20.x
#   - Install PM2, NGINX, Git, Certbot
#   - Configure firewall
#   - Clone repository
#   - Setup initial deployment
#
# Prerequisites:
#   - Fresh Ubuntu 22.04 server (Hostinger KVM1)
#   - Root or sudo access
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (UPDATE THESE)
GIT_REPO="https://github.com/EshaanManchanda/kidrove-Project.git"
GIT_BRANCH="backend_auth"  # or "main" depending on your branch
DOMAIN_NAME="kidrove.com"  # Leave empty if not ready
PROJECT_ROOT="/var/www/kidrove"

###############################################################################
# Helper Functions
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

###############################################################################
# Check if running as root
###############################################################################

if [ "$EUID" -ne 0 ]; then
    error "Please run as root or with sudo"
    exit 1
fi

###############################################################################
# System Update
###############################################################################

log "Updating system packages..."
apt update && apt upgrade -y
success "System updated"

###############################################################################
# Install Essential Packages
###############################################################################

log "Installing essential packages..."
apt install -y curl wget git build-essential software-properties-common
success "Essential packages installed"

###############################################################################
# Install Node.js 20.x
###############################################################################

log "Installing Node.js 20.x..."

# Remove old Node.js if exists
apt remove -y nodejs npm 2>/dev/null || true

# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js
apt install -y nodejs

# Verify installation
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)

log "Node.js version: $NODE_VERSION"
log "NPM version: $NPM_VERSION"

success "Node.js installed successfully"

###############################################################################
# Install PM2
###############################################################################

log "Installing PM2..."
npm install -g pm2

# Configure PM2 startup script
pm2 startup systemd -u root --hp /root

success "PM2 installed and configured"

###############################################################################
# Install NGINX
###############################################################################

log "Installing NGINX..."
apt install -y nginx

# Start and enable NGINX
systemctl start nginx
systemctl enable nginx

success "NGINX installed and started"

###############################################################################
# Install Certbot (Let's Encrypt SSL)
###############################################################################

log "Installing Certbot..."
apt install -y certbot python3-certbot-nginx

success "Certbot installed"

###############################################################################
# Install Redis
###############################################################################

log "Installing Redis..."
apt install -y redis-server

# Configure Redis
log "Configuring Redis..."
# Enable Redis to start on boot
systemctl enable redis-server

# Update Redis configuration for production
REDIS_CONF="/etc/redis/redis.conf"
if [ -f "$REDIS_CONF" ]; then
    # Backup original config
    cp "$REDIS_CONF" "$REDIS_CONF.backup"

    # Set supervised to systemd
    sed -i 's/^supervised no/supervised systemd/' "$REDIS_CONF"

    # Set maxmemory to 256MB (adjust for KVM1)
    if ! grep -q "^maxmemory" "$REDIS_CONF"; then
        echo "maxmemory 256mb" >> "$REDIS_CONF"
    fi

    # Set maxmemory-policy to allkeys-lru
    if ! grep -q "^maxmemory-policy" "$REDIS_CONF"; then
        echo "maxmemory-policy allkeys-lru" >> "$REDIS_CONF"
    fi
fi

# Start Redis
systemctl restart redis-server

# Verify Redis is running
if systemctl is-active --quiet redis-server; then
    success "Redis installed and running"
    log "Redis version: $(redis-cli --version)"
else
    error "Redis installation failed"
fi

###############################################################################
# Configure Firewall (UFW)
###############################################################################

log "Configuring firewall..."

# Install UFW if not present
apt install -y ufw

# Allow SSH (CRITICAL - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

success "Firewall configured (ports 22, 80, 443 open)"

###############################################################################
# Create Project Directory
###############################################################################

log "Creating project directory..."
mkdir -p "$PROJECT_ROOT"
success "Project directory created: $PROJECT_ROOT"

###############################################################################
# Clone Repository
###############################################################################

log "Cloning kidrove repository..."

if [ -d "$PROJECT_ROOT/.git" ]; then
    warning "Repository already exists, pulling latest changes..."
    cd "$PROJECT_ROOT"
    git pull origin "$GIT_BRANCH"
else
    git clone -b "$GIT_BRANCH" "$GIT_REPO" "$PROJECT_ROOT"
fi

success "Repository cloned successfully"

###############################################################################
# Setup Backend
###############################################################################

log "Setting up backend..."

cd "$PROJECT_ROOT/backend"

# Create logs directory
mkdir -p logs

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    warning "Created .env file from .env.example"
    warning "IMPORTANT: Edit /var/www/kidrove/backend/.env with your production values"
else
    warning ".env file already exists, skipping..."
fi

# Install dependencies
log "Installing backend dependencies..."
npm install --production=false

# Build backend
log "Building backend..."
npm run build

success "Backend setup complete"

###############################################################################
# Setup Frontend
###############################################################################

log "Setting up frontend..."

cd "$PROJECT_ROOT/frontend"

# Copy environment file
if [ ! -f .env.production ]; then
    if [ -f .env.production ]; then
        cp .env.production .env.production
    else
        warning "No .env.production template found"
        warning "IMPORTANT: Create /var/www/kidrove/frontend/.env.production"
    fi
fi

# Install dependencies
log "Installing frontend dependencies..."
npm install

# Build frontend
log "Building frontend..."
npm run build

success "Frontend setup complete"

###############################################################################
# Setup NGINX Configuration
###############################################################################

log "Setting up NGINX configuration..."

if [ -f "$PROJECT_ROOT/deployment/nginx/kidrove.conf" ]; then
    # Copy NGINX config
    cp "$PROJECT_ROOT/deployment/nginx/kidrove.conf" /etc/nginx/sites-available/kidrove

    # Update domain name if provided
    if [ -n "$DOMAIN_NAME" ]; then
        sed -i "s/your-domain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/kidrove
        success "NGINX config updated with domain: $DOMAIN_NAME"
    else
        warning "Domain name not set - using default config"
        warning "Edit /etc/nginx/sites-available/kidrove and replace 'your-domain.com'"
    fi

    # Enable site
    ln -sf /etc/nginx/sites-available/kidrove /etc/nginx/sites-enabled/

    # Remove default site
    rm -f /etc/nginx/sites-enabled/default

    # Test NGINX config
    if nginx -t; then
        systemctl reload nginx
        success "NGINX configured successfully"
    else
        error "NGINX configuration test failed"
        error "Check /etc/nginx/sites-available/kidrove for errors"
    fi
else
    warning "NGINX config template not found in repository"
    warning "You'll need to configure NGINX manually"
fi

###############################################################################
# Start Backend with PM2
###############################################################################

log "Starting backend with PM2..."

cd "$PROJECT_ROOT/backend"

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

success "Backend started with PM2"

###############################################################################
# Setup SSL (if domain is configured)
###############################################################################

if [ -n "$DOMAIN_NAME" ]; then
    log "Setting up SSL certificate..."

    warning "About to request SSL certificate from Let's Encrypt"
    warning "Make sure your domain $DOMAIN_NAME points to this server's IP"

    read -p "Continue with SSL setup? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" --non-interactive --agree-tos --email "admin@$DOMAIN_NAME"
        success "SSL certificate installed"
    else
        warning "Skipping SSL setup - run manually later with:"
        warning "sudo certbot --nginx -d $DOMAIN_NAME"
    fi
else
    warning "Domain not configured - SSL not set up"
    warning "To setup SSL later:"
    warning "1. Point your domain to this server's IP"
    warning "2. Update /etc/nginx/sites-available/kidrove with your domain"
    warning "3. Run: sudo certbot --nginx -d your-domain.com"
fi

###############################################################################
# Install PM2 Log Rotation
###############################################################################

log "Installing PM2 log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
success "PM2 log rotation configured"

###############################################################################
# Setup Automatic Security Updates
###############################################################################

log "Configuring automatic security updates..."
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
success "Automatic security updates enabled"

###############################################################################
# Final System Information
###############################################################################

log ""
log "========================================="
log "  kidrove Server Setup Complete!"
log "========================================="
log ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

success "Server IP: $SERVER_IP"
success "Project Location: $PROJECT_ROOT"
success "Node.js Version: $NODE_VERSION"
success "NPM Version: $NPM_VERSION"
success ""

if [ -n "$DOMAIN_NAME" ]; then
    success "Domain: https://$DOMAIN_NAME"
else
    success "Access via: http://$SERVER_IP"
fi

success ""
success "========================================="
success "  IMPORTANT NEXT STEPS"
success "========================================="
warning ""
warning "1. Configure Environment Variables:"
warning "   Edit: $PROJECT_ROOT/backend/.env"
warning "   Required: MONGODB_URI, JWT_SECRET, STRIPE_SECRET_KEY, etc."
warning ""
warning "2. Configure Frontend Environment:"
warning "   Edit: $PROJECT_ROOT/frontend/.env.production"
warning "   Required: VITE_API_BASE_URL, VITE_STRIPE_PUBLISHABLE_KEY"
warning ""
warning "3. Setup MongoDB Atlas:"
warning "   - Create cluster at https://cloud.mongodb.com"
warning "   - Add server IP to whitelist"
warning "   - Copy connection string to backend/.env"
warning ""
warning "4. If domain not configured:"
warning "   - Point your domain DNS to: $SERVER_IP"
warning "   - Update /etc/nginx/sites-available/kidrove"
warning "   - Run: sudo certbot --nginx -d your-domain.com"
warning ""
warning "5. After configuring .env files:"
warning "   cd $PROJECT_ROOT"
warning "   ./deploy.sh"
warning ""
success "========================================="
success "  USEFUL COMMANDS"
success "========================================="
success ""
success "PM2 Commands:"
success "  pm2 status                 - View running processes"
success "  pm2 logs kidrove-backend      - View logs"
success "  pm2 monit                  - Monitor resources"
success "  pm2 restart kidrove-backend   - Restart backend"
success ""
success "Deployment:"
success "  cd $PROJECT_ROOT"
success "  ./deploy.sh                - Deploy updates"
success "  ./deploy.sh --rollback     - Rollback to previous version"
success ""
success "NGINX:"
success "  sudo nginx -t              - Test configuration"
success "  sudo systemctl reload nginx - Reload NGINX"
success "  sudo systemctl status nginx - Check status"
success ""
success "Logs:"
success "  tail -f $PROJECT_ROOT/backend/logs/combined.log"
success "  tail -f /var/log/nginx/kidrove_error.log"
success ""
success "========================================="
success "Setup completed at: $(date +'%Y-%m-%d %H:%M:%S')"
success "========================================="
