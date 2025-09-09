# Quick Setup Guide

## ⚡ 5-Minute Setup

Get the Gema Event Management Platform running locally in just 5 minutes with this streamlined setup guide.

---

## 📋 **Prerequisites**

Before you begin, ensure you have the following installed:

- **Node.js** v18+ and npm (or yarn)
- **MongoDB** v5+ (local or Atlas cloud)
- **Git** for version control
- **VS Code** (recommended) with TypeScript extension

### Quick Verification
```bash
node --version    # Should show v18+
npm --version     # Should show 8+
git --version     # Any recent version
mongod --version  # Should show v5+ (if local)
```

---

## 🚀 **Quick Start**

### 1. Clone & Navigate
```bash
git clone <repository-url>
cd gema
```

### 2. Install Dependencies
```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Or install individually
cd backend && npm install
cd ../frontend && npm install
```

### 3. Environment Setup
```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment  
cp frontend/.env.example frontend/.env.local
```

### 4. Configure Database
```bash
# Option A: Local MongoDB
# Make sure MongoDB is running locally
mongod

# Option B: MongoDB Atlas (recommended)
# Update MONGODB_URI in backend/.env with your Atlas connection string
```

### 5. Start Development Servers
```bash
# Start both backend and frontend simultaneously
npm run dev

# Or start individually
cd backend && npm run dev    # Backend on :5000
cd frontend && npm run dev   # Frontend on :3000
```

### 6. Verify Installation
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/health
- **API Documentation**: http://localhost:5000/api-docs (if Swagger is configured)

---

## 🔧 **Environment Configuration**

### Backend Environment (`.env`)
```env
# Server Configuration
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/gema
# OR for Atlas: mongodb+srv://<username>:<password>@cluster.mongodb.net/gema

# Authentication
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d

# File Upload
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Payment Processing
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# External APIs
CURRENCY_API_KEY=your-currency-api-key
```

### Frontend Environment (`.env.local`)
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000

# App Configuration
REACT_APP_APP_NAME=Gema Event Management
REACT_APP_VERSION=1.0.0
REACT_APP_ENV=development

# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

# Firebase Configuration (Optional)
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id

# Feature Flags
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_PWA=true
```

---

## 🗄️ **Database Setup**

### Option 1: Local MongoDB
```bash
# Start MongoDB service
# Windows: 
net start MongoDB

# macOS:
brew services start mongodb/brew/mongodb-community

# Linux:
sudo systemctl start mongod

# Create database and collections
npm run db:setup
```

### Option 2: MongoDB Atlas (Recommended)
```bash
# 1. Create Atlas account at https://www.mongodb.com/atlas
# 2. Create a new cluster
# 3. Create database user
# 4. Whitelist IP addresses
# 5. Get connection string and update MONGODB_URI in .env
```

### Database Seeding (Optional)
```bash
# Seed with sample data
cd backend
npm run db:seed

# Reset and reseed database
npm run db:reset
```

---

## 🧪 **Development Commands**

### Backend Commands
```bash
cd backend

# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server

# Database
npm run db:seed     # Seed database with sample data  
npm run db:reset    # Reset and reseed database

# Quality
npm run lint        # Run ESLint
npm run test        # Run test suites
npm run type-check  # TypeScript type checking
```

### Frontend Commands
```bash
cd frontend

# Development
npm run dev         # Start development server
npm run build       # Create production build
npm run preview     # Preview production build

# Quality  
npm run lint        # Run ESLint
npm run test        # Run test suites
npm run type-check  # TypeScript type checking
npm run analyze     # Analyze bundle size
```

### Root Commands (run from project root)
```bash
# Development
npm run dev         # Start both backend and frontend
npm run build       # Build both applications
npm run start       # Start both in production mode

# Installation
npm run install:all # Install all dependencies
npm run clean       # Clean all node_modules and builds
npm run fresh       # Clean install everything
```

---

## 🔧 **Default Test Accounts**

After running database seed, you can use these test accounts:

### Admin Account
- **Email**: admin@gema.com
- **Password**: Admin123!
- **Role**: Administrator

### Vendor Account
- **Email**: vendor@example.com
- **Password**: Vendor123!
- **Role**: Vendor

### Customer Account
- **Email**: customer@example.com  
- **Password**: Customer123!
- **Role**: Customer

---

## 🚨 **Troubleshooting**

### Common Issues & Solutions

#### Port Already in Use
```bash
# Kill process on port 3000 or 5000
npx kill-port 3000
npx kill-port 5000

# Or use different ports
PORT=3001 npm run dev    # Frontend
PORT=5001 npm run dev    # Backend
```

#### MongoDB Connection Failed
```bash
# Check MongoDB service status
# Windows: services.msc (look for MongoDB)
# macOS/Linux: 
sudo systemctl status mongod

# Verify connection string
echo $MONGODB_URI
```

#### Module Not Found
```bash
# Clear cache and reinstall
npm run clean
npm run fresh
```

#### TypeScript Errors
```bash
# Check TypeScript configuration
npm run type-check

# Update TypeScript definitions
npm update @types/node @types/react
```

#### Build Failures
```bash
# Check for environment variables
cat .env

# Clean build directories
rm -rf dist/ build/ .next/
npm run build
```

---

## 🐳 **Docker Setup (Alternative)**

### Quick Docker Start
```bash
# Build and start all services
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f
```

### Docker Environment
```yaml
# docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:5
    ports:
      - "27017:27017"
    
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/gema
      
  frontend:
    build: ./frontend  
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000/api
```

---

## ✅ **Verification Checklist**

After setup, verify these endpoints work:

### Backend Verification
- [ ] **Health Check**: GET http://localhost:5000/api/health
- [ ] **Database**: MongoDB connection successful
- [ ] **Authentication**: POST http://localhost:5000/api/auth/register
- [ ] **File Upload**: Cloudinary configuration working

### Frontend Verification  
- [ ] **Home Page**: http://localhost:3000 loads
- [ ] **API Connection**: Data loads from backend
- [ ] **Authentication**: Login/register forms work
- [ ] **Responsive**: Mobile view renders correctly

### Integration Verification
- [ ] **End-to-End**: Register → Login → Browse Events
- [ ] **File Upload**: Image upload works
- [ ] **Payment**: Stripe test mode functional
- [ ] **Email**: Email notifications sent

---

## 🚀 **Next Steps**

After successful setup:

1. **Explore the Codebase**: Review [Project Structure](./project-structure.md)
2. **Understand the Database**: Check [Database Documentation](../02-database/)
3. **API Integration**: Review [Backend API Reference](../03-backend/api-reference.md)
4. **Component Architecture**: Study [Frontend Documentation](../04-frontend/)
5. **Admin Features**: Explore [Admin System](../05-admin-system/)

---

## 📞 **Need Help?**

### Development Support
- **Documentation**: Browse other sections in `/documentation`
- **Code Examples**: Check `/examples` folder
- **Issues**: Create GitHub issue with setup details

### Common Resources
- **MongoDB Atlas**: https://www.mongodb.com/atlas
- **Cloudinary**: https://cloudinary.com/
- **Stripe Testing**: https://stripe.com/docs/testing

---

**Setup Status**: ✅ **Ready for Development**

You now have a fully functional local development environment! Start building amazing features for the Gema Event Management Platform.