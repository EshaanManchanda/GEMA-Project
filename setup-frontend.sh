#!/bin/bash

# Kidrove Frontend Deployment Script
# Run this on your server: sudo bash setup-frontend.sh

set -e  # Exit on error

echo "🚀 Setting up Kidrove Frontend..."

# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    apt update
    apt install -y nginx
fi

# Create nginx configuration
echo "⚙️  Creating nginx configuration..."
cat > /etc/nginx/sites-available/kidrove << 'NGINX_EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name kidrove.com www.kidrove.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name kidrove.com www.kidrove.com;
    # SSL certificates (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/kidrove.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kidrove.com/privkey.pem;

    root /var/www/kidrove/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

# Enable site
echo "🔗 Enabling site..."
ln -sf /etc/nginx/sites-available/kidrove /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
echo "✅ Testing nginx configuration..."
nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx
systemctl enable nginx

echo ""
echo "✨ Nginx configured successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Install SSL certificate:"
echo "      sudo certbot --nginx -d kidrove.com -d www.kidrove.com"
echo ""
echo "   2. Update frontend .env API URL to:"
echo "      VITE_API_BASE_URL=https://kidrove.com/api"
echo ""
echo "   3. Rebuild frontend:"
echo "      cd /var/www/kidrove/frontend && npm run build"
echo ""
echo "   4. Visit: https://kidrove.com"
echo ""
