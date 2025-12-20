/**
 * Query key factory for TanStack Query
 * Centralized query key management ensures consistency and type safety
 *
 * Pattern: [resource, operation, ...filters]
 * Examples:
 * - ['events'] - all events cache
 * - ['events', 'list'] - list queries
 * - ['events', 'list', { category: 'sports' }] - filtered list
 * - ['events', 'detail', '123'] - single event
 */

// Events query keys
export const eventsKeys = {
  all: ['events'] as const,
  lists: () => [...eventsKeys.all, 'list'] as const,
  list: (filters?: any) => [...eventsKeys.lists(), filters || {}] as const,
  details: () => [...eventsKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventsKeys.details(), id] as const,
  featured: () => [...eventsKeys.all, 'featured'] as const,
  popular: () => [...eventsKeys.all, 'popular'] as const,
  upcoming: () => [...eventsKeys.all, 'upcoming'] as const,
  byCategory: (categoryId: string) => [...eventsKeys.all, 'category', categoryId] as const,
  byVendor: (vendorId: string) => [...eventsKeys.all, 'vendor', vendorId] as const,
  search: (query: string, filters?: any) => [...eventsKeys.all, 'search', query, filters || {}] as const,
};

// Categories query keys
export const categoriesKeys = {
  all: ['categories'] as const,
  lists: () => [...categoriesKeys.all, 'list'] as const,
  list: (filters?: any) => [...categoriesKeys.lists(), filters || {}] as const,
  details: () => [...categoriesKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoriesKeys.details(), id] as const,
};

// Collections query keys
export const collectionsKeys = {
  all: ['collections'] as const,
  lists: () => [...collectionsKeys.all, 'list'] as const,
  list: (filters?: any) => [...collectionsKeys.lists(), filters || {}] as const,
  details: () => [...collectionsKeys.all, 'detail'] as const,
  detail: (id: string) => [...collectionsKeys.details(), id] as const,
};

// Vendors query keys
export const vendorsKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorsKeys.all, 'list'] as const,
  list: (filters?: any) => [...vendorsKeys.lists(), filters || {}] as const,
  details: () => [...vendorsKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorsKeys.details(), id] as const,
};

// Bookings query keys
export const bookingsKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingsKeys.all, 'list'] as const,
  list: (filters?: any) => [...bookingsKeys.lists(), filters || {}] as const,
  details: () => [...bookingsKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingsKeys.details(), id] as const,
  userBookings: (userId: string) => [...bookingsKeys.all, 'user', userId] as const,
};

// Orders query keys
export const ordersKeys = {
  all: ['orders'] as const,
  lists: () => [...ordersKeys.all, 'list'] as const,
  list: (filters?: any) => [...ordersKeys.lists(), filters || {}] as const,
  details: () => [...ordersKeys.all, 'detail'] as const,
  detail: (id: string) => [...ordersKeys.details(), id] as const,
  userOrders: (userId: string) => [...ordersKeys.all, 'user', userId] as const,
};

// Admin query keys
export const adminKeys = {
  all: ['admin'] as const,

  // Admin events
  events: {
    all: () => [...adminKeys.all, 'events'] as const,
    lists: () => [...adminKeys.events.all(), 'list'] as const,
    list: (filters?: any) => [...adminKeys.events.lists(), filters || {}] as const,
    pending: () => [...adminKeys.events.all(), 'pending'] as const,
  },

  // Admin users
  users: {
    all: () => [...adminKeys.all, 'users'] as const,
    lists: () => [...adminKeys.users.all(), 'list'] as const,
    list: (filters?: any) => [...adminKeys.users.lists(), filters || {}] as const,
    detail: (id: string) => [...adminKeys.users.all(), 'detail', id] as const,
  },

  // Admin vendors
  vendors: {
    all: () => [...adminKeys.all, 'vendors'] as const,
    lists: () => [...adminKeys.vendors.all(), 'list'] as const,
    list: (filters?: any) => [...adminKeys.vendors.lists(), filters || {}] as const,
    pending: () => [...adminKeys.vendors.all(), 'pending'] as const,
  },

  // Admin analytics
  analytics: {
    all: () => [...adminKeys.all, 'analytics'] as const,
    dashboard: () => [...adminKeys.analytics.all(), 'dashboard'] as const,
    revenue: (dateRange?: any) => [...adminKeys.analytics.all(), 'revenue', dateRange || {}] as const,
    events: (dateRange?: any) => [...adminKeys.analytics.all(), 'events', dateRange || {}] as const,
    users: (dateRange?: any) => [...adminKeys.analytics.all(), 'users', dateRange || {}] as const,
  },

  // Admin orders
  orders: {
    all: () => [...adminKeys.all, 'orders'] as const,
    lists: () => [...adminKeys.orders.all(), 'list'] as const,
    list: (filters?: any) => [...adminKeys.orders.lists(), filters || {}] as const,
  },

  // Admin payouts
  payouts: {
    all: () => [...adminKeys.all, 'payouts'] as const,
    lists: () => [...adminKeys.payouts.all(), 'list'] as const,
    list: (filters?: any) => [...adminKeys.payouts.lists(), filters || {}] as const,
  },
};

// Vendor query keys
export const vendorKeys = {
  all: ['vendor'] as const,

  // Vendor events
  events: {
    all: () => [...vendorKeys.all, 'events'] as const,
    lists: () => [...vendorKeys.events.all(), 'list'] as const,
    list: (filters?: any) => [...vendorKeys.events.lists(), filters || {}] as const,
    detail: (id: string) => [...vendorKeys.events.all(), 'detail', id] as const,
  },

  // Vendor bookings
  bookings: {
    all: () => [...vendorKeys.all, 'bookings'] as const,
    lists: () => [...vendorKeys.bookings.all(), 'list'] as const,
    list: (filters?: any) => [...vendorKeys.bookings.lists(), filters || {}] as const,
    detail: (id: string) => [...vendorKeys.bookings.all(), 'detail', id] as const,
  },

  // Vendor analytics
  analytics: {
    all: () => [...vendorKeys.all, 'analytics'] as const,
    dashboard: () => [...vendorKeys.analytics.all(), 'dashboard'] as const,
    revenue: (dateRange?: any) => [...vendorKeys.analytics.all(), 'revenue', dateRange || {}] as const,
  },

  // Vendor payouts
  payouts: {
    all: () => [...vendorKeys.all, 'payouts'] as const,
    lists: () => [...vendorKeys.payouts.all(), 'list'] as const,
    list: (filters?: any) => [...vendorKeys.payouts.lists(), filters || {}] as const,
  },
};

// User query keys
export const userKeys = {
  all: ['user'] as const,
  profile: (id: string) => [...userKeys.all, 'profile', id] as const,
  favorites: (userId: string) => [...userKeys.all, 'favorites', userId] as const,
  reviews: (userId: string) => [...userKeys.all, 'reviews', userId] as const,
  tickets: (userId: string) => [...userKeys.all, 'tickets', userId] as const,
  registrations: (userId: string) => [...userKeys.all, 'registrations', userId] as const,
};
