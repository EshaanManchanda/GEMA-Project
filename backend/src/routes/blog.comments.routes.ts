import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  likeComment,
  dislikeComment,
  reportComment,
  getCommentReplies,
  approveComment,
  getCommentsForAdmin
} from '../controllers/blog.comments.controller';

const router = Router();

// Get comments for a blog post
router.get(
  '/posts/:postId/comments',
  [
    param('postId')
      .isMongoId()
      .withMessage('Invalid blog post ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('sort')
      .optional()
      .isIn(['newest', 'oldest', 'likes'])
      .withMessage('Sort must be newest, oldest, or likes')
  ],
  validateRequest,
  getComments
);

// Create a new comment
router.post(
  '/posts/:postId/comments',
  authenticate,
  [
    param('postId')
      .isMongoId()
      .withMessage('Invalid blog post ID'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment content must be between 1 and 1000 characters'),
    body('parentComment')
      .optional()
      .isMongoId()
      .withMessage('Invalid parent comment ID')
  ],
  validateRequest,
  createComment
);

// Update a comment
router.put(
  '/comments/:commentId',
  authenticate,
  [
    param('commentId')
      .isMongoId()
      .withMessage('Invalid comment ID'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment content must be between 1 and 1000 characters')
  ],
  validateRequest,
  updateComment
);

// Delete a comment
router.delete(
  '/comments/:commentId',
  authenticate,
  [
    param('commentId')
      .isMongoId()
      .withMessage('Invalid comment ID')
  ],
  validateRequest,
  deleteComment
);

// Like a comment
router.post(
  '/comments/:commentId/like',
  authenticate,
  [
    param('commentId')
      .isMongoId()
      .withMessage('Invalid comment ID')
  ],
  validateRequest,
  likeComment
);

// Dislike a comment
router.post(
  '/comments/:commentId/dislike',
  authenticate,
  [
    param('commentId')
      .isMongoId()
      .withMessage('Invalid comment ID')
  ],
  validateRequest,
  dislikeComment
);

// Report a comment
router.post(
  '/comments/:commentId/report',
  authenticate,
  [
    param('commentId')
      .isMongoId()
      .withMessage('Invalid comment ID'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Report reason cannot exceed 500 characters')
  ],
  validateRequest,
  reportComment
);

// Get replies for a comment
router.get(
  '/comments/:commentId/replies',
  [
    param('commentId')
      .isMongoId()
      .withMessage('Invalid comment ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
  ],
  validateRequest,
  getCommentReplies
);

// Approve a comment (Admin/Superadmin only)
router.put(
  '/comments/:commentId/approve',
  authenticate,
  authorize(['admin', 'superadmin']),
  [
    param('commentId')
      .isMongoId()
      .withMessage('Invalid comment ID')
  ],
  validateRequest,
  approveComment
);

// Get all comments for a blog post (Admin/Superadmin only - includes all statuses)
router.get(
  '/admin/posts/:postId/comments',
  authenticate,
  authorize(['admin', 'superadmin']),
  [
    param('postId')
      .isMongoId()
      .withMessage('Invalid blog post ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sort')
      .optional()
      .isIn(['newest', 'oldest'])
      .withMessage('Sort must be newest or oldest'),
    query('statuses')
      .optional()
      .isString()
      .withMessage('Statuses must be a comma-separated string')
  ],
  validateRequest,
  getCommentsForAdmin
);

export default router;