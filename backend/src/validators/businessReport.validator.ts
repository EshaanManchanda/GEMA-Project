import { body, param, query } from "express-validator";
import {
  MAX_SOCIAL_REACH,
  MAX_IMPRESSIONS,
  MAX_BANNER_IMPRESSIONS,
  MAX_POST_REACH,
  MAX_CAMPAIGN_COST,
  MAX_LABEL_LENGTH,
  MAX_BANNER_PLACEMENTS,
  MAX_FEATURED_LISTINGS,
  MAX_TOP_POSTS,
  MAX_OFFLINE_CAMPAIGNS,
} from "../constants/businessHealth.rules";

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const OFFLINE_CAMPAIGN_TYPES = [
  "billboard",
  "magazine",
  "tv",
  "radio",
  "influencer",
  "school_visit",
  "exhibition",
  "workshop",
  "other",
];

export const vendorIdParamValidation = [
  param("vendorId")
    .isMongoId()
    .withMessage("vendorId must be a valid Mongo ID"),
];

export const periodQueryValidation = [
  query("period")
    .optional()
    .matches(PERIOD_REGEX)
    .withMessage('period must be in "YYYY-MM" format'),
];

export const periodBodyValidation = [
  body("period")
    .matches(PERIOD_REGEX)
    .withMessage('period must be in "YYYY-MM" format'),
];

export const reportQueryValidation = [
  ...vendorIdParamValidation,
  query("period")
    .matches(PERIOD_REGEX)
    .withMessage('period must be in "YYYY-MM" format'),
  query("type")
    .optional()
    .isIn(["promotion", "health"])
    .withMessage("type must be promotion or health"),
  query("format")
    .optional()
    .isIn(["pdf", "csv"])
    .withMessage("format must be pdf or csv"),
];

export const taskCodeParamValidation = [
  ...vendorIdParamValidation,
  param("taskCode")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("taskCode is required"),
];

export const taskUpdateValidation = [
  ...taskCodeParamValidation,
  body("done").isBoolean().withMessage("done must be a boolean"),
];

// Per-element validation on the four repeater arrays uses the same
// wildcard-chain pattern as bulkGenerateValidation's `vendorIds.*` below.
// All wildcard chains are `.optional()` — express-validator can't express
// "required when the array exists", so required-ness (label/eventTitle/
// platform/type) is enforced by Mongoose (`required: true` on the schema,
// and upsertPromotionInput already passes `runValidators: true`).
export const promotionInputUpsertValidation = [
  ...vendorIdParamValidation,
  ...periodQueryValidation,
  body("socialReach.instagram")
    .optional()
    .isInt({ min: 0, max: MAX_SOCIAL_REACH }),
  body("socialReach.facebook")
    .optional()
    .isInt({ min: 0, max: MAX_SOCIAL_REACH }),
  body("socialReach.tiktok")
    .optional()
    .isInt({ min: 0, max: MAX_SOCIAL_REACH }),
  body("socialReach.youtube")
    .optional()
    .isInt({ min: 0, max: MAX_SOCIAL_REACH }),
  body("impressions").optional().isInt({ min: 0, max: MAX_IMPRESSIONS }),
  body("homepagePromotion")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 }),
  body("notes").optional().isString().trim().isLength({ max: 2000 }),

  body("bannerPlacements").optional().isArray({ max: MAX_BANNER_PLACEMENTS }),
  body("bannerPlacements.*.label")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: MAX_LABEL_LENGTH }),
  body("bannerPlacements.*.placement")
    .optional()
    .isString()
    .trim()
    .isLength({ max: MAX_LABEL_LENGTH }),
  body("bannerPlacements.*.impressions")
    .optional()
    .isInt({ min: 0, max: MAX_BANNER_IMPRESSIONS }),
  body("bannerPlacements.*.clicks")
    .optional()
    .isInt({ min: 0, max: MAX_BANNER_IMPRESSIONS }),

  body("featuredListings").optional().isArray({ max: MAX_FEATURED_LISTINGS }),
  body("featuredListings.*.eventTitle")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: MAX_LABEL_LENGTH }),
  body("featuredListings.*.placement")
    .optional()
    .isString()
    .trim()
    .isLength({ max: MAX_LABEL_LENGTH }),

  body("topPosts").optional().isArray({ max: MAX_TOP_POSTS }),
  body("topPosts.*.platform")
    .optional()
    .isIn(["instagram", "facebook", "tiktok", "youtube", "other"])
    .withMessage("topPosts[].platform must be a supported platform"),
  body("topPosts.*.url")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("topPosts[].url must be an http(s) URL"),
  body("topPosts.*.caption")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 }),
  body("topPosts.*.reach").optional().isInt({ min: 0, max: MAX_POST_REACH }),
  body("topPosts.*.engagement")
    .optional()
    .isInt({ min: 0, max: MAX_POST_REACH }),

  body("offlineCampaigns").optional().isArray({ max: MAX_OFFLINE_CAMPAIGNS }),
  body("offlineCampaigns.*.type")
    .optional()
    .isIn(OFFLINE_CAMPAIGN_TYPES)
    .withMessage("offlineCampaigns[].type must be a supported campaign type"),
  body("offlineCampaigns.*.label")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: MAX_LABEL_LENGTH }),
  body("offlineCampaigns.*.details")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 }),
  body("offlineCampaigns.*.cost")
    .optional()
    .isFloat({ min: 0, max: MAX_CAMPAIGN_COST }),
];

export const snapshotGenerateValidation = [
  ...vendorIdParamValidation,
  ...periodBodyValidation,
];

export const snapshotStatusValidation = [
  param("id").isMongoId().withMessage("id must be a valid Mongo ID"),
  body("status")
    .isIn(["locked", "reopened", "archived"])
    .withMessage("status must be locked, reopened, or archived"),
];

export const snapshotNotesValidation = [
  param("id").isMongoId().withMessage("id must be a valid Mongo ID"),
  body("vendorVisible").optional().isString().trim().isLength({ max: 4000 }),
  body("internal").optional().isString().trim().isLength({ max: 4000 }),
];

export const bulkGenerateValidation = [
  body("vendorIds")
    .isArray({ min: 1 })
    .withMessage("vendorIds must be a non-empty array"),
  body("vendorIds.*")
    .isMongoId()
    .withMessage("each vendorId must be a valid Mongo ID"),
  ...periodBodyValidation,
];

export const overviewQueryValidation = [
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("sortBy")
    .optional()
    .isIn([
      "overall",
      "listing",
      "sales",
      "marketing",
      "customer",
      "operations",
    ]),
  query("filter").optional().isIn([
    // Legacy values, kept for existing bookmarked admin URLs — see
    // LEGACY_FILTER_MAP in admin.businessReport.controller.ts.
    "low_performers",
    "declining",
    "inactive",
    // New segment predicates — see classifyVendorSegments.
    "new",
    "growing",
    "top_performer",
    "steady",
    "low_performer",
  ]),
];
