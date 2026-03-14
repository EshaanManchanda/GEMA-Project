# GEMA - Event Management Platform

A comprehensive, full-stack event management platform for creating, managing, and attending events. Built with React, TypeScript, Node.js, Express, and MongoDB.

## Features

- **Event Management**: Create, edit, and manage events with rich media support
- **Ticketing System**: Flexible ticket types, pricing, and sales management
- **User Management**: Role-based access control (Admin, Vendor, Customer)
- **Payment Processing**: Integrated Stripe payment gateway
- **Blog & CMS**: Full-featured blog system with categories and comments
- **Coupon System**: Flexible discount codes and promotional campaigns
- **Real-time Updates**: WebSocket-based live notifications
- **Multi-currency Support**: AED, INR, USD, EUR, GBP
- **Media Management**: Cloudinary integration for image/video uploads
- **Analytics Dashboard**: Comprehensive revenue and performance metrics
- **Commission Management**: Configurable revenue sharing for vendors
- **Email Notifications**: Automated email system for bookings and updates

## Project Structure

```
gema/
├── backend/          # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── models/       # MongoDB models
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth, security, etc.
│   │   ├── config/       # Configuration files
│   │   ├── utils/        # Helper functions
│   │   └── server.ts     # Entry point
│   └── README.md
│
├── frontend/         # React/TypeScript SPA
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API services
│   │   ├── hooks/        # Custom hooks
│   │   └── App.tsx       # Main app component
│   └── README.md
│
└── README.md         # This file
```

## Quick Start

### Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x (local or MongoDB Atlas)
- npm or yarn
- Cloudinary account (for media uploads)
- Stripe account (for payments)
- Firebase project (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gema
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install

   # Copy environment variables
   cp .env.example .env

   # Edit .env with your credentials
   # See backend/README.md and doc/README.md for detailed configuration

   # Start development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install

   # Copy environment variables
   cp .env.example .env

   # Edit .env with your backend URL

   # Start development server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001
   - API Docs: http://localhost:5001/api-docs (if configured)

## Environment Variables

### Backend (.env)

Key variables (see `backend/.env.example` for complete list):

```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/gema
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=http://localhost:5173
ADDITIONAL_ALLOWED_ORIGINS=

# Payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Media
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."
FIREBASE_CLIENT_EMAIL=your-service-account@...
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:5001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Development

### Backend Commands

```bash
cd backend

npm run dev          # Start dev server with nodemon
npm run build        # Build TypeScript to dist/
npm run start        # Run production build
npm run test         # Run tests
npm run lint         # Run ESLint
npm run seed         # Seed database with sample data
```

### Frontend Commands

```bash
cd frontend

npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

## Testing

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npm test
```

## Deployment

### Backend Deployment (Render/Railway/Heroku)

1. Set environment variables in your hosting platform
2. Ensure `NODE_ENV=production`
3. Configure production MongoDB URI (MongoDB Atlas recommended)
4. Set up Cloudinary for media storage
5. Configure Stripe webhooks for your domain
6. Deploy from `main` branch

### Frontend Deployment (Vercel/Netlify)

1. Connect your git repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables:
   - `VITE_API_BASE_URL` = your backend URL
   - `VITE_STRIPE_PUBLISHABLE_KEY` = your Stripe key
5. Deploy

## API Documentation

The backend exposes a RESTful API. Key endpoints:

- `/api/auth/*` - Authentication (login, register, refresh)
- `/api/events/*` - Event management
- `/api/tickets/*` - Ticket operations
- `/api/orders/*` - Order management
- `/api/users/*` - User management
- `/api/blog/*` - Blog posts and comments
- `/api/coupons/*` - Coupon management
- `/api/admin/*` - Admin operations

See `doc/api/api-reference.md` for complete API documentation.

## Architecture

### Backend Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + Firebase Auth
- **File Upload**: Cloudinary
- **Payment**: Stripe
- **Caching**: Redis (optional)
- **Email**: NodeMailer

### Frontend Stack
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Context API + React Query
- **Forms**: React Hook Form
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **UI Components**: Custom + Headless UI

## Security Features

- Helmet.js for HTTP security headers
- CORS configuration
- Rate limiting
- MongoDB injection prevention
- XSS protection
- HPP (HTTP Parameter Pollution) protection
- JWT token-based authentication
- Environment-based CORS origins
- Secure password hashing with bcrypt

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Known Issues

### TypeScript Errors
There are currently 60+ TypeScript type errors in the frontend that need to be addressed:
- Unused imports in various component files
- Type mismatches in form components (BlogForm, CouponForm)
- Badge variant type issues
- Date type handling in forms
- Table column type definitions

These errors do not prevent the application from running but should be fixed for production. See `doc/troubleshooting/TYPESCRIPT_ERRORS.md` for details.

### Security Notes
⚠️ **IMPORTANT**: Before deploying to production:
1. Rotate any credentials that may have been exposed in git history
2. Ensure all environment variables are properly configured
3. Review CORS settings for production domains
4. Enable HTTPS in production
5. Configure proper CSP headers
6. Set up monitoring and logging

## License

[Your License Here]

## Support

For support, email [your-email] or open an issue in the GitHub repository.

## Authors

[Your Name/Team]

---

**Note**: This project is under active development. Some features may be incomplete or subject to change.
