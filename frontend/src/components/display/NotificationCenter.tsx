import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FaBell, 
  FaEnvelope, 
  FaEnvelopeOpen, 
  FaTrash, 
  FaCheck, 
  FaFilter,
  FaSearch,
  FaCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimes,
  FaEllipsisV
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { RootState, AppDispatch } from '../../store';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllAsRead,
  deleteNotification,
  bulkDeleteNotifications,
  selectNotifications,
  selectNotificationsStats,
  selectNotificationsLoading
} from '../../store/slices/notificationsSlice';
import type { Notification, NotificationPriority, NotificationType } from '../../services/api/notificationsAPI';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../interactive/Modal';

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  compact?: boolean;
  realTimeUpdates?: boolean;
  onNotificationClick?: (notification: Notification) => void;
}

interface FilterState {
  type: NotificationType | 'all';
  priority: NotificationPriority | 'all';
  status: 'all' | 'read' | 'unread';
  search: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  maxHeight = '600px',
  showHeader = true,
  compact = false,
  realTimeUpdates = true,
  onNotificationClick
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const notifications = useSelector(selectNotifications);
  const stats = useSelector(selectNotificationsStats);
  const isLoading = useSelector(selectNotificationsLoading);

  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    priority: 'all',
    status: 'all',
    search: ''
  });
  
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);

  // Real-time updates
  useEffect(() => {
    dispatch(fetchUserNotifications({ page: 1, limit: 50 }));

    if (realTimeUpdates) {
      const interval = setInterval(() => {
        dispatch(fetchUserNotifications({ page: 1, limit: 50 }));
      }, 30000); // Poll every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [dispatch, realTimeUpdates]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(n => n.type === filters.type);
    }

    // Filter by priority
    if (filters.priority !== 'all') {
      filtered = filtered.filter(n => n.priority === filters.priority);
    }

    // Filter by status
    if (filters.status === 'read') {
      filtered = filtered.filter(n => n.isRead);
    } else if (filters.status === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchLower) ||
        n.message.toLowerCase().includes(searchLower)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, filters]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await dispatch(markNotificationAsRead(notification._id));
    }
    onNotificationClick?.(notification);
  };

  const handleToggleRead = async (notification: Notification) => {
    if (notification.isRead) {
      await dispatch(markNotificationAsUnread(notification._id));
    } else {
      await dispatch(markNotificationAsRead(notification._id));
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    setNotificationToDelete(notification);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (notificationToDelete) {
      await dispatch(deleteNotification(notificationToDelete._id));
      setShowDeleteModal(false);
      setNotificationToDelete(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    await dispatch(markAllAsRead());
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.size > 0) {
      await dispatch(bulkDeleteNotifications(Array.from(selectedNotifications)));
      setSelectedNotifications(new Set());
      setShowBulkActions(false);
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n._id)));
    }
  };

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'high': return <FaExclamationTriangle className="text-red-500" />;
      case 'medium': return <FaInfoCircle className="text-yellow-500" />;
      case 'low': return <FaCircle className="text-gray-400" size={8} />;
      default: return <FaCircle className="text-gray-400" size={8} />;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-gray-500 bg-gray-50';
      default: return 'border-l-gray-300';
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case 'booking': return 'text-blue-600 bg-blue-100';
      case 'payment': return 'text-green-600 bg-green-100';
      case 'event': return 'text-purple-600 bg-purple-100';
      case 'system': return 'text-gray-600 bg-gray-100';
      case 'reminder': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaBell className="text-gray-600" size={20} />
              <h3 className="text-lg font-medium text-gray-900">
                Notifications
              </h3>
              {stats.unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {stats.unreadCount} unread
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedNotifications.size > 0 && (
                <div className="flex items-center space-x-2 mr-2">
                  <span className="text-sm text-gray-600">
                    {selectedNotifications.size} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-md transition-colors ${
                  showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <FaFilter size={16} />
              </button>
              
              {stats.unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded hover:bg-blue-50"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Type filter */}
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as NotificationType | 'all' }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="booking">Booking</option>
                  <option value="payment">Payment</option>
                  <option value="event">Event</option>
                  <option value="system">System</option>
                  <option value="reminder">Reminder</option>
                </select>

                {/* Priority filter */}
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as NotificationPriority | 'all' }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>

                {/* Status filter */}
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as 'all' | 'read' | 'unread' }))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedNotifications.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedNotifications(new Set())}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <FaBell className="mx-auto text-gray-300" size={48} />
            <p className="mt-4 text-gray-500">
              {filters.search || filters.type !== 'all' || filters.priority !== 'all' || filters.status !== 'all'
                ? 'No notifications match your filters'
                : 'No notifications yet'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`
                  relative flex items-start p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4
                  ${!notification.isRead ? 'bg-blue-50' : 'bg-white'}
                  ${getPriorityColor(notification.priority)}
                `}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={selectedNotifications.has(notification._id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectNotification(notification._id);
                  }}
                  className="mr-3 mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />

                {/* Priority indicator */}
                <div className="mr-3 mt-1">
                  {getPriorityIcon(notification.priority)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className={`text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                        
                        {!notification.isRead && (
                          <FaCircle className="text-blue-500" size={8} />
                        )}
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <p className="mt-2 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRead(notification);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
                      >
                        {notification.isRead ? <FaEnvelope size={14} /> : <FaEnvelopeOpen size={14} />}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete notification"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Action button if provided */}
                  {notification.actionUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(notification.actionUrl, '_blank');
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {notification.actionText || 'View Details'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Notification"
        size="sm"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this notification? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NotificationCenter;