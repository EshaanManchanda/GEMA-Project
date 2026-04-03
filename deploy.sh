#!/bin/bash

###############################################################################
# GEMA Deployment Script
# Automated deployment for Hostinger KVM1 VPS
#
# Usage:
#   ./deploy.sh                 # Deploy both frontend and backend
#   ./deploy.sh --backend-only  # Deploy backend only
#   ./deploy.sh --frontend-only # Deploy frontend only
#   ./deploy.sh --rollback      # Rollback to previous version
#   ./deploy.sh --help          # Show help
#
# Prerequisites:
#   - Git repository cloned to /var/www/gema
#   - PM2 installed globally
#   - NGINX installed and configured
#   - Node.js 20+ installed
#   - Environment files (.env) configured
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/var/www/gema"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
PM2_APP_NAME="gema-backend"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$PROJECT_ROOT/deployment.log"

# Parse arguments
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
ROLLBACK=false

for arg in "$@"; do
    case $arg in
        --backend-only)
            DEPLOY_FRONTEND=false
            ;;
        --frontend-only)
            DEPLOY_BACKEND=false
            ;;
        --rollback)
            ROLLBACK=true
            ;;
        --help)
            echo "GEMA Deployment Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --backend-only   Deploy backend only"
            echo "  --frontend-only  Deploy frontend only"
            echo "  --rollback       Rollback to previous version"
            echo "  --help           Show this help message"
            exit 0
            ;;
    esac
done

###############################################################################
# Helper Functions
###############################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"
}

###############################################################################
# Pre-flight Checks
###############################################################################

preflight_checks() {
    log "Running pre-flight checks..."

    # Check if running on server
    if [ ! -d "$PROJECT_ROOT" ]; then
        error "Project directory not found: $PROJECT_ROOT"
        error "This script should be run on the server where GEMA is deployed"
        exit 1
    fi

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed. Install with: npm install -g pm2"
        exit 1
    fi

    # Check if NGINX is installed
    if ! command -v nginx &> /dev/null; then
        error "NGINX is not installed. Install with: apt install nginx"
        exit 1
    fi

    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ required. Current: $(node -v)"
        exit 1
    fi

    success "Pre-flight checks passed"
}

###############################################################################
# Backup Function
###############################################################################

create_backup() {
    log "Creating backup..."

    mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="backup-$(date +'%Y%m%d-%H%M%S')"

    if [ "$DEPLOY_BACKEND" = true ]; then
        if [ -d "$BACKEND_DIR/dist" ]; then
            cp -r "$BACKEND_DIR/dist" "$BACKUP_DIR/$BACKUP_NAME-backend"
            success "Backend backup created: $BACKUP_NAME-backend"
        fi
    fi

    if [ "$DEPLOY_FRONTEND" = true ]; then
        if [ -d "$FRONTEND_DIR/dist" ]; then
            cp -r "$FRONTEND_DIR/dist" "$BACKUP_DIR/$BACKUP_NAME-frontend"
            success "Frontend backup created: $BACKUP_NAME-frontend"
        fi
    fi

    # Keep only last 5 backups
    cd "$BACKUP_DIR" && ls -t | tail -n +11 | xargs -r rm -rf

    echo "$BACKUP_NAME" > "$PROJECT_ROOT/.last-backup"
}

###############################################################################
# Rollback Function
###############################################################################

rollback_deployment() {
    log "Rolling back to previous version..."

    if [ ! -f "$PROJECT_ROOT/.last-backup" ]; then
        error "No backup found for rollback"
        exit 1
    fi

    BACKUP_NAME=$(cat "$PROJECT_ROOT/.last-backup")

    if [ "$DEPLOY_BACKEND" = true ]; then
        if [ -d "$BACKUP_DIR/$BACKUP_NAME-backend" ]; then
            rm -rf "$BACKEND_DIR/dist"
            cp -r "$BACKUP_DIR/$BACKUP_NAME-backend" "$BACKEND_DIR/dist"
            pm2 reload "$PM2_APP_NAME"
            success "Backend rolled back to $BACKUP_NAME"
        fi
    fi

    if [ "$DEPLOY_FRONTEND" = true ]; then
        if [ -d "$BACKUP_DIR/$BACKUP_NAME-frontend" ]; then
            rm -rf "$FRONTEND_DIR/dist"
            cp -r "$BACKUP_DIR/$BACKUP_NAME-frontend" "$FRONTEND_DIR/dist"
            success "Frontend rolled back to $BACKUP_NAME"
        fi
    fi

    success "Rollback completed successfully"
    exit 0
}

###############################################################################
# Git Pull
###############################################################################

git_pull() {
    log "Pulling latest code from repository..."

    cd "$PROJECT_ROOT"

    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log "Current branch: $CURRENT_BRANCH"

    # Stash any local changes
    git stash

    # Pull latest changes
    if git pull origin "$CURRENT_BRANCH"; then
        success "Code pulled successfully"
    else
        error "Failed to pull code from repository"
        git stash pop
        exit 1
    fi

    # Get current commit hash
    COMMIT_HASH=$(git rev-parse --short HEAD)
    log "Deployed commit: $COMMIT_HASH"
}

###############################################################################
# Deploy Backend
###############################################################################

deploy_backend() {
    log "Deploying backend..."

    cd "$BACKEND_DIR"

    # Install dependencies
    log "Installing backend dependencies..."
    if npm install --production=false; then
        success "Backend dependencies installed"
    else
        error "Failed to install backend dependencies"
        exit 1
    fi

    # Build backend
    log "Building backend..."
    if npm run build; then
        success "Backend built successfully"
    else
        error "Backend build failed"
        exit 1
    fi

    # Restart PM2 process
    log "Restarting backend with PM2..."
    if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
        # App exists, reload it (zero-downtime)
        pm2 reload "$PM2_APP_NAME"
        success "Backend reloaded with PM2"
    else
        # App doesn't exist, start it
        pm2 start ecosystem.config.js --env production
        pm2 save
        success "Backend started with PM2"
    fi

    # Wait for backend to be ready
    log "Waiting for backend to be ready..."
    sleep 3

    # Health check
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        success "Backend health check passed"
    else
        warning "Backend health check failed - check PM2 logs: pm2 logs $PM2_APP_NAME"
    fi
}

###############################################################################
# Deploy Frontend
###############################################################################

deploy_frontend() {
    log "Deploying frontend..."

    cd "$FRONTEND_DIR"

    # Install dependencies
    log "Installing frontend dependencies..."
    if npm install; then
        success "Frontend dependencies installed"
    else
        error "Failed to install frontend dependencies"
        exit 1
    fi

    # Build frontend
    log "Building frontend..."
    if npm run build; then
        success "Frontend built successfully"
    else
        error "Frontend build failed"
        exit 1
    fi

    # Reload NGINX
    log "Reloading NGINX..."
    if sudo nginx -t; then
        sudo systemctl reload nginx
        success "NGINX reloaded successfully"
    else
        error "NGINX configuration test failed"
        exit 1
    fi
}

###############################################################################
# Post-deployment Tasks
###############################################################################

post_deployment() {
    log "Running post-deployment tasks..."

    # Clear PM2 logs older than 7 days
    find /root/.pm2/logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true

    # Display PM2 status
    pm2 status

    # Get deployment time
    DEPLOY_TIME=$(date +'%Y-%m-%d %H:%M:%S')

    success ""
    success "========================================="
    success "  GEMA Deployment Completed Successfully"
    success "========================================="
    success "Deployment time: $DEPLOY_TIME"
    if [ "$DEPLOY_BACKEND" = true ]; then
        success "Backend: ✓ Deployed and running"
    fi
    if [ "$DEPLOY_FRONTEND" = true ]; then
        success "Frontend: ✓ Built and served by NGINX"
    fi
    success ""
    success "Useful commands:"
    success "  - View logs: pm2 logs $PM2_APP_NAME"
    success "  - Monitor: pm2 monit"
    success "  - Rollback: ./deploy.sh --rollback"
    success "========================================="
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log ""
    log "========================================="
    log "  GEMA Deployment Script"
    log "========================================="
    log "Deployment started at: $(date +'%Y-%m-%d %H:%M:%S')"
    log ""

    # Handle rollback
    if [ "$ROLLBACK" = true ]; then
        rollback_deployment
    fi

    # Run pre-flight checks
    preflight_checks

    # Create backup before deployment
    create_backup

    # Pull latest code
    git_pull

    # Deploy backend
    if [ "$DEPLOY_BACKEND" = true ]; then
        deploy_backend
    fi

    # Deploy frontend
    if [ "$DEPLOY_FRONTEND" = true ]; then
        deploy_frontend
    fi

    # Post-deployment tasks
    post_deployment
}

# Run main function
main "$@"
