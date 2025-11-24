import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
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

interface AuthContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isInitialized = useSelector(selectIsInitialized);
  const user = useSelector(selectUser);
  const loading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  useEffect(() => {
    // Initialize auth on mount - check if user is authenticated via httpOnly cookies
    // Note: Tokens are now stored in httpOnly cookies, not localStorage
    const initializeAuth = async () => {
      // Skip initialization if already initialized (e.g., after logout)
      if (isInitialized) {
        console.log('[AuthContext] Already initialized, skipping auth check');
        return;
      }

      try {
        // Clear any existing errors before attempting auth
        dispatch(clearError());

        // Verify server session on mount to ensure cookies are valid
        // This is critical because auth state is not persisted in localStorage
        // The server will validate the httpOnly cookies and return user data if valid
        await dispatch(getCurrentUser() as any);
      } catch (error) {
        // If getCurrentUser fails, it means no valid auth cookies exist
        // The authSlice will automatically clear the auth state
        dispatch(clearError());
        console.log('[AuthContext] No valid auth session found');
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isInitialized]); // Re-run if isInitialized changes

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

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};