import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPartnership extends Document {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  partnershipType: "vendor" | "influencer" | "school" | "affiliate" | "other";
  website?: string;
  message: string;
  agreeToTerms: boolean;
  status: "pending" | "contacted" | "approved" | "rejected";
  contactedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPartnershipModel extends Model<IPartnership> {
  getPartnershipStats(): Promise<any>;
}

const partnershipSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      validate: {
        validator: function (email: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (phone: string) {
          if (!phone) return true; // Optional field
          return /^[\d\s+()-]+$/.test(phone);
        },
        message: "Please provide a valid phone number",
      },
    },
    organization: {
      type: String,
      trim: true,
      maxlength: [200, "Organization name cannot exceed 200 characters"],
    },
    partnershipType: {
      type: String,
      required: [true, "Partnership type is required"],
      enum: {
        values: ["vendor", "influencer", "school", "affiliate", "other"],
        message: "Invalid partnership type",
      },
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (url: string) {
          if (!url) return true; // Optional field
          return /^https?:\/\/.+\..+/.test(url);
        },
        message: "Please provide a valid website URL",
      },
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters long"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    agreeToTerms: {
      type: Boolean,
      required: [true, "You must agree to the terms and conditions"],
      validate: {
        validator: function (value: boolean) {
          return value === true;
        },
        message: "You must agree to the terms and conditions",
      },
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "approved", "rejected"],
      default: "pending",
    },
    contactedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for efficient querying
partnershipSchema.index({ email: 1 });
partnershipSchema.index({ partnershipType: 1 });
partnershipSchema.index({ status: 1 });
partnershipSchema.index({ createdAt: -1 });

// Static method to get partnership statistics
partnershipSchema.statics.getPartnershipStats =
  async function (): Promise<any> {
    const stats = await this.aggregate([
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          totalCount: [
            {
              $count: "total",
            },
          ],
          typeCounts: [
            {
              $group: {
                _id: "$partnershipType",
                count: { $sum: 1 },
              },
            },
          ],
          recentPartnerships: [
            {
              $sort: { createdAt: -1 },
            },
            {
              $limit: 10,
            },
          ],
        },
      },
    ]);

    return stats[0] || {};
  };

const Partnership = mongoose.model<IPartnership, IPartnershipModel>(
  "Partnership",
  partnershipSchema,
);

export default Partnership;
