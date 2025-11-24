// import { Request, Response, NextFunction } from 'express';
// import {  User } from '../models';
// import { AppError } from '../middleware/index';
// import { ApiResponse } from '../types';

// /**
//  * Get user's notifications
//  */
// export const getUserNotifications = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const userId = req.user?._id || req.user?.id;
//     const {
//       page = 1,
//       limit = 20,
//       unreadOnly = 'false',
//       type,
//       priority
//     } = req.query;
    
//     if (!userId) {
//       return next(new AppError('Authentication required', 401));
//     }
    
//     const query: any = { userId };
    
//     // Filter by read status
//     if (unreadOnly === 'true') {
//       query.isRead = false;
//     }
    
//     // Filter by type
//     if (type) {
//       query.type = type;
//     }
    
//     // Filter by priority
//     if (priority) {
//       query.priority = priority;
//     }
    
//     // Only show notifications that are not expired and scheduled for now or past
//     query.scheduledFor = { $lte: new Date() };
//     query.$or = [
//       { expiresAt: null },
//       { expiresAt: { $gt: new Date() } }
//     ];
    
//     const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
//     const [notifications, total, unreadCount] = await Promise.all([
//       Notification.find(query)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit as string))
//         .populate('relatedId', 'title orderNumber eventTitle')
//         .lean(),
//       Notification.countDocuments(query),
//       Notification.getUnreadCountByUser(userId)
//     ]);
    
//     res.status(200).json({
//       success: true,
//       data: {
//         notifications,
//         unreadCount,
//         pagination: {
//           page: parseInt(page as string),
//           limit: parseInt(limit as string),
//           total,
//           pages: Math.ceil(total / parseInt(limit as string))
//         }
//       },
//       message: 'Notifications retrieved successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get single notification
//  */
// export const getNotification = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?._id || req.user?.id;
    
//     if (!userId) {
//       return next(new AppError('Authentication required', 401));
//     }
    
//     const notification = await Notification.findOne({
//       _id: id,
//       userId
//     }).populate('relatedId', 'title orderNumber eventTitle');
    
//     if (!notification) {
//       return next(new AppError('Notification not found', 404));
//     }
    
//     res.status(200).json({
//       success: true,
//       data: notification,
//       message: 'Notification retrieved successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Mark notification as read
//  */
// export const markAsRead = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?._id || req.user?.id;
    
//     if (!userId) {
//       return next(new AppError('Authentication required', 401));
//     }
    
//     const notification = await Notification.findOne({
//       _id: id,
//       userId
//     });
    
//     if (!notification) {
//       return next(new AppError('Notification not found', 404));
//     }
    
//     await notification.markAsRead();
    
//     res.status(200).json({
//       success: true,
//       data: notification,
//       message: 'Notification marked as read'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Mark notification as clicked
//  */
// export const markAsClicked = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?._id || req.user?.id;
    
//     if (!userId) {
//       return next(new AppError('Authentication required', 401));
//     }
    
//     const notification = await Notification.findOne({
//       _id: id,
//       userId
//     });
    
//     if (!notification) {
//       return next(new AppError('Notification not found', 404));
//     }
    
//     await notification.markAsClicked();
    
//     res.status(200).json({
//       success: true,
//       data: notification,
//       message: 'Notification interaction recorded'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Mark all notifications as read for user
//  */
// export const markAllAsRead = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const userId = req.user?._id || req.user?.id;
    
//     if (!userId) {
//       return next(new AppError('Authentication required', 401));
//     }
    
//     const result = await Notification.markAllAsReadForUser(userId);
    
//     res.status(200).json({
//       success: true,
//       data: {
//         modifiedCount: result.modifiedCount
//       },
//       message: 'All notifications marked as read'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get unread count for user
//  */
// export const getUnreadCount = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const userId = req.user?._id || req.user?.id;
    
//     if (!userId) {
//       return next(new AppError('Authentication required', 401));
//     }
    
//     const count = await Notification.getUnreadCountByUser(userId);
    
//     res.status(200).json({
//       success: true,
//       data: { count },
//       message: 'Unread count retrieved successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Create notification (admin only)
//  */
// export const createNotification = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const notificationData = req.body;
    
//     // Validate required fields
//     if (!notificationData.userId && !notificationData.targetAudience) {
//       return next(new AppError('Either userId or targetAudience is required', 400));
//     }
    
//     // If targetAudience is specified, create notifications for multiple users
//     if (notificationData.targetAudience) {
//       const query: any = {};
      
//       if (notificationData.targetAudience.userRole) {
//         query.role = { $in: notificationData.targetAudience.userRole };
//       }
      
//       if (notificationData.targetAudience.userSegment) {
//         // Add user segment logic based on your business rules
//         // This could be based on user activity, location, etc.
//       }
      
//       const users = await User.find(query).select('_id');
      
//       if (users.length === 0) {
//         return next(new AppError('No users found matching target audience', 404));
//       }
      
//       // Create notification for each user
//       const notifications = users.map(user => ({
//         ...notificationData,
//         userId: user._id,
//         targetAudience: notificationData.targetAudience
//       }));
      
//       const createdNotifications = await Notification.insertMany(notifications);
      
//       res.status(201).json({
//         success: true,
//         data: {
//           count: createdNotifications.length,
//           notifications: createdNotifications.slice(0, 5) // Show first 5 as sample
//         },
//         message: `${createdNotifications.length} notifications created successfully`
//       });
      
//       return;
//     }
    
//     // Single user notification
//     const notification = new Notification(notificationData);
//     await notification.save();
    
//     await notification.populate('userId', 'firstName lastName email');
    
//     res.status(201).json({
//       success: true,
//       data: notification,
//       message: 'Notification created successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Update notification (admin only)
//  */
// export const updateNotification = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const updateData = req.body;
    
//     const notification = await Notification.findById(id);
//     if (!notification) {
//       return next(new AppError('Notification not found', 404));
//     }
    
//     // Don't allow updating delivered notifications
//     const hasDeliveredStatus = notification.delivery.some(
//       d => d.status === NotificationStatus.DELIVERED
//     );
    
//     if (hasDeliveredStatus && (updateData.title || updateData.message)) {
//       return next(new AppError('Cannot modify content of delivered notification', 400));
//     }
    
//     Object.assign(notification, updateData);
//     await notification.save();
    
//     res.status(200).json({
//       success: true,
//       data: notification,
//       message: 'Notification updated successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Delete notification (admin only)
//  */
// export const deleteNotification = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
    
//     const notification = await Notification.findById(id);
//     if (!notification) {
//       return next(new AppError('Notification not found', 404));
//     }
    
//     await Notification.findByIdAndDelete(id);
    
//     res.status(200).json({
//       success: true,
//       data: null,
//       message: 'Notification deleted successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get all notifications (admin only)
//  */
// export const getAllNotifications = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       type,
//       priority,
//       status,
//       userId,
//       startDate,
//       endDate
//     } = req.query;
    
//     const query: any = {};
    
//     // Filter by type
//     if (type) {
//       query.type = type;
//     }
    
//     // Filter by priority
//     if (priority) {
//       query.priority = priority;
//     }
    
//     // Filter by user
//     if (userId) {
//       query.userId = userId;
//     }
    
//     // Date range filter
//     if (startDate || endDate) {
//       query.createdAt = {};
//       if (startDate) query.createdAt.$gte = new Date(startDate as string);
//       if (endDate) query.createdAt.$lte = new Date(endDate as string);
//     }
    
//     const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
//     const [notifications, total] = await Promise.all([
//       Notification.find(query)
//         .populate('userId', 'firstName lastName email')
//         .populate('relatedId', 'title orderNumber')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit as string)),
//       Notification.countDocuments(query)
//     ]);
    
//     res.status(200).json({
//       success: true,
//       data: {
//         notifications,
//         pagination: {
//           page: parseInt(page as string),
//           limit: parseInt(limit as string),
//           total,
//           pages: Math.ceil(total / parseInt(limit as string))
//         }
//       },
//       message: 'All notifications retrieved successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get notification analytics (admin only)
//  */
// export const getNotificationAnalytics = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { startDate, endDate } = req.query;
    
//     const matchQuery: any = {};
    
//     if (startDate || endDate) {
//       matchQuery.createdAt = {};
//       if (startDate) matchQuery.createdAt.$gte = new Date(startDate as string);
//       if (endDate) matchQuery.createdAt.$lte = new Date(endDate as string);
//     }
    
//     const analytics = await Notification.aggregate([
//       { $match: matchQuery },
//       {
//         $group: {
//           _id: null,
//           totalNotifications: { $sum: 1 },
//           totalRead: { $sum: { $cond: ['$isRead', 1, 0] } },
//           totalClicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
//           avgClicksPerNotification: { $avg: '$clickCount' },
//           byType: {
//             $push: {
//               type: '$type',
//               priority: '$priority',
//               isRead: '$isRead',
//               clickCount: '$clickCount'
//             }
//           }
//         }
//       },
//       {
//         $project: {
//           totalNotifications: 1,
//           totalRead: 1,
//           totalClicked: 1,
//           avgClicksPerNotification: 1,
//           readRate: {
//             $multiply: [
//               { $divide: ['$totalRead', '$totalNotifications'] },
//               100
//             ]
//           },
//           clickRate: {
//             $multiply: [
//               { $divide: ['$totalClicked', '$totalNotifications'] },
//               100
//             ]
//           }
//         }
//       }
//     ]);
    
//     // Get notifications by type
//     const notificationsByType = await Notification.aggregate([
//       { $match: matchQuery },
//       {
//         $group: {
//           _id: '$type',
//           count: { $sum: 1 },
//           readCount: { $sum: { $cond: ['$isRead', 1, 0] } },
//           clickCount: { $sum: '$clickCount' }
//         }
//       },
//       { $sort: { count: -1 } }
//     ]);
    
//     res.status(200).json({
//       success: true,
//       data: {
//         overview: analytics[0] || {
//           totalNotifications: 0,
//           totalRead: 0,
//           totalClicked: 0,
//           readRate: 0,
//           clickRate: 0
//         },
//         byType: notificationsByType
//       },
//       message: 'Notification analytics retrieved successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Send bulk notifications (admin only)
//  */
// export const sendBulkNotifications = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { userIds, ...notificationData } = req.body;
    
//     if (!Array.isArray(userIds) || userIds.length === 0) {
//       return next(new AppError('User IDs array is required', 400));
//     }
    
//     // Validate users exist
//     const users = await User.find({ _id: { $in: userIds } }).select('_id');
//     const existingUserIds = users.map(u => u._id.toString());
    
//     // Create notifications for existing users
//     const notifications = existingUserIds.map(userId => ({
//       ...notificationData,
//       userId
//     }));
    
//     const createdNotifications = await Notification.insertMany(notifications);
    
//     res.status(201).json({
//       success: true,
//       data: {
//         sent: createdNotifications.length,
//         failed: userIds.length - createdNotifications.length
//       },
//       message: `${createdNotifications.length} notifications sent successfully`
//     });
//   } catch (error) {
//     next(error);
//   }
// };