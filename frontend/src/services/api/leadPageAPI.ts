import api from '../api';

export interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  submittedAt: string;
}

export interface LeadPageEvent {
  _id: string;
  title: string;
  description?: string;
  images?: string[];
  imageUrls?: string[];
  slug?: string;
  category?: string;
  location?: { city: string; address: string };
  ageRange?: [number, number];
  price?: number;
  currency?: string;
  vendorId?: { _id: string; businessName?: string; fullName?: string; logo?: string; about?: string };
  teacherId?: { _id: string; fullName?: string };
  faqs?: Array<{ question: string; answer: string }>;
  dateSchedule?: Array<{ date?: string; startDate?: string; endDate?: string }>;
  tags?: string[];
}

export interface ILeadPage {
  _id: string;
  event: LeadPageEvent;
  isActive: boolean;
  viewCount: number;
  leads: Lead[];
  leadCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: { firstName: string; lastName: string; email: string };
}

// ─── Admin APIs ───────────────────────────────────────────────────────────────

/** Create a lead page for an event */
export const createLeadPage = async (eventId: string): Promise<ILeadPage> => {
  const response = await api.post('/admin/lead-pages', { eventId });
  return response.data.data;
};

/** Get all lead pages (admin) */
export const getAdminLeadPages = async (params?: {
  search?: string;
  status?: 'active' | 'inactive' | '';
}): Promise<ILeadPage[]> => {
  const response = await api.get('/admin/lead-pages', { params });
  return response.data.data;
};

/** Toggle active/inactive */
export const toggleLeadPage = async (id: string): Promise<ILeadPage> => {
  const response = await api.patch(`/admin/lead-pages/${id}/toggle`);
  return response.data.data;
};

/** Delete a lead page */
export const deleteLeadPage = async (id: string): Promise<void> => {
  await api.delete(`/admin/lead-pages/${id}`);
};

/** Delete a specific lead from a lead page */
export const deleteLead = async (leadPageId: string, leadId: string): Promise<void> => {
  await api.delete(`/admin/lead-pages/${leadPageId}/leads/${leadId}`);
};

// ─── Public APIs ──────────────────────────────────────────────────────────────

/** Get all active lead pages (public) */
export const getAllActiveLeadPages = async (): Promise<ILeadPage[]> => {
  const response = await api.get('/lead-pages');
  return response.data.data;
};

/** Get lead page data for a specific event (public) */
export const getLeadPageByEvent = async (eventId: string): Promise<ILeadPage> => {
  const response = await api.get(`/lead-pages/${eventId}`);
  return response.data.data;
};

/** Submit a lead */
export const submitLead = async (
  eventId: string,
  data: { name: string; email?: string; phone?: string; message?: string }
): Promise<{ message: string }> => {
  const response = await api.post(`/lead-pages/${eventId}/lead`, data);
  return response.data;
};
