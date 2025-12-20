import { body, param, query } from 'express-validator';

export const createPopupValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters'),

  body('image')
    .optional()
    .isMongoId().withMessage('Image must be a valid MediaAsset ID'),

  body('ctaText')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('CTA text cannot exceed 30 characters'),

  body('ctaLink')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      return /^https?:\/\//.test(value) || /^\//.test(value);
    }).withMessage('CTA link must be a valid URL or path'),

  body('dismissText')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Dismiss text cannot exceed 30 characters'),

  body('targetAudience')
    .notEmpty().withMessage('Target audience is required')
    .isIn(['all', 'authenticated', 'anonymous']).withMessage('Invalid target audience'),

  body('targetRoles')
    .optional()
    .isArray().withMessage('Target roles must be an array')
    .custom((roles) => {
      const validRoles = ['admin', 'vendor', 'customer', 'employee'];
      return roles.every((role: string) => validRoles.includes(role));
    }).withMessage('Invalid role in target roles'),

  body('targetPages')
    .notEmpty().withMessage('Target pages is required')
    .isIn(['all', 'specific']).withMessage('Invalid target pages value'),

  body('specificPages')
    .optional()
    .isArray().withMessage('Specific pages must be an array'),

  body('excludePages')
    .optional()
    .isArray().withMessage('Exclude pages must be an array'),

  body('trigger')
    .notEmpty().withMessage('Trigger is required')
    .isIn(['pageLoad', 'timeDelay', 'scrollPercent', 'exitIntent']).withMessage('Invalid trigger type'),

  body('triggerValue')
    .optional()
    .isInt({ min: 0 }).withMessage('Trigger value must be a positive number'),

  body('frequency')
    .notEmpty().withMessage('Frequency is required')
    .isIn(['once', 'session', 'daily', 'always']).withMessage('Invalid frequency'),

  body('displayOrder')
    .notEmpty().withMessage('Display order is required')
    .isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['active', 'inactive', 'scheduled']).withMessage('Invalid status'),

  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),

  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (!endDate || !req.body.startDate) return true;
      return new Date(endDate) > new Date(req.body.startDate);
    }).withMessage('End date must be after start date'),

  body('isActive')
    .notEmpty().withMessage('isActive is required')
    .isBoolean().withMessage('isActive must be a boolean'),

  body('backgroundColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i).withMessage('Background color must be a valid hex color'),

  body('textColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i).withMessage('Text color must be a valid hex color'),

  body('overlayOpacity')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Overlay opacity must be between 0 and 100'),

  body('position')
    .optional()
    .isIn(['center', 'top', 'bottom']).withMessage('Invalid position'),

  body('size')
    .optional()
    .isIn(['small', 'medium', 'large']).withMessage('Invalid size')
];

export const updatePopupValidation = [
  param('id')
    .isMongoId().withMessage('Invalid popup ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),

  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters'),

  body('image')
    .optional()
    .isMongoId().withMessage('Image must be a valid MediaAsset ID'),

  body('ctaText')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('CTA text cannot exceed 30 characters'),

  body('ctaLink')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      return /^https?:\/\//.test(value) || /^\//.test(value);
    }).withMessage('CTA link must be a valid URL or path'),

  body('dismissText')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Dismiss text cannot exceed 30 characters'),

  body('targetAudience')
    .optional()
    .isIn(['all', 'authenticated', 'anonymous']).withMessage('Invalid target audience'),

  body('targetRoles')
    .optional()
    .isArray().withMessage('Target roles must be an array')
    .custom((roles) => {
      const validRoles = ['admin', 'vendor', 'customer', 'employee'];
      return roles.every((role: string) => validRoles.includes(role));
    }).withMessage('Invalid role in target roles'),

  body('targetPages')
    .optional()
    .isIn(['all', 'specific']).withMessage('Invalid target pages value'),

  body('specificPages')
    .optional()
    .isArray().withMessage('Specific pages must be an array'),

  body('excludePages')
    .optional()
    .isArray().withMessage('Exclude pages must be an array'),

  body('trigger')
    .optional()
    .isIn(['pageLoad', 'timeDelay', 'scrollPercent', 'exitIntent']).withMessage('Invalid trigger type'),

  body('triggerValue')
    .optional()
    .isInt({ min: 0 }).withMessage('Trigger value must be a positive number'),

  body('frequency')
    .optional()
    .isIn(['once', 'session', 'daily', 'always']).withMessage('Invalid frequency'),

  body('displayOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'scheduled']).withMessage('Invalid status'),

  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),

  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('backgroundColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i).withMessage('Background color must be a valid hex color'),

  body('textColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i).withMessage('Text color must be a valid hex color'),

  body('overlayOpacity')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Overlay opacity must be between 0 and 100'),

  body('position')
    .optional()
    .isIn(['center', 'top', 'bottom']).withMessage('Invalid position'),

  body('size')
    .optional()
    .isIn(['small', 'medium', 'large']).withMessage('Invalid size')
];

export const getPopupValidation = [
  param('id')
    .isMongoId().withMessage('Invalid popup ID')
];

export const deletePopupValidation = [
  param('id')
    .isMongoId().withMessage('Invalid popup ID')
];

export const getAllPopupsValidation = [
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'inactive', 'scheduled']).withMessage('Invalid status'),

  query('search')
    .optional({ checkFalsy: true })
    .trim(),

  query('page')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

export const updateDisplayOrdersValidation = [
  body('orders')
    .isArray({ min: 1 }).withMessage('Orders must be a non-empty array'),

  body('orders.*.id')
    .isMongoId().withMessage('Each order must have a valid popup ID'),

  body('orders.*.displayOrder')
    .isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
];
