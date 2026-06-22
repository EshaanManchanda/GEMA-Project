import api from '../api';

export interface Partnership {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    partnershipType: 'vendor' | 'influencer' | 'school' | 'affiliate' | 'other';
    website?: string;
    message: string;
    agreeToTerms: boolean;
    status: 'pending' | 'contacted' | 'approved' | 'rejected';
    contactedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    notes?: string;
    plans?: string;
    contents?: string;
    socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        youtube?: string;
    };
    videoAttachments?: Array<{
        originalName?: string;
        filename?: string;
        url: string;
        size?: number;
        mimetype?: string;
        provider?: "local" | "cloudinary";
        publicId?: string;
        cloudinaryUrl?: string;
        uploadedAt?: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface PartnershipStats {
    statusCounts: { _id: string; count: number }[];
    totalCount: { total: number }[];
    typeCounts: { _id: string; count: number }[];
}

export interface GetPartnershipsParams {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}

export interface GetPartnershipsResponse {
    success: boolean;
    count: number;
    pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        limit: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    partnerships: Partnership[];
    stats: PartnershipStats;
}

const partnershipAPI = {
    // Public - submit form
    submit: async (data: any) => {
        const response = await api.post('/partnerships', data);
        return response.data;
    },

    // Admin - get all
    getAll: async (params?: GetPartnershipsParams): Promise<GetPartnershipsResponse> => {
        const response = await api.get('/partnerships', { params });
        return response.data;
    },

    // Public - get directory
    getPublicDirectory: async (params?: GetPartnershipsParams): Promise<GetPartnershipsResponse> => {
        const response = await api.get('/partnerships/directory', { params });
        return response.data;
    },

    // Public - get public partner by ID
    getPublicById: async (id: string) => {
        const response = await api.get(`/partnerships/directory/${id}`);
        return response.data;
    },

    // Admin - get stats
    getStats: async () => {
        const response = await api.get('/partnerships/stats');
        return response.data;
    },

    // Admin - update status
    updateStatus: async (id: string, updates: { status?: string; notes?: string }) => {
        const response = await api.patch(`/partnerships/${id}`, updates);
        return response.data;
    },

    // Admin - update partnership full details
    update: async (id: string, updates: any) => {
        const response = await api.put(`/partnerships/${id}`, updates);
        return response.data;
    },

    // Admin - delete
    delete: async (id: string) => {
        const response = await api.delete(`/partnerships/${id}`);
        return response.data;
    }
};

export default partnershipAPI;
