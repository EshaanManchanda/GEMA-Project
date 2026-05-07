import { body, param, query } from "express-validator";

export const createAnnouncementValidation = [
  body("message")
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage("Message must be between 1 and 200 characters"),
  body("link")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      if (!/^https?:\/\//.test(value) && !/^\//.test(value)) {
        throw new Error(
          "Link must be a valid URL (http/https) or relative path (starting with /)",
        );
      }
      return true;
    }),
  body("linkText")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 30 })
    .withMessage("Link text cannot exceed 30 characters"),
  body("icon")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 50 })
    .withMessage("Icon cannot exceed 50 characters"),
  body("backgroundColor")
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("Background color must be a valid hex color (#RRGGBB)"),
  body("textColor")
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("Text color must be a valid hex color (#RRGGBB)"),
  body("variant")
    .isIn(["info", "warning", "success", "error"])
    .withMessage("Variant must be info, warning, success, or error"),
  body("displayOrder")
    .isInt({ min: 0 })
    .withMessage("Display order must be 0 or greater"),
  body("status")
    .isIn(["active", "inactive", "scheduled"])
    .withMessage("Status must be active, inactive, or scheduled"),
  body("startDate")
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("endDate")
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((value, { req }) => {
      if (!value || !req.body.startDate) return true;
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  body("isActive")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("targetPages")
    .isIn(["all", "specific"])
    .withMessage("Target pages must be all or specific"),
  body("specificPages")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Specific pages must be an array"),
  body("specificPages.*")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .withMessage("Each page must be a string"),
  body("excludePages")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Exclude pages must be an array"),
  body("excludePages.*")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .withMessage("Each excluded page must be a string"),
  body("isDismissible")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("isDismissible must be a boolean"),
  body("dismissalDuration")
    .optional({ checkFalsy: true, nullable: true })
    .isInt({ min: 0 })
    .withMessage("Dismissal duration must be 0 or greater"),
];

export const updateAnnouncementValidation = [
  param("id").isMongoId().withMessage("Announcement ID must be valid"),
  body("message")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage("Message must be between 1 and 200 characters"),
  body("link")
    .optional({ checkFalsy: true, nullable: true })
    .custom((value) => {
      if (!value) return true;
      if (!/^https?:\/\//.test(value) && !/^\//.test(value)) {
        throw new Error(
          "Link must be a valid URL (http/https) or relative path (starting with /)",
        );
      }
      return true;
    }),
  body("linkText")
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .isLength({ max: 30 })
    .withMessage("Link text cannot exceed 30 characters"),
  body("icon")
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .isLength({ max: 50 })
    .withMessage("Icon cannot exceed 50 characters"),
  body("backgroundColor")
    .optional({ checkFalsy: true })
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("Background color must be a valid hex color (#RRGGBB)"),
  body("textColor")
    .optional({ checkFalsy: true })
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("Text color must be a valid hex color (#RRGGBB)"),
  body("variant")
    .optional({ checkFalsy: true })
    .isIn(["info", "warning", "success", "error"])
    .withMessage("Variant must be info, warning, success, or error"),
  body("displayOrder")
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Display order must be 0 or greater"),
  body("status")
    .optional({ checkFalsy: true })
    .isIn(["active", "inactive", "scheduled"])
    .withMessage("Status must be active, inactive, or scheduled"),
  body("startDate")
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("endDate")
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((value, { req }) => {
      if (!value || !req.body.startDate) return true;
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  body("isActive")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("targetPages")
    .optional({ checkFalsy: true })
    .isIn(["all", "specific"])
    .withMessage("Target pages must be all or specific"),
  body("specificPages")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Specific pages must be an array"),
  body("excludePages")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Exclude pages must be an array"),
  body("isDismissible")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("isDismissible must be a boolean"),
  body("dismissalDuration")
    .optional({ checkFalsy: true, nullable: true })
    .isInt({ min: 0 })
    .withMessage("Dismissal duration must be 0 or greater"),
];

export const getAnnouncementValidation = [
  param("id").isMongoId().withMessage("Announcement ID must be valid"),
];

export const deleteAnnouncementValidation = [
  param("id").isMongoId().withMessage("Announcement ID must be valid"),
];

export const getAllAnnouncementsValidation = [
  query("page")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional({ checkFalsy: true })
    .isIn(["active", "inactive", "scheduled"])
    .withMessage("Status must be active, inactive, or scheduled"),
  query("search")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),
];

export const updateDisplayOrdersValidation = [
  body("orders")
    .isArray({ min: 1 })
    .withMessage("Orders must be a non-empty array"),
  body("orders.*.id")
    .isMongoId()
    .withMessage("Each order item must have a valid announcement ID"),
  body("orders.*.displayOrder")
    .isInt({ min: 0 })
    .withMessage("Display order must be 0 or greater"),
];
