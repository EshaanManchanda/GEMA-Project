# Node 22 to match package.json engines (">=20.0.0 <26.0.0") and CI (NODE_VERSION: '22')
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files + .npmrc (sets legacy-peer-deps=true, required because
# multer-storage-cloudinary@4 peer-depends on cloudinary@^1.21.0 while the
# root project uses cloudinary@^2.8.0 — without .npmrc, npm ci fails on this
# conflict here even though it succeeds outside Docker, since .npmrc lives at
# the repo root and was never part of the build context before)
COPY package*.json .npmrc ./

# Install dependencies
RUN npm ci --only=production

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN npm ci
RUN npm run build

# Production stage — was pinned to node:18-alpine (EOL, violates the
# ">=20.0.0 <26.0.0" engines range and CI's Node 22); now matches base/build.
FROM node:22-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files + .npmrc (sets legacy-peer-deps=true, required because
# multer-storage-cloudinary@4 peer-depends on cloudinary@^1.21.0 while the
# root project uses cloudinary@^2.8.0 — without .npmrc, npm ci fails on this
# conflict here even though it succeeds outside Docker, since .npmrc lives at
# the repo root and was never part of the build context before)
COPY package*.json .npmrc ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Create uploads directory and set permissions
RUN mkdir -p uploads && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# App defaults to PORT=5001 (src/config/env.ts) when PORT is unset — pin it
# to 5000 to match EXPOSE/HEALTHCHECK below and ecosystem.config.js's
# env_production.PORT, which is the port actually used in deployment.
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]