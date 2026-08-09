/**
 * AuthProvider — ONLY exports a React component (Fast Refresh compatible).
 * The AuthContext object lives in authContextDef.ts.
 * The useAuthContext hook lives in hooks/useAuthContext.ts.
 */
import React, { useEffect, useRef } from 'react';
import logger from '../utils/logger';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser,
  registerUser,
  logoutUser,
  updateProfile as updateProfileAction,
  getCurrentUser,
  clearError,
  selectIsAuthenticated,
  selectIsInitialized,
  selectUser,
  selectIsLoading,
  selectError
} from '../store/slices/authSlice';
import { User, LoginCredentials, RegisterData } from '@/types/auth';
import { AuthContext } from './authContextDef';

// Re-export AuthContextType for convenience (no component = no HMR issue)
export type { AuthContextType } from './authContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isInitialized = useSelector(selectIsInitialized);
  const user = useSelector(selectUser);
  const loading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  // Use a ref to ensure session check runs exactly once per mount,
  // even in React StrictMode which double-invokes effects.
  // We do NOT depend on isInitialized so that stale redux-persist state
  // (isInitialized:true from a previous session) doesn't skip the verify.
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeAuth = async () => {
      logger.debug('[AuthContext] 🔄 Starting auth initialization...');

      // Optimization: avoid unnecessary network calls for first-time guests.
      // If the user has never authenticated in this browser (no persisted flag),
      // attempt a lightweight detection of a server-side session before skipping /auth/me.
      const everAuthenticated = localStorage.getItem('gema_ever_authenticated') === 'true';

      // Lightweight session indicators:
      // 1) Presence of a readable XSRF cookie (backend issues XSRF-TOKEN alongside httpOnly cookies)
      // 2) A legacy/stored refresh token in localStorage (fallback)
      const hasXsrfCookie = typeof document !== 'undefined' && document.cookie.split(';').some((c) => c.trim().startsWith('XSRF-TOKEN='));
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!everAuthenticated && !hasXsrfCookie && !storedRefreshToken) {
        logger.debug('[AuthContext] No prior session or session indicators detected - skipping silent /auth/me call');
        dispatch(clearError());
        return;
      }

      try {
        dispatch(clearError());
        await dispatch(getCurrentUser() as any);
        logger.debug('[AuthContext] ✅ Auth initialization complete');
      } catch (error) {
        dispatch(clearError());
        logger.debug('[AuthContext] ❌ Auth initialization failed (no session)', error);
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]); // Only dispatch (stable ref) — intentionally NOT depending on isInitialized

  const login = async (credentials: LoginCredentials) => {
    try {
      await dispatch(loginUser(credentials) as any);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      await dispatch(registerUser(userData) as any);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await dispatch(logoutUser() as any);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      await dispatch(updateProfileAction(userData) as any);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshUserData = async () => {
    try {
      await dispatch(getCurrentUser() as any);
    } catch (error) {
      console.error('Refresh user data error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isInitialized,
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};