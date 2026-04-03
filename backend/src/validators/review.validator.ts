import { body, param } from 'express-validator';

export const createReviewValidation = [
  body('eventId')
    .isMongoId()
    .withMessage('Valid event ID is required'),

  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .isString()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Comment must be between 10 and 2000 characters'),

  body('title')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),

  body('images.*')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),

  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean'),
];

export const updateReviewValidation = [
  param('id').isMongoId().withMessage('Invalid review ID'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .isString()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Comment must be between 10 and 2000 characters'),

  body('title')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
];

export const respondToReviewValidation = [
  param('id').isMongoId().withMessage('Invalid review ID'),
  body('response')
    .isString()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Response must be between 10 and 1000 characters'),
];
