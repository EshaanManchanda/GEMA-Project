import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchNotifications } from '@/store/slices/notificationsSlice';
import { fetchFeaturedCategories } from '@/store/slices/categoriesSlice';

interface UseRealTimeDataOptions {
  enableNotifications?: boolean;
  enableCategories?: boolean;
  notificationInterval?: number;
  categoryInterval?: number;
}

export const useRealTimeData = (options: UseRealTimeDataOptions = {}) => {
  const {
    enableNotifications = true,
    enableCategories = false,
    notificationInterval = 30000, // 30 seconds
    categoryInterval = 300000, // 5 minutes
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const notificationIntervalRef = useRef<NodeJS.Timeout>();
  const categoryIntervalRef = useRef<NodeJS.Timeout>();

  const refreshNotifications = useCallback(() => {
    if (isAuthenticated && enableNotifications) {
      dispatch(fetchNotifications({ limit: 20, unreadOnly: true }));
    }
  }, [dispatch, isAuthenticated, enableNotifications]);

  const refreshCategories = useCallback(() => {
    if (enableCategories) {
      dispatch(fetchFeaturedCategories(4));
    }
  }, [dispatch, enableCategories]);

  // Setup real-time notifications refresh
  useEffect(() => {
    if (enableNotifications && isAuthenticated) {
      refreshNotifications();
      
      notificationIntervalRef.current = setInterval(
        refreshNotifications,
        notificationInterval
      );
    }

    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, [enableNotifications, isAuthenticated, refreshNotifications, notificationInterval]);

  // Setup categories refresh
  useEffect(() => {
    if (enableCategories) {
      refreshCategories();
      
      categoryIntervalRef.current = setInterval(
        refreshCategories,
        categoryInterval
      );
    }

    return () => {
      if (categoryIntervalRef.current) {
        clearInterval(categoryIntervalRef.current);
      }
    };
  }, [enableCategories, refreshCategories, categoryInterval]);

  // Manual refresh functions
  const manualRefresh = useCallback(() => {
    if (enableNotifications) refreshNotifications();
    if (enableCategories) refreshCategories();
  }, [enableNotifications, enableCategories, refreshNotifications, refreshCategories]);

  return {
    refreshNotifications,
    refreshCategories,
    manualRefresh,
  };
};

export default useRealTimeData;