import mongoose, { Document, Schema } from "mongoose";

export enum CouponType {
  PERCENTAGE = "percentage",
  FIXED_AMOUNT = "fixed_amount",
  FREE_SHIPPING = "free_shipping",
}

export enum CouponStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  EXPIRED = "expired",
}

export interface ICouponUsage {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  usedAt: Date;
  discountAmount: number;
}

export interface ICoupon extends Document {
  code: string;
  name: string;
  description?: string;
  type: CouponType;
  value: number;
  currency?: string;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usageCount: number;
  userUsageLimit?: number;
  isActive: boolean;
  status: CouponStatus;
  applicableEvents: mongoose.Types.ObjectId[];
  applicableCategories: mongoose.Types.ObjectId[];
  excludedEvents: mongoose.Types.ObjectId[];
  excludedCategories: mongoose.Types.ObjectId[];
  applicableVendors: mongoose.Types.ObjectId[];
  excludedVendors: mongoose.Types.ObjectId[];
  applicableEventTypes: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  firstTimeOnly: boolean;
  createdBy: mongoose.Types.ObjectId;
  usage: ICouponUsage[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isValidForUser(userId: mongoose.Types.ObjectId): Promise<boolean>;
  isValidForOrder(
    orderAmount: number,
    eventIds: mongoose.Types.ObjectId[],
    events?: any[],
  ): boolean;
  calculateDiscount(orderAmount: number): number;
  canBeUsed(): boolean;
  incrementUsage(
    userId: mongoose.Types.ObjectId,
    orderId: mongoose.Types.ObjectId,
    discountAmount: number,
  ): Promise<void>;
}

// Static methods interface
export interface ICouponModel extends mongoose.Model<ICoupon> {
  findActive(): mongoose.Query<ICoupon[], ICoupon>;
  findByCode(code: string): mongoose.Query<ICoupon | null, ICoupon>;
}

const couponUsageSchema = new Schema<ICouponUsage>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  usedAt: {
    type: Date,
    default: Date.now,
  },
  discountAmount: {
    type: Number,
    required: true,
    min: [0, "Discount amount cannot be negative"],
  },
});

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      trim: true,
      uppercase: true,
      minlength: [3, "Coupon code must be at least 3 characters"],
      maxlength: [20, "Coupon code cannot exceed 20 characters"],
      match: [
        /^[A-Z0-9-_]+$/,
        "Coupon code can only contain uppercase letters, numbers, hyphens, and underscores",
      ],
    },
    name: {
      type: String,
      required: [true, "Coupon name is required"],
      trim: true,
      maxlength: [100, "Coupon name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    type: {
      type: String,
      enum: Object.values(CouponType),
      required: [true, "Coupon type is required"],
    },
    value: {
      type: Number,
      required: [true, "Coupon value is required"],
      min: [0, "Coupon value cannot be negative"],
      validate: {
        validator: function (this: ICoupon, v: number) {
          if (this.type === CouponType.PERCENTAGE) {
            return v >= 0 && v <= 100;
          }
          return v >= 0;
        },
        message: "Percentage coupons must be between 0 and 100",
      },
    },
    currency: {
      type: String,
      enum: ["AED", "EGP", "CAD", "USD"],
      default: "AED",
      required: function (this: ICoupon) {
        return this.type === CouponType.FIXED_AMOUNT;
      },
    },
    minimumAmount: {
      type: Number,
      min: [0, "Minimum amount cannot be negative"],
    },
    maximumDiscount: {
      type: Number,
      min: [0, "Maximum discount cannot be negative"],
    },
    validFrom: {
      type: Date,
      required: [true, "Valid from date is required"],
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, "Valid until date is required"],
      validate: {
        validator: function (this: ICoupon, v: Date) {
          return v > this.validFrom;
        },
        message: "Valid until date must be after valid from date",
      },
    },
    usageLimit: {
      type: Number,
      min: [1, "Usage limit must be at least 1"],
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, "Usage count cannot be negative"],
    },
    userUsageLimit: {
      type: Number,
      min: [1, "User usage limit must be at least 1"],
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: Object.values(CouponStatus),
      default: CouponStatus.ACTIVE,
    },
    applicableEvents: [
      {
        type: Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    applicableCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    excludedEvents: [
      {
        type: Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    excludedCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    applicableVendors: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    excludedVendors: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    applicableEventTypes: [
      {
        type: String,
        enum: [
          "Olympiad",
          "Championship",
          "Competition",
          "Event",
          "Course",
          "Venue",
        ],
        trim: true,
      },
    ],
    priceRange: {
      min: {
        type: Number,
        min: [0, "Minimum price cannot be negative"],
      },
      max: {
        type: Number,
        min: [0, "Maximum price cannot be negative"],
        validate: {
          validator: function (this: ICoupon, v: number) {
            if (this.priceRange?.min && v) {
              return v >= this.priceRange.min;
            }
            return true;
          },
          message:
            "Maximum price must be greater than or equal to minimum price",
        },
      },
    },
    firstTimeOnly: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
    },
    usage: [couponUsageSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes for performance
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ status: 1, isActive: 1 });
couponSchema.index({ validFrom: 1, validUntil: 1 });
couponSchema.index({ createdBy: 1 });
couponSchema.index({ "usage.userId": 1 });
couponSchema.index({ applicableCategories: 1 });
couponSchema.index({ excludedCategories: 1 });
couponSchema.index({ applicableVendors: 1 });
couponSchema.index({ excludedVendors: 1 });
couponSchema.index({ applicableEventTypes: 1 });

// Pre-save middleware to update status
couponSchema.pre("save", function (next) {
  const now = new Date();

  if (now < this.validFrom) {
    this.status = CouponStatus.INACTIVE;
  } else if (now > this.validUntil) {
    this.status = CouponStatus.EXPIRED;
  } else if (this.usageLimit && this.usageCount >= this.usageLimit) {
    this.status = CouponStatus.EXPIRED;
  } else if (this.isActive) {
    this.status = CouponStatus.ACTIVE;
  } else {
    this.status = CouponStatus.INACTIVE;
  }

  next();
});

// Virtual for remaining uses
couponSchema.virtual("remainingUses").get(function () {
  if (!this.usageLimit) return null;
  return Math.max(0, this.usageLimit - this.usageCount);
});

// Method to check if coupon is valid for user
couponSchema.methods.isValidForUser = async function (
  userId: mongoose.Types.ObjectId,
): Promise<boolean> {
  // Check if coupon is generally valid
  if (!this.canBeUsed()) {
    return false;
  }

  // Check user usage limit
  if (this.userUsageLimit) {
    const userUsageCount = this.usage.filter(
      (u) => u.userId.toString() === userId.toString(),
    ).length;
    if (userUsageCount >= this.userUsageLimit) {
      return false;
    }
  }

  // Check if it's first time only coupon
  if (this.firstTimeOnly) {
    const userOrderCount = await this.model("Order").countDocuments({
      userId,
      status: { $in: ["confirmed", "paid"] },
    });
    if (userOrderCount > 0) {
      return false;
    }
  }

  return true;
};

// Method to check if coupon is valid for order
couponSchema.methods.isValidForOrder = function (
  orderAmount: number,
  eventIds: mongoose.Types.ObjectId[],
  events: any[] = [],
): boolean {
  // Check minimum amount
  if (this.minimumAmount && orderAmount < this.minimumAmount) {
    return false;
  }

  // Check applicable events (if specified)
  if (this.applicableEvents.length > 0) {
    const hasApplicableEvent = eventIds.some((eventId) =>
      this.applicableEvents.some(
        (applicableId) => applicableId.toString() === eventId.toString(),
      ),
    );
    if (!hasApplicableEvent) {
      return false;
    }
  }

  // Check excluded events
  if (this.excludedEvents.length > 0) {
    const hasExcludedEvent = eventIds.some((eventId) =>
      this.excludedEvents.some(
        (excludedId) => excludedId.toString() === eventId.toString(),
      ),
    );
    if (hasExcludedEvent) {
      return false;
    }
  }

  // If events data is provided, check additional restrictions
  if (events && events.length > 0) {
    // Check applicable categories
    if (this.applicableCategories.length > 0) {
      const hasApplicableCategory = events.some((event) =>
        this.applicableCategories.some(
          (catId) =>
            event.category?.toString() === catId.toString() ||
            event.category?._id?.toString() === catId.toString(),
        ),
      );
      if (!hasApplicableCategory) {
        return false;
      }
    }

    // Check excluded categories
    if (this.excludedCategories.length > 0) {
      const hasExcludedCategory = events.some((event) =>
        this.excludedCategories.some(
          (catId) =>
            event.category?.toString() === catId.toString() ||
            event.category?._id?.toString() === catId.toString(),
        ),
      );
      if (hasExcludedCategory) {
        return false;
      }
    }

    // Check applicable vendors
    if (this.applicableVendors.length > 0) {
      const hasApplicableVendor = events.some((event) =>
        this.applicableVendors.some(
          (vendorId) => event.vendorId?.toString() === vendorId.toString(),
        ),
      );
      if (!hasApplicableVendor) {
        return false;
      }
    }

    // Check excluded vendors
    if (this.excludedVendors.length > 0) {
      const hasExcludedVendor = events.some((event) =>
        this.excludedVendors.some(
          (vendorId) => event.vendorId?.toString() === vendorId.toString(),
        ),
      );
      if (hasExcludedVendor) {
        return false;
      }
    }

    // Check applicable event types
    if (this.applicableEventTypes.length > 0) {
      const hasApplicableType = events.some((event) =>
        this.applicableEventTypes.includes(event.type),
      );
      if (!hasApplicableType) {
        return false;
      }
    }

    // Check price range
    if (this.priceRange) {
      if (this.priceRange.min !== undefined) {
        const hasMinPrice = events.every(
          (event) => event.price >= this.priceRange.min,
        );
        if (!hasMinPrice) {
          return false;
        }
      }
      if (this.priceRange.max !== undefined) {
        const hasMaxPrice = events.every(
          (event) => event.price <= this.priceRange.max,
        );
        if (!hasMaxPrice) {
          return false;
        }
      }
    }
  }

  return true;
};

// Method to calculate discount amount
couponSchema.methods.calculateDiscount = function (
  orderAmount: number,
): number {
  let discount = 0;

  switch (this.type) {
    case CouponType.PERCENTAGE:
      discount = (orderAmount * this.value) / 100;
      break;
    case CouponType.FIXED_AMOUNT:
      discount = this.value;
      break;
    case CouponType.FREE_SHIPPING:
      // This would need to be calculated based on shipping costs
      discount = 0; // Placeholder
      break;
  }

  // Apply maximum discount limit
  if (this.maximumDiscount && discount > this.maximumDiscount) {
    discount = this.maximumDiscount;
  }

  // Ensure discount doesn't exceed order amount
  return Math.min(discount, orderAmount);
};

// Method to check if coupon can be used
couponSchema.methods.canBeUsed = function (): boolean {
  const now = new Date();

  return (
    this.isActive &&
    this.status === CouponStatus.ACTIVE &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (!this.usageLimit || this.usageCount < this.usageLimit)
  );
};

// Method to increment usage
couponSchema.methods.incrementUsage = async function (
  userId: mongoose.Types.ObjectId,
  orderId: mongoose.Types.ObjectId,
  discountAmount: number,
): Promise<void> {
  this.usageCount += 1;
  this.usage.push({
    userId,
    orderId,
    usedAt: new Date(),
    discountAmount,
  });

  await this.save();
};

// Static method to find active coupons
couponSchema.statics.findActive = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    status: CouponStatus.ACTIVE,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  });
};

// Static method to find coupon by code
couponSchema.statics.findByCode = function (code: string) {
  return this.findOne({ code: code.toUpperCase() });
};

const Coupon = mongoose.model<ICoupon, ICouponModel>("Coupon", couponSchema);

export default Coupon;
