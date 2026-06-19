# Gema Backend API

A comprehensive event management platform backend built with Node.js, Express, MongoDB, and Firebase Authentication.

## 🚀 Quick Start

Get up and running in 5 minutes:

```bash
git clone <repository-url>
cd gema/backend
npm install
cp .env.example .env
# Configure your .env file (see ../doc/README.md for details)
npm run db:seed
npm run dev
```

**API will be available at:** `http://localhost:5000`

**First test:** `curl http://localhost:5000/api`

📖 **For detailed setup instructions, see [Master Documentation Index](../doc/README.md)**

## ✨ Key Features

### Authentication & Security
- 🔐 **Dual Authentication**: JWT tokens + Firebase integration  
- 🔑 **Google Sign-In**: Sign up / sign in with Google via Firebase — role-aware, hardened
- 👥 **Role-Based Access**: Customer, Vendor, Teacher, Admin, Employee roles
- 🛡️ **Security Hardened**: Rate limiting, CORS, helmet, input validation
- 🔄 **Token Management**: Access tokens with refresh token rotation

### Core Functionality
- 🎫 **Event Management**: Creation, approval workflow, scheduling
- 🏢 **Multi-tenant**: Vendor management with isolated data
- 💳 **Payment Integration**: Stripe payment processing
- 📱 **QR Code System**: Digital tickets with check-in functionality
- ⭐ **Review System**: Rating and review management
- 📊 **Analytics**: Comprehensive reporting and insights

### Technical Excellence
- 📝 **TypeScript**: Full type safety and modern JavaScript
- 🗄️ **MongoDB**: Scalable document database with Mongoose ODM
- ☁️ **Cloud Ready**: Optimized for Render.com deployment
- 📁 **File Management**: Cloudinary integration for media storage
- 📧 **Email Service**: Automated notifications and OTP verification

## 📋 Prerequisites

- **Node.js** v18+ and npm
- **MongoDB** (local or [MongoDB Atlas](https://cloud.mongodb.com/))
- **Firebase Project** ([Firebase Console](https://console.firebase.google.com/)) — required for Google sign-in and email auth

### Firebase Setup (Google Sign-In)

1. Go to [Firebase Console](https://console.firebase.google.com/) → your project → **Authentication** → **Sign-in method**
2. Enable the **Google** provider
3. Under **Settings** → **Authorized domains**, add `localhost` and your production domain
4. Go to **Project settings** → **Service accounts** → **Generate new private key** — download the JSON
5. Add these three values to your `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

> The frontend also needs `VITE_FIREBASE_*` vars from **Project settings** → **General** → **Web app config**.  
> See [Google Sign-In full guide](../doc/google-signup-plan.md) for all details and the verification checklist.

## 📚 Documentation

Detailed documentation has been consolidated into the root [`doc/`](../doc/README.md) folder.
| Document | Description |
|----------|-------------|
| [**Master Index**](../doc/README.md) | Master directory for all documentation |
| [**API Reference**](../doc/api/api-reference.md) | Detailed endpoint documentation |
| [**Auth Flow**](../doc/api/flow-auth.md) | Auth flows and security |
| [**Google Sign-In**](../doc/google-signup-plan.md) | Google / Firebase sign-up setup, security decisions, verification checklist |
| [**Deployment**](../doc/deployment/deployment-guide.md) | Production deployment guide |

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend    │    │   Database      │
│   (React)       │◄───│   (Express)  │◄───│   (MongoDB)     │
│                 │    │              │    │                 │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │                       
                       ┌──────────────┐              
                       │   Services   │              
                       │ • Firebase   │              
                       │ • Stripe     │              
                       │ • Cloudinary │              
                       │ • Nodemailer │              
                       └──────────────┘              
```

## 🚀 Deployment

### Quick Deploy to Render

1. **Fork this repository**
2. **Connect to Render**: [render.com](https://render.com)
3. **Configure environment variables** (see [deployment-guide.md](../doc/deployment/deployment-guide.md))
4. **Deploy!**

📖 **For detailed deployment instructions**: [../doc/deployment/deployment-guide.md](../doc/deployment/deployment-guide.md)

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm start           # Start production server
npm run db:seed     # Seed database with sample data
npm run lint        # Run ESLint
npm test           # Run tests
```

### Project Structure

```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Custom middleware
│   ├── models/        # Mongoose models
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── types/         # TypeScript definitions
│   └── utils/         # Helper functions
├── docs/              # Documentation
└── dist/             # Compiled JavaScript (production)
```

## 💡 Quick API Examples

### Test Your Setup
```bash
# Health check
curl http://localhost:5000/api

# Get event categories (no auth)  
curl http://localhost:5000/api/events/categories

# Browse events (no auth)
curl "http://localhost:5000/api/events?limit=3"
```

### Authentication Flow
```bash
# Register new user (email/password)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"SecurePass123!"}'

# Login (email/password)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Google sign-in/sign-up (exchange Firebase ID token for session cookies)
# idToken obtained from Firebase signInWithPopup on the frontend
curl -X POST http://localhost:5000/api/auth/firebase \
  -H "Content-Type: application/json" \
  -d '{"idToken":"FIREBASE_ID_TOKEN","role":"customer"}'
# role is optional — only used for NEW accounts. Accepted: customer | vendor | teacher

# Use token to access protected endpoint
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow development guidelines**: See [../doc/README.md](../doc/README.md)
4. **Run tests**: `npm test`
5. **Submit pull request**

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Need help?** Check out our consolidated [documentation folder](../doc/README.md).