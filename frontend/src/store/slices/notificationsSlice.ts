import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import notificationAPI from '../../services/api/notificationAPI';
import type { 
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  CreateNotificationData,
  NotificationAnalytics
} from '../../services/api/notificationAPI';
import { toast } from 'react-hot-toast';

interface NotificationsState {
  notifications: Notification[];
  userNotifications: Notification[];
  unreadNotifications: Notification[];
  currentNotification: Notification | null;
  notificationAnalytics: NotificationAnalytics | null;
  unreadCount: number;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isMarkingRead: boolean;
  error: string | null;
  realTimeConnected: boolean;
}

const initialState: NotificationsState = {
  notifications: [],
  userNotifications: [],
  unreadNotifications: [],
  currentNotification: null,
  notificationAnalytics: null,
  unreadCount: 0,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isMarkingRead: false,
  error: null,
  realTimeConnected: false,
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params: {
    page?: number;
    limit?: number;
    type?: NotificationType;
    status?: NotificationStatus;
    priority?: NotificationPriority;
    startDate?: string;
    endDate?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.getAllNotifications(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch notifications';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserNotifications = createAsyncThunk(
  'notifications/fetchUserNotifications',
  async (params: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.getUserNotifications(params);
      // Handle different response structures
      const data = response.data || response;
      // If data has notifications array, return it; otherwise return data if it's an array
      if (data && typeof data === 'object' && 'notifications' in data) {
        return data.notifications || [];
      }
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch user notifications';
      return rejectWithValue(message);
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.getUnreadCount();
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch unread count';
      return rejectWithValue(message);
    }
  }
);

export const fetchNotificationById = createAsyncThunk(
  'notifications/fetchNotificationById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.getNotificationById(id);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch notification';
      return rejectWithValue(message);
    }
  }
);

export const createNotification = createAsyncThunk(
  'notifications/createNotification',
  async (notificationData: CreateNotificationData, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.createNotification(notificationData);
      toast.success('Notification created successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create notification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateNotification = createAsyncThunk(
  'notifications/updateNotification',
  async (params: {
    id: string;
    notificationData: Partial<CreateNotificationData>;
  }, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.updateNotification(params.id, params.notificationData);
      toast.success('Notification updated successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update notification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationAPI.deleteNotification(id);
      toast.success('Notification deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete notification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.markAsRead(id);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark as read';
      return rejectWithValue(message);
    }
  }
);

export const markAsUnread = createAsyncThunk(
  'notifications/markAsUnread',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.markAsUnread(id);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark as unread';
      return rejectWithValue(message);
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.markAllAsRead();
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark all as read';
      return rejectWithValue(message);
    }
  }
);

export const deleteAllRead = createAsyncThunk(
  'notifications/deleteAllRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.deleteAllRead();
      toast.success('All read notifications deleted!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete read notifications';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const sendNotification = createAsyncThunk(
  'notifications/sendNotification',
  async (params: {
    id: string;
    channels: string[];
  }, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.sendNotification(params.id, params.channels);
      toast.success('Notification sent successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send notification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const scheduleNotification = createAsyncThunk(
  'notifications/scheduleNotification',
  async (params: {
    id: string;
    scheduledAt: string;
  }, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.scheduleNotification(params.id, params.scheduledAt);
      toast.success('Notification scheduled successfully!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to schedule notification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const cancelScheduledNotification = createAsyncThunk(
  'notifications/cancelScheduledNotification',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.cancelScheduledNotification(id);
      toast.success('Scheduled notification cancelled!');
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to cancel notification';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchNotificationAnalytics = createAsyncThunk(
  'notifications/fetchNotificationAnalytics',
  async (params: {
    startDate?: string;
    endDate?: string;
    type?: NotificationType;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.getNotificationAnalytics(params);
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch notification analytics';
      return rejectWithValue(message);
    }
  }
);

export const bulkAction = createAsyncThunk(
  'notifications/bulkAction',
  async (params: {
    notificationIds: string[];
    action: 'read' | 'unread' | 'delete';
  }, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.bulkAction(params.notificationIds, params.action);
      toast.success(`Bulk ${params.action} completed!`);
      return { action: params.action, ids: params.notificationIds };
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to ${params.action} notifications`;
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Notifications slice
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentNotification: (state, action: PayloadAction<Notification | null>) => {
      state.currentNotification = action.payload;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      // Add new notification to the beginning of the list
      state.notifications.unshift(action.payload);
      state.userNotifications.unshift(action.payload);
      
      if (!action.payload.isRead) {
        state.unreadNotifications.unshift(action.payload);
        state.unreadCount += 1;
      }
    },
    updateNotificationInLists: (state, action: PayloadAction<Notification>) => {
      const updateLists = (notifications: Notification[]) => {
        const index = notifications.findIndex(notification => notification._id === action.payload._id);
        if (index !== -1) {
          notifications[index] = action.payload;
        }
      };

      updateLists(state.notifications);
      updateLists(state.userNotifications);
      updateLists(state.unreadNotifications);

      if (state.currentNotification && state.currentNotification._id === action.payload._id) {
        state.currentNotification = action.payload;
      }
    },
    removeNotificationFromLists: (state, action: PayloadAction<string>) => {
      const removeFromLists = (notifications: Notification[]) => {
        return notifications.filter(notification => notification._id !== action.payload);
      };

      const removedFromUnread = state.unreadNotifications.some(n => n._id === action.payload);
      
      state.notifications = removeFromLists(state.notifications);
      state.userNotifications = removeFromLists(state.userNotifications);
      state.unreadNotifications = removeFromLists(state.unreadNotifications);

      if (removedFromUnread) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }

      if (state.currentNotification && state.currentNotification._id === action.payload) {
        state.currentNotification = null;
      }
    },
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const updateReadStatus = (notifications: Notification[]) => {
        const notification = notifications.find(n => n._id === action.payload);
        if (notification && !notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          return true;
        }
        return false;
      };

      const wasUnread = updateReadStatus(state.notifications) || 
                       updateReadStatus(state.userNotifications);
      
      if (wasUnread) {
        state.unreadNotifications = state.unreadNotifications.filter(n => n._id !== action.payload);
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }

      if (state.currentNotification && state.currentNotification._id === action.payload) {
        state.currentNotification.isRead = true;
        state.currentNotification.readAt = new Date().toISOString();
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.userNotifications = [];
      state.unreadNotifications = [];
      state.unreadCount = 0;
    },
    setRealTimeConnection: (state, action: PayloadAction<boolean>) => {
      state.realTimeConnected = action.payload;
    },
    updateUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.error = null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch User Notifications
      .addCase(fetchUserNotifications.fulfilled, (state, action) => {
        // Ensure payload is an array before using filter
        const notifications = Array.isArray(action.payload) ? action.payload : [];
        state.userNotifications = notifications;
        state.unreadNotifications = notifications.filter((n: Notification) => !n.isRead);
      })

      // Fetch Unread Count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })

      // Fetch Notification by ID
      .addCase(fetchNotificationById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotificationById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentNotification = action.payload;
        state.error = null;
      })
      .addCase(fetchNotificationById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.currentNotification = null;
      })

      // Create Notification
      .addCase(createNotification.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createNotification.fulfilled, (state, action) => {
        state.isCreating = false;
        notificationsSlice.caseReducers.addNotification(state, { payload: action.payload, type: '' });
        state.error = null;
      })
      .addCase(createNotification.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })

      // Update Notification
      .addCase(updateNotification.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateNotification.fulfilled, (state, action) => {
        state.isUpdating = false;
        notificationsSlice.caseReducers.updateNotificationInLists(state, { payload: action.payload, type: '' });
        state.error = null;
      })
      .addCase(updateNotification.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })

      // Delete Notification
      .addCase(deleteNotification.pending, (state) => {
        state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.isDeleting = false;
        notificationsSlice.caseReducers.removeNotificationFromLists(state, { payload: action.payload, type: '' });
        state.error = null;
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.isDeleting = false;
        state.error = action.payload as string;
      })

      // Mark as Read
      .addCase(markAsRead.pending, (state) => {
        state.isMarkingRead = true;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.isMarkingRead = false;
        notificationsSlice.caseReducers.markNotificationRead(state, { payload: action.payload._id, type: '' });
      })
      .addCase(markAsRead.rejected, (state) => {
        state.isMarkingRead = false;
      })

      // Mark as Unread
      .addCase(markAsUnread.fulfilled, (state, action) => {
        notificationsSlice.caseReducers.updateNotificationInLists(state, { payload: action.payload, type: '' });
        if (!state.unreadNotifications.find(n => n._id === action.payload._id)) {
          state.unreadNotifications.unshift(action.payload);
          state.unreadCount += 1;
        }
      })

      // Mark All as Read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
        });
        state.userNotifications.forEach(notification => {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
        });
        state.unreadNotifications = [];
        state.unreadCount = 0;
      })

      // Delete All Read
      .addCase(deleteAllRead.fulfilled, (state) => {
        state.notifications = state.notifications.filter(n => !n.isRead);
        state.userNotifications = state.userNotifications.filter(n => !n.isRead);
      })

      // Send Notification
      .addCase(sendNotification.fulfilled, (state, action) => {
        notificationsSlice.caseReducers.updateNotificationInLists(state, { payload: action.payload, type: '' });
      })

      // Schedule Notification
      .addCase(scheduleNotification.fulfilled, (state, action) => {
        notificationsSlice.caseReducers.updateNotificationInLists(state, { payload: action.payload, type: '' });
      })

      // Cancel Scheduled Notification
      .addCase(cancelScheduledNotification.fulfilled, (state, action) => {
        notificationsSlice.caseReducers.updateNotificationInLists(state, { payload: action.payload, type: '' });
      })

      // Fetch Notification Analytics
      .addCase(fetchNotificationAnalytics.fulfilled, (state, action) => {
        state.notificationAnalytics = action.payload;
      })

      // Bulk Action
      .addCase(bulkAction.fulfilled, (state, action) => {
        const { action: bulkActionType, ids } = action.payload;
        
        ids.forEach(id => {
          switch (bulkActionType) {
            case 'read':
              notificationsSlice.caseReducers.markNotificationRead(state, { payload: id, type: '' });
              break;
            case 'delete':
              notificationsSlice.caseReducers.removeNotificationFromLists(state, { payload: id, type: '' });
              break;
            // 'unread' would need additional logic
          }
        });
      });
  },
});

export const {
  clearError,
  setCurrentNotification,
  addNotification,
  updateNotificationInLists,
  removeNotificationFromLists,
  markNotificationRead,
  clearNotifications,
  setRealTimeConnection,
  updateUnreadCount,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;

// Selectors
export const selectNotifications = (state: { notifications: NotificationsState }) => state.notifications.notifications;
export const selectUserNotifications = (state: { notifications: NotificationsState }) => state.notifications.userNotifications;
export const selectUnreadNotifications = (state: { notifications: NotificationsState }) => state.notifications.unreadNotifications;
export const selectCurrentNotification = (state: { notifications: NotificationsState }) => state.notifications.currentNotification;
export const selectNotificationAnalytics = (state: { notifications: NotificationsState }) => state.notifications.notificationAnalytics;
export const selectUnreadCount = (state: { notifications: NotificationsState }) => state.notifications?.unreadCount || 0;
export const selectNotificationsLoading = (state: { notifications: NotificationsState }) => state.notifications.isLoading;
export const selectNotificationsError = (state: { notifications: NotificationsState }) => state.notifications.error;
export const selectRealTimeConnection = (state: { notifications: NotificationsState }) => state.notifications.realTimeConnected;

export const selectNotificationsOperations = (state: { notifications: NotificationsState }) => ({
  isCreating: state.notifications.isCreating,
  isUpdating: state.notifications.isUpdating,
  isDeleting: state.notifications.isDeleting,
  isMarkingRead: state.notifications.isMarkingRead,
});

// Helper selectors
export const selectNotificationById = (id: string) => (state: { notifications: NotificationsState }) => {
  return state.notifications.notifications.find(notification => notification._id === id) ||
         state.notifications.userNotifications.find(notification => notification._id === id);
};

export const selectNotificationsByType = (type: NotificationType) => (state: { notifications: NotificationsState }) => {
  return state.notifications.userNotifications.filter(notification => notification.type === type);
};

export const selectNotificationsByPriority = (priority: NotificationPriority) => (state: { notifications: NotificationsState }) => {
  return state.notifications.userNotifications.filter(notification => notification.priority === priority);
};

export const selectRecentNotifications = (limit: number = 5) => (state: { notifications: NotificationsState }) => {
  return state.notifications.userNotifications.slice(0, limit);
};

export const selectHighPriorityUnread = (state: { notifications: NotificationsState }) => {
  return state.notifications.unreadNotifications.filter(notification => 
    notification.priority === 'high' || notification.priority === 'urgent'
  );
};

export const selectNotificationsByDateRange = (startDate: string, endDate: string) => (state: { notifications: NotificationsState }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return state.notifications.userNotifications.filter(notification => {
    const notificationDate = new Date(notification.createdAt);
    return notificationDate >= start && notificationDate <= end;
  });
};