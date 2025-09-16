import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  EVENT_REMINDER = 'event_reminder',
  EVENT_APPROVED = 'event_approved',
  EVENT_REJECTED = 'event_rejected',
  VENDOR_APPLICATION_APPROVED = 'vendor_application_approved',
  VENDOR_APPLICATION_REJECTED = 'vendor_application_rejected',
  REVIEW_RECEIVED = 'review_received',
  PAYOUT_PROCESSED = 'payout_processed',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  PROMOTIONAL = 'promotional',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface INotificationAction {
  label: string;
  action: string;
  url?: string;
  style?: 'primary' | 'secondary' | 'danger' | 'success';
}

export interface INotificationDelivery {
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  externalId?: string; // ID from external service (email service, push service, etc.)
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  priority: NotificationPriority;
  
  // Content
  title: string;
  message: string;
  shortMessage?: string; // For SMS or short displays
  richContent?: {
    html?: string;
    imageUrl?: string;
    videoUrl?: string;
    attachments?: string[];
  };
  
  // Metadata
  relatedId?: mongoose.Types.ObjectId; // Related booking, event, order, etc.
  relatedType?: 'booking' | 'event' | 'order' | 'user' | 'payment' | 'review';
  metadata?: Record<string, any>;
  
  // Delivery tracking
  channels: NotificationChannel[];
  delivery: INotificationDelivery[];
  
  // User interaction
  isRead: boolean;
  readAt?: Date;
  clickedAt?: Date;
  clickCount: number;
  
  // Actions (buttons/links in notification)
  actions?: INotificationAction[];
  
  // Scheduling
  scheduledFor?: Date;
  expiresAt?: Date;
  
  // Targeting and personalization
  targetAudience?: {
    userRole?: string[];
    userSegment?: string[];
    location?: string[];
  };
  personalizationData?: Record<string, any>;
  
  // A/B Testing
  campaignId?: string;
  variant?: string;
  
  // Aggregation (for grouped notifications)
  isGrouped?: boolean;
  groupId?: string;
  groupCount?: number;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  markAsRead(): Promise<INotification>;
  markAsClicked(): Promise<INotification>;
  updateDeliveryStatus(channel: NotificationChannel, status: NotificationStatus, metadata?: any): Promise<INotification>;
  canBeDelivered(): boolean;
  isExpired(): boolean;
}

// Static methods interface
export interface INotificationModel extends mongoose.Model<INotification> {
  findUnreadByUser(userId: string): mongoose.Query<INotification[], INotification>;
  findByUser(userId: string, limit?: number): mongoose.Query<INotification[], INotification>;
  findPendingDelivery(channel?: NotificationChannel): mongoose.Query<INotification[], INotification>;
  markAllAsReadForUser(userId: string): Promise<any>;
  getUnreadCountByUser(userId: string): Promise<number>;
  findByType(type: NotificationType, startDate?: Date, endDate?: Date): mongoose.Query<INotification[], INotification>;
}

const notificationActionSchema = new Schema<INotificationAction>({
  label: {
    type: String,
    required: true,
    maxlength: [50, 'Action label cannot exceed 50 characters'],
  },
  action: {
    type: String,
    required: true,
    maxlength: [100, 'Action cannot exceed 100 characters'],
  },
  url: {
    type: String,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP/HTTPS URL',
    },
  },
  style: {
    type: String,
    enum: ['primary', 'secondary', 'danger', 'success'],
    default: 'primary',
  },
});

const notificationDeliverySchema = new Schema<INotificationDelivery>({
  channel: {
    type: String,
    enum: Object.values(NotificationChannel),
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.PENDING,
  },
  sentAt: Date,
  deliveredAt: Date,
  failureReason: {
    type: String,
    maxlength: [500, 'Failure reason cannot exceed 500 characters'],
  },
  externalId: String,
});

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, 'Notification type is required'],
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
    },
    
    // Content
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    shortMessage: {
      type: String,
      maxlength: [160, 'Short message cannot exceed 160 characters'],
    },
    richContent: {
      html: String,
      imageUrl: String,
      videoUrl: String,
      attachments: [String],
    },
    
    // Metadata
    relatedId: {
      type: Schema.Types.ObjectId,
    },
    relatedType: {
      type: String,
      enum: ['booking', 'event', 'order', 'user', 'payment', 'review'],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    
    // Delivery tracking
    channels: {
      type: [String],
      enum: Object.values(NotificationChannel),
      default: [NotificationChannel.IN_APP],
    },
    delivery: [notificationDeliverySchema],
    
    // User interaction
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    clickedAt: Date,
    clickCount: {
      type: Number,
      default: 0,
      min: [0, 'Click count cannot be negative'],
    },
    
    // Actions
    actions: [notificationActionSchema],
    
    // Scheduling
    scheduledFor: {
      type: Date,
      default: Date.now,
    },
    expiresAt: Date,
    
    // Targeting and personalization
    targetAudience: {
      userRole: [String],
      userSegment: [String],
      location: [String],
    },
    personalizationData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    
    // A/B Testing
    campaignId: String,
    variant: String,
    
    // Aggregation
    isGrouped: {
      type: Boolean,
      default: false,
    },
    groupId: String,
    groupCount: {
      type: Number,
      min: [1, 'Group count must be at least 1'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1, scheduledFor: 1 });
notificationSchema.index({ isRead: 1, userId: 1 });
notificationSchema.index({ scheduledFor: 1, 'delivery.status': 1 });
notificationSchema.index({ relatedId: 1, relatedType: 1 });
notificationSchema.index({ campaignId: 1 });
notificationSchema.index({ groupId: 1 });

// TTL index for expired notifications (combines both index and TTL)
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for unread status
notificationSchema.virtual('isUnread').get(function () {
  return !this.isRead;
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function (): Promise<INotification> {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return this;
};

// Method to mark as clicked
notificationSchema.methods.markAsClicked = async function (): Promise<INotification> {
  this.clickCount += 1;
  this.clickedAt = new Date();
  
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
  }
  
  return this.save();
};

// Method to update delivery status
notificationSchema.methods.updateDeliveryStatus = async function (
  channel: NotificationChannel,
  status: NotificationStatus,
  metadata?: any
): Promise<INotification> {
  const delivery = this.delivery.find(d => d.channel === channel);
  
  if (delivery) {
    delivery.status = status;
    
    if (status === NotificationStatus.SENT && !delivery.sentAt) {
      delivery.sentAt = new Date();
    }
    
    if (status === NotificationStatus.DELIVERED && !delivery.deliveredAt) {
      delivery.deliveredAt = new Date();
    }
    
    if (status === NotificationStatus.FAILED && metadata?.failureReason) {
      delivery.failureReason = metadata.failureReason;
    }
    
    if (metadata?.externalId) {
      delivery.externalId = metadata.externalId;
    }
  } else {
    // Create new delivery record if it doesn't exist
    this.delivery.push({
      channel,
      status,
      sentAt: status === NotificationStatus.SENT ? new Date() : undefined,
      deliveredAt: status === NotificationStatus.DELIVERED ? new Date() : undefined,
      failureReason: metadata?.failureReason,
      externalId: metadata?.externalId,
    });
  }
  
  return this.save();
};

// Method to check if notification can be delivered
notificationSchema.methods.canBeDelivered = function (): boolean {
  const now = new Date();
  
  return (
    (!this.scheduledFor || this.scheduledFor <= now) &&
    (!this.expiresAt || this.expiresAt > now)
  );
};

// Method to check if notification is expired
notificationSchema.methods.isExpired = function (): boolean {
  return this.expiresAt ? new Date() > this.expiresAt : false;
};

// Static methods
notificationSchema.statics.findUnreadByUser = function (userId: string) {
  return this.find({ userId, isRead: false }).sort({ createdAt: -1 });
};

notificationSchema.statics.findByUser = function (userId: string, limit?: number) {
  const query = this.find({ userId }).sort({ createdAt: -1 });
  return limit ? query.limit(limit) : query;
};

notificationSchema.statics.findPendingDelivery = function (channel?: NotificationChannel) {
  const query: any = {
    scheduledFor: { $lte: new Date() },
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  };
  
  if (channel) {
    query['delivery.channel'] = channel;
    query['delivery.status'] = NotificationStatus.PENDING;
  }
  
  return this.find(query);
};

notificationSchema.statics.markAllAsReadForUser = async function (userId: string) {
  return this.updateMany(
    { userId, isRead: false },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
};

notificationSchema.statics.getUnreadCountByUser = function (userId: string) {
  return this.countDocuments({ userId, isRead: false });
};

notificationSchema.statics.findByType = function (type: NotificationType, startDate?: Date, endDate?: Date) {
  const query: any = { type };
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

const Notification = mongoose.model<INotification, INotificationModel>('Notification', notificationSchema);

export default Notification;