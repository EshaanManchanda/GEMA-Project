import { ApiService } from '../api';
import { extractApiData, logApiResponse } from '../../utils/apiResponseHandler';

export interface Collection {
  _id: string;
  id: string;
  title: string;
  description: string;
  icon: string;
  featuredImage?: string;
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
  icon?: string;
  iconFile?: File;
  featuredImage?: string;
  featuredImageFile?: File;
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

  // Create collection with file uploads
  createCollection: async (formData: CollectionFormData): Promise<{ collection: Collection }> => {
    try {
      const data = new FormData();

      // Add text fields
      data.append('title', formData.title);
      data.append('description', formData.description);

      if (formData.count) data.append('count', formData.count);
      if (formData.category) data.append('category', formData.category);
      if (formData.sortOrder !== undefined) data.append('sortOrder', String(formData.sortOrder));
      if (formData.isActive !== undefined) data.append('isActive', String(formData.isActive));
      if (formData.slug) data.append('slug', formData.slug);

      // Add icon (file or URL)
      if (formData.iconFile) {
        data.append('icon', formData.iconFile);
      } else if (formData.icon) {
        data.append('icon', formData.icon);
      }

      // Add featured image (file or URL)
      if (formData.featuredImageFile) {
        data.append('featuredImage', formData.featuredImageFile);
      } else if (formData.featuredImage) {
        data.append('featuredImage', formData.featuredImage);
      }

      // Add events array
      if (formData.events && formData.events.length > 0) {
        data.append('events', JSON.stringify(formData.events));
      }

      // Add SEO data
      if (formData.seo) {
        data.append('seo', JSON.stringify(formData.seo));
      }

      const response = await ApiService.post('/admin/collections', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      logApiResponse('POST /admin/collections', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /admin/collections', null, error);
      throw error;
    }
  },

  // Update collection with file uploads
  updateCollection: async (id: string, formData: CollectionFormData): Promise<{ collection: Collection }> => {
    try {
      const data = new FormData();

      // Add text fields (only if provided)
      if (formData.title) data.append('title', formData.title);
      if (formData.description) data.append('description', formData.description);
      if (formData.count !== undefined) data.append('count', formData.count);
      if (formData.category !== undefined) data.append('category', formData.category);
      if (formData.sortOrder !== undefined) data.append('sortOrder', String(formData.sortOrder));
      if (formData.isActive !== undefined) data.append('isActive', String(formData.isActive));
      if (formData.slug !== undefined) data.append('slug', formData.slug);

      // Add icon (file or URL)
      if (formData.iconFile) {
        data.append('icon', formData.iconFile);
      } else if (formData.icon !== undefined) {
        data.append('icon', formData.icon);
      }

      // Add featured image (file or URL)
      if (formData.featuredImageFile) {
        data.append('featuredImage', formData.featuredImageFile);
      } else if (formData.featuredImage !== undefined) {
        data.append('featuredImage', formData.featuredImage);
      }

      // Add events array
      if (formData.events !== undefined) {
        data.append('events', JSON.stringify(formData.events));
      }

      // Add SEO data
      if (formData.seo !== undefined) {
        data.append('seo', JSON.stringify(formData.seo));
      }

      const response = await ApiService.put(`/admin/collections/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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