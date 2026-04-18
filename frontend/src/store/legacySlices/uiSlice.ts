import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Modal {
  id: string;
  type: 'auth' | 'booking' | 'confirmation' | 'image' | 'video' | 'form' | 'alert' | 'custom';
  title?: string;
  content?: any;
  props?: Record<string, any>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  backdrop?: boolean;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: {
    label: string;
    action: () => void;
  }[];
  createdAt: string;
}

export interface LoadingState {
  global: boolean;
  auth: boolean;
  events: boolean;
  booking: boolean;
  payment: boolean;
  upload: boolean;
  [key: string]: boolean;
}

interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'ar';
  currency: 'AED' | 'USD' | 'EUR' | 'GBP' | 'EGP' | 'CAD';
  direction: 'ltr' | 'rtl';
  
  // Layout and navigation
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  searchOpen: boolean;
  filtersOpen: boolean;
  
  // Modals
  modals: Modal[];
  
  // Notifications
  notifications: Notification[];
  
  // Loading states
  loading: LoadingState;
  
  // Page states
  pageTitle: string;
  breadcrumbs: {
    label: string;
    href?: string;
  }[];
  
  // Scroll and viewport
  scrollPosition: number;
  viewportSize: {
    width: number;
    height: number;
  };
  isMobile: boolean;
  isTablet: boolean;
  
  // User preferences
  preferences: {
    animations: boolean;
    soundEffects: boolean;
    notifications: boolean;
    autoplay: boolean;
    reducedMotion: boolean;
  };
  
  // Error states
  globalError: string | null;
  networkStatus: 'online' | 'offline';
  
  // Feature flags
  features: {
    [key: string]: boolean;
  };
}

const initialState: UIState = {
  theme: 'light',
  language: 'en',
  currency: 'AED',
  direction: 'ltr',
  
  sidebarOpen: false,
  mobileMenuOpen: false,
  searchOpen: false,
  filtersOpen: false,
  
  modals: [],
  notifications: [],
  
  loading: {
    global: false,
    auth: false,
    events: false,
    booking: false,
    payment: false,
    upload: false,
  },
  
  pageTitle: '',
  breadcrumbs: [],
  
  scrollPosition: 0,
  viewportSize: {
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  },
  isMobile: false,
  isTablet: false,
  
  preferences: {
    animations: true,
    soundEffects: false,
    notifications: true,
    autoplay: false,
    reducedMotion: false,
  },
  
  globalError: null,
  networkStatus: 'online',
  
  features: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme and appearance
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
    },
    
    setLanguage: (state, action: PayloadAction<'en' | 'ar'>) => {
      state.language = action.payload;
      state.direction = action.payload === 'ar' ? 'rtl' : 'ltr';
    },
    
    setCurrency: (state, action: PayloadAction<string>) => {
      state.currency = action.payload as any;
    },
    
    // Layout and navigation
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    
    toggleSearch: (state) => {
      state.searchOpen = !state.searchOpen;
    },
    
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload;
    },
    
    toggleFilters: (state) => {
      state.filtersOpen = !state.filtersOpen;
    },
    
    setFiltersOpen: (state, action: PayloadAction<boolean>) => {
      state.filtersOpen = action.payload;
    },
    
    // Modals
    openModal: (state, action: PayloadAction<Omit<Modal, 'id'>>) => {
      const modal: Modal = {
        id: `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...action.payload,
      };
      state.modals.push(modal);
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter(modal => modal.id !== action.payload);
    },
    
    closeAllModals: (state) => {
      state.modals = [];
    },
    
    updateModal: (state, action: PayloadAction<{ id: string; updates: Partial<Modal> }>) => {
      const { id, updates } = action.payload;
      const modalIndex = state.modals.findIndex(modal => modal.id === id);
      if (modalIndex !== -1) {
        state.modals[modalIndex] = { ...state.modals[modalIndex], ...updates };
      }
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'createdAt'>>) => {
      const notification: Notification = {
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        duration: 5000,
        ...action.payload,
      };
      state.notifications.unshift(notification);
      
      // Limit to 10 notifications
      if (state.notifications.length > 10) {
        state.notifications = state.notifications.slice(0, 10);
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(notification => notification.id !== action.payload);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        // Add read property if needed
      }
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<{ key: keyof LoadingState; value: boolean }>) => {
      const { key, value } = action.payload;
      state.loading[key] = value;
    },
    
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    
    // Page states
    setPageTitle: (state, action: PayloadAction<string>) => {
      state.pageTitle = action.payload;
    },
    
    setBreadcrumbs: (state, action: PayloadAction<{ label: string; href?: string }[]>) => {
      state.breadcrumbs = action.payload;
    },
    
    addBreadcrumb: (state, action: PayloadAction<{ label: string; href?: string }>) => {
      state.breadcrumbs.push(action.payload);
    },
    
    // Scroll and viewport
    setScrollPosition: (state, action: PayloadAction<number>) => {
      state.scrollPosition = action.payload;
    },
    
    setViewportSize: (state, action: PayloadAction<{ width: number; height: number }>) => {
      state.viewportSize = action.payload;
      state.isMobile = action.payload.width < 768;
      state.isTablet = action.payload.width >= 768 && action.payload.width < 1024;
    },
    
    // User preferences
    updatePreferences: (state, action: PayloadAction<Partial<UIState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    
    togglePreference: (state, action: PayloadAction<keyof UIState['preferences']>) => {
      const key = action.payload;
      state.preferences[key] = !state.preferences[key];
    },
    
    // Error states
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.globalError = action.payload;
    },
    
    clearGlobalError: (state) => {
      state.globalError = null;
    },
    
    setNetworkStatus: (state, action: PayloadAction<'online' | 'offline'>) => {
      state.networkStatus = action.payload;
    },
    
    // Feature flags
    setFeature: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      const { key, value } = action.payload;
      state.features[key] = value;
    },
    
    setFeatures: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.features = { ...state.features, ...action.payload };
    },
    
    // Utility actions
    resetUI: (state) => {
      // Reset to initial state but preserve user preferences
      const { preferences, theme, language, currency } = state;
      Object.assign(state, initialState, {
        preferences,
        theme,
        language,
        currency,
        direction: language === 'ar' ? 'rtl' : 'ltr',
      });
    },
    
    closeAllOverlays: (state) => {
      state.sidebarOpen = false;
      state.mobileMenuOpen = false;
      state.searchOpen = false;
      state.filtersOpen = false;
      state.modals = [];
    },
  },
});

export const {
  // Theme and appearance
  setTheme,
  setLanguage,
  setCurrency,
  
  // Layout and navigation
  toggleSidebar,
  setSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  toggleSearch,
  setSearchOpen,
  toggleFilters,
  setFiltersOpen,
  
  // Modals
  openModal,
  closeModal,
  closeAllModals,
  updateModal,
  
  // Notifications
  addNotification,
  removeNotification,
  clearNotifications,
  markNotificationAsRead,
  
  // Loading states
  setLoading,
  setGlobalLoading,
  
  // Page states
  setPageTitle,
  setBreadcrumbs,
  addBreadcrumb,
  
  // Scroll and viewport
  setScrollPosition,
  setViewportSize,
  
  // User preferences
  updatePreferences,
  togglePreference,
  
  // Error states
  setGlobalError,
  clearGlobalError,
  setNetworkStatus,
  
  // Feature flags
  setFeature,
  setFeatures,
  
  // Utility actions
  resetUI,
  closeAllOverlays,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectLanguage = (state: { ui: UIState }) => state.ui.language;
export const selectCurrency = (state: { ui: UIState }) => state.ui.currency;
export const selectDirection = (state: { ui: UIState }) => state.ui.direction;

export const selectSidebarOpen = (state: { ui: UIState }) => state.ui.sidebarOpen;
export const selectMobileMenuOpen = (state: { ui: UIState }) => state.ui.mobileMenuOpen;
export const selectSearchOpen = (state: { ui: UIState }) => state.ui.searchOpen;
export const selectFiltersOpen = (state: { ui: UIState }) => state.ui.filtersOpen;

export const selectModals = (state: { ui: UIState }) => state.ui.modals;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.modals[state.ui.modals.length - 1] || null;
export const selectModalById = (id: string) => (state: { ui: UIState }) => 
  state.ui.modals.find(modal => modal.id === id);

export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectUnreadNotifications = (state: { ui: UIState }) => 
  state.ui.notifications.filter(n => !n.persistent);

export const selectLoading = (state: { ui: UIState }) => state.ui.loading;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.loading.global;
export const selectLoadingByKey = (key: keyof LoadingState) => (state: { ui: UIState }) => 
  state.ui.loading[key];

export const selectPageTitle = (state: { ui: UIState }) => state.ui.pageTitle;
export const selectBreadcrumbs = (state: { ui: UIState }) => state.ui.breadcrumbs;

export const selectScrollPosition = (state: { ui: UIState }) => state.ui.scrollPosition;
export const selectViewportSize = (state: { ui: UIState }) => state.ui.viewportSize;
export const selectIsMobile = (state: { ui: UIState }) => state.ui.isMobile;
export const selectIsTablet = (state: { ui: UIState }) => state.ui.isTablet;
export const selectIsDesktop = (state: { ui: UIState }) => !state.ui.isMobile && !state.ui.isTablet;

export const selectPreferences = (state: { ui: UIState }) => state.ui.preferences;
export const selectPreference = (key: keyof UIState['preferences']) => (state: { ui: UIState }) => 
  state.ui.preferences[key];

export const selectGlobalError = (state: { ui: UIState }) => state.ui.globalError;
export const selectNetworkStatus = (state: { ui: UIState }) => state.ui.networkStatus;
export const selectIsOnline = (state: { ui: UIState }) => state.ui.networkStatus === 'online';

export const selectFeatures = (state: { ui: UIState }) => state.ui.features;
export const selectFeature = (key: string) => (state: { ui: UIState }) => 
  state.ui.features[key] || false;

// Complex selectors
export const selectIsAnyModalOpen = (state: { ui: UIState }) => state.ui.modals.length > 0;
export const selectIsAnyOverlayOpen = (state: { ui: UIState }) => 
  state.ui.sidebarOpen || state.ui.mobileMenuOpen || state.ui.searchOpen || 
  state.ui.filtersOpen || state.ui.modals.length > 0;

export const selectIsAnyLoading = (state: { ui: UIState }) => 
  Object.values(state.ui.loading).some(loading => loading);

export const selectCurrentBreakpoint = (state: { ui: UIState }) => {
  const { width } = state.ui.viewportSize;
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
};

export const selectUIState = (state: { ui: UIState }) => ({
  theme: state.ui.theme,
  language: state.ui.language,
  currency: state.ui.currency,
  direction: state.ui.direction,
  isMobile: state.ui.isMobile,
  isTablet: state.ui.isTablet,
  networkStatus: state.ui.networkStatus,
});