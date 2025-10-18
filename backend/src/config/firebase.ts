import * as admin from 'firebase-admin';
import { config } from './env';

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebase = (): void => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // In development, we can skip Firebase initialization if not provided
      if (config.nodeEnv === 'development' && 
          (!config.firebase.projectId || !config.firebase.privateKey || !config.firebase.clientEmail)) {
        console.log('Firebase credentials not provided. Skipping Firebase initialization in development mode.');
        return;
      } else {
        // Initialize with provided credentials
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            privateKey: config.firebase.privateKey.replace(/\\\\n/g, '\n'),
            clientEmail: config.firebase.clientEmail
          })
        });
        console.log('Firebase Admin SDK initialized with provided credentials');
      }
    }
  } catch (error) {
    console.error(`Error initializing Firebase Admin SDK: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (config.nodeEnv === 'production') {
      process.exit(1); // Exit in production if Firebase fails to initialize
    } else {
      console.warn('Continuing without Firebase in development mode');
    }
  }
};

/**
 * Get Firebase Auth instance
 */
export const getAuth = (): admin.auth.Auth => {
  return admin.auth();
};