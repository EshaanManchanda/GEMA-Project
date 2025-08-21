import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authAPI from '@services/api/authAPI';
import { User, LoginCredentials, RegisterData, AuthResponse } from '@types/auth';
import { toast } from 'react-hot-toast';
import { loginWithGoogle } from '@/services/firebaseAuth';
import { redirectToRoleDashboard, type UserRole } from '@/utils/roleRedirect';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isEmailVerified: boolean;
  lastLoginTime: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isEmailVerified: false,
  lastLoginTime: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials & { navigate?: any }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login({
        email: credentials.email,
        password: credentials.password
      });
      toast.success('Welcome back!');
      
      // Handle role-based redirect if navigate function is provided
      if (credentials.navigate && response.user?.role) {
        redirectToRoleDashboard(response.user.role as UserRole, credentials.navigate);
      }
      
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      toast.success('Account created successfully! Please verify your email.');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (state.auth.token) {
        await authAPI.logout();
      }
      toast.success('Logged out successfully');
      return null;
    } catch (error: any) {
      // Even if logout fails on server, we should clear local state
      console.error('Logout error:', error);
      return null;
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (!state.auth.refreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await authAPI.refreshToken(state.auth.refreshToken);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Token refresh failed';
      return rejectWithValue(message);
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await authAPI.verifyEmail(token);
      toast.success('Email verified successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Email verification failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await authAPI.forgotPassword(email);
      toast.success('Password reset email sent!');
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }: { token: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.resetPassword(token, password);
      toast.success('Password reset successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: Partial<User>, { rejectWithValue }) => {
    try {
      const response = await authAPI.updateProfile(userData);
      toast.success('Profile updated successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get user data';
      return rejectWithValue(message);
    }
  }
);

export const loginWithGoogleThunk = createAsyncThunk(
  'auth/loginWithGoogle',
  async (navigate?: any, { rejectWithValue }) => {
    try {
      const response = await loginWithGoogle();
      toast.success('Signed in with Google successfully!');
      
      // Handle role-based redirect if navigate function is provided
      if (navigate && response.user?.role) {
        redirectToRoleDashboard(response.user.role as UserRole, navigate);
      }
      
      return response;
    } catch (error: any) {
      const message = error.message || 'Google sign-in failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setEmailVerified: (state, action: PayloadAction<boolean>) => {
      state.isEmailVerified = action.payload;
      if (state.user) {
        state.user.isEmailVerified = action.payload;
      }
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isEmailVerified = false;
      state.lastLoginTime = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.tokens?.accessToken || action.payload.token || null;
        state.refreshToken = action.payload.tokens?.refreshToken || action.payload.refreshToken || null;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.user.isEmailVerified;
        state.lastLoginTime = new Date().toISOString();
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.tokens?.accessToken || action.payload.token || null;
        state.refreshToken = action.payload.tokens?.refreshToken || action.payload.refreshToken || null;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.user.isEmailVerified;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.lastLoginTime = null;
        state.error = null;
        state.isLoading = false;
      })
      
      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.token = action.payload.tokens?.accessToken || action.payload.token || null;
        state.refreshToken = action.payload.tokens?.refreshToken || action.payload.refreshToken || null;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
      })
      
      // Google Login
      .addCase(loginWithGoogleThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogleThunk.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.tokens?.accessToken || action.payload.token || null;
        state.refreshToken = action.payload.tokens?.refreshToken || action.payload.refreshToken || null;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.user.isEmailVerified;
        state.lastLoginTime = new Date().toISOString();
        state.error = null;
      })
      .addCase(loginWithGoogleThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      
      // Verify Email
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.isEmailVerified = true;
        if (state.user) {
          state.user.isEmailVerified = true;
        }
      })
      
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Get Current User
      .addCase(getCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.isEmailVerified;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
      });
  },
});

export const {
  clearError,
  setLoading,
  updateUser,
  setEmailVerified,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectError = (state: { auth: AuthState }) => state.auth.error;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsEmailVerified = (state: { auth: AuthState }) => state.auth.isEmailVerified;

// Helper selectors
export const selectUserRole = (state: { auth: AuthState }): UserRole | null => {
  const user = state.auth.user;
  if (!user || !user.role) return null;
  
  // Return the user's role directly from the backend User model
  return user.role as UserRole;
};

export const selectIsAdmin = (state: { auth: AuthState }) => {
  const role = selectUserRole(state);
  return role === 'admin';
};

export const selectIsVendor = (state: { auth: AuthState }) => {
  const role = selectUserRole(state);
  return role === 'vendor';
};

export const selectIsEmployee = (state: { auth: AuthState }) => {
  const role = selectUserRole(state);
  return role === 'employee';
};

export const selectIsCustomer = (state: { auth: AuthState }) => {
  const role = selectUserRole(state);
  return role === 'customer';
};