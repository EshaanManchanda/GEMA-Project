import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * Media Slice - Redux State Management
 *
 * Manages media assets, filters, pagination, and upload state
 */

export interface MediaAsset {
  _id: string;
  uuid: string; // UUID for secure public access
  filename: string;
  originalName: string;
  url: string; // Now UUID-based URL
  mimeType: string;
  fileExtension: string; // File extension (e.g., .jpg, .png, .mp4)
  size: number;
  category: string;
  folder: string;
  width?: number;
  height?: number;
  createdAt: string;
  publicId?: string;
  localPath?: string;
  tags?: string[];
  variations?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  uploadedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface MediaState {
  assets: MediaAsset[];
  selectedAssets: string[];
  currentAsset: MediaAsset | null;
  filters: {
    category?: string;
    folder?: string;
    mimeType?: string;
    search?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  loading: boolean;
  uploading: boolean;
  error: string | null;
  stats: {
    total: number;
    totalSize: number;
    byCategory: Record<string, { count: number; size: number }>;
    unused: number;
  } | null;
}

const initialState: MediaState = {
  assets: [],
  selectedAssets: [],
  currentAsset: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },
  loading: false,
  uploading: false,
  error: null,
  stats: null
};

// Async Thunks

/**
 * Fetch media assets with filters
 */
export const fetchMedia = createAsyncThunk(
  'media/fetchMedia',
  async (params: {
    category?: string;
    folder?: string;
    mimeType?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const response = await api.get('/media', { params });
    return response.data.data;
  }
);

/**
 * Upload single media file
 */
export const uploadMedia = createAsyncThunk(
  'media/uploadMedia',
  async (data: {
    file: File;
    category: string;
    folder: string;
    tags?: string[];
  }) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('category', data.category);
    formData.append('folder', data.folder);
    if (data.tags && data.tags.length > 0) {
      formData.append('tags', JSON.stringify(data.tags));
    }

    const response = await api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }
);

/**
 * Upload multiple media files with per-file error handling
 */
export const uploadMultipleMedia = createAsyncThunk(
  'media/uploadMultipleMedia',
  async (data: {
    files: File[];
    category: string;
    folder: string;
    tags?: string[];
  }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      data.files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('category', data.category);
      formData.append('folder', data.folder);
      if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
      }

      const response = await api.post('/media/upload-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Return per-file results
      return {
        successful: response.data.data.successful || [],
        failed: response.data.data.failed || [],
        summary: response.data.data.summary || { total: 0, succeeded: 0, failed: 0 }
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Upload failed');
    }
  }
);

/**
 * Delete media asset
 */
export const deleteMedia = createAsyncThunk(
  'media/deleteMedia',
  async (data: { id: string; force?: boolean }) => {
    await api.delete(`/media/${data.id}${data.force ? '?force=true' : ''}`);
    return data.id;
  }
);

/**
 * Bulk delete media assets
 */
export const bulkDeleteMedia = createAsyncThunk(
  'media/bulkDeleteMedia',
  async (data: { ids: string[]; force?: boolean }) => {
    await api.post('/media/bulk-delete', data);
    return data.ids;
  }
);

/**
 * Fetch media statistics
 */
export const fetchMediaStats = createAsyncThunk(
  'media/fetchMediaStats',
  async () => {
    const response = await api.get('/media/stats');
    return response.data.data;
  }
);

/**
 * Update media tags
 */
export const updateMediaTags = createAsyncThunk(
  'media/updateMediaTags',
  async (data: { id: string; tags: string[] }) => {
    const response = await api.patch(`/media/${data.id}`, { tags: data.tags });
    return response.data.data;
  }
);

// Slice

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<MediaState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSelectedAssets: (state, action: PayloadAction<string[]>) => {
      state.selectedAssets = action.payload;
    },
    toggleAssetSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedAssets.indexOf(action.payload);
      if (index > -1) {
        state.selectedAssets.splice(index, 1);
      } else {
        state.selectedAssets.push(action.payload);
      }
    },
    selectAllAssets: (state) => {
      state.selectedAssets = state.assets.map(asset => asset._id);
    },
    clearSelection: (state) => {
      state.selectedAssets = [];
    },
    setCurrentAsset: (state, action: PayloadAction<MediaAsset | null>) => {
      state.currentAsset = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch media
      .addCase(fetchMedia.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMedia.fulfilled, (state, action) => {
        state.loading = false;
        state.assets = action.payload.assets;
        state.pagination = {
          page: action.payload.page || 1,
          limit: action.payload.limit || 20,
          total: action.payload.total,
          pages: action.payload.pages
        };
      })
      .addCase(fetchMedia.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch media';
      })

      // Upload single media
      .addCase(uploadMedia.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadMedia.fulfilled, (state, action) => {
        state.uploading = false;
        state.assets.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(uploadMedia.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.error.message || 'Failed to upload media';
      })

      // Upload multiple media
      .addCase(uploadMultipleMedia.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadMultipleMedia.fulfilled, (state, action) => {
        state.uploading = false;

        // Extract MediaAsset objects from successful uploads
        const newAssets = action.payload.successful.map((result: any) => result.data);
        state.assets = [...newAssets, ...state.assets];
        state.pagination.total += newAssets.length;
      })
      .addCase(uploadMultipleMedia.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.error.message || 'Failed to upload media';
      })

      // Delete media
      .addCase(deleteMedia.fulfilled, (state, action) => {
        state.assets = state.assets.filter(asset => asset._id !== action.payload);
        state.selectedAssets = state.selectedAssets.filter(id => id !== action.payload);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        if (state.currentAsset?._id === action.payload) {
          state.currentAsset = null;
        }
      })

      // Bulk delete media
      .addCase(bulkDeleteMedia.fulfilled, (state, action) => {
        state.assets = state.assets.filter(asset => !action.payload.includes(asset._id));
        state.selectedAssets = [];
        state.pagination.total = Math.max(0, state.pagination.total - action.payload.length);
      })

      // Fetch stats
      .addCase(fetchMediaStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })

      // Update tags
      .addCase(updateMediaTags.fulfilled, (state, action) => {
        const index = state.assets.findIndex(asset => asset._id === action.payload._id);
        if (index > -1) {
          state.assets[index] = action.payload;
        }
        if (state.currentAsset?._id === action.payload._id) {
          state.currentAsset = action.payload;
        }
      });
  }
});

export const {
  setFilters,
  clearFilters,
  setSelectedAssets,
  toggleAssetSelection,
  selectAllAssets,
  clearSelection,
  setCurrentAsset,
  clearError
} = mediaSlice.actions;

export default mediaSlice.reducer;
