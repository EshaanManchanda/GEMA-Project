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

// NOTE: ApiService methods already unwrap axios response.data,
// so they return the JSON body directly ({ success, message, data }).
// Do NOT access .data again — that would double-unwrap.

export const getPublicReels = async (params?: {
  page?: number;
  limit?: number;
}): Promise<ReelsResponse> => {
  return ApiService.get('/reels', { params }) as unknown as Promise<ReelsResponse>;
};

export const getReelById = async (id: string): Promise<SingleReelResponse> => {
  return ApiService.get(`/reels/${id}`) as unknown as Promise<SingleReelResponse>;
};

export const incrementView = async (id: string): Promise<void> => {
  await ApiService.post(`/reels/${id}/view`);
};

export const toggleLike = async (
  id: string,
  increment: boolean = true
): Promise<{ liked: boolean; likes: number }> => {
  const response = await ApiService.post(`/reels/${id}/like`, { increment });
  return response.data;
};

// ========================================
// ADMIN API
// ========================================

export const getAllReels = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  visibility?: 'public' | 'draft' | 'archived';
  isFeatured?: boolean;
}): Promise<ReelsResponse> => {
  return ApiService.get('/admin/reels', { params }) as unknown as Promise<ReelsResponse>;
};

export const getAdminReelById = async (id: string): Promise<SingleReelResponse> => {
  return ApiService.get(`/admin/reels/${id}`) as unknown as Promise<SingleReelResponse>;
};

export const createReel = async (data: {
  title: string;
  description?: string;
  videoSourceType?: 'uploaded' | 'youtube' | 'instagram';
  videoAsset?: string;
  externalVideoUrl?: string;
  embedCode?: string;
  thumbnailAsset?: string;
  visibility?: 'public' | 'draft' | 'archived';
  isFeatured?: boolean;
  displayOrder?: number;
  duration?: number;
  tags?: string[];
  showLikeButton?: boolean;
  showShareButton?: boolean;
  showTitle?: boolean;
  linkedEvent?: string;
}): Promise<SingleReelResponse> => {
  return ApiService.post('/admin/reels', data) as unknown as Promise<SingleReelResponse>;
};

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
  return ApiService.put(`/admin/reels/${id}`, data) as unknown as Promise<SingleReelResponse>;
};

export const deleteReel = async (id: string): Promise<void> => {
  await ApiService.delete(`/admin/reels/${id}`);
};

export const updateVisibility = async (
  id: string,
  visibility: 'public' | 'draft' | 'archived'
): Promise<SingleReelResponse> => {
  return ApiService.patch(`/admin/reels/${id}/visibility`, {
    visibility
  }) as unknown as Promise<SingleReelResponse>;
};

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
