import { getFirebaseAuth, getGoogleProvider } from '@/config/firebase';
import { authAPI } from './api/authAPI';
import { AuthResponse } from '@/types/auth';

/** Firebase error codes that mean the user cancelled — suppress toast for these. */
const POPUP_CANCELLED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
]);

/**
 * Sign in / Sign up with Google and exchange token with backend.
 * Firebase is lazy-loaded on first auth attempt.
 * @param role Optional role for NEW accounts: "customer" | "vendor" | "teacher". Ignored for existing accounts.
 */
export async function loginWithGoogle(role?: string): Promise<AuthResponse> {
  const [auth, googleProvider] = await Promise.all([
    getFirebaseAuth(),
    getGoogleProvider()
  ]);

  if (!auth || !googleProvider) {
    throw new Error('Firebase authentication not available');
  }

  const { signInWithPopup } = await import('firebase/auth');

  let result;
  try {
    result = await signInWithPopup(auth, googleProvider);
  } catch (popupError: any) {
    const code: string = popupError?.code ?? '';

    // User dismissed the popup — silent, not an error
    if (POPUP_CANCELLED_CODES.has(code)) {
      throw Object.assign(new Error('popup-cancelled'), { silent: true });
    }

    // Email already exists with a different provider
    if (code === 'auth/account-exists-with-different-credential') {
      throw new Error('An account already exists with this email. Sign in with your original method.');
    }

    throw popupError;
  }

  const idToken = await result.user.getIdToken();
  return await authAPI.firebaseAuth(idToken, role);
}

/**
 * Sign in with email/password via Firebase and exchange token
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  const auth = await getFirebaseAuth();

  if (!auth) {
    throw new Error('Firebase authentication not available');
  }

  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();
  return await authAPI.firebaseAuth(idToken);
}

/**
 * Sign out from Firebase
 */
export async function logoutFirebase(): Promise<void> {
  const auth = await getFirebaseAuth();

  if (!auth) return;

  const { signOut } = await import('firebase/auth');
  await signOut(auth);
}