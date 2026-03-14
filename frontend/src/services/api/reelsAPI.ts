import { ApiService } from '../api';

export interface Reel {
  _id: string;
  title: string;
  description?: string;
  videoSourceType: 'uploaded' | 'youtube' | 'instagram';
  videoAsset?: {
    _id: string;
    url: string;
    thumbnailUrl?: string;
    duration?: number;
    mimeType: string;
    size?: number;
  };
  externalVideoUrl?: string;
  embedCode?: string;
  thumbnailAsset?: {
    _id: string;
    url: string;
    thumbnailUrl?: string;
  };
  likes: number;
  viewsCount: number;
  shareCount: number;
  visibility: 'public' | 'draft' | 'archived';
  isFeatured: boolean;
  displayOrder: number;
  tags: string[];
  duration?: number;
  showLikeButton: boolean;
  showShareButton: boolean;
  showTitle: boolean;
  linkedEvent?: {
    _id: string;
    title: string;
    slug: string;
    pricing: any;
    location: any;
    dateSchedule: any[];
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ReelsResponse {
  success: boolean;
  message: string;
  data: {
    reels: Reel[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface SingleReelResponse {
  success: boolean;
  message: string;
  data: {
    reel: Reel;
  };
}

// ========================================
// PUBLIC API
// ========================================

/**
 * Get public reels (visibility='public')
 */
export const getPublicReels = async (params?: {
  page?: number;
  limit?: number;
}): Promise<ReelsResponse> => {
  const response = await ApiService.get('/reels', { params });
  return response.data;
};

/**
 * Get single public reel by ID
 */
export const getReelById = async (id: string): Promise<SingleReelResponse> => {
  const response = await ApiService.get(`/reels/${id}`);
  return response.data;
};

/**
 * Increment view count
 */
export const incrementView = async (id: string): Promise<void> => {
  await ApiService.post(`/reels/${id}/view`);
};

/**
 * Toggle like (add or remove like)
 */
export const toggleLike = async (
  id: string,
  increment: boolean = true
): Promise<{ liked: boolean; likes: number }> => {
  const response = await ApiService.post(`/reels/${id}/like`, { increment });
  return response.data.data;
};

// ========================================
// ADMIN API
// ========================================

/**
 * Get all reels (admin) with filters
 */
export const getAllReels = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  visibility?: 'public' | 'draft' | 'archived';
  isFeatured?: boolean;
}): Promise<ReelsResponse> => {
  const response = await ApiService.get('/admin/reels', { params });
  return response.data;
};

/**
 * Get single reel by ID (admin)
 */
export const getAdminReelById = async (id: string): Promise<SingleReelResponse> => {
  const response = await ApiService.get(`/admin/reels/${id}`);
  return response.data;
};

/**
 * Create new reel
 */
export const createReel = async (data: {
  title: string;
  description?: string;
  videoSourceType?: 'uploaded' | 'youtube' | 'instagram';
  videoAsset?: string; // MediaAsset ID (for uploaded videos)
  externalVideoUrl?: string; // For YouTube/Instagram
  embedCode?: string; // For Instagram embed
  thumbnailAsset?: string; // MediaAsset ID
  visibility?: 'public' | 'draft' | 'archived';
  isFeatured?: boolean;
  displayOrder?: number;
  duration?: number;
  tags?: string[];
  showLikeButton?: boolean;
  showShareButton?: boolean;
  showTitle?: boolean;
  linkedEvent?: string; // Event ID
}): Promise<SingleReelResponse> => {
  const response = await ApiService.post('/admin/reels', data);
  return response.data;
};

/**
 * Update reel
 */
export const updateReel = async (
  id: string,
  data: Partial<{
    title: string;
    description: string;
    videoSourceType: 'uploaded' | 'youtube' | 'instagram';
    videoAsset: string;
    externalVideoUrl: string;
    embedCode: string;
    thumbnailAsset: string;
    visibility: 'public' | 'draft' | 'archived';
    isFeatured: boolean;
    displayOrder: number;
    duration: number;
    tags: string[];
    showLikeButton: boolean;
    showShareButton: boolean;
    showTitle: boolean;
    linkedEvent: string;
  }>
): Promise<SingleReelResponse> => {
  const response = await ApiService.put(`/admin/reels/${id}`, data);
  return response.data;
};

/**
 * Delete reel (hard delete)
 */
export const deleteReel = async (id: string): Promise<void> => {
  await ApiService.delete(`/admin/reels/${id}`);
};

/**
 * Update reel visibility
 */
export const updateVisibility = async (
  id: string,
  visibility: 'public' | 'draft' | 'archived'
): Promise<SingleReelResponse> => {
  const response = await ApiService.patch(`/admin/reels/${id}/visibility`, {
    visibility
  });
  return response.data;
};

/**
 * Bulk update display orders
 */
export const updateDisplayOrders = async (
  reels: Array<{ id: string; displayOrder: number }>
): Promise<void> => {
  await ApiService.patch('/admin/reels/display-orders', { reels });
};

// Default export with all methods
export default {
  // Public
  getPublicReels,
  getReelById,
  incrementView,
  toggleLike,
  // Admin
  getAllReels,
  getAdminReelById,
  createReel,
  updateReel,
  deleteReel,
  updateVisibility,
  updateDisplayOrders
};
