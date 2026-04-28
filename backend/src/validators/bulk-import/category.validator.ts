import { body } from "express-validator";
import mongoose from "mongoose";

/**
 * Validator for Category bulk import
 * Accepts both categorySlug/categoryId and parentSlug/parentId
 */
export const validateCategoryImport = [
  // Validate data array
  body("data")
    .isArray({ min: 1, max: 10000 })
    .withMessage("data must be an array with 1-10000 items"),

  // Validate each category in array
  body("data.*.name")
    .notEmpty()
    .withMessage("Category name is required")
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Category name cannot exceed 100 characters"),

  body("data.*.slug")
    .optional()
    .isString()
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Slug can only contain lowercase letters, numbers, and hyphens",
    )
    .isLength({ max: 100 })
    .withMessage("Slug cannot exceed 100 characters"),

  body("data.*.description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("data.*.parentSlug")
    .optional()
    .isString()
    .trim()
    .toLowerCase()
    .withMessage("parentSlug must be a string"),

  body("data.*.parentId")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("parentId must be a valid MongoDB ObjectId");
      }
      return true;
    }),

  body("data.*.isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("data.*.sortOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("sortOrder must be a non-negative integer"),

  body("data.*.color")
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("color must be a valid hex color code (e.g., #FF5733)"),

  body("data.*.seoMeta.title")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 60 })
    .withMessage("SEO title cannot exceed 60 characters"),

  body("data.*.seoMeta.description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 160 })
    .withMessage("SEO description cannot exceed 160 characters"),

  body("data.*.seoMeta.keywords")
    .optional()
    .isArray({ max: 10 })
    .withMessage("SEO keywords must be an array with max 10 items"),

  body("data.*.seoMeta.keywords.*")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Each SEO keyword cannot exceed 50 characters"),

  // _id for updates (upsert mode)
  body("data.*._id")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("_id must be a valid MongoDB ObjectId");
      }
      return true;
    }),
];

/**
 * Validator for Category bulk export filters
 */
export const validateCategoryExportFilters = [
  body("filters.isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("filters.parentId")
    .optional()
    .custom((value) => {
      if (
        value &&
        value !== "null" &&
        !mongoose.Types.ObjectId.isValid(value)
      ) {
        throw new Error(
          'parentId must be a valid MongoDB ObjectId or "null" for root categories',
        );
      }
      return true;
    }),

  body("filters.level")
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage("level must be between 0 and 5"),

  body("filters.limit")
    .optional()
    .isInt({ min: 1, max: 50000 })
    .withMessage("limit must be between 1 and 50000"),

  body("includeRelationships")
    .optional()
    .isBoolean()
    .withMessage("includeRelationships must be a boolean"),

  body("format").optional().isIn(["json"]).withMessage("format must be json"),
];
