import { ApiService } from '../api';
import { extractApiData, logApiResponse } from '../../utils/apiResponseHandler';

export interface Collection {
  _id: string;
  id: string;
  title: string;
  description: string;
  icon: string;
  count: string;
  category?: string;
  events: any[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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

  // Admin functions (require authentication)
  createCollection: async (collectionData: Partial<Collection>): Promise<{ collection: Collection }> => {
    try {
      const response = await ApiService.post('/collections', collectionData);
      logApiResponse('POST /collections', response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse('POST /collections', null, error);
      throw error;
    }
  },

  updateCollection: async (id: string, collectionData: Partial<Collection>): Promise<{ collection: Collection }> => {
    try {
      const response = await ApiService.put(`/collections/${id}`, collectionData);
      logApiResponse(`PUT /collections/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`PUT /collections/${id}`, null, error);
      throw error;
    }
  },

  deleteCollection: async (id: string): Promise<void> => {
    try {
      const response = await ApiService.delete(`/collections/${id}`);
      logApiResponse(`DELETE /collections/${id}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`DELETE /collections/${id}`, null, error);
      throw error;
    }
  },

  addEventToCollection: async (collectionId: string, eventId: string): Promise<{ collection: Collection }> => {
    try {
      const response = await ApiService.post(`/collections/${collectionId}/events`, { eventId });
      logApiResponse(`POST /collections/${collectionId}/events`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`POST /collections/${collectionId}/events`, null, error);
      throw error;
    }
  },

  removeEventFromCollection: async (collectionId: string, eventId: string): Promise<{ collection: Collection }> => {
    try {
      const response = await ApiService.delete(`/collections/${collectionId}/events/${eventId}`);
      logApiResponse(`DELETE /collections/${collectionId}/events/${eventId}`, response);
      return extractApiData(response);
    } catch (error) {
      logApiResponse(`DELETE /collections/${collectionId}/events/${eventId}`, null, error);
      throw error;
    }
  },
};

export default collectionsAPI;