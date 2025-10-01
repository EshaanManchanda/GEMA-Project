import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';

/**
 * Validates Firebase environment variables
 * Returns true if all required variables are set and not placeholder values
 */
function validateFirebaseEnv(): boolean {
  const requiredVars = {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const placeholders = ['your_firebase', 'your_project', 'your_sender', 'your_app'];

  for (const [key, value] of Object.entries(requiredVars)) {
    // Check if variable is missing
    if (!value || value === 'undefined') {
      console.warn(`[Firebase] Missing environment variable: ${key}`);
      return false;
    }

    // Check if variable is a placeholder
    if (placeholders.some(placeholder => value.includes(placeholder))) {
      console.warn(`[Firebase] Environment variable ${key} appears to be a placeholder. Please update your .env file with actual Firebase credentials.`);
      return false;
    }
  }

  return true;
}

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

// Initialize Firebase only if environment variables are valid
let app: FirebaseApp | null = null;

if (validateFirebaseEnv()) {
  try {
    app = initializeApp(firebaseConfig);
    console.log('[Firebase] ✅ Initialized successfully');
  } catch (error) {
    console.error('[Firebase] ❌ Failed to initialize:', error);
  }
} else {
  console.warn('[Firebase] ⚠️ Skipping initialization - invalid or missing environment variables');
  console.warn('[Firebase] 💡 To enable Firebase, update your .env file with actual Firebase credentials from the Firebase Console');
}

// Initialize Firebase Authentication and get a reference to the service
// Only initialize auth if Firebase app was successfully initialized
export const auth = app ? getAuth(app) : null;

// Configure auth providers only if Firebase is initialized
export const googleProvider = app ? (() => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
})() : null;

export const emailProvider = app ? new EmailAuthProvider() : null;

// Export the Firebase app (may be null if initialization failed)
export default app;