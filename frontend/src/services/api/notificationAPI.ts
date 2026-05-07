import { ApiService } from '../api';

// Notification interfaces
export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  shortMessage?: string;
  richContent?: {
    html?: string;
    imageUrl?: string;
    videoUrl?: string;
    attachments?: string[];
  };
  relatedId?: string;
  relatedType?: 'booking' | 'event' | 'order' | 'user' | 'payment' | 'review';
  metadata?: Record<string, any>;
  channels: NotificationChannel[];
  delivery: NotificationDelivery[];
  isRead: boolean;
  readAt?: string;
  clickedAt?: string;
  clickCount: number;
  actions?: NotificationAction[];
  scheduledFor?: string;
  expiresAt?: string;
  targetAudience?: {
    userRole?: string[];
    userSegment?: string[];
    location?: string[];
  };
  personalizationData?: Record<string, any>;
  campaignId?: string;
  variant?: string;
  isGrouped?: boolean;
  groupId?: string;
  groupCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'booking_confirmed' 
  | 'booking_cancelled' 
  | 'payment_success' 
  | 'payment_failed'
  | 'event_reminder' 
  | 'event_approved' 
  | 'event_rejected' 
  | 'vendor_application_approved'
  | 'vendor_application_rejected' 
  | 'review_received' 
  | 'payout_processed'
  | 'system_maintenance' 
  | 'promotional' 
  | 'welcome' 
  | 'password_reset' 
  | 'email_verification';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
  style?: 'primary' | 'secondary' | 'danger' | 'success';
}

export interface NotificationDelivery {
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  externalId?: string;
}

export interface CreateNotificationData {
  userId?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  shortMessage?: string;
  richContent?: {
    html?: string;
    imageUrl?: string;
    videoUrl?: string;
    attachments?: string[];
  };
  relatedId?: string;
  relatedType?: 'booking' | 'event' | 'order' | 'user' | 'payment' | 'review';
  metadata?: Record<string, any>;
  channels?: NotificationChannel[];
  actions?: NotificationAction[];
  scheduledFor?: string;
  expiresAt?: string;
  targetAudience?: {
    userRole?: string[];
    userSegment?: string[];
    location?: string[];
  };
  personalizationData?: Record<string, any>;
  campaignId?: string;
  variant?: string;
}

export interface NotificationAnalytics {
  totalNotifications: number;
  totalRead: number;
  totalClicked: number;
  readRate: number;
  clickRate: number;
  byType: Array<{
    _id: string;
    count: number;
    readCount: number;
    clickCount: number;
  }>;
}

const notificationAPI = {
  // User: Get user's notifications
  getUserNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
    priority?: NotificationPriority;
  }) => {
    try {
      const response = await ApiService.get('/notifications/my', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // User: Get single notification
  getNotification: async (id: string) => {
    try {
      const response = await ApiService.get(`/notifications/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // User: Mark notification as read
  markAsRead: async (id: string) => {
    try {
      const response = await ApiService.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // User: Mark notification as clicked
  markAsClicked: async (id: string) => {
    try {
      const response = await ApiService.put(`/notifications/${id}/clicked`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // User: Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await ApiService.put('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // User: Get unread count
  getUnreadCount: async () => {
    try {
      const response = await ApiService.get('/notifications/unread-count');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get all notifications
  getAllNotifications: async (params?: {
    page?: number;
    limit?: number;
    type?: NotificationType;
    priority?: NotificationPriority;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await ApiService.get('/notifications', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Create notification
  createNotification: async (notificationData: CreateNotificationData) => {
    try {
      const response = await ApiService.post('/notifications', notificationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Update notification
  updateNotification: async (id: string, notificationData: Partial<CreateNotificationData>) => {
    try {
      const response = await ApiService.put(`/notifications/${id}`, notificationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Delete notification
  deleteNotification: async (id: string) => {
    try {
      const response = await ApiService.delete(`/notifications/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get notification analytics
  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const response = await ApiService.get('/notifications/analytics/overview', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Send bulk notifications
  sendBulkNotifications: async (data: {
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    channels?: NotificationChannel[];
    scheduledFor?: string;
    expiresAt?: string;
  }) => {
    try {
      const response = await ApiService.post('/notifications/bulk/send', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default notificationAPI;