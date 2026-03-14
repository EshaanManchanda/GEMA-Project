import mongoose, { Schema, Document, Model } from "mongoose";

export interface INewsletterSubscriber extends Document {
  email: string;
  name: string;
  ageOfChildren?: string;
  city?: string;
  isActive: boolean;
  source: string;
  tags: string[];
  preferences: {
    frequency: "daily" | "weekly" | "monthly";
    categories: string[];
    receivePromotions: boolean;
  };
  subscriptionDate: Date;
  lastEmailSent?: Date;
  unsubscribeToken?: string;
  unsubscribeDate?: Date;
  unsubscribeReason?: string;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  unsubscribe(reason?: string): Promise<INewsletterSubscriber>;
  resubscribe(): Promise<INewsletterSubscriber>;
}

export interface INewsletterSubscriberModel extends Model<INewsletterSubscriber> {
  getActiveSubscribersByFrequency(
    frequency: string,
  ): Promise<INewsletterSubscriber[]>;
  getSubscribersBySource(source: string): Promise<INewsletterSubscriber[]>;
  getSubscriptionStats(): Promise<any>;
}

const newsletterSubscriberSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (email: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
    name: {
      type: String,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
      // Note: NOT required in schema for backward compatibility
    },
    ageOfChildren: {
      type: String,
      trim: true,
      maxlength: [50, "Age of children cannot exceed 50 characters"],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      required: [true, "Subscription source is required"],
      enum: ["blog", "footer", "popup", "checkout", "profile", "api"],
      default: "blog",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    preferences: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "weekly",
      },
      categories: [
        {
          type: String,
          trim: true,
        },
      ],
      receivePromotions: {
        type: Boolean,
        default: true,
      },
    },
    subscriptionDate: {
      type: Date,
      default: Date.now,
    },
    lastEmailSent: {
      type: Date,
    },
    unsubscribeToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    unsubscribeDate: {
      type: Date,
    },
    unsubscribeReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for better performance
// Note: email and unsubscribeToken already have indexes from unique: true
newsletterSubscriberSchema.index({ isActive: 1 });
newsletterSubscriberSchema.index({ source: 1 });
newsletterSubscriberSchema.index({ subscriptionDate: -1 });
newsletterSubscriberSchema.index({ "preferences.frequency": 1 });
newsletterSubscriberSchema.index({ city: 1 });

// Pre-save middleware to generate unsubscribe token
newsletterSubscriberSchema.pre("save", function (next) {
  if (this.isNew && !this.unsubscribeToken) {
    this.unsubscribeToken = require("crypto").randomBytes(32).toString("hex");
  }
  next();
});

// Virtual for days since subscription
newsletterSubscriberSchema.virtual("daysSinceSubscription").get(function (
  this: INewsletterSubscriber,
) {
  if (!this.subscriptionDate) return 0;
  const now = new Date();
  const diffTime = now.getTime() - this.subscriptionDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Static method to get active subscribers by frequency
newsletterSubscriberSchema.statics.getActiveSubscribersByFrequency = function (
  frequency: string,
) {
  return this.find({
    isActive: true,
    "preferences.frequency": frequency,
  });
};

// Static method to get subscribers by source
newsletterSubscriberSchema.statics.getSubscribersBySource = function (
  source: string,
) {
  return this.find({ source });
};

// Static method to get subscription stats
newsletterSubscriberSchema.statics.getSubscriptionStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalSubscribers: { $sum: 1 },
        activeSubscribers: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        inactiveSubscribers: {
          $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
        },
        bySource: {
          $push: {
            source: "$source",
            isActive: "$isActive",
          },
        },
        byFrequency: {
          $push: {
            frequency: "$preferences.frequency",
            isActive: "$isActive",
          },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      totalSubscribers: 0,
      activeSubscribers: 0,
      inactiveSubscribers: 0,
      bySource: [],
      byFrequency: [],
    }
  );
};

// Instance method to unsubscribe
newsletterSubscriberSchema.methods.unsubscribe = function (reason?: string) {
  this.isActive = false;
  this.unsubscribeDate = new Date();
  if (reason) {
    this.unsubscribeReason = reason;
  }
  return this.save();
};

// Instance method to resubscribe
newsletterSubscriberSchema.methods.resubscribe = function () {
  this.isActive = true;
  this.unsubscribeDate = undefined;
  this.unsubscribeReason = undefined;
  return this.save();
};

export default mongoose.model<
  INewsletterSubscriber,
  INewsletterSubscriberModel
>("NewsletterSubscriber", newsletterSubscriberSchema);
