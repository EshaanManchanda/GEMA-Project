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
  selectUser,
  selectIsLoading,
  selectError
} from '../store/slices/authSlice';
import { User, LoginCredentials, RegisterData } from '@/types/auth';

interface AuthContextType {
  isAuthenticated: boolean;
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
  const user = useSelector(selectUser);
  const loading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  useEffect(() => {
    // Check if user is already authenticated from stored token
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token && !user) {
        try {
          // Clear any existing errors before attempting auth
          dispatch(clearError());
          await dispatch(getCurrentUser() as any);
        } catch (error) {
          // Token might be invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          // Clear auth errors since this is just initialization
          dispatch(clearError());
        }
      }
    };

    initializeAuth();
  }, [dispatch, user]);

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