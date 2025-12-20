import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

export const createBannerValidation = [
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('imageAsset')
    .custom((value) => {
      if (!value) {
        throw new Error('Banner image is required');
      }
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Image asset must be a valid MongoDB ObjectId');
      }
      return true;
    }),
  body('link')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      // Check for http/https URL or relative path starting with /
      if (!/^https?:\/\//.test(value) && !/^\//.test(value)) {
        throw new Error('Link must be a valid URL (http/https) or relative path (starting with /)');
      }
      return true;
    }),
  body('ctaText')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 50 })
    .withMessage('CTA text cannot exceed 50 characters'),
  body('ctaLink')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      // Check for http/https URL or relative path starting with /
      if (!/^https?:\/\//.test(value) && !/^\//.test(value)) {
        throw new Error('CTA link must be a valid URL (http/https) or relative path (starting with /)');
      }
      return true;
    }),
  body('displayOrder')
    .isInt({ min: 0 })
    .withMessage('Display order must be 0 or greater'),
  body('status')
    .isIn(['active', 'inactive', 'scheduled'])
    .withMessage('Status must be active, inactive, or scheduled'),
  body('startDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (!value || !req.body.startDate) return true;
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('isActive')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('titleVisible')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('titleVisible must be a boolean')
];

export const updateBannerValidation = [
  param('id').isMongoId().withMessage('Banner ID must be valid'),
  body('title')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('imageAsset')
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Image asset must be a valid MongoDB ObjectId');
      }
      return true;
    }),
  body('link')
    .optional({ checkFalsy: true, nullable: true })
    .custom((value) => {
      if (!value) return true;
      if (!/^https?:\/\//.test(value) && !/^\//.test(value)) {
        throw new Error('Link must be a valid URL (http/https) or relative path (starting with /)');
      }
      return true;
    }),
  body('ctaText')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .isLength({ max: 50 })
    .withMessage('CTA text cannot exceed 50 characters'),
  body('ctaLink')
    .optional({ checkFalsy: true, nullable: true })
    .custom((value) => {
      if (!value) return true;
      if (!/^https?:\/\//.test(value) && !/^\//.test(value)) {
        throw new Error('CTA link must be a valid URL (http/https) or relative path (starting with /)');
      }
      return true;
    }),
  body('displayOrder')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Display order must be 0 or greater'),
  body('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'inactive', 'scheduled'])
    .withMessage('Status must be active, inactive, or scheduled'),
  body('startDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (!value || !req.body.startDate) return true;
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('isActive')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('titleVisible')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('titleVisible must be a boolean')
];

export const getBannerValidation = [
  param('id').isMongoId().withMessage('Banner ID must be valid')
];

export const deleteBannerValidation = [
  param('id').isMongoId().withMessage('Banner ID must be valid')
];

export const getAllBannersValidation = [
  query('page')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'inactive', 'scheduled'])
    .withMessage('Status must be active, inactive, or scheduled'),
  query('search')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
];

export const updateDisplayOrdersValidation = [
  body('orders')
    .isArray({ min: 1 })
    .withMessage('Orders must be a non-empty array'),
  body('orders.*.id')
    .isMongoId()
    .withMessage('Each order item must have a valid banner ID'),
  body('orders.*.displayOrder')
    .isInt({ min: 0 })
    .withMessage('Display order must be 0 or greater')
];
