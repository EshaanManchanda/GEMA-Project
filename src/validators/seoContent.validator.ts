import { body, param, query } from "express-validator";

export const createSEOContentValidation = [
  body("page")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Page identifier is required"),
  body("metaTitle")
    .isString()
    .isLength({ min: 30, max: 60 })
    .withMessage("Meta title must be between 30 and 60 characters"),
  body("metaDescription")
    .isString()
    .isLength({ min: 120, max: 160 })
    .withMessage("Meta description must be between 120 and 160 characters"),
  body("keywords")
    .isArray({ min: 3, max: 10 })
    .withMessage("Keywords must be an array with 3 to 10 items"),
  body("keywords.*")
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each keyword must be between 1 and 50 characters"),
  body("faqItems")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("FAQ items must be an array"),
  body("faqItems.*.question")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage("FAQ question must be between 1 and 200 characters"),
  body("faqItems.*.answer")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("FAQ answer must be between 1 and 1000 characters"),
  body("faqItems.*.category")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("FAQ category must be between 1 and 100 characters"),
  body("features")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Features must be an array"),
  body("features.*.title")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage("Feature title must be between 1 and 100 characters"),
  body("features.*.description")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage("Feature description must be between 1 and 500 characters"),
  body("features.*.icon")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Feature icon must be between 1 and 50 characters"),
  body("trustSignals")
    .optional({ checkFalsy: true })
    .isObject()
    .withMessage("Trust signals must be an object"),
  body("trustSignals.yearsInBusiness")
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Years in business must be 0 or greater"),
  body("trustSignals.certifications")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Certifications must be an array"),
  body("trustSignals.certifications.*")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Each certification must be between 1 and 200 characters"),
  body("trustSignals.awards")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Awards must be an array"),
  body("trustSignals.awards.*")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Each award must be between 1 and 200 characters"),
  body("isActive")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const updateSEOContentValidation = [
  param("page")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Page identifier is required"),
  body("metaTitle")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 30, max: 60 })
    .withMessage("Meta title must be between 30 and 60 characters"),
  body("metaDescription")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 120, max: 160 })
    .withMessage("Meta description must be between 120 and 160 characters"),
  body("keywords")
    .optional({ checkFalsy: true })
    .isArray({ min: 3, max: 10 })
    .withMessage("Keywords must be an array with 3 to 10 items"),
  body("keywords.*")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each keyword must be between 1 and 50 characters"),
  body("faqItems")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("FAQ items must be an array"),
  body("faqItems.*.question")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage("FAQ question must be between 1 and 200 characters"),
  body("faqItems.*.answer")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("FAQ answer must be between 1 and 1000 characters"),
  body("faqItems.*.category")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("FAQ category must be between 1 and 100 characters"),
  body("features")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Features must be an array"),
  body("features.*.title")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage("Feature title must be between 1 and 100 characters"),
  body("features.*.description")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage("Feature description must be between 1 and 500 characters"),
  body("features.*.icon")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Feature icon must be between 1 and 50 characters"),
  body("trustSignals")
    .optional({ checkFalsy: true })
    .isObject()
    .withMessage("Trust signals must be an object"),
  body("trustSignals.yearsInBusiness")
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Years in business must be 0 or greater"),
  body("trustSignals.certifications")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Certifications must be an array"),
  body("trustSignals.certifications.*")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Each certification must be between 1 and 200 characters"),
  body("trustSignals.awards")
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage("Awards must be an array"),
  body("trustSignals.awards.*")
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Each award must be between 1 and 200 characters"),
  body("isActive")
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const getSEOContentValidation = [
  param("page")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Page identifier is required"),
];

export const deleteSEOContentValidation = [
  param("page")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Page identifier is required"),
];

export const getAllSEOContentValidation = [
  query("page")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("search")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),
];
