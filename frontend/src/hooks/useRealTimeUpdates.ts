import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';

interface UseRealTimeUpdatesOptions {
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: any) => void;
}

interface RealTimeUpdate {
  type: 'notification' | 'booking' | 'payment' | 'event_update' | 'user_activity';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  userId?: string;
}

export const useRealTimeUpdates = (options: UseRealTimeUpdatesOptions = {}) => {
  const {
    enabled = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
    onMessage
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (!enabled || websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // In a real implementation, this would connect to your WebSocket server
      // For now, we'll simulate WebSocket connection
      const wsUrl = import.meta.env.VITE_WS_URL || 'wss://gema-project.onrender.com/ws';
      const token = localStorage.getItem('authToken');
      
      websocketRef.current = new WebSocket(`${wsUrl}?token=${token}`);

      websocketRef.current.onopen = () => {
        console.log('WebSocket connected');
        isConnectedRef.current = true;
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const update: RealTimeUpdate = JSON.parse(event.data);
          handleRealTimeUpdate(update);
          onMessage?.(update);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocketRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        isConnectedRef.current = false;
        onDisconnect?.();
        
        // Attempt to reconnect if enabled and within retry limits
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [enabled, maxReconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    isConnectedRef.current = false;
  }, []);

  const handleRealTimeUpdate = useCallback((update: RealTimeUpdate) => {
    switch (update.type) {
      case 'notification':
        // Dispatch notification update to Redux store
        if (update.action === 'create') {
          // dispatch(addNotification(update.data));
          // Show browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(update.data.title, {
              body: update.data.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico'
            });
          }
        }
        break;

      case 'booking':
        // Handle booking updates
        if (update.action === 'create') {
          // dispatch(addBooking(update.data));
        } else if (update.action === 'update') {
          // dispatch(updateBooking(update.data));
        }
        break;

      case 'payment':
        // Handle payment updates
        if (update.action === 'update') {
          // dispatch(updatePaymentStatus(update.data));
        }
        break;

      case 'event_update':
        // Handle event updates (seat availability, schedule changes, etc.)
        if (update.action === 'update') {
          // dispatch(updateEvent(update.data));
        }
        break;

      case 'user_activity':
        // Handle user activity updates
        break;

      default:
        console.log('Unhandled real-time update type:', update.type);
    }
  }, [dispatch]);

  const sendMessage = useCallback((message: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts: reconnectAttemptsRef.current
  };
};

// Hook for subscribing to specific real-time events
export const useRealTimeSubscription = (
  eventTypes: string[],
  callback: (update: RealTimeUpdate) => void,
  enabled: boolean = true
) => {
  const handleMessage = useCallback((update: RealTimeUpdate) => {
    if (eventTypes.includes(update.type)) {
      callback(update);
    }
  }, [eventTypes, callback]);

  return useRealTimeUpdates({
    enabled,
    onMessage: handleMessage
  });
};

// Hook for real-time notifications
export const useRealTimeNotifications = () => {
  const dispatch = useDispatch<AppDispatch>();

  const handleNotificationUpdate = useCallback((update: RealTimeUpdate) => {
    if (update.type === 'notification') {
      // Handle notification-specific updates
      console.log('Real-time notification:', update);
      
      // Show toast notification
      // toast.info(update.data.message);
    }
  }, [dispatch]);

  return useRealTimeSubscription(['notification'], handleNotificationUpdate);
};

// Hook for real-time booking updates
export const useRealTimeBookings = () => {
  const dispatch = useDispatch<AppDispatch>();

  const handleBookingUpdate = useCallback((update: RealTimeUpdate) => {
    if (update.type === 'booking') {
      console.log('Real-time booking update:', update);
      
      // Update booking state in Redux
      switch (update.action) {
        case 'create':
          // dispatch(addBooking(update.data));
          break;
        case 'update':
          // dispatch(updateBooking(update.data));
          break;
        case 'delete':
          // dispatch(removeBooking(update.data.id));
          break;
      }
    }
  }, [dispatch]);

  return useRealTimeSubscription(['booking'], handleBookingUpdate);
};

export default useRealTimeUpdates;