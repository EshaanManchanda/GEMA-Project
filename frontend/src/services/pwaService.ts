// PWA Service for managing service worker, notifications, and offline functionality
import { logger } from '../utils/logger';

interface PWAUpdateEvent {
  type: 'update-available' | 'update-installed' | 'offline' | 'online';
  data?: any;
}

export type PWAEventListener = (event: PWAUpdateEvent) => void;

class PWAService {
  private serviceWorker: ServiceWorker | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: PWAEventListener[] = [];
  private isOnline: boolean = navigator.onLine;
  private notificationPermission: NotificationPermission = 'default';

  constructor() {
    // Initialize online/offline listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Check notification permission
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  // Register service worker
  async register(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker not supported');
      return false;
    }

    // Disable service worker in development to prevent API request interference
    if (import.meta.env.VITE_DEV) {
      console.log('[PWA] Service Worker disabled in development mode');
      // Unregister any existing service worker in development
      await this.unregister();
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.registration = registration;

      // Handle different registration states
      if (registration.installing) {
        console.log('[PWA] Service Worker installing...');
        this.trackServiceWorker(registration.installing);
      } else if (registration.waiting) {
        console.log('[PWA] Service Worker installed, waiting to activate');
        this.notifyListeners({ type: 'update-available' });
      } else if (registration.active) {
        console.log('[PWA] Service Worker active');
        this.serviceWorker = registration.active;
      }

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          this.trackServiceWorker(newWorker);
        }
      });

      // Handle controlled change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New service worker activated');
        window.location.reload();
      });

      return true;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
      return false;
    }
  }

  // Unregister service worker
  async unregister(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[PWA] Service Worker unregistered');
      }

      // Clear all caches
      await this.clearCaches();

      return true;
    } catch (error) {
      console.error('[PWA] Service Worker unregistration failed:', error);
      return false;
    }
  }

  // Track service worker state changes
  private trackServiceWorker(worker: ServiceWorker) {
    worker.addEventListener('statechange', () => {
      console.log('[PWA] Service Worker state changed:', worker.state);
      
      if (worker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New update available
          this.notifyListeners({ type: 'update-available' });
        } else {
          // First install
          this.notifyListeners({ type: 'update-installed' });
        }
      }
    });
  }

  // Update service worker
  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('No service worker registration found');
    }

    try {
      await this.registration.update();
    } catch (error) {
      console.error('[PWA] Service Worker update failed:', error);
      throw error;
    }
  }

  // Skip waiting for new service worker
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      throw new Error('No waiting service worker found');
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported');
      return 'denied';
    }

    if (this.notificationPermission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission;
    } catch (error) {
      console.error('[PWA] Notification permission request failed:', error);
      return 'denied';
    }
  }

  // Show notification
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (this.notificationPermission !== 'granted') {
      console.warn('[PWA] Notification permission not granted');
      return;
    }

    if (this.registration) {
      try {
        await this.registration.showNotification(title, {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          ...options
        });
      } catch (error) {
        console.error('[PWA] Failed to show notification:', error);
      }
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('No service worker registration found');
    }

    if (!('PushManager' in window)) {
      console.warn('[PWA] Push messaging not supported');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('[PWA] Push subscription successful');
      return subscription;
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        const result = await subscription.unsubscribe();
        console.log('[PWA] Push unsubscription successful');
        return result;
      }
      return true;
    } catch (error) {
      console.error('[PWA] Push unsubscription failed:', error);
      return false;
    }
  }

  // Check if app can be installed
  canInstall(): boolean {
    return !!(window as any).deferredPrompt;
  }

  // Prompt app installation
  async install(): Promise<boolean> {
    const deferredPrompt = (window as any).deferredPrompt;
    
    if (!deferredPrompt) {
      console.warn('[PWA] No deferred install prompt available');
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA] Install prompt outcome:', outcome);
      
      // Clear the deferred prompt
      (window as any).deferredPrompt = null;
      
      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }

  // Get network status
  isAppOnline(): boolean {
    return this.isOnline;
  }

  // Add event listener
  addEventListener(listener: PWAEventListener): void {
    this.listeners.push(listener);
  }

  // Remove event listener
  removeEventListener(listener: PWAEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Cache important resources
  async cacheResources(urls: string[]): Promise<void> {
    if (!('caches' in window)) {
      console.warn('[PWA] Cache API not supported');
      return;
    }

    try {
      const cache = await caches.open('gema-runtime-cache');
      await cache.addAll(urls);
      console.log('[PWA] Resources cached successfully');
    } catch (error) {
      console.error('[PWA] Failed to cache resources:', error);
    }
  }

  // Clear all caches
  async clearCaches(): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[PWA] All caches cleared');
    } catch (error) {
      console.error('[PWA] Failed to clear caches:', error);
    }
  }

  // Private methods
  private handleOnline(): void {
    this.isOnline = true;
    this.notifyListeners({ type: 'online' });
    console.log('[PWA] App is online');
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners({ type: 'offline' });
    console.log('[PWA] App is offline');
  }

  private notifyListeners(event: PWAUpdateEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[PWA] Error in event listener:', error);
      }
    });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Create singleton instance
export const pwaService = new PWAService();

// Initialize PWA on app load
export const initializePWA = async (): Promise<void> => {
  try {
    const registered = await pwaService.register();
    
    if (registered) {
      console.log('[PWA] Service worker registered successfully');
      
      // Request notification permission on user interaction
      document.addEventListener('click', async () => {
        if (pwaService.notificationPermission === 'default') {
          await pwaService.requestNotificationPermission();
        }
      }, { once: true });
    }
  } catch (error) {
    console.error('[PWA] Failed to initialize PWA:', error);
  }
};

// Handle beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
  console.log('[PWA] Install prompt deferred');
});

// Handle app installed event
window.addEventListener('appinstalled', () => {
  console.log('[PWA] App was installed');
  (window as any).deferredPrompt = null;
});

export default pwaService;