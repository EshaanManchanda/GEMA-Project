import { ApiService } from '../api';

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface Feature {
  title: string;
  description: string;
  icon: string;
}

export interface TrustSignals {
  yearsInBusiness: number;
  certifications: string[];
  awards: string[];
}

export interface SEOContent {
  _id: string;
  page: 'homepage' | 'about' | 'contact';
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  faqItems: FAQItem[];
  features: Feature[];
  trustSignals: TrustSignals;
  isActive: boolean;
  updatedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const seoContentAPI = {
  // Public
  getPublicSEOContent: async (page: string): Promise<{ seoContent: SEOContent }> => {
    const response = await ApiService.get(`/seo-content/${page}`);
    return response.data;
  },

  // Admin
  admin: {
    getAllSEOContent: async (params?: {
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const response = await ApiService.get('/seo-content', { params });
      return response.data;
    },

    getSEOContent: async (page: string): Promise<SEOContent> => {
      const response = await ApiService.get(`/seo-content/${page}`);
      return response.data.seoContent;
    },

    createSEOContent: async (data: Partial<SEOContent>): Promise<SEOContent> => {
      const response = await ApiService.post('/seo-content', data);
      return response.data.seoContent;
    },

    updateSEOContent: async (page: string, data: Partial<SEOContent>): Promise<SEOContent> => {
      const response = await ApiService.put(`/seo-content/${page}`, data);
      return response.data.seoContent;
    },

    deleteSEOContent: async (page: string): Promise<void> => {
      await ApiService.delete(`/seo-content/${page}`);
    }
  }
};

export default seoContentAPI;
