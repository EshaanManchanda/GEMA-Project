# Gema - Event Management Platform Frontend

A modern React frontend application built with Vite, TypeScript, and Tailwind CSS for event management and booking.

## 🚀 Vercel Deployment

This application is optimized for deployment on Vercel with production-ready configurations.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/gema-frontend)

### Manual Deployment Steps

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Build and Deploy**
   ```bash
   npm run vercel:build
   npm run vercel:deploy
   ```

3. **Preview Deployment**
   ```bash
   npm run vercel:preview
   ```

## 🔧 Environment Configuration

### Required Environment Variables

Set these in your Vercel dashboard under Settings → Environment Variables:

```env
# API Configuration
VITE_API_BASE_URL=https://your-backend-api.com/api

# Payment Services
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key

# Map Services
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# File Upload
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Firebase (for push notifications)
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Analytics
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Environment Files

- `.env` - Development environment
- `.env.local` - Local overrides (gitignored)
- `.env.production` - Production defaults
- `.env.example` - Template for all variables

## 📦 Build & Development

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Type Checking & Linting
```bash
npm run type-check
npm run lint
npm run lint:fix
```

### Testing
```bash
npm test
npm run test:coverage
```

## 🏗️ Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── services/      # API services
├── store/         # Redux store
├── types/         # TypeScript types
├── utils/         # Utility functions
├── assets/        # Static assets
└── styles/        # Global styles
```

## 🔧 Technology Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Yup
- **Routing**: React Router DOM
- **PWA**: Vite PWA Plugin
- **Testing**: Jest + Testing Library

## 🌐 Features

- ✅ Progressive Web App (PWA)
- ✅ Server-Side Rendering (SSR) ready
- ✅ TypeScript support
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Multi-language support
- ✅ Payment integration (Stripe)
- ✅ Map integration (Google Maps/Mapbox)
- ✅ Push notifications
- ✅ Image optimization
- ✅ SEO optimized

## 🔒 Security Features

- Content Security Policy (CSP)
- XSS Protection
- HTTPS enforcement
- Secure cookies
- Input validation
- Rate limiting

## 📊 Performance Optimizations

- Code splitting with dynamic imports
- Image lazy loading
- Service worker caching
- Bundle size optimization
- Tree shaking
- Minification

## 🐛 Debugging

### Build Issues
```bash
# Clean build
npm run clean
npm run build

# Analyze bundle
npm run build:analyze
```

### Vercel Deployment Issues
```bash
# Check deployment logs
vercel logs

# Test production build locally
npm run build
npm run preview
```

## 📈 Monitoring

- Build status via Vercel dashboard
- Performance monitoring
- Error tracking
- Analytics integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit changes
7. Push to branch
8. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

---

**Need Help?**
- Check [Vercel Documentation](https://vercel.com/docs)
- Review [Vite Documentation](https://vitejs.dev/)
- Open an issue for support