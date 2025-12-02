import { ApiService } from '../api';
import { extractApiData, logApiResponse } from '../../utils/apiResponseHandler';

export interface Collection {
  _id: string;
  id: string;
  title: string;
  description: string;
  icon: string; // OLD: URL (deprecated)
  iconAsset?: any; // NEW: MediaAsset ref (populated or ID)
  featuredImage?: string; // OLD: URL (deprecated)
  featuredImageAsset?: any; // NEW: MediaAsset ref (populated or ID)
  count: string;
  category?: string;
  events: any[];
  eventsCount?: number;
  isActive: boolean;
  sortOrder: number;
  slug?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CollectionFormData {
  title: string;
  description: string;
  iconAsset?: string; // MediaAsset._id
  featuredImageAsset?: string; // MediaAsset._id
  count?: string;
  category?: string;
  events?: string[];
  isActive?: boolean;
  sortOrder?: number;
  slug?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
}

export interface CollectionStats {
  totalCollections: number;
  activeCollections: number;
  inactiveCollections: number;
  categoriesCount: number;
  topCollections: {
    _id: string;
    title: string;
    eventsCount: number;
  }[];
}

export interface CollectionsResponse {
  collections: Collection[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCollections: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const collectionsAPI = {
  getAllCollections: async (params?: any): Promise<CollectionsResponse> => {
    try {
      const response = await ApiService.get('/collections', { params });
      logApiResponse('GET /collections', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /collections', null, error);
      throw error;
    }
  },

  getCollectionById: async (id: string): Promise<{ collection: Collection }> => {
    try {
      const response = await ApiService.get(`/collections/${id}`);
      logApiResponse(`GET /collections/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`GET /collections/${id}`, null, error);
      throw error;
    }
  },

  // ============= ADMIN FUNCTIONS (require authentication) =============

  // Get all collections (admin - includes inactive)
  getAdminCollections: async (params?: any): Promise<CollectionsResponse> => {
    try {
      const response = await ApiService.get('/admin/collections', { params });
      logApiResponse('GET /admin/collections', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /admin/collections', null, error);
      throw error;
    }
  },

  // Get collection stats
  getCollectionStats: async (): Promise<CollectionStats> => {
    try {
      const response = await ApiService.get('/admin/collections/stats');
      logApiResponse('GET /admin/collections/stats', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('GET /admin/collections/stats', null, error);
      throw error;
    }
  },

  // Create collection
  createCollection: async (formData: CollectionFormData): Promise<{ collection: Collection }> => {
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        count: formData.count,
        category: formData.category,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        slug: formData.slug,
        iconAsset: formData.iconAsset,
        featuredImageAsset: formData.featuredImageAsset,
        events: formData.events,
        seo: formData.seo
      };

      const response = await ApiService.post('/admin/collections', payload);
      logApiResponse('POST /admin/collections', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /admin/collections', null, error);
      throw error;
    }
  },

  // Update collection
  updateCollection: async (id: string, formData: CollectionFormData): Promise<{ collection: Collection }> => {
    try {
      const payload: any = {};

      // Only add fields that are provided
      if (formData.title !== undefined) payload.title = formData.title;
      if (formData.description !== undefined) payload.description = formData.description;
      if (formData.count !== undefined) payload.count = formData.count;
      if (formData.category !== undefined) payload.category = formData.category;
      if (formData.sortOrder !== undefined) payload.sortOrder = formData.sortOrder;
      if (formData.isActive !== undefined) payload.isActive = formData.isActive;
      if (formData.slug !== undefined) payload.slug = formData.slug;
      if (formData.iconAsset !== undefined) payload.iconAsset = formData.iconAsset;
      if (formData.featuredImageAsset !== undefined) payload.featuredImageAsset = formData.featuredImageAsset;
      if (formData.events !== undefined) payload.events = formData.events;
      if (formData.seo !== undefined) payload.seo = formData.seo;

      const response = await ApiService.put(`/admin/collections/${id}`, payload);
      logApiResponse(`PUT /admin/collections/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /admin/collections/${id}`, null, error);
      throw error;
    }
  },

  // Delete collection (soft delete)
  deleteCollection: async (id: string): Promise<void> => {
    try {
      const response = await ApiService.delete(`/admin/collections/${id}`);
      logApiResponse(`DELETE /admin/collections/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`DELETE /admin/collections/${id}`, null, error);
      throw error;
    }
  },

  // Bulk update collections
  bulkUpdateCollections: async (collectionIds: string[], updateData: any): Promise<{ modifiedCount: number; matchedCount: number }> => {
    try {
      const response = await ApiService.patch('/admin/collections/bulk', {
        collectionIds,
        updateData
      });
      logApiResponse('PATCH /admin/collections/bulk', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('PATCH /admin/collections/bulk', null, error);
      throw error;
    }
  },

  // Add event to collection
  addEventToCollection: async (collectionId: string, eventId: string): Promise<{ collection: Collection }> => {
    try {
      const response = await ApiService.post(`/admin/collections/${collectionId}/events`, { eventId });
      logApiResponse(`POST /admin/collections/${collectionId}/events`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`POST /admin/collections/${collectionId}/events`, null, error);
      throw error;
    }
  },

  // Remove event from collection
  removeEventFromCollection: async (collectionId: string, eventId: string): Promise<{ collection: Collection }> => {
    try {
      const response = await ApiService.delete(`/admin/collections/${collectionId}/events/${eventId}`);
      logApiResponse(`DELETE /admin/collections/${collectionId}/events/${eventId}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`DELETE /admin/collections/${collectionId}/events/${eventId}`, null, error);
      throw error;
    }
  },
};

export default collectionsAPI;