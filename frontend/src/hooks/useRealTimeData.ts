import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchUserNotifications } from '@/store/slices/notificationsSlice';
import logger from '@/utils/logger';

interface UseRealTimeDataOptions {
  enableNotifications?: boolean;
  enableCategories?: boolean;
  notificationInterval?: number;
  categoryInterval?: number;
}

export const useRealTimeData = (options: UseRealTimeDataOptions = {}) => {
  const {
    enableNotifications = true,
    notificationInterval = 120000, // Increased to 2 minutes
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const notificationIntervalRef = useRef<NodeJS.Timeout>();

  // Track connection status
  const [connectionError, setConnectionError] = useState(false);
  const [currentNotificationInterval, setCurrentNotificationInterval] = useState(notificationInterval);
  const consecutiveErrorsRef = useRef(0);

  const refreshNotifications = useCallback(async () => {
    if (isAuthenticated && enableNotifications) {
      try {
        await dispatch(fetchUserNotifications({ limit: 20, unreadOnly: true })).unwrap();

        // Reset error state on successful request
        if (connectionError) {
          setConnectionError(false);
          consecutiveErrorsRef.current = 0;
          setCurrentNotificationInterval(notificationInterval);
        }
      } catch (error: any) {
        logger.warn('[RealTimeData] Notification fetch failed:', error.message);

        consecutiveErrorsRef.current += 1;

        // Set connection error state
        if (!connectionError) {
          setConnectionError(true);
        }

        // Exponential backoff: increase interval after multiple failures
        if (consecutiveErrorsRef.current >= 3) {
          const backoffMultiplier = Math.min(Math.pow(2, Math.floor(consecutiveErrorsRef.current / 3)), 8);
          setCurrentNotificationInterval(notificationInterval * backoffMultiplier);
        }
      }
    }
  }, [dispatch, isAuthenticated, enableNotifications, connectionError, notificationInterval]);

  // Categories removed - they don't change frequently and don't need real-time updates

  // Setup real-time notifications refresh
  useEffect(() => {
    if (enableNotifications && isAuthenticated) {
      refreshNotifications();

      notificationIntervalRef.current = setInterval(() => {
        // Only poll if document is visible (user is active)
        if (document.visibilityState === 'visible') {
          refreshNotifications();
        }
      }, currentNotificationInterval);
    }

    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, [enableNotifications, isAuthenticated, refreshNotifications, currentNotificationInterval]);

  // Categories refresh removed - not needed for real-time updates

  // Manual refresh functions
  const manualRefresh = useCallback(() => {
    if (enableNotifications) refreshNotifications();
  }, [enableNotifications, refreshNotifications]);

  return {
    refreshNotifications,
    manualRefresh,
    connectionError,
    currentNotificationInterval,
  };
};

export default useRealTimeData;