import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authAPI from '@services/api/authAPI';
import {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  UserProfile,
  UpdateProfileData,
  AvatarUploadData,
  Address
} from '@types/auth';
import { toast } from 'react-hot-toast';
import { loginWithGoogle } from '@/services/firebaseAuth';
import { redirectToRoleDashboard, type UserRole } from '@/utils/roleRedirect';

// Note: Tokens are now stored in httpOnly cookies (server-side) for security
// They are no longer stored in Redux state
interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Single source of truth for loading state
  isProfileLoading: boolean;
  error: string | null;
  profileError: string | null;
  isEmailVerified: boolean;
  lastLoginTime: string | null;
  profileCompletion: number;
}

const initialState: AuthState = {
  user: null,
  userProfile: null,
  isAuthenticated: false,
  isLoading: false,
  isProfileLoading: false,
  error: null,
  profileError: null,
  isEmailVerified: false,
  lastLoginTime: null,
  profileCompletion: 0,
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

// Refresh token is now handled via httpOnly cookies
// No need to pass refresh token from state
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      // Refresh token is automatically sent via httpOnly cookie
      const response = await authAPI.refreshToken();
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

export const verifyEmailWithOTP = createAsyncThunk(
  'auth/verifyEmailWithOTP',
  async (otp: string, { rejectWithValue }) => {
    try {
      const response = await authAPI.verifyEmailWithOTP(otp);
      toast.success('Email verified successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Email verification failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const resendVerificationEmail = createAsyncThunk(
  'auth/resendVerificationEmail',
  async (email: string, { rejectWithValue }) => {
    try {
      await authAPI.sendVerificationEmail(email);
      toast.success('Verification code sent successfully!');
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend verification email';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Phone Verification Thunks
export const sendPhoneVerificationOTP = createAsyncThunk(
  'auth/sendPhoneVerificationOTP',
  async (phone: string, { rejectWithValue }) => {
    try {
      const response = await authAPI.sendPhoneVerificationOTP(phone);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send verification code';
      return rejectWithValue(message);
    }
  }
);

export const verifyPhoneOTP = createAsyncThunk(
  'auth/verifyPhoneOTP',
  async (otp: string, { rejectWithValue }) => {
    try {
      const response = await authAPI.verifyPhoneOTP(otp);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid verification code';
      return rejectWithValue(message);
    }
  }
);

export const resendPhoneVerificationOTP = createAsyncThunk(
  'auth/resendPhoneVerificationOTP',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.resendPhoneVerificationOTP();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend verification code';
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

export const getFullProfile = createAsyncThunk(
  'auth/getFullProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getFullProfile();
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load profile';
      return rejectWithValue(message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: UpdateProfileData, { rejectWithValue }) => {
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

export const uploadAvatar = createAsyncThunk(
  'auth/uploadAvatar',
  async (data: AvatarUploadData, { rejectWithValue }) => {
    try {
      const response = await authAPI.uploadAvatar(data);
      toast.success('Avatar updated successfully!');
      return response.avatarUrl;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Avatar upload failed';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const removeAvatar = createAsyncThunk(
  'auth/removeAvatar',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.removeAvatar();
      toast.success('Avatar removed successfully!');
      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove avatar';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const addAddress = createAsyncThunk(
  'auth/addAddress',
  async (address: Omit<Address, 'id'>, { rejectWithValue }) => {
    try {
      const response = await authAPI.addAddress(address);
      toast.success('Address added successfully!');
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add address';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateAddress = createAsyncThunk(
  'auth/updateAddress',
  async ({ addressIndex, address }: { addressIndex: number; address: Partial<Address> }, { rejectWithValue }) => {
    try {
      const response = await authAPI.updateAddress(addressIndex, address);
      toast.success('Address updated successfully!');
      return { index: addressIndex, address: response };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update address';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteAddress = createAsyncThunk(
  'auth/deleteAddress',
  async (addressIndex: number, { rejectWithValue }) => {
    try {
      await authAPI.deleteAddress(addressIndex);
      toast.success('Address deleted successfully!');
      return addressIndex;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete address';
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
      state.profileError = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setProfileLoading: (state, action: PayloadAction<boolean>) => {
      state.isProfileLoading = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.userProfile) {
        state.userProfile = { ...state.userProfile, ...action.payload };
      }
    },
    setEmailVerified: (state, action: PayloadAction<boolean>) => {
      state.isEmailVerified = action.payload;
      if (state.user) {
        state.user.isEmailVerified = action.payload;
      }
    },
    setProfileCompletion: (state, action: PayloadAction<number>) => {
      state.profileCompletion = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isEmailVerified = false;
      state.lastLoginTime = null;
      state.error = null;
      // Note: Cookies are cleared by the server logout endpoint
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
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.user.isEmailVerified;
        state.lastLoginTime = new Date().toISOString();
        state.error = null;
        // Note: Tokens are set in httpOnly cookies by the server
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
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.user.isEmailVerified;
        state.error = null;
        // Note: Tokens are set in httpOnly cookies by the server
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.lastLoginTime = null;
        state.error = null;
        state.isLoading = false;
        // Note: Cookies are cleared by the server logout endpoint
      })

      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        // Note: New tokens are set in httpOnly cookies by the server
      })
      .addCase(refreshToken.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        // Note: Invalid cookies are cleared by the server
      })
      
      // Google Login
      .addCase(loginWithGoogleThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithGoogleThunk.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.user.isEmailVerified;
        state.lastLoginTime = new Date().toISOString();
        state.error = null;
        // Note: Tokens are set in httpOnly cookies by the server
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

      // Verify Email with OTP
      .addCase(verifyEmailWithOTP.fulfilled, (state, action) => {
        state.isEmailVerified = true;
        if (state.user) {
          state.user.isEmailVerified = true;
        }
      })

      // Verify Phone with OTP
      .addCase(verifyPhoneOTP.fulfilled, (state, action) => {
        if (state.user) {
          state.user.isPhoneVerified = true;
        }
        if (state.userProfile) {
          state.userProfile.isPhoneVerified = true;
        }
        // Refresh profile to update completion percentage
        if (state.userProfile) {
          state.profileCompletion = state.userProfile.profileCompletion;
        }
      })

      // Get Full Profile
      .addCase(getFullProfile.pending, (state) => {
        state.isProfileLoading = true;
        state.profileError = null;
      })
      .addCase(getFullProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.isProfileLoading = false;
        state.userProfile = action.payload;
        state.profileCompletion = action.payload.profileCompletion;
        state.profileError = null;
      })
      .addCase(getFullProfile.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.profileError = action.payload as string;
      })

      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isProfileLoading = true;
        state.profileError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.isProfileLoading = false;
        state.userProfile = action.payload;
        state.profileCompletion = action.payload.profileCompletion;
        // Update basic user info as well
        if (state.user) {
          state.user = {
            ...state.user,
            firstName: action.payload.firstName,
            lastName: action.payload.lastName,
            phone: action.payload.phone,
            avatar: action.payload.avatar,
            preferences: action.payload.preferences,
          };
        }
        state.profileError = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.profileError = action.payload as string;
      })

      // Upload Avatar
      .addCase(uploadAvatar.pending, (state) => {
        state.isProfileLoading = true;
        state.profileError = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action: PayloadAction<string>) => {
        state.isProfileLoading = false;
        if (state.user) {
          state.user.avatar = action.payload;
        }
        if (state.userProfile) {
          state.userProfile.avatar = action.payload;
        }
        state.profileError = null;
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.isProfileLoading = false;
        state.profileError = action.payload as string;
      })

      // Remove Avatar
      .addCase(removeAvatar.fulfilled, (state) => {
        if (state.user) {
          state.user.avatar = undefined;
        }
        if (state.userProfile) {
          state.userProfile.avatar = undefined;
        }
      })

      // Add Address
      .addCase(addAddress.fulfilled, (state, action: PayloadAction<Address>) => {
        if (state.userProfile) {
          state.userProfile.addresses.push(action.payload);
        }
      })

      // Update Address
      .addCase(updateAddress.fulfilled, (state, action: PayloadAction<{ index: number; address: Address }>) => {
        if (state.userProfile) {
          state.userProfile.addresses[action.payload.index] = action.payload.address;
        }
      })

      // Delete Address
      .addCase(deleteAddress.fulfilled, (state, action: PayloadAction<number>) => {
        if (state.userProfile) {
          state.userProfile.addresses.splice(action.payload, 1);
        }
      })
      
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isEmailVerified = action.payload.isEmailVerified;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.isEmailVerified = false;
        state.error = null; // Explicitly clear errors for failed auth checks
        // Note: Invalid cookies should be cleared by calling logout
      });
  },
});

export const {
  clearError,
  setLoading,
  setProfileLoading,
  updateUser,
  updateUserProfile,
  setEmailVerified,
  setProfileCompletion,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectUserProfile = (state: { auth: AuthState }) => state.auth.userProfile;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectIsProfileLoading = (state: { auth: AuthState }) => state.auth.isProfileLoading;
export const selectError = (state: { auth: AuthState }) => state.auth.error;
export const selectProfileError = (state: { auth: AuthState }) => state.auth.profileError;
export const selectIsEmailVerified = (state: { auth: AuthState }) => state.auth.isEmailVerified;
export const selectProfileCompletion = (state: { auth: AuthState }) => state.auth.profileCompletion;
// Note: selectToken removed - tokens are now in httpOnly cookies

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