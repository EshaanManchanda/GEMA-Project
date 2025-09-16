// Service Worker for Gema Event Management Platform
// Provides offline functionality, caching, and background sync

const CACHE_NAME = 'gema-v1.0.0';
const API_CACHE_NAME = 'gema-api-v1.0.0';
const IMAGE_CACHE_NAME = 'gema-images-v1.0.0';

// Check if we're in development mode
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Assets to cache on install - different for dev vs prod
const STATIC_ASSETS = isDevelopment ? [
  '/',
  '/manifest.json',
  // Don't cache dev server assets as they change frequently
] : [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html',
  // Core pages
  '/events',
  '/categories',
  '/vendors',
  '/login',
  '/register',
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/events',
  '/api/categories',
  '/api/venues',
  '/api/blogs',
];

// Background sync tags
const SYNC_TAGS = {
  BOOKING_RETRY: 'booking-retry',
  OFFLINE_ACTIONS: 'offline-actions',
  ANALYTICS: 'analytics-sync',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets with error handling
      caches.open(CACHE_NAME).then(async (cache) => {
        console.log('[SW] Caching static assets');
        try {
          // In development, cache assets one by one to handle failures gracefully
          if (isDevelopment) {
            for (const url of STATIC_ASSETS) {
              try {
                await cache.add(new Request(url, { mode: 'no-cors' }));
                console.log(`[SW] Cached: ${url}`);
              } catch (error) {
                console.warn(`[SW] Failed to cache ${url}:`, error.message);
              }
            }
          } else {
            // In production, use addAll for efficiency
            await cache.addAll(STATIC_ASSETS.map(url => new Request(url, { mode: 'cors' })));
          }
        } catch (error) {
          console.error('[SW] Error caching static assets:', error);
        }
      }),
      // Cache offline page
      caches.open(CACHE_NAME).then((cache) => {
        return fetch('/offline.html').then((response) => {
          if (response.ok) {
            return cache.put('/offline.html', response);
          }
        }).catch(() => {
          // Create a simple offline page if it doesn't exist
          const offlineResponse = new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Offline - Gema Events</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .icon { font-size: 64px; margin-bottom: 20px; }
                h1 { color: #333; margin-bottom: 10px; }
                p { color: #666; margin-bottom: 30px; }
                button { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; }
                button:hover { background: #2563eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">📱</div>
                <h1>You're Offline</h1>
                <p>Please check your internet connection and try again.</p>
                <button onclick="window.location.reload()">Retry</button>
              </div>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
          return cache.put('/offline.html', offlineResponse);
        });
      })
    ])
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== API_CACHE_NAME && 
                     cacheName !== IMAGE_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  try {
    const url = new URL(request.url);

    // Skip non-GET requests and chrome-extension requests
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
      return;
    }

    // In development mode, skip caching for hot reload files
    if (isDevelopment && (url.pathname.includes('/@vite/') || url.pathname.includes('/@fs/'))) {
      return;
    }

    // Handle different types of requests with appropriate caching strategies
    if (url.pathname.startsWith('/api/')) {
      // API requests - Network First with Cache Fallback
      event.respondWith(handleApiRequest(request));
    } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      // Images - Cache First
      event.respondWith(handleImageRequest(request));
    } else if (url.pathname.startsWith('/static/')) {
      // Static assets - Cache First
      event.respondWith(handleStaticRequest(request));
    } else {
      // Navigation requests - Network First with Offline Fallback
      event.respondWith(handleNavigationRequest(request));
    }
  } catch (error) {
    console.error('[SW] Error in fetch event:', error);
    // Let the request fall through to the network
    return;
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = url.pathname + url.search;

  try {
    // Try network first
    const networkResponse = await fetch(request.clone());
    
    if (networkResponse.ok) {
      // Cache successful API responses for specific endpoints
      if (CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
        const cache = await caches.open(API_CACHE_NAME);
        // Cache for 5 minutes
        const responseToCache = networkResponse.clone();
        responseToCache.headers.set('sw-cache-timestamp', Date.now().toString());
        cache.put(cacheKey, responseToCache);
      }
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', url.pathname);
    
    // Try cache fallback
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      const cacheAge = Date.now() - parseInt(cacheTimestamp || '0');
      
      // Use cached response if less than 5 minutes old
      if (cacheAge < 5 * 60 * 1000) {
        return cachedResponse;
      }
    }
    
    // Store failed request for background sync
    if (url.pathname.includes('/bookings') || url.pathname.includes('/orders')) {
      await storeFailedRequest(request);
    }
    
    // Return error response
    return new Response(JSON.stringify({
      error: 'Network unavailable',
      message: 'Please check your internet connection'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Failed to fetch image:', request.url);
  }
  
  // Return placeholder image
  return new Response('', {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

// Handle static asset requests with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle navigation requests with network-first and offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache');
    
    // Try cache fallback
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    const offlineResponse = await cache.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Last resort: basic offline response
    return new Response('Offline', { status: 200, statusText: 'Offline' });
  }
}

// Store failed requests for background sync
async function storeFailedRequest(request) {
  const db = await openDB();
  const tx = db.transaction(['failed_requests'], 'readwrite');
  const store = tx.objectStore('failed_requests');
  
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.clone().text() : null,
    timestamp: Date.now()
  };
  
  await store.add(requestData);
  
  // Register background sync
  if (self.registration && self.registration.sync) {
    try {
      await self.registration.sync.register(SYNC_TAGS.OFFLINE_ACTIONS);
    } catch (error) {
      console.log('[SW] Background sync registration failed:', error);
    }
  }
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === SYNC_TAGS.OFFLINE_ACTIONS) {
    event.waitUntil(processFailedRequests());
  } else if (event.tag === SYNC_TAGS.BOOKING_RETRY) {
    event.waitUntil(retryBookings());
  }
});

// Process failed requests when back online
async function processFailedRequests() {
  try {
    const db = await openDB();
    const tx = db.transaction(['failed_requests'], 'readwrite');
    const store = tx.objectStore('failed_requests');
    const requests = await store.getAll();
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          // Successfully retried, remove from store
          await store.delete(requestData.id);
          console.log('[SW] Successfully retried request:', requestData.url);
        }
      } catch (error) {
        console.log('[SW] Failed to retry request:', requestData.url, error);
      }
    }
  } catch (error) {
    console.log('[SW] Error processing failed requests:', error);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      image: data.image,
      tag: data.tag || 'gema-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Gema Events', options)
    );
  } catch (error) {
    console.log('[SW] Error handling push notification:', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = data.url || '/';

  // Handle notification actions
  if (event.action) {
    switch (event.action) {
      case 'view_booking':
        url = `/bookings/${data.bookingId}`;
        break;
      case 'view_event':
        url = `/events/${data.eventId}`;
        break;
      default:
        url = data.url || '/';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing tab
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new tab if no existing tab found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Simple IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GemaOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('failed_requests')) {
        const store = db.createObjectStore('failed_requests', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

console.log('[SW] Service worker loaded successfully');