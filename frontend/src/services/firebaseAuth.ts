import { getFirebaseAuth, getGoogleProvider } from '@/config/firebase';
import { authAPI } from './api/authAPI';
import { AuthResponse } from '@/types/auth';

/**
 * Sign in with Google and exchange token with backend
 * Firebase is lazy-loaded on first auth attempt
 */
export async function loginWithGoogle(): Promise<AuthResponse> {
  const [auth, googleProvider] = await Promise.all([
    getFirebaseAuth(),
    getGoogleProvider()
  ]);

  if (!auth || !googleProvider) {
    throw new Error('Firebase authentication not available');
  }

  const { signInWithPopup } = await import('firebase/auth');
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return await authAPI.firebaseAuth(idToken);
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