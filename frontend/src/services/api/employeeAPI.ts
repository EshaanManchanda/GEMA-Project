import { ApiService } from '../api';

const employeeAPI = {
  // Dashboard stats
  getDashboardStats: async () => {
    try {
      const response = await ApiService.get('/employee/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Task management
  getTasks: async (params?: any) => {
    try {
      const response = await ApiService.get('/employee/tasks', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTaskStatus: async (taskId: string, status: string) => {
    try {
      const response = await ApiService.put(`/employee/tasks/${taskId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Event review and approval
  getPendingEvents: async (params?: any) => {
    try {
      const response = await ApiService.get('/employee/events/pending', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  reviewEvent: async (eventId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await ApiService.put(`/employee/events/${eventId}/review`, {
        action,
        notes
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Support tickets
  getSupportTickets: async (params?: any) => {
    try {
      const response = await ApiService.get('/employee/support-tickets', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateSupportTicket: async (ticketId: string, data: any) => {
    try {
      const response = await ApiService.put(`/employee/support-tickets/${ticketId}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Recent activity
  getRecentActivity: async (params?: any) => {
    try {
      const response = await ApiService.get('/employee/activity', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reports
  generateReport: async (reportType: string, params?: any) => {
    try {
      const response = await ApiService.post(`/employee/reports/${reportType}`, params);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getReports: async (params?: any) => {
    try {
      const response = await ApiService.get('/employee/reports', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default employeeAPI;