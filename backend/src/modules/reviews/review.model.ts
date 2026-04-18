import mongoose, { Document, Schema } from "mongoose";

export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  FLAGGED = "flagged",
  HIDDEN = "hidden",
}

export enum ReviewType {
  EVENT = "event",
  VENDOR = "vendor",
  VENUE = "venue",
  TEACHING_EVENT = "teaching_event",
}

export enum FlagReason {
  INAPPROPRIATE = "inappropriate",
  SPAM = "spam",
  FAKE = "fake",
  OFFENSIVE = "offensive",
  COPYRIGHT = "copyright",
  OTHER = "other",
}

export interface IReviewMedia {
  type: "image" | "video";
  url: string;
  thumbnail?: string;
  caption?: string;
  order: number;
}

export interface IFlag {
  user: mongoose.Types.ObjectId;
  reason: FlagReason;
  description?: string;
  flaggedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  action?: "dismissed" | "warning" | "hidden" | "removed";
}

export interface IHelpfulVote {
  user: mongoose.Types.ObjectId;
  helpful: boolean;
  votedAt: Date;
}

export interface IResponse {
  user: mongoose.Types.ObjectId;
  message: string;
  respondedAt: Date;
  isVendor: boolean;
  isOfficial: boolean;
}

export interface IReviewModel extends mongoose.Model<IReview> {
  findByEvent(eventId: mongoose.Types.ObjectId): Promise<IReview[]>;
  findByVendor(vendorId: mongoose.Types.ObjectId): Promise<IReview[]>;
  findByUser(userId: mongoose.Types.ObjectId): Promise<IReview[]>;
  getAverageRating(
    targetId: mongoose.Types.ObjectId,
    type: ReviewType,
  ): Promise<{
    averageRating: number;
    totalReviews: number;
    distribution: { [key: number]: number };
  }>;
  updateEventStats(eventId: mongoose.Types.ObjectId): Promise<void>;
}

export interface IReview extends Document {
  type: ReviewType;
  event?: mongoose.Types.ObjectId;
  vendor?: mongoose.Types.ObjectId;
  venue?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  rating: number;
  title?: string;
  comment?: string;
  pros?: string[];
  cons?: string[];
  media: IReviewMedia[];
  verified: boolean;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  helpful: number;
  notHelpful: number;
  helpfulVotes: IHelpfulVote[];
  flags: IFlag[];
  flagCount: number;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationNotes?: string;
  responses: IResponse[];
  analytics: {
    views: number;
    shares: number;
    helpfulClicks: number;
    reportClicks: number;
    lastViewed?: Date;
  };
  source: "web" | "mobile" | "email" | "admin";
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  isActive: boolean;
  helpfulPercentage: number;
  canEdit: boolean;
  canDelete: boolean;
  addHelpfulVote(userId: mongoose.Types.ObjectId, helpful: boolean): void;
  removeHelpfulVote(userId: mongoose.Types.ObjectId): void;
  addFlag(userId: mongoose.Types.ObjectId, reason: FlagReason, description?: string): void;
  addResponse(userId: mongoose.Types.ObjectId, message: string, isVendor?: boolean): void;
  moderate(moderatorId: mongoose.Types.ObjectId, status: ReviewStatus, notes?: string): void;
  incrementViews(): void;
  toJSON(): any;
}

const reviewSchema = new Schema<IReview>(
  {
    type: {
      type: String,
      enum: Object.values(ReviewType),
      required: [true, "Review type is required"],
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: function () {
        return this.type === ReviewType.EVENT;
      },
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type === ReviewType.VENDOR;
      },
    },
    venue: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: function () {
        return this.type === ReviewType.VENUE;
      },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
    pros: [
      {
        type: String,
        trim: true,
        maxlength: [200, "Pro cannot exceed 200 characters"],
      },
    ],
    cons: [
      {
        type: String,
        trim: true,
        maxlength: [200, "Con cannot exceed 200 characters"],
      },
    ],
    media: [
      {
        type: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },
        url: { type: String, required: true },
        thumbnail: String,
        caption: { type: String, maxlength: [200, "Caption cannot exceed 200 characters"] },
        order: { type: Number, default: 0 },
      },
    ],
    verified: { type: Boolean, default: false },
    verifiedPurchase: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.PENDING,
    },
    helpful: { type: Number, default: 0, min: 0 },
    notHelpful: { type: Number, default: 0, min: 0 },
    helpfulVotes: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        helpful: { type: Boolean, required: true },
        votedAt: { type: Date, default: Date.now },
      },
    ],
    flags: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, enum: Object.values(FlagReason), required: true },
        description: { type: String, maxlength: [500, "Flag description cannot exceed 500 characters"] },
        flaggedAt: { type: Date, default: Date.now },
        resolved: { type: Boolean, default: false },
        resolvedAt: Date,
        resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
        action: { type: String, enum: ["dismissed", "warning", "hidden", "removed"] },
      },
    ],
    flagCount: { type: Number, default: 0, min: 0 },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: Date,
    moderationNotes: { type: String, maxlength: [1000, "Moderation notes cannot exceed 1000 characters"] },
    responses: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, required: true, maxlength: [1000, "Response message cannot exceed 1000 characters"] },
        respondedAt: { type: Date, default: Date.now },
        isVendor: { type: Boolean, default: false },
        isOfficial: { type: Boolean, default: false },
      },
    ],
    analytics: {
      views: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      helpfulClicks: { type: Number, default: 0 },
      reportClicks: { type: Number, default: 0 },
      lastViewed: Date,
    },
    source: {
      type: String,
      enum: ["web", "mobile", "email", "admin"],
      default: "web",
    },
    ipAddress: String,
    userAgent: String,
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.virtual("isActive").get(function () {
  return this.status === ReviewStatus.APPROVED && !this.deletedAt;
});

reviewSchema.virtual("helpfulPercentage").get(function () {
  const total = this.helpful + this.notHelpful;
  return total > 0 ? Math.round((this.helpful / total) * 100) : 0;
});

reviewSchema.virtual("canEdit").get(function () {
  const now = new Date();
  const createdAt = new Date(this.createdAt);
  const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 3600);
  return hoursDiff <= 24 && this.status === ReviewStatus.PENDING;
});

reviewSchema.virtual("canDelete").get(function () {
  const now = new Date();
  const createdAt = new Date(this.createdAt);
  const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
  return daysDiff <= 7;
});

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
reviewSchema.index({ event: 1, status: 1, rating: 1 });
reviewSchema.index({ vendor: 1, status: 1, rating: 1 });
reviewSchema.index({ user: 1, type: 1 });
reviewSchema.index({ status: 1, flagCount: 1 });
reviewSchema.index({ title: "text", comment: "text", pros: "text", cons: "text" });

reviewSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const query: any = {
        user: this.user,
        type: this.type,
        deletedAt: { $exists: false },
        _id: { $ne: this._id },
      };
      if (this.type === ReviewType.EVENT) query.event = this.event;
      else if (this.type === ReviewType.VENDOR) query.vendor = this.vendor;
      else if (this.type === ReviewType.VENUE) query.venue = this.venue;

      const existingReview = await (this.constructor as any).findOne(query);
      if (existingReview) {
        return next(new Error("User has already reviewed this item"));
      }
    }

    if (this.order) {
      const Order = mongoose.model("Order");
      const order = await Order.findOne({
        _id: this.order,
        userId: this.user,
        status: "confirmed",
        paymentStatus: "paid",
      });
      if (order) {
        this.verifiedPurchase = true;
        this.verified = true;
      }
    }

    if (this.verified && this.status === ReviewStatus.PENDING) {
      this.status = ReviewStatus.APPROVED;
    }

    this.flagCount = this.flags.filter((flag: IFlag) => !flag.resolved).length;
    if (this.flagCount >= 3 && this.status === ReviewStatus.APPROVED) {
      this.status = ReviewStatus.FLAGGED;
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

reviewSchema.post("save", async function (doc) {
  try {
    if (doc.type === ReviewType.EVENT && doc.event) {
      const statusChanged = doc.isModified("status");
      const ratingChanged = doc.isModified("rating");
      const isApproved = doc.status === ReviewStatus.APPROVED;
      if (statusChanged || (ratingChanged && isApproved) || (doc.isNew && isApproved)) {
        const Review = mongoose.model<IReview, IReviewModel>("Review");
        await Review.updateEventStats(doc.event);
      }
    }
  } catch (error) {
    console.error("Error in post-save middleware for review stats:", error);
  }
});

reviewSchema.methods.addHelpfulVote = function (userId: mongoose.Types.ObjectId, helpful: boolean): void {
  this.removeHelpfulVote(userId);
  this.helpfulVotes.push({ user: userId, helpful, votedAt: new Date() });
  this.helpful = this.helpfulVotes.filter((v: IHelpfulVote) => v.helpful).length;
  this.notHelpful = this.helpfulVotes.filter((v: IHelpfulVote) => !v.helpful).length;
  this.analytics.helpfulClicks++;
};

reviewSchema.methods.removeHelpfulVote = function (userId: mongoose.Types.ObjectId): void {
  this.helpfulVotes = this.helpfulVotes.filter((v: IHelpfulVote) => !v.user.equals(userId));
  this.helpful = this.helpfulVotes.filter((v: IHelpfulVote) => v.helpful).length;
  this.notHelpful = this.helpfulVotes.filter((v: IHelpfulVote) => !v.helpful).length;
};

reviewSchema.methods.addFlag = function (userId: mongoose.Types.ObjectId, reason: FlagReason, description?: string): void {
  const existingFlag = this.flags.find((f: IFlag) => f.user.equals(userId) && !f.resolved);
  if (existingFlag) throw new Error("User has already flagged this review");
  this.flags.push({ user: userId, reason, description, flaggedAt: new Date(), resolved: false });
  this.flagCount = this.flags.filter((f: IFlag) => !f.resolved).length;
  this.analytics.reportClicks++;
};

reviewSchema.methods.addResponse = function (userId: mongoose.Types.ObjectId, message: string, isVendor = false): void {
  this.responses.push({ user: userId, message, respondedAt: new Date(), isVendor, isOfficial: isVendor });
};

reviewSchema.methods.moderate = function (moderatorId: mongoose.Types.ObjectId, status: ReviewStatus, notes?: string): void {
  this.status = status;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  this.moderationNotes = notes;
  if (status === ReviewStatus.APPROVED) {
    this.flags.forEach((f: IFlag) => {
      if (!f.resolved) {
        f.resolved = true;
        f.resolvedAt = new Date();
        f.resolvedBy = moderatorId;
        f.action = "dismissed";
      }
    });
    this.flagCount = 0;
  }
};

reviewSchema.methods.incrementViews = function (): void {
  this.analytics.views++;
  this.analytics.lastViewed = new Date();
};

reviewSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.ipAddress;
  delete obj.userAgent;
  delete obj.flags;
  delete obj.moderationNotes;
  return obj;
};

reviewSchema.statics.findByEvent = function (eventId: mongoose.Types.ObjectId) {
  return this.find({ event: eventId, status: ReviewStatus.APPROVED, deletedAt: { $exists: false } })
    .populate("user", "firstName lastName avatar")
    .sort({ createdAt: -1 });
};

reviewSchema.statics.findByVendor = function (vendorId: mongoose.Types.ObjectId) {
  return this.find({ vendor: vendorId, status: ReviewStatus.APPROVED, deletedAt: { $exists: false } })
    .populate("user", "firstName lastName avatar")
    .sort({ createdAt: -1 });
};

reviewSchema.statics.findByUser = function (userId: mongoose.Types.ObjectId) {
  return this.find({ user: userId, deletedAt: { $exists: false } })
    .populate("event vendor venue", "title firstName lastName")
    .sort({ createdAt: -1 });
};

reviewSchema.statics.getAverageRating = async function (targetId: mongoose.Types.ObjectId, type: ReviewType) {
  const field = type === ReviewType.EVENT ? "event" : type === ReviewType.VENDOR ? "vendor" : "venue";
  const result = await this.aggregate([
    { $match: { [field]: targetId, status: ReviewStatus.APPROVED, deletedAt: { $exists: false } } },
    { $group: { _id: null, averageRating: { $avg: "$rating" }, totalReviews: { $sum: 1 }, distribution: { $push: "$rating" } } },
  ]);
  if (result.length === 0) {
    return { averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }
  const data = result[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  data.distribution.forEach((r: number) => { distribution[r as keyof typeof distribution]++; });
  return { averageRating: Math.round(data.averageRating * 10) / 10, totalReviews: data.totalReviews, distribution };
};

reviewSchema.statics.updateEventStats = async function (this: IReviewModel, eventId: mongoose.Types.ObjectId) {
  try {
    const Event = mongoose.model("Event");
    const stats = await (this as IReviewModel).getAverageRating(eventId, ReviewType.EVENT);
    await Event.findByIdAndUpdate(eventId, {
      $set: { reviewCount: stats.totalReviews, averageRating: stats.averageRating, ratingDistribution: stats.distribution },
    }, { new: true });
    try {
      const { eventService } = await import("../../modules/events/events.service");
      await eventService.updateCombinedRating(eventId);
    } catch (error) {
      console.error(`Error updating combined rating for event ${eventId}:`, error);
    }
  } catch (error) {
    console.error(`Error updating event stats for ${eventId}:`, error);
    throw error;
  }
};

const Review = mongoose.model<IReview, IReviewModel>("Review", reviewSchema);
export default Review;
