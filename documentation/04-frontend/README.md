# Frontend Documentation

## 🎨 React Frontend Application

Modern React 18 frontend application with TypeScript, Redux state management, and responsive design. Built for optimal performance and user experience across all device types.

---

## 📑 Section Contents

### [🧩 Component Architecture](./component-architecture.md)
React component structure and design patterns:
- Component organization and hierarchy
- Props and state management patterns
- Custom hooks and context providers
- Component testing strategies

### [🎭 Assets & Animations](./assets-and-animations.md)
Media handling and animation implementation:
- Static asset management and optimization
- Lottie animations and micro-interactions
- Image loading and optimization
- Animation performance considerations

### [🔄 State Management](./state-management.md)
Redux Toolkit implementation and patterns:
- Store configuration and middleware
- Slice definitions and actions
- Selectors and derived state
- Async operations with RTK Query

---

## 🌟 Frontend Features

### 🎯 **Modern React Architecture**
- **React 18**: Latest features including concurrent rendering and automatic batching
- **TypeScript**: Full type safety with comprehensive interfaces and generics
- **Redux Toolkit**: Modern Redux with RTK Query for server state management
- **React Router**: Client-side routing with protected routes and lazy loading
- **React Hook Form**: Performant forms with validation and error handling

### 🎨 **Design & User Experience**
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Responsive Design**: Mobile-first approach with breakpoint-specific layouts
- **Dark/Light Theme**: User preference-based theme switching
- **Accessibility**: WCAG 2.1 compliant with keyboard navigation support
- **Internationalization**: Multi-language support (English/Arabic) with RTL layouts

### ⚡ **Performance Optimization**
- **Code Splitting**: React.lazy() and dynamic imports for optimal loading
- **Bundle Optimization**: Webpack optimization with tree shaking
- **Image Optimization**: Lazy loading and responsive images
- **Caching Strategy**: Service worker implementation for offline capability
- **Memory Management**: Proper cleanup and leak prevention

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ and npm
- **Backend API** running on port 5000

### Installation & Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.local

# Configure environment variables
# Edit .env.local with your settings

# Start development server
npm run dev
```

### Environment Configuration
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000

# App Configuration
REACT_APP_APP_NAME=Gema Event Management
REACT_APP_VERSION=1.0.0
REACT_APP_ENV=development

# Firebase Configuration (Optional)
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id

# Feature Flags
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_ANALYTICS=true
```

---

## 🏗️ Application Architecture

### Component Structure
```
src/
├── components/           # Reusable UI components
│   ├── admin/           # Admin-specific components
│   │   ├── UserManagement.tsx
│   │   ├── EventModeration.tsx
│   │   └── RevenueReports.tsx
│   ├── auth/            # Authentication components
│   │   ├── ProtectedRoute.tsx
│   │   ├── AdminRoute.tsx
│   │   └── VendorRoute.tsx
│   ├── client/          # Customer-facing components
│   │   ├── EventCard.tsx
│   │   ├── CategoryCarousel.tsx
│   │   └── FilterSidebar.tsx
│   ├── common/          # Shared components
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ScrollToTop.tsx
│   └── layout/          # Layout components
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Sidebar.tsx
├── pages/               # Route-level components
│   ├── HomePage.tsx
│   ├── EventsPage.tsx
│   ├── admin/           # Admin pages
│   ├── auth/            # Auth pages
│   └── dashboard/       # User dashboard
├── store/               # Redux store
│   ├── index.ts         # Store configuration
│   └── slices/          # Feature slices
├── services/            # API services
│   ├── api.ts           # Base API configuration
│   └── api/             # Feature-specific APIs
├── hooks/               # Custom React hooks
├── contexts/            # React contexts
├── utils/               # Utility functions
└── types/               # TypeScript definitions
```

### State Management Architecture
```
Redux Store
├── Auth Slice           # Authentication state
├── Events Slice         # Events data and filters
├── Bookings Slice       # User bookings
├── Cart Slice           # Shopping cart
├── Admin Slice          # Admin interface state
├── UI Slice             # Global UI state
└── Notifications Slice  # Real-time notifications
```

---

## 🎨 Design System

### Theme Configuration
```typescript
// Tailwind CSS theme extension
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          50: '#f8fafc',
          500: '#64748b',
          600: '#475569',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Noto Sans Arabic', 'Arial', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    }
  }
}
```

### Component Variants
```typescript
// Button component with variants
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ 
  variant, 
  size, 
  loading, 
  disabled, 
  children, 
  onClick 
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
};
```

---

## 🔄 State Management

### Redux Store Configuration
```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authSlice from './slices/authSlice';
import eventsSlice from './slices/eventsSlice';
import bookingsSlice from './slices/bookingsSlice';
import cartSlice from './slices/cartSlice';
import uiSlice from './slices/uiSlice';
import { apiSlice } from './api/apiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    events: eventsSlice,
    bookings: bookingsSlice,
    cart: cartSlice,
    ui: uiSlice,
    api: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(apiSlice.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Slice Example
```typescript
// store/slices/eventsSlice.ts
interface EventsState {
  events: Event[];
  currentEvent: Event | null;
  filters: EventFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setEvents: (state, action) => {
      state.events = action.payload;
    },
    setCurrentEvent: (state, action) => {
      state.currentEvent = action.payload;
    },
    updateFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.events;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
      });
  },
});

export const { setEvents, setCurrentEvent, updateFilters, setLoading } = eventsSlice.actions;
export default eventsSlice.reducer;

// Selectors
export const selectEvents = (state: RootState) => state.events.events;
export const selectCurrentEvent = (state: RootState) => state.events.currentEvent;
export const selectEventsLoading = (state: RootState) => state.events.loading;
export const selectEventsFilters = (state: RootState) => state.events.filters;
```

---

## 🌐 Internationalization

### i18n Configuration
```typescript
// i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false,
    },
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

### Translation Usage
```typescript
// Component with translations
import { useTranslation } from 'react-i18next';

const EventCard: React.FC<{ event: Event }> = ({ event }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <div className={`card ${isRTL ? 'rtl' : 'ltr'}`}>
      <h3>{event.title}</h3>
      <p>{t('events.price')}: {event.price} {t('common.currency.aed')}</p>
      <button>{t('events.actions.book_now')}</button>
    </div>
  );
};
```

---

## 📱 Responsive Design

### Breakpoint System
```typescript
// Tailwind CSS breakpoints
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large
};

// Responsive component example
const ResponsiveGrid: React.FC = ({ children }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {children}
    </div>
  );
};
```

### Mobile-First Approach
```css
/* Base styles - Mobile first */
.event-card {
  @apply p-4 rounded-lg shadow-sm;
}

/* Tablet styles */
@media (min-width: 768px) {
  .event-card {
    @apply p-6 shadow-md;
  }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .event-card {
    @apply p-8 shadow-lg hover:shadow-xl transition-shadow;
  }
}
```

---

## ⚡ Performance Optimization

### Code Splitting
```typescript
// Route-based code splitting
import { lazy, Suspense } from 'react';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy load admin components
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboardPage'));
const UserManagement = lazy(() => import('./components/admin/UserManagement'));
const EventModeration = lazy(() => import('./components/admin/EventModeration'));

// App routing with suspense
const AppRoutes = () => (
  <Router>
    <Routes>
      <Route path="/admin" element={
        <Suspense fallback={<LoadingSpinner />}>
          <AdminDashboard />
        </Suspense>
      } />
      {/* Other routes */}
    </Routes>
  </Router>
);
```

### Image Optimization
```typescript
// Optimized image component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  width, 
  height, 
  className 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
      />
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400">Image unavailable</span>
        </div>
      )}
    </div>
  );
};
```

---

## 🧪 Testing Strategy

### Component Testing
```typescript
// EventCard component test
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import EventCard from '../EventCard';
import { store } from '../../store';

const mockEvent = {
  id: '1',
  title: 'Test Event',
  price: 100,
  category: 'Entertainment'
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('EventCard', () => {
  test('displays event information correctly', () => {
    renderWithProviders(<EventCard event={mockEvent} />);
    
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
  });

  test('handles booking button click', () => {
    const onBook = jest.fn();
    renderWithProviders(<EventCard event={mockEvent} onBook={onBook} />);
    
    fireEvent.click(screen.getByText('Book Now'));
    expect(onBook).toHaveBeenCalledWith(mockEvent.id);
  });
});
```

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| **Component Details** | [Component Architecture](./component-architecture.md) |
| **Media & Animations** | [Assets & Animations](./assets-and-animations.md) |
| **State Patterns** | [State Management](./state-management.md) |
| **Backend Integration** | [Backend Documentation](../03-backend/) |
| **Deployment Setup** | [Deployment Guide](../07-deployment/) |

---

**Frontend Status**: ✅ **Production Ready**

The frontend application is fully optimized for production with comprehensive testing, performance optimization, and responsive design. It provides an excellent user experience across all devices and platforms.