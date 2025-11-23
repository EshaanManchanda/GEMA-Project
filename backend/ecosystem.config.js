/**
 * PM2 Ecosystem Configuration for GEMA Backend
 * Optimized for Hostinger KVM1 VPS (4GB RAM, 1 vCPU)
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js --env production
 *   pm2 stop gema-backend
 *   pm2 delete gema-backend
 *   pm2 logs gema-backend
 *   pm2 monit
 */

module.exports = {
  apps: [{
    // Application Name
    name: 'gema-backend',

    // Script to run
    script: './dist/server.js',

    // Instances (1 for KVM1 single vCPU, or 'max' for auto-detection)
    instances: 1,

    // Execution mode: 'cluster' or 'fork'
    // Use 'fork' for single instance, 'cluster' for multiple
    exec_mode: 'fork',

    // Current working directory
    cwd: '/var/www/gema/backend',

    // Environment Variables - Production
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,

      // These will be overridden by .env file if present
      // PM2 will load .env automatically if it exists
    },

    // Environment Variables - Development (for testing)
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000,
    },

    // Auto-restart configuration
    autorestart: true,
    watch: false, // Set to true only in development
    max_restarts: 10, // Max consecutive restarts before stopping
    min_uptime: '10s', // Minimum uptime before restart is considered successful

    // Memory Management (Critical for KVM1 4GB RAM)
    max_memory_restart: '500M', // Restart if memory exceeds 500MB

    // Logging Configuration
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_file: './logs/combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Log rotation (requires pm2-logrotate module)
    // Install: pm2 install pm2-logrotate
    // Configure: pm2 set pm2-logrotate:max_size 10M

    // Process Management
    kill_timeout: 5000, // Time to wait before force kill (ms)
    listen_timeout: 3000, // Time to wait for app to be ready (ms)
    shutdown_with_message: true,

    // Source Map Support (for better error traces)
    source_map_support: true,

    // Interpreter (Node.js binary path)
    // interpreter: '/usr/bin/node',

    // Arguments to pass to the script
    // args: '',

    // Interpreter arguments
    // node_args: '--max-old-space-size=512', // Limit Node.js heap to 512MB

    // Process Priority (-20 to 19, lower = higher priority)
    // nice: 0,

    // Auto-restart on file changes (development only)
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads',
      'dist',
      '.git',
      '*.log'
    ],

    // Advanced PM2 Features

    // Exponential backoff restart delay
    exp_backoff_restart_delay: 100,

    // Cron restart (useful for memory leaks or daily restarts)
    // cron_restart: '0 3 * * *', // Restart every day at 3 AM

    // Force restart if app crashes this many times in 1 minute
    max_restarts_within_min: 5,

    // Health check (requires PM2 Plus)
    // health: {
    //   endpoint: 'http://localhost:5000/health',
    //   interval: 30000,
    //   timeout: 5000
    // },

    // Monitoring (requires PM2 Plus)
    // pmx: true,

    // Instance variables (accessible via process.env.PM2_INSTANCE_ID)
    instance_var: 'INSTANCE_ID',

    // Post-deploy scripts
    // Will run after deployment
    // post_update: ['npm install', 'npm run build'],

    // Environment file loading
    // PM2 will automatically load .env file if present
    // Or specify path:
    // env_file: '.env',
  }],

  // Deployment Configuration (Optional - for PM2 Deploy)
  deploy: {
    production: {
      // SSH connection
      user: 'root',
      host: 'your-server-ip',
      ref: 'origin/main', // or 'origin/backend_auth'
      repo: 'https://github.com/EshaanManchanda/GEMA-Project.git',
      path: '/var/www/gema',

      // Post-deployment commands
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',

      // Environment variables for deployment
      env: {
        NODE_ENV: 'production'
      }
    },

    staging: {
      user: 'root',
      host: 'your-staging-server-ip',
      ref: 'origin/backend_auth',
      repo: 'https://github.com/EshaanManchanda/GEMA-Project.git',
      path: '/var/www/gema-staging',
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env development',
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};

/**
 * PM2 Commands Cheat Sheet:
 *
 * # Start application
 * pm2 start ecosystem.config.js --env production
 *
 * # Reload (zero-downtime restart)
 * pm2 reload gema-backend
 *
 * # Restart (with downtime)
 * pm2 restart gema-backend
 *
 * # Stop
 * pm2 stop gema-backend
 *
 * # Delete from PM2
 * pm2 delete gema-backend
 *
 * # View logs
 * pm2 logs gema-backend
 * pm2 logs gema-backend --lines 100
 * pm2 logs gema-backend --err
 * pm2 logs gema-backend --out
 *
 * # Monitor
 * pm2 monit
 *
 * # Status
 * pm2 status
 * pm2 info gema-backend
 *
 * # Save current process list
 * pm2 save
 *
 * # Startup script (run once after installation)
 * pm2 startup
 * # Then run the command it outputs
 *
 * # Update PM2
 * pm2 update
 *
 * # Install log rotation
 * pm2 install pm2-logrotate
 * pm2 set pm2-logrotate:max_size 10M
 * pm2 set pm2-logrotate:retain 10
 * pm2 set pm2-logrotate:compress true
 *
 * # Deployment (if using PM2 Deploy)
 * pm2 deploy ecosystem.config.js production setup
 * pm2 deploy ecosystem.config.js production
 * pm2 deploy ecosystem.config.js production update
 */
