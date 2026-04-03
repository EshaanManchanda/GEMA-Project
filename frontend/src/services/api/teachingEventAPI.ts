import { ApiService } from '../api';
import { extractApiData } from '../../utils/apiResponseHandler';

export interface TeachingEventFilters {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    type?: string;
    eventType?: 'Online' | 'Offline';
    city?: string;
    startDate?: string;
    endDate?: string;
    minPrice?: number;
    maxPrice?: number;
}

const EDUCATIONAL_TYPES = 'Class,Course,Workshop,Bootcamp,Masterclass';

const teachingEventAPI = {
    /**
     * Get all teaching events (public) — redirected to /events with educational type filter
     */
    getAll: async (params?: TeachingEventFilters) => {
        try {
            const response = await ApiService.get('/events', {
                params: { ...params, type: EDUCATIONAL_TYPES },
            });
            return extractApiData(response);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get public teaching event by ID or Slug — redirected to /events/:id
     */
    getById: async (id: string) => {
        try {
            const response = await ApiService.get(`/events/${id}`);
            const data = extractApiData(response) as any;
            // Normalize: return as { teachingEvent } for backward compat
            return { teachingEvent: data?.event || data?.teachingEvent || data };
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get unique cities — redirected to /events/cities
     */
    getCities: async (): Promise<string[]> => {
        try {
            const response = await ApiService.get('/events/cities');
            return extractApiData(response) as any;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get categories for educational events — redirected to /events/categories
     */
    getCategories: async (): Promise<any[]> => {
        try {
            const response = await ApiService.get('/events/categories');
            return extractApiData(response) as any;
        } catch (error) {
            throw error;
        }
    }
};

export default teachingEventAPI;
