import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import settingsAPI from '@services/api/settingsAPI';
import { RootState } from '../index';

interface SocialSettings {
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
}

interface SettingsState {
  socialSettings: SocialSettings;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: SettingsState = {
  socialSettings: {
    facebookUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    linkedinUrl: ''
  },
  isLoading: false,
  error: null,
  lastFetched: null
};

// Async thunks
export const fetchSocialSettings = createAsyncThunk(
  'settings/fetchSocialSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await settingsAPI.getSocialSettings();
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch social settings';
      return rejectWithValue(message);
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearSettingsError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch social settings
      .addCase(fetchSocialSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSocialSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.socialSettings = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchSocialSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

// Actions
export const { clearSettingsError } = settingsSlice.actions;

// Selectors
export const selectSocialSettings = (state: RootState) => state.settings.socialSettings;
export const selectSettingsLoading = (state: RootState) => state.settings.isLoading;
export const selectSettingsError = (state: RootState) => state.settings.error;
export const selectSettingsLastFetched = (state: RootState) => state.settings.lastFetched;

export default settingsSlice.reducer;
