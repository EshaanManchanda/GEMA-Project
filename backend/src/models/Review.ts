import mongoose, { Document, Schema } from 'mongoose';

// Review status enum
export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
  HIDDEN = 'hidden',
}

// Review type enum
export enum ReviewType {
  EVENT = 'event',
  VENDOR = 'vendor',
  VENUE = 'venue',
}

// Flag reason enum
export enum FlagReason {
  INAPPROPRIATE = 'inappropriate',
  SPAM = 'spam',
  FAKE = 'fake',
  OFFENSIVE = 'offensive',
  COPYRIGHT = 'copyright',
  OTHER = 'other',
}

// Media interface
export interface IReviewMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  caption?: string;
  order: number;
}

// Flag interface
export interface IFlag {
  user: mongoose.Types.ObjectId;
  reason: FlagReason;
  description?: string;
  flaggedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  action?: 'dismissed' | 'warning' | 'hidden' | 'removed';
}

// Helpful vote interface
export interface IHelpfulVote {
  user: mongoose.Types.ObjectId;
  helpful: boolean;
  votedAt: Date;
}

// Response interface
export interface IResponse {
  user: mongoose.Types.ObjectId;
  message: string;
  respondedAt: Date;
  isVendor: boolean;
  isOfficial: boolean;
}

// Review model interface with static methods
export interface IReviewModel extends mongoose.Model<IReview> {
  findByEvent(eventId: mongoose.Types.ObjectId): Promise<IReview[]>;
  findByVendor(vendorId: mongoose.Types.ObjectId): Promise<IReview[]>;
  findByUser(userId: mongoose.Types.ObjectId): Promise<IReview[]>;
  getAverageRating(targetId: mongoose.Types.ObjectId, type: ReviewType): Promise<{
    averageRating: number;
    totalReviews: number;
    distribution: { [key: number]: number };
  }>;
  updateEventStats(eventId: mongoose.Types.ObjectId): Promise<void>;
}

// Review interface
export interface IReview extends Document {
  // Basic Information
  type: ReviewType;
  event?: mongoose.Types.ObjectId;
  vendor?: mongoose.Types.ObjectId;
  venue?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  
  // Review Content
  rating: number;
  title?: string;
  comment?: string;
  pros?: string[];
  cons?: string[];
  
  // Media
  media: IReviewMedia[];
  
  // Verification
  verified: boolean;
  verifiedPurchase: boolean;
  
  // Status
  status: ReviewStatus;
  
  // Interaction
  helpful: number;
  notHelpful: number;
  helpfulVotes: IHelpfulVote[];
  
  // Flags and Moderation
  flags: IFlag[];
  flagCount: number;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationNotes?: string;
  
  // Responses
  responses: IResponse[];
  
  // Analytics
  analytics: {
    views: number;
    shares: number;
    helpfulClicks: number;
    reportClicks: number;
    lastViewed?: Date;
  };
  
  // Metadata
  source: 'web' | 'mobile' | 'email' | 'admin';
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Virtual fields
  isActive: boolean;
  helpfulPercentage: number;
  canEdit: boolean;
  canDelete: boolean;
  
  // Methods
  addHelpfulVote(userId: mongoose.Types.ObjectId, helpful: boolean): void;
  removeHelpfulVote(userId: mongoose.Types.ObjectId): void;
  addFlag(userId: mongoose.Types.ObjectId, reason: FlagReason, description?: string): void;
  addResponse(userId: mongoose.Types.ObjectId, message: string, isVendor?: boolean): void;
  moderate(moderatorId: mongoose.Types.ObjectId, status: ReviewStatus, notes?: string): void;
  incrementViews(): void;
  toJSON(): any;
}

// Review schema
const reviewSchema = new Schema<IReview>({
  // Basic Information
  type: {
    type: String,
    enum: Object.values(ReviewType),
    required: [true, 'Review type is required'],
  },
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: function() {
      return this.type === ReviewType.EVENT;
    },
  },
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === ReviewType.VENDOR;
    },
  },
  venue: {
    type: Schema.Types.ObjectId,
    ref: 'Venue',
    required: function() {
      return this.type === ReviewType.VENUE;
    },
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
  },
  
  // Review Content
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
  },
  pros: [{
    type: String,
    trim: true,
    maxlength: [200, 'Pro cannot exceed 200 characters'],
  }],
  cons: [{
    type: String,
    trim: true,
    maxlength: [200, 'Con cannot exceed 200 characters'],
  }],
  
  // Media
  media: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnail: String,
    caption: {
      type: String,
      maxlength: [200, 'Caption cannot exceed 200 characters'],
    },
    order: {
      type: Number,
      default: 0,
    },
  }],
  
  // Verification
  verified: {
    type: Boolean,
    default: false,
  },
  verifiedPurchase: {
    type: Boolean,
    default: false,
  },
  
  // Status
  status: {
    type: String,
    enum: Object.values(ReviewStatus),
    default: ReviewStatus.PENDING,
  },
  
  // Interaction
  helpful: {
    type: Number,
    default: 0,
    min: 0,
  },
  notHelpful: {
    type: Number,
    default: 0,
    min: 0,
  },
  helpfulVotes: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    helpful: {
      type: Boolean,
      required: true,
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Flags and Moderation
  flags: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(FlagReason),
      required: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Flag description cannot exceed 500 characters'],
    },
    flaggedAt: {
      type: Date,
      default: Date.now,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: Date,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    action: {
      type: String,
      enum: ['dismissed', 'warning', 'hidden', 'removed'],
    },
  }],
  flagCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  moderatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  moderatedAt: Date,
  moderationNotes: {
    type: String,
    maxlength: [1000, 'Moderation notes cannot exceed 1000 characters'],
  },
  
  // Responses
  responses: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: [1000, 'Response message cannot exceed 1000 characters'],
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
    isVendor: {
      type: Boolean,
      default: false,
    },
    isOfficial: {
      type: Boolean,
      default: false,
    },
  }],
  
  // Analytics
  analytics: {
    views: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    helpfulClicks: {
      type: Number,
      default: 0,
    },
    reportClicks: {
      type: Number,
      default: 0,
    },
    lastViewed: Date,
  },
  
  // Metadata
  source: {
    type: String,
    enum: ['web', 'mobile', 'email', 'admin'],
    default: 'web',
  },
  ipAddress: String,
  userAgent: String,
  
  // Timestamps
  deletedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual fields
reviewSchema.virtual('isActive').get(function() {
  return this.status === ReviewStatus.APPROVED && !this.deletedAt;
});

reviewSchema.virtual('helpfulPercentage').get(function() {
  const total = this.helpful + this.notHelpful;
  return total > 0 ? Math.round((this.helpful / total) * 100) : 0;
});

reviewSchema.virtual('canEdit').get(function() {
  const now = new Date();
  const createdAt = new Date(this.createdAt);
  const timeDiff = now.getTime() - createdAt.getTime();
  const hoursDiff = timeDiff / (1000 * 3600);
  
  return hoursDiff <= 24 && this.status === ReviewStatus.PENDING;
});

reviewSchema.virtual('canDelete').get(function() {
  const now = new Date();
  const createdAt = new Date(this.createdAt);
  const timeDiff = now.getTime() - createdAt.getTime();
  const daysDiff = timeDiff / (1000 * 3600 * 24);
  
  return daysDiff <= 7;
});

// Indexes
reviewSchema.index({ event: 1 });
reviewSchema.index({ vendor: 1 });
reviewSchema.index({ venue: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ order: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ verified: 1 });
reviewSchema.index({ verifiedPurchase: 1 });
reviewSchema.index({ helpful: 1 });
reviewSchema.index({ flagCount: 1 });
reviewSchema.index({ createdAt: 1 });
reviewSchema.index({ deletedAt: 1 });

// Compound indexes
reviewSchema.index({ event: 1, status: 1, rating: 1 });
reviewSchema.index({ vendor: 1, status: 1, rating: 1 });
reviewSchema.index({ user: 1, type: 1 });
reviewSchema.index({ status: 1, flagCount: 1 });

// Text search index
reviewSchema.index({
  title: 'text',
  comment: 'text',
  pros: 'text',
  cons: 'text',
});

// Pre-save middleware
reviewSchema.pre('save', async function(next) {
  try {
    // Check if user has already reviewed this item
    if (this.isNew) {
      const query: any = {
        user: this.user,
        type: this.type,
        deletedAt: { $exists: false },
        _id: { $ne: this._id },
      };
      
      if (this.type === ReviewType.EVENT) {
        query.event = this.event;
      } else if (this.type === ReviewType.VENDOR) {
        query.vendor = this.vendor;
      } else if (this.type === ReviewType.VENUE) {
        query.venue = this.venue;
      }
      
      const existingReview = await (this.constructor as any).findOne(query);
      if (existingReview) {
        return next(new Error('User has already reviewed this item'));
      }
    }
    
    // Verify purchase if order is provided
    if (this.order) {
      const Order = mongoose.model('Order');
      const order = await Order.findOne({
        _id: this.order,
        userId: this.user,
        status: 'confirmed',
        paymentStatus: 'paid',
      });
      
      if (order) {
        this.verifiedPurchase = true;
        this.verified = true;
      }
    }
    
    // Auto-approve verified reviews
    if (this.verified && this.status === ReviewStatus.PENDING) {
      this.status = ReviewStatus.APPROVED;
    }
    
    // Update flag count
    this.flagCount = this.flags.filter((flag: IFlag) => !flag.resolved).length;
    
    // Auto-flag if too many flags
    if (this.flagCount >= 3 && this.status === ReviewStatus.APPROVED) {
      this.status = ReviewStatus.FLAGGED;
    }
    
    next();
  } catch (error: any) {
    next(error);
  }
});

// Post-save middleware to update Event stats
reviewSchema.post('save', async function(doc) {
  try {
    // Only update stats for event reviews
    if (doc.type === ReviewType.EVENT && doc.event) {
      // Check if review status changed or rating changed while approved
      const statusChanged = doc.isModified('status');
      const ratingChanged = doc.isModified('rating');
      const isApproved = doc.status === ReviewStatus.APPROVED;

      // Update stats if:
      // - Status changed (could be to/from approved)
      // - Rating changed while approved
      // - New review that is approved
      if (statusChanged || (ratingChanged && isApproved) || (doc.isNew && isApproved)) {
        const Review = mongoose.model<IReview, IReviewModel>('Review');
        await Review.updateEventStats(doc.event);
      }
    }
  } catch (error) {
    console.error('Error in post-save middleware for review stats:', error);
    // Don't throw error to avoid interrupting the save operation
  }
});

// Post-deleteOne middleware to update Event stats when review is deleted
reviewSchema.post('deleteOne', async function(doc: any) {
  try {
    // Only update stats for event reviews that were approved
    if (doc && doc.type === ReviewType.EVENT && doc.event && doc.status === ReviewStatus.APPROVED) {
      const Review = mongoose.model<IReview, IReviewModel>('Review');
      await Review.updateEventStats(doc.event);
    }
  } catch (error) {
    console.error('Error in post-deleteOne middleware for review stats:', error);
    // Don't throw error to avoid interrupting the remove operation
  }
});

// Post-findOneAndDelete middleware to handle soft deletes
reviewSchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc && doc.type === ReviewType.EVENT && doc.event && doc.status === ReviewStatus.APPROVED) {
      const Review = mongoose.model<IReview, IReviewModel>('Review');
      await Review.updateEventStats(doc.event);
    }
  } catch (error) {
    console.error('Error in post-findOneAndDelete middleware for review stats:', error);
  }
});

// Instance methods
reviewSchema.methods.addHelpfulVote = function(userId: mongoose.Types.ObjectId, helpful: boolean): void {
  // Remove existing vote from same user
  this.removeHelpfulVote(userId);
  
  // Add new vote
  this.helpfulVotes.push({
    user: userId,
    helpful,
    votedAt: new Date(),
  });
  
  // Update counters
  this.helpful = this.helpfulVotes.filter((vote: IHelpfulVote) => vote.helpful).length;
  this.notHelpful = this.helpfulVotes.filter((vote: IHelpfulVote) => !vote.helpful).length;
  
  // Update analytics
  this.analytics.helpfulClicks++;
};

reviewSchema.methods.removeHelpfulVote = function(userId: mongoose.Types.ObjectId): void {
  this.helpfulVotes = this.helpfulVotes.filter(
    (vote: IHelpfulVote) => !vote.user.equals(userId)
  );
  
  // Update counters
  this.helpful = this.helpfulVotes.filter((vote: IHelpfulVote) => vote.helpful).length;
  this.notHelpful = this.helpfulVotes.filter((vote: IHelpfulVote) => !vote.helpful).length;
};

reviewSchema.methods.addFlag = function(userId: mongoose.Types.ObjectId, reason: FlagReason, description?: string): void {
  // Check if user has already flagged this review
  const existingFlag = this.flags.find((flag: IFlag) => flag.user.equals(userId) && !flag.resolved);
  if (existingFlag) {
    throw new Error('User has already flagged this review');
  }
  
  this.flags.push({
    user: userId,
    reason,
    description,
    flaggedAt: new Date(),
    resolved: false,
  });
  
  this.flagCount = this.flags.filter((flag: IFlag) => !flag.resolved).length;
  this.analytics.reportClicks++;
};

reviewSchema.methods.addResponse = function(userId: mongoose.Types.ObjectId, message: string, isVendor: boolean = false): void {
  this.responses.push({
    user: userId,
    message,
    respondedAt: new Date(),
    isVendor,
    isOfficial: isVendor,
  });
};

reviewSchema.methods.moderate = function(moderatorId: mongoose.Types.ObjectId, status: ReviewStatus, notes?: string): void {
  this.status = status;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  this.moderationNotes = notes;
  
  // Resolve all flags if approved
  if (status === ReviewStatus.APPROVED) {
    this.flags.forEach((flag: IFlag) => {
      if (!flag.resolved) {
        flag.resolved = true;
        flag.resolvedAt = new Date();
        flag.resolvedBy = moderatorId;
        flag.action = 'dismissed';
      }
    });
    this.flagCount = 0;
  }
};

reviewSchema.methods.incrementViews = function(): void {
  this.analytics.views++;
  this.analytics.lastViewed = new Date();
};

// Override toJSON to exclude sensitive fields
reviewSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.ipAddress;
  delete obj.userAgent;
  delete obj.flags;
  delete obj.moderationNotes;
  return obj;
};

// Static methods
reviewSchema.statics.findByEvent = function(eventId: mongoose.Types.ObjectId) {
  return this.find({
    event: eventId,
    status: ReviewStatus.APPROVED,
    deletedAt: { $exists: false }
  }).populate('user', 'firstName lastName avatar').sort({ createdAt: -1 });
};

reviewSchema.statics.findByVendor = function(vendorId: mongoose.Types.ObjectId) {
  return this.find({
    vendor: vendorId,
    status: ReviewStatus.APPROVED,
    deletedAt: { $exists: false }
  }).populate('user', 'firstName lastName avatar').sort({ createdAt: -1 });
};

reviewSchema.statics.findByUser = function(userId: mongoose.Types.ObjectId) {
  return this.find({
    user: userId,
    deletedAt: { $exists: false }
  }).populate('event vendor venue', 'title firstName lastName').sort({ createdAt: -1 });
};

reviewSchema.statics.getAverageRating = async function(targetId: mongoose.Types.ObjectId, type: ReviewType) {
  const field = type === ReviewType.EVENT ? 'event' : type === ReviewType.VENDOR ? 'vendor' : 'venue';
  
  const result = await this.aggregate([
    {
      $match: {
        [field]: targetId,
        status: ReviewStatus.APPROVED,
        deletedAt: { $exists: false }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        distribution: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  const data = result[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  data.distribution.forEach((rating: number) => {
    distribution[rating as keyof typeof distribution]++;
  });
  
  return {
    averageRating: Math.round(data.averageRating * 10) / 10,
    totalReviews: data.totalReviews,
    distribution
  };
};

reviewSchema.statics.updateEventStats = async function(this: IReviewModel, eventId: mongoose.Types.ObjectId) {
  try {
    const Event = mongoose.model('Event');

    // Get rating statistics using existing method
    const stats = await this.getAverageRating(eventId, ReviewType.EVENT);

    // Update the event with the calculated statistics
    await Event.findByIdAndUpdate(
      eventId,
      {
        $set: {
          reviewCount: stats.totalReviews,
          averageRating: stats.averageRating,
          ratingDistribution: stats.distribution
        }
      },
      { new: true }
    );

    console.log(`Updated review stats for event ${eventId}: ${stats.totalReviews} reviews, ${stats.averageRating} avg rating`);
  } catch (error) {
    console.error(`Error updating event stats for ${eventId}:`, error);
    throw error;
  }
};

const Review = mongoose.model<IReview, IReviewModel>('Review', reviewSchema);

export default Review;