import mongoose, { Document, Schema } from "mongoose";
import {
  MAX_SOCIAL_REACH,
  MAX_IMPRESSIONS,
  MAX_BANNER_IMPRESSIONS,
  MAX_POST_REACH,
  MAX_CAMPAIGN_COST,
  MAX_LABEL_LENGTH,
} from "../constants/businessHealth.rules";

/**
 * Admin-entered promotional data for a vendor's business report period.
 *
 * Kidrove cannot compute social reach, impressions, or offline campaign
 * performance itself — this is where admin types those numbers in, modelled
 * on how the Ascend Esports promotion snapshot is assembled today. Every
 * numeric field is optional/nullable: an unfilled field must render as
 * "Not tracked" in the report, never as a fabricated 0.
 *
 * Mutable — this is the input side. VendorBusinessSnapshot freezes a copy
 * of the relevant fields (with `source: 'manual'`) at generation time so a
 * report never silently changes after being sent to a vendor.
 */

export interface ISocialReach {
  instagram?: number;
  facebook?: number;
  tiktok?: number;
  youtube?: number;
}

export interface IBannerPlacement {
  label: string;
  placement?: string;
  impressions?: number;
  clicks?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface IFeaturedListing {
  eventTitle: string;
  placement?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ITopPost {
  platform: "instagram" | "facebook" | "tiktok" | "youtube" | "other";
  url?: string;
  caption?: string;
  reach?: number;
  engagement?: number;
  postedAt?: Date;
}

export type OfflineCampaignType =
  | "billboard"
  | "magazine"
  | "tv"
  | "radio"
  | "influencer"
  | "school_visit"
  | "exhibition"
  | "workshop"
  | "other";

export interface IOfflineCampaign {
  type: OfflineCampaignType;
  label: string;
  details?: string;
  cost?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface IVendorPromotionInput extends Document {
  vendorId: mongoose.Types.ObjectId;
  period: string; // "YYYY-MM"

  socialReach?: ISocialReach;
  impressions?: number;
  bannerPlacements?: IBannerPlacement[];
  homepagePromotion?: string;
  featuredListings?: IFeaturedListing[];
  topPosts?: ITopPost[];
  offlineCampaigns?: IOfflineCampaign[];

  notes?: string;

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SocialReachSchema = new Schema<ISocialReach>(
  {
    instagram: { type: Number, min: 0, max: MAX_SOCIAL_REACH },
    facebook: { type: Number, min: 0, max: MAX_SOCIAL_REACH },
    tiktok: { type: Number, min: 0, max: MAX_SOCIAL_REACH },
    youtube: { type: Number, min: 0, max: MAX_SOCIAL_REACH },
  },
  { _id: false },
);

const BannerPlacementSchema = new Schema<IBannerPlacement>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_LABEL_LENGTH,
    },
    placement: { type: String, trim: true },
    impressions: { type: Number, min: 0, max: MAX_BANNER_IMPRESSIONS },
    clicks: { type: Number, min: 0, max: MAX_BANNER_IMPRESSIONS },
    startDate: Date,
    endDate: Date,
  },
  { _id: false },
);

const FeaturedListingSchema = new Schema<IFeaturedListing>(
  {
    eventTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_LABEL_LENGTH,
    },
    placement: { type: String, trim: true },
    startDate: Date,
    endDate: Date,
  },
  { _id: false },
);

const TopPostSchema = new Schema<ITopPost>(
  {
    platform: {
      type: String,
      enum: ["instagram", "facebook", "tiktok", "youtube", "other"],
      required: true,
    },
    url: { type: String, trim: true },
    caption: { type: String, trim: true, maxlength: 500 },
    reach: { type: Number, min: 0, max: MAX_POST_REACH },
    engagement: { type: Number, min: 0, max: MAX_POST_REACH },
    postedAt: Date,
  },
  { _id: false },
);

const OfflineCampaignSchema = new Schema<IOfflineCampaign>(
  {
    type: {
      type: String,
      enum: [
        "billboard",
        "magazine",
        "tv",
        "radio",
        "influencer",
        "school_visit",
        "exhibition",
        "workshop",
        "other",
      ],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_LABEL_LENGTH,
    },
    details: { type: String, trim: true, maxlength: 1000 },
    cost: { type: Number, min: 0, max: MAX_CAMPAIGN_COST },
    startDate: Date,
    endDate: Date,
  },
  { _id: false },
);

const VendorPromotionInputSchema = new Schema<IVendorPromotionInput>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    period: { type: String, required: true }, // "YYYY-MM"

    socialReach: SocialReachSchema,
    impressions: { type: Number, min: 0, max: MAX_IMPRESSIONS },
    bannerPlacements: [BannerPlacementSchema],
    homepagePromotion: { type: String, trim: true, maxlength: 1000 },
    featuredListings: [FeaturedListingSchema],
    topPosts: [TopPostSchema],
    offlineCampaigns: [OfflineCampaignSchema],

    notes: { type: String, trim: true, maxlength: 2000 },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// One editable input document per (vendor, calendar month)
VendorPromotionInputSchema.index({ vendorId: 1, period: 1 }, { unique: true });

const VendorPromotionInput = mongoose.model<IVendorPromotionInput>(
  "VendorPromotionInput",
  VendorPromotionInputSchema,
);

export default VendorPromotionInput;
