import { auth, googleProvider } from '@/config/firebase';
import { signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { authAPI } from './api/authAPI';
import { AuthResponse } from '@/types/auth';

// Using AuthResponse from types/auth instead of custom interface

// Sign in with Google and exchange token with backend
export async function loginWithGoogle(): Promise<AuthResponse> {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return await authAPI.firebaseAuth(idToken);
}

// Sign in with email/password via Firebase (if enabled) and exchange token
export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();
  return await authAPI.firebaseAuth(idToken);
}

// Sign out from Firebase
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}