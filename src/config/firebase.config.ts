/**
 * Firebase Admin SDK Configuration
 */
import * as admin from "firebase-admin";
import logger from "./logger";

/**
 * Initialize Firebase Admin SDK
 * This function should be called once when the application starts
 */
export const initializeFirebase = (): void => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      logger.info("Firebase Admin SDK already initialized");
      return;
    }

    // Get Firebase credentials from environment variables
    const {
      FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY,
      FIREBASE_SERVICE_ACCOUNT_PATH,
    } = process.env;

    // Option 1: Initialize with service account JSON file path
    if (FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(FIREBASE_SERVICE_ACCOUNT_PATH);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      logger.info("Firebase Admin SDK initialized with service account file");
      return;
    }

    // Option 2: Initialize with individual environment variables
    if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
      // Firebase private key in .env is stored with escaped \n
      // We need to replace \\n with actual newlines
      const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: FIREBASE_PROJECT_ID,
      });

      logger.info("Firebase Admin SDK initialized with environment variables");
      return;
    }

    // Option 3: Use Application Default Credentials (for development)
    // This works if you have Google Cloud SDK installed and authenticated
    if (process.env.NODE_ENV === "development") {
      logger.warn(
        "Firebase credentials not found, using Application Default Credentials",
      );
      logger.warn(
        "Make sure you have run: gcloud auth application-default login",
      );

      admin.initializeApp({
        projectId: FIREBASE_PROJECT_ID || "your-project-id",
      });

      logger.info(
        "Firebase Admin SDK initialized with Application Default Credentials",
      );
      return;
    }

    throw new Error(
      "Firebase configuration missing. Please set Firebase environment variables.",
    );
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
};

/**
 * Get Firebase Admin instance
 * @returns Firebase Admin instance
 */
export const getFirebaseAdmin = (): admin.app.App => {
  if (admin.apps.length === 0) {
    throw new Error(
      "Firebase Admin SDK not initialized. Call initializeFirebase() first.",
    );
  }
  return admin.app();
};

/**
 * Get Firebase Auth instance
 * @returns Firebase Auth instance
 */
export const getFirebaseAuth = (): admin.auth.Auth => {
  return getFirebaseAdmin().auth();
};

/**
 * Verify Firebase is initialized
 * @returns true if initialized, false otherwise
 */
export const isFirebaseInitialized = (): boolean => {
  return admin.apps.length > 0;
};

export default {
  initializeFirebase,
  getFirebaseAdmin,
  getFirebaseAuth,
  isFirebaseInitialized,
};
