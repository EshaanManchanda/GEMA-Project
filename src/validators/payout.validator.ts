import { body, param } from 'express-validator';

export const requestPayoutValidation = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Payout amount must be at least 1'),

  body('payoutMethod')
    .isIn(['bank_transfer', 'stripe', 'paypal', 'manual'])
    .withMessage('Invalid payout method'),

  body('bankDetails')
    .if(body('payoutMethod').equals('bank_transfer'))
    .notEmpty()
    .withMessage('Bank details are required for bank transfer'),

  body('bankDetails.accountNumber')
    .if(body('payoutMethod').equals('bank_transfer'))
    .isString()
    .notEmpty()
    .withMessage('Account number is required'),

  body('bankDetails.bankName')
    .if(body('payoutMethod').equals('bank_transfer'))
    .isString()
    .notEmpty()
    .withMessage('Bank name is required'),

  body('transactionIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one transaction ID is required'),

  body('transactionIds.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid transaction ID'),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
];

export const processPayoutValidation = [
  param('id').isMongoId().withMessage('Invalid payout ID'),

  body('status')
    .isIn(['approved', 'rejected', 'processing', 'completed'])
    .withMessage('Invalid payout status'),

  body('rejectionReason')
    .if(body('status').equals('rejected'))
    .notEmpty()
    .withMessage('Rejection reason is required when rejecting a payout'),

  body('payoutReference')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Payout reference cannot exceed 200 characters'),
];
