# Project Structure Overview

This document outlines the file structure and a high-level overview of key functions and classes within the `backend` and `frontend` directories of the project.

## Backend Structure (`e:/coding/gema/backend/`)

```
├── .env.example
├── .gitignore
├── README.md
├── package-lock.json
├── package.json
├── setup.bat
├── src\
│   ├── config\
│   │   ├── database.ts
│   │   ├── env.ts
│   │   ├── firebase.ts
│   │   ├── index.ts
│   │   ├── jwt.ts
│   │   └── logger.ts
│   ├── controllers\
│   │   └── auth.controller.ts
│   ├── middleware\
│   │   ├── auth.ts
│   │   ├── error.ts
│   │   ├── index.ts
│   │   └── validation.ts
│   ├── models\
│   │   ├── RefreshToken.ts
│   │   ├── Role.ts
│   │   ├── User.ts
│   │   └── index.ts
│   ├── routes\
│   │   ├── auth.routes.ts
│   │   └── index.ts
│   ├── scripts\
│   │   └── seed.ts
│   ├── server.ts
│   ├── types\
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── express.d.ts
│   │   └── index.ts
│   └── utils\
│       └── mailer.ts
└── tsconfig.json
```

### Backend Function Overview

-   **`auth.controller.ts`**:
    -   `formatUserResponse(user: IUser)`: Formats user data for API responses.
    -   `generateAuthTokens(userId: string, req: Request)`: Generates access and refresh tokens for a user.
    -   `register(req: Request, res: Response, next: NextFunction)`: Handles new user registration.
    -   `resendVerificationEmail(req: Request, res: Response, next: NextFunction)`: Resends email verification links.
    -   `login(req: Request, res: Response, next: NextFunction)`: Handles user login.

-   **`seed.ts`**:
    -   `seedRoles()`: Seeds default roles into the database.
    -   `seed()`: Main function to connect to DB and run all seeding operations.

-   **`jwt.ts`**:
    -   `parseExpiration(value: string)`: Parses JWT expiration values.
    -   `generateToken(payload: object)`: Generates a standard JWT token.
    -   `generateRefreshToken(payload: object)`: Generates a refresh token.
    -   `verifyToken(token: string)`: Verifies a standard JWT token.
    -   `verifyRefreshToken(token: string)`: Verifies a refresh token.

-   **`auth.ts` (middleware)**:
    -   `authenticate(req: Request, res: Response, next: NextFunction)`: Authenticates users using JWT.
    -   `authenticateFirebase(req: Request, res: Response, next: NextFunction)`: Authenticates users using Firebase ID tokens.
    -   `authorize(roles: string[])`: Middleware to check if a user has the required roles.

-   **`firebase.ts` (config)**:
    -   `initializeFirebase()`: Initializes the Firebase Admin SDK.
    -   `getAuth()`: Returns the Firebase Auth instance.

-   **`error.ts` (middleware)**:
    -   `errorHandler(err: any, req: Request, res: Response, next: NextFunction)`: Centralized error handling middleware.
    -   `notFound(req: Request, res: Response, next: NextFunction)`: Handles 404 Not Found errors.
    -   `AppError` (class): Custom error class for application-specific errors.

-   **`env.ts` (config)**:
    -   `config` (object): Contains all environment variables and configurations.
    -   `validateEnv()`: Validates required environment variables.

## Frontend Structure (`e:/coding/gema/frontend/`)

```
├── .env
├── .env.example
├── index.html
├── package-lock.json
├── package.json
├── postcss.config.js
├── public\
│   └── assets\
│       ├── animations\
│       │   ├── README.md
│       │   ├── loading.svg
│       │   └── success.json
│       └── characters.jpg
├── src\
│   ├── App.tsx
│   ├── components\
│   │   ├── animations\
│   │   │   ├── LottieAnimation.tsx
│   │   │   ├── MotionAnimations.tsx
│   │   │   ├── SpringAnimations.tsx
│   │   │   └── index.ts
│   │   ├── auth\
│   │   │   ├── AdminRoute.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── VendorRoute.tsx
│   │   ├── client\
│   │   │   ├── AgeSlider.tsx
│   │   │   ├── CategoryCarousel.tsx
│   │   │   ├── CollectionsCarousel.tsx
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventGridSection.tsx
│   │   │   ├── FilterSidebar.tsx
│   │   │   ├── NewsletterSubscribe.tsx
│   │   │   └── ReviewCarouselKeen.tsx
│   │   ├── common\
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ScrollToTop.tsx
│   │   └── layout\
│   │       └── Layout.tsx
│   ├── config\
│   │   └── firebase.ts
│   ├── contexts\
│   │   ├── AuthContext.tsx
│   │   ├── CartContext.tsx
│   │   ├── CurrencyContext.tsx
│   │   ├── LanguageContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks\
│   │   ├── useAuth.ts
│   │   └── useLanguage.ts
│   ├── i18n\
│   │   └── config.ts
│   ├── main.tsx
│   ├── pages\
│   │   ├── BookingPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CategoriesPage.tsx
│   │   ├── CategoryPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── EventDetailPage.tsx
│   │   ├── EventsPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── PaymentCancelPage.tsx
│   │   ├── PaymentSuccessPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── VendorPage.tsx
│   │   ├── VendorsPage.tsx
│   │   ├── admin\
│   │   │   ├── AdminAnalyticsPage.tsx
│   │   │   ├── AdminCategoriesPage.tsx
│   │   │   ├── AdminDashboardPage.tsx
│   │   │   ├── AdminEventsPage.tsx
│   │   │   ├── AdminOrdersPage.tsx
│   │   │   ├── AdminSettingsPage.tsx
│   │   │   └── AdminUsersPage.tsx
│   │   ├── auth\
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   └── VerifyEmailPage.tsx
│   │   ├── dashboard\
│   │   │   ├── BookingsPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── FavoritesPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── ReviewsPage.tsx
│   │   ├── error\
│   │   │   ├── NotFoundPage.tsx
│   │   │   └── ServerErrorPage.tsx
│   │   ├── static\
│   │   │   ├── AboutPage.tsx
│   │   │   ├── BlogPage.tsx
│   │   │   ├── ContactPage.tsx
│   │   │   ├── FAQPage.tsx
│   │   │   ├── HelpPage.tsx
│   │   │   ├── PrivacyPage.tsx
│   │   │   ├── TermsPage.tsx
│   │   │   └── index.ts
│   │   └── vendor\
│   │       ├── VendorAnalyticsPage.tsx
│   │       ├── VendorBookingsPage.tsx
│   │       ├── VendorCreateEventPage.tsx
│   │       ├── VendorDashboardPage.tsx
│   │       ├── VendorEditEventPage.tsx
│   │       ├── VendorEventsPage.tsx
│   │       └── VendorProfilePage.tsx
│   ├── services\
│   │   ├── api\
│   │   │   ├── adminAPI.ts
│   │   │   ├── authAPI.ts
│   │   │   ├── bookingAPI.ts
│   │   │   ├── categoriesAPI.ts
│   │   │   ├── eventsAPI.ts
│   │   │   ├── favoritesAPI.ts
│   │   │   ├── searchAPI.ts
│   │   │   └── vendorAPI.ts
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── eventsService.ts
│   │   └── firebaseAuth.ts
│   ├── store\
│   │   ├── hooks.ts
│   │   ├── index.ts
│   │   └── slices\
│   │       ├── adminSlice.ts
│   │       ├── authSlice.ts
│   │       ├── bookingsSlice.ts
│   │       ├── cartSlice.ts
│   │       ├── categoriesSlice.ts
│   │       ├── eventsSlice.ts
│   │       ├── favoritesSlice.ts
│   │       ├── searchSlice.ts
│   │       ├── uiSlice.ts
│   │       └── vendorSlice.ts
│   ├── styles\
│   │   └── index.css
│   └── types\
│       └── auth.ts
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

### Frontend Function Overview

-   **`eventsService.ts`**:
    -   `EventsService` (class): Provides methods for interacting with event-related APIs.

-   **`vendorSlice.ts`** (Redux slice):
    -   Numerous `selectVendor...` selectors for accessing vendor-related state (e.g., `selectVendorProfile`, `selectVendorEvents`, `selectVendorBookings`).
    -   `selectUnreadNotificationsCount`, `selectVendorEventById`, `selectVendorBookingById`, `selectVendorActiveEvents`, `selectVendorUpcomingEvents`, `selectVendorPendingBookings`, `selectVendorRecentBookings`, `selectVendorTotalRevenue`, `selectVendorIsVerified`, `selectVendorCanCreateEvents`, `selectVendorDashboardSummary`.

-   **`VendorProfilePage.tsx`**:
    -   `handleInputChange`: Handles input changes for form fields.
    -   `handleFileChange`: Handles file input changes for logo and cover images.
    -   `handleCancelEdit`: Handles canceling profile edits.
    -   `formatDate`: Formats date strings.

-   **`uiSlice.ts`** (Redux slice):
    -   Numerous `select...` selectors for UI state (e.g., `selectTheme`, `selectLanguage`, `selectSidebarOpen`, `selectIsMobile`).
    -   `selectActiveModal`, `selectModalById`, `selectUnreadNotifications`, `selectLoadingByKey`, `selectPreference`, `selectFeature`, `selectIsAnyModalOpen`, `selectIsAnyOverlayOpen`, `selectIsAnyLoading`, `selectCurrentBreakpoint`, `selectUIState`.

-   **`cartSlice.ts`** (Redux slice):
    -   `calculateItemTotal`: Calculates the total for a single cart item.
    -   `calculateCartSummary`: Calculates the summary of the entire cart.
    -   Numerous `selectCart...` selectors for cart state (e.g., `selectCartItems`, `selectCartSummary`, `selectCartTotal`).
    -   `selectCartItemsCount`, `selectCartSubtotal`, `selectIsItemInCart`, `selectCartItemById`, `selectCartItemsByEvent`, `selectCartCurrency`, `selectIsCartEmpty`, `selectCartValidation`.

-   **`authService.ts`**:
    -   `AuthService` (class): Provides methods for authentication-related operations.

-   **`adminAPI.ts`**:
    -   `API_URL` (constant): Defines the base URL for admin API requests.

-   **`bookingsSlice.ts`** (Redux slice):
    -   Numerous `selectBooking...` selectors for booking state (e.g., `selectBookings`, `selectCurrentBooking`, `selectBookingStats`).
    -   `selectBookingStep`, `selectBookingParticipants`, `selectCheckout`, `selectBookingFilters`, `selectBookingPagination`, `selectIsBookingLoading`, `selectIsCreatingBooking`, `selectIsUpdatingBooking`, `selectIsCancellingBooking`, `selectIsRefundingBooking`, `selectBookingError`, `selectBookingCreateError`, `selectBookingUpdateError`, `selectBookingById`, `selectUpcomingBookings`, `selectPastBookings`, `selectBookingsByStatus`, `selectCanProceedToNextStep`, `selectBookingFlowProgress`, `selectTotalBookingAmount`, `selectBookingParticipantsCount`, `selectIsBookingFlowComplete`.

-   **`favoritesSlice.ts`** (Redux slice):
    -   Numerous `selectFavorites...` selectors for favorites state (e.g., `selectFavorites`, `selectFavoritesLoading`, `selectFavoritesCount`).
    -   `selectIsFavorite`, `selectFavoriteById`, `selectFavoritesByCategory`, `selectFavoritesByVendor`, `selectRecentFavorites`, `selectFavoritesByPriceRange`, `selectFavoritesByLocation`, `selectFavoritesWithNotes`, `selectFavoriteEvents`, `selectFavoritesGroupedByCategory`, `selectFavoritesStats`.

-   **`categoriesSlice.ts`** (Redux slice):
    -   `updateInTree`: Updates a category within a tree structure.
    -   `removeFromTree`: Removes a category from a tree structure.
    -   Numerous `selectCategories...` selectors for categories state (e.g., `selectCategories`, `selectFeaturedCategories`, `selectCategoryTree`).
    -   `selectCategoriesOperations`, `selectCategoriesByParent`, `selectRootCategories`, `selectCategoryById`, `selectCategoryBySlug`.

-   **`adminSlice.ts`** (Redux slice):
    -   Numerous `selectAdmin...` selectors for admin state (e.g., `selectAdminStats`, `selectAdminUsers`, `selectAdminEvents`).
    -   `selectSelectedTimeRange`, `selectPendingVendorApplications`, `selectPendingEvents`, `selectAdminFilters`, `selectAdminPagination`, `selectIsAdminStatsLoading`, `selectIsAdminAnalyticsLoading`, `selectIsAdminUsersLoading`, `selectIsAdminVendorsLoading`, `selectIsAdminEventsLoading`, `selectIsAdminBookingsLoading`, `selectIsSystemSettingsLoading`, `selectAdminErrors`, `selectUnreadAdminNotificationsCount`, `selectAdminDashboardSummary`, `selectCriticalAdminNotifications`, `selectRecentAdminActivity`.

-   **`VendorEventsPage.tsx`**:
    -   `formatDate`: Formats date strings.
    -   `getStatusBadgeClass`: Returns CSS class for event status badges.

-   **`api.ts`**:
    -   `ApiService` (class): Provides a base for API interactions.

-   **`firebaseAuth.ts`**:
    -   `loginWithGoogle()`: Handles Google authentication.
    -   `loginWithEmail(email: string, password: string)`: Handles email/password authentication.
    -   `logoutFirebase()`: Handles Firebase logout.

-   **`hooks.ts`**:
    -   `useAppDispatch()`: Custom hook for Redux dispatch.

-   **`authSlice.ts`** (Redux slice):
    -   Numerous `selectAuth...` selectors for authentication state (e.g., `selectAuth`, `selectUser`, `selectIsAuthenticated`).
    -   `selectUserRole`, `selectIsAdmin`, `selectIsVendor`, `selectIsCustomer`.

-   **`eventsSlice.ts`** (Redux slice):
    -   Numerous `selectEvents...` selectors for events state (e.g., `selectEvents`, `selectFeaturedEvents`, `selectCurrentEvent`).
    -   `selectEventsPagination`, `selectEventsFilters`, `selectSearchQuery`, `selectViewMode`, `selectSortOptions`.

-   **`searchSlice.ts`** (Redux slice):
    -   Numerous `selectSearch...` selectors for search state (e.g., `selectCurrentQuery`, `selectSearchResults`, `selectIsSearching`).
    -   `selectHasActiveFilters`, `selectActiveFiltersCount`, `selectSearchResultsCount`, `selectSearchEvents`, `selectSearchFacets`, `selectSearchPagination`, `selectCanSearch`, `selectSearchSummary`.