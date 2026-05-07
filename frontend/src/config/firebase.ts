import type { FirebaseApp } from 'firebase/app';
import type { Auth, GoogleAuthProvider as GoogleAuthProviderType } from 'firebase/auth';

/**
 * Firebase Lazy Loading Module
 * Dynamically imports Firebase only when auth is needed (~100KB savings on initial load)
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const placeholders = ['your_firebase', 'your_project', 'your_sender', 'your_app'];

function validateFirebaseEnv(): boolean {
  const requiredVars = {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value === 'undefined') {
      console.warn(`[Firebase] Missing environment variable: ${key}`);
      return false;
    }
    if (placeholders.some(placeholder => value.includes(placeholder))) {
      console.warn(`[Firebase] Environment variable ${key} appears to be a placeholder.`);
      return false;
    }
  }
  return true;
}

// Cached instances (lazy initialized)
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProviderType | null = null;
let _initPromise: Promise<void> | null = null;

/**
 * Lazily initializes Firebase app and auth
 * Called automatically by getFirebaseAuth() and getGoogleProvider()
 */
async function initFirebase(): Promise<void> {
  if (_app) return;

  if (!validateFirebaseEnv()) {
    console.warn('[Firebase] ⚠️ Skipping initialization - invalid/missing env vars');
    return;
  }

  try {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, GoogleAuthProvider } = await import('firebase/auth');

    _app = initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _googleProvider = new GoogleAuthProvider();
    _googleProvider.setCustomParameters({ prompt: 'select_account' });

    console.log('[Firebase] ✅ Initialized successfully (lazy)');
  } catch (error) {
    console.error('[Firebase] ❌ Failed to initialize:', error);
  }
}

/**
 * Gets Firebase Auth instance (lazy loaded)
 * @returns Promise<Auth | null>
 */
export async function getFirebaseAuth(): Promise<Auth | null> {
  if (!_initPromise) {
    _initPromise = initFirebase();
  }
  await _initPromise;
  return _auth;
}

/**
 * Gets Google Auth Provider instance (lazy loaded)
 * @returns Promise<GoogleAuthProvider | null>
 */
export async function getGoogleProvider(): Promise<GoogleAuthProviderType | null> {
  if (!_initPromise) {
    _initPromise = initFirebase();
  }
  await _initPromise;
  return _googleProvider;
}

/**
 * Gets Firebase App instance (lazy loaded)
 * @returns Promise<FirebaseApp | null>
 */
export async function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (!_initPromise) {
    _initPromise = initFirebase();
  }
  await _initPromise;
  return _app;
}

// Legacy exports for backward compatibility (null until lazy-loaded)
// Components should migrate to async getters
export const auth = null as Auth | null;
export const googleProvider = null as GoogleAuthProviderType | null;
export default null as FirebaseApp | null;