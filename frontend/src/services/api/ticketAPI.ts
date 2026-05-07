import api from '../api';

export interface Ticket {
  _id: string;
  ticketNumber: string;
  qrCode: string;
  qrCodeImage: string;
  attendeeName: string;
  attendeeEmail: string;
  price: number;
  currency: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  validFrom: string;
  validUntil: string;
  eventId: {
    _id: string;
    title: string;
    location: {
      address: string;
      city: string;
    };
    dateSchedule: Array<{
      startDate: string;
      endDate: string;
    }>;
    images?: string[];
  };
  orderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketsResponse {
  success: boolean;
  tickets: Ticket[];
  message?: string;
}

export interface TicketResponse {
  success: boolean;
  ticket: Ticket;
  message?: string;
}

class TicketAPI {
  async getTicketsByOrder(orderId: string): Promise<TicketsResponse> {
    try {
      const response = await api.get(`/tickets/order/${orderId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch tickets');
    }
  }

  async getTicketsByUser(): Promise<TicketsResponse> {
    try {
      const response = await api.get('/tickets/user');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user tickets');
    }
  }

  async getTicketById(ticketId: string): Promise<TicketResponse> {
    try {
      const response = await api.get(`/tickets/${ticketId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch ticket');
    }
  }

  async downloadTicket(ticketId: string): Promise<Blob> {
    try {
      const response = await api.get(`/tickets/${ticketId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to download ticket');
    }
  }

  async validateTicket(qrCode: string): Promise<{ valid: boolean; ticket?: Ticket; message?: string }> {
    try {
      const response = await api.post('/tickets/validate', { qrCode });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to validate ticket');
    }
  }

  async updateTicketStatus(ticketId: string, status: 'active' | 'used' | 'cancelled' | 'expired'): Promise<TicketResponse> {
    try {
      const response = await api.patch(`/tickets/${ticketId}/status`, { status });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update ticket status');
    }
  }

  async generateMissingTickets(orderId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      orderId: string;
      orderNumber: string;
      ticketsGenerated: number;
      tickets: Ticket[];
    };
  }> {
    try {
      const response = await api.post('/tickets/generate-missing', { orderId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate tickets');
    }
  }
}

export const ticketAPI = new TicketAPI();
export default ticketAPI;