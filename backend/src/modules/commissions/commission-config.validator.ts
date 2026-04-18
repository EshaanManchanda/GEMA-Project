import { body } from "express-validator";
import { validateMongoId } from "../../validators/common.validator";

const CURRENCIES = ["AED", "USD", "EGP"];
const RULE_TYPES = ["fixed", "percentage", "tiered"];

/**
 * Create commission config validation
 */
export const validateCreateCommissionConfig = [
  body("name")
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage("name must be between 1 and 100 characters"),
  body("platformCommission.defaultPercentage")
    .isFloat({ min: 0, max: 100 })
    .withMessage("platformCommission.defaultPercentage must be between 0 and 100"),
  body("platformCommission.minAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("platformCommission.minAmount must be 0 or greater"),
  body("platformCommission.currency")
    .optional()
    .isIn(CURRENCIES)
    .withMessage(`platformCommission.currency must be one of: ${CURRENCIES.join(", ")}`),
  body("rules")
    .optional()
    .isArray()
    .withMessage("rules must be an array"),
  body("rules.*.type")
    .optional()
    .isIn(RULE_TYPES)
    .withMessage(`rule type must be one of: ${RULE_TYPES.join(", ")}`),
  body("rules.*.value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("rule value must be 0 or greater"),
  body("multiLevelEnabled")
    .optional()
    .isBoolean()
    .withMessage("multiLevelEnabled must be a boolean"),
];

/**
 * Update commission config validation (all optional)
 */
export const validateUpdateCommissionConfig = [
  validateMongoId("id", "param"),
  body("name")
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage("name must be between 1 and 100 characters"),
  body("platformCommission.defaultPercentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("platformCommission.defaultPercentage must be between 0 and 100"),
  body("platformCommission.minAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("platformCommission.minAmount must be 0 or greater"),
  body("platformCommission.currency")
    .optional()
    .isIn(CURRENCIES)
    .withMessage(`platformCommission.currency must be one of: ${CURRENCIES.join(", ")}`),
  body("rules")
    .optional()
    .isArray()
    .withMessage("rules must be an array"),
  body("multiLevelEnabled")
    .optional()
    .isBoolean()
    .withMessage("multiLevelEnabled must be a boolean"),
];

/**
 * Apply commission validation
 */
export const validateApplyCommission = [
  validateMongoId("orderId", "body"),
  validateMongoId("vendorId", "body"),
];
