import { ApiService } from '../api';

export interface Banner {
  _id: string;
  title: string;
  description?: string;
  imageAsset?: {
    _id: string;
    url: string;
    /** Direct Cloudinary CDN URL, bypassing the /api/media/file/:uuid proxy
     * redirect. Present when the backend populate selects publicId+provider
     * (see homepage.service.ts). Prefer this over `url` when set. */
    directUrl?: string;
    filename: string;
    width?: number;
    height?: number;
    altText?: string;
  };
  link?: string;
  ctaText?: string;
  ctaLink?: string;
  displayOrder: number;
  status: 'active' | 'inactive' | 'scheduled';
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  titleVisible: boolean;
  descriptionVisible: boolean;
  ctaVisible: boolean;
  objectFit?: 'cover' | 'contain' | 'fill';
  objectPosition?: 'center' | 'top' | 'bottom' | 'left center' | 'right center' |
                   'top left' | 'top right' | 'bottom left' | 'bottom right';
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const bannerAPI = {
  // Public
  getActiveBanners: async (): Promise<{ banners: Banner[] }> => {
    const response = await ApiService.get('/banners/active');
    return response.data;
  },

  // Admin
  admin: {
    getAllBanners: async (params?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const response = await ApiService.get('/banners', { params });
      return response.data;
    },

    getBannerById: async (id: string): Promise<Banner> => {
      const response = await ApiService.get(`/banners/${id}`);
      return response.data.banner;
    },

    createBanner: async (data: Partial<Banner>): Promise<Banner> => {
      const response = await ApiService.post('/banners', data);
      return response.data.banner;
    },

    updateBanner: async (id: string, data: Partial<Banner>): Promise<Banner> => {
      const response = await ApiService.put(`/banners/${id}`, data);
      return response.data.banner;
    },

    deleteBanner: async (id: string): Promise<void> => {
      await ApiService.delete(`/banners/${id}`);
    },

    updateDisplayOrders: async (orders: { id: string; displayOrder: number }[]): Promise<void> => {
      await ApiService.patch('/banners/display-orders', { orders });
    }
  }
};

export default bannerAPI;
