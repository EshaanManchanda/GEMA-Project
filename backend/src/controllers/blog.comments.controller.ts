import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/express.d";
import mongoose from "mongoose";
import Comment from "../models/Comment";
import { Blog } from "../models/Blog";
import { AppError } from "../middleware/error";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

// Get comments for a blog post
export const getComments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { postId } = req.params;
    const {
      page = 1,
      limit = 10,
      sort = "newest",
      status = "active",
    } = req.query;

    // Check if blog post exists
    const blogPost = await Blog.findById(postId);
    if (!blogPost) {
      return next(new AppError("Blog post not found", 404));
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Get comments with replies using the static method
    const comments = await Comment.getCommentsWithReplies(
      postId,
      status as "pending" | "active" | "flagged" | "deleted",
      pageNum,
      limitNum,
      sort as "newest" | "oldest" | "likes",
    );

    // Get comment stats filtered by the same status
    const stats = await Comment.getCommentStats(
      postId,
      status as "pending" | "active" | "flagged" | "deleted",
    );

    res.status(200).json({
      success: true,
      message: "Comments retrieved successfully",
      data: {
        comments,
        stats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: stats.totalComments,
          pages: Math.ceil(stats.totalComments / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new comment
export const createComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { postId } = req.params;
    const { content, parentComment } = req.body;
    const userId = req.user!._id;

    // Check if blog post exists
    const blogPost = await Blog.findById(postId);
    if (!blogPost) {
      return next(new AppError("Blog post not found", 404));
    }

    // If this is a reply, check if parent comment exists
    if (parentComment) {
      const parentCommentDoc = await Comment.findById(parentComment);
      if (!parentCommentDoc) {
        return next(new AppError("Parent comment not found", 404));
      }
      if (parentCommentDoc.blogPost.toString() !== postId) {
        return next(
          new AppError("Parent comment does not belong to this blog post", 400),
        );
      }
    }

    // Sanitize comment content
    const sanitizedContent = DOMPurify.sanitize(content);

    // Create the comment
    const comment = new Comment({
      content,
      sanitizedContent,
      author: userId,
      blogPost: postId,
      parentComment: parentComment || null,
      status: "pending", // Set initial status to pending
    });

    await comment.save();

    // Populate author details
    await comment.populate("author", "firstName lastName email avatar");

    // Create name field from firstName and lastName
    if (comment.author && typeof comment.author === "object") {
      (comment.author as any).name =
        `${(comment.author as any).firstName} ${(comment.author as any).lastName}`;
    }

    // Update blog post comment count
    await Blog.findByIdAndUpdate(postId, {
      $inc: { commentsCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

// Update a comment
export const updateComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user!._id;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new AppError("Comment not found", 404));
    }

    // Check if user is the author of the comment
    if (comment.author.toString() !== userId.toString()) {
      return next(new AppError("You can only edit your own comments", 403));
    }

    // Check if comment is not deleted
    if (comment.status === "deleted") {
      return next(new AppError("Cannot edit deleted comment", 400));
    }

    // Update the comment
    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    // Populate author details
    await comment.populate("author", "firstName lastName email avatar");

    // Create name field from firstName and lastName
    if (comment.author && typeof comment.author === "object") {
      (comment.author as any).name =
        `${(comment.author as any).firstName} ${(comment.author as any).lastName}`;
    }

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a comment
export const deleteComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user!.role;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new AppError("Comment not found", 404));
    }

    // Check if user is the author or an admin
    if (
      comment.author.toString() !== userId.toString() &&
      userRole !== "admin"
    ) {
      return next(new AppError("You can only delete your own comments", 403));
    }

    // Soft delete: mark as deleted instead of removing from database
    comment.status = "deleted";
    comment.content = "[This comment has been deleted]";
    await comment.save();

    // Update blog post comment count
    await Blog.findByIdAndUpdate(comment.blogPost, {
      $inc: { commentsCount: -1 },
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Like a comment
export const likeComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!._id;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new AppError("Comment not found", 404));
    }

    // Check if comment is active
    if (comment.status !== "active") {
      return next(new AppError("Cannot like this comment", 400));
    }

    // Check if user already liked the comment
    const hasLiked = comment.likes.includes(userId);
    const hasDisliked = comment.dislikes.includes(userId);

    if (hasLiked) {
      // Remove like
      comment.likes = comment.likes.filter(
        (id) => id.toString() !== userId.toString(),
      );
    } else {
      // Add like
      comment.likes.push(userId);

      // Remove dislike if exists
      if (hasDisliked) {
        comment.dislikes = comment.dislikes.filter(
          (id) => id.toString() !== userId.toString(),
        );
      }
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message: hasLiked ? "Like removed" : "Comment liked successfully",
      data: {
        likes: comment.likes.length,
        dislikes: comment.dislikes.length,
        hasLiked: !hasLiked,
        hasDisliked: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Dislike a comment
export const dislikeComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!._id;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new AppError("Comment not found", 404));
    }

    // Check if comment is active
    if (comment.status !== "active") {
      return next(new AppError("Cannot dislike this comment", 400));
    }

    // Check if user already disliked the comment
    const hasDisliked = comment.dislikes.includes(userId);
    const hasLiked = comment.likes.includes(userId);

    if (hasDisliked) {
      // Remove dislike
      comment.dislikes = comment.dislikes.filter(
        (id) => id.toString() !== userId.toString(),
      );
    } else {
      // Add dislike
      comment.dislikes.push(userId);

      // Remove like if exists
      if (hasLiked) {
        comment.likes = comment.likes.filter(
          (id) => id.toString() !== userId.toString(),
        );
      }
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message: hasDisliked
        ? "Dislike removed"
        : "Comment disliked successfully",
      data: {
        likes: comment.likes.length,
        dislikes: comment.dislikes.length,
        hasLiked: false,
        hasDisliked: !hasDisliked,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Report a comment
export const reportComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { commentId } = req.params;
    const { reason } = req.body;
    const userId = req.user!._id;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new AppError("Comment not found", 404));
    }

    // Check if comment is active
    if (comment.status !== "active") {
      return next(new AppError("Cannot report this comment", 400));
    }

    // Check if user is trying to report their own comment
    if (comment.author.toString() === userId.toString()) {
      return next(new AppError("You cannot report your own comment", 400));
    }

    // Update comment report status
    comment.isReported = true;
    comment.reportCount += 1;

    // Flag comment if it has multiple reports
    if (comment.reportCount >= 5) {
      comment.status = "flagged";
    }

    await comment.save();

    // TODO: Create a report record in a separate reports collection
    // This would include the reporter, reason, timestamp, etc.

    res.status(200).json({
      success: true,
      message: "Comment reported successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get replies for a comment
export const getCommentReplies = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Find the parent comment
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return next(new AppError("Comment not found", 404));
    }

    // Get replies
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const replies = await Comment.find({
      parentComment: commentId,
      status: "active",
    })
      .populate("author", "firstName lastName email avatar")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum);

    // Create name field from firstName and lastName for each reply
    replies.forEach((reply) => {
      if (reply.author && typeof reply.author === "object") {
        (reply.author as any).name =
          `${(reply.author as any).firstName} ${(reply.author as any).lastName}`;
      }
    });

    const totalReplies = await Comment.countDocuments({
      parentComment: commentId,
      status: "active",
    });

    res.status(200).json({
      success: true,
      message: "Replies retrieved successfully",
      data: {
        replies,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalReplies,
          pages: Math.ceil(totalReplies / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const approveComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return next(new AppError("Comment not found", 404));
    }

    if (comment.status === "active") {
      return next(new AppError("Comment is already active", 400));
    }

    comment.status = "active";
    await comment.save();

    // Populate author data for response
    await comment.populate("author", "firstName lastName email avatar");

    // Create name field from firstName and lastName
    if (comment.author && typeof comment.author === "object") {
      (comment.author as any).name =
        `${(comment.author as any).firstName} ${(comment.author as any).lastName}`;
    }

    res.status(200).json({
      success: true,
      message: "Comment approved successfully!",
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all comments for a blog post (regardless of status)
export const getCommentsForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 50, sort = "newest", statuses } = req.query;

    // Check if blog post exists
    const blogPost = await Blog.findById(postId);
    if (!blogPost) {
      return next(new AppError("Blog post not found", 404));
    }

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 for admin
    const skip = (pageNum - 1) * limitNum;

    // Build status filter
    let statusFilter: any = {
      $in: ["pending", "active", "flagged", "deleted"],
    }; // Default: all statuses
    if (statuses && typeof statuses === "string") {
      const statusArray = statuses.split(",");
      statusFilter = { $in: statusArray };
    }

    // Build sort object
    let sortObject: any = { createdAt: -1 }; // Default: newest first
    if (sort === "oldest") {
      sortObject = { createdAt: 1 };
    }

    // Get comments with author populated
    const comments = await Comment.find({
      blogPost: postId,
      parentComment: null, // Only top-level comments
      status: statusFilter,
    })
      .populate("author", "firstName lastName email avatar")
      .populate({
        path: "replies",
        populate: { path: "author", select: "firstName lastName email avatar" },
      })
      .sort(sortObject)
      .skip(skip)
      .limit(limitNum);

    // Create name field from firstName and lastName for each comment and reply
    comments.forEach((comment) => {
      if (comment.author && typeof comment.author === "object") {
        (comment.author as any).name =
          `${(comment.author as any).firstName} ${(comment.author as any).lastName}`;
      }

      // Process replies
      if (comment.replies && Array.isArray(comment.replies)) {
        comment.replies.forEach((reply: any) => {
          if (reply.author && typeof reply.author === "object") {
            reply.author.name = `${reply.author.firstName} ${reply.author.lastName}`;
          }
        });
      }
    });

    // Get total count for pagination
    const totalComments = await Comment.countDocuments({
      blogPost: postId,
      parentComment: null,
      status: statusFilter,
    });

    // Get stats breakdown by status
    const statsBreakdown = await Comment.aggregate([
      {
        $match: {
          blogPost: new mongoose.Types.ObjectId(postId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      total: totalComments,
      byStatus: statsBreakdown.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };

    res.status(200).json({
      success: true,
      message: "Comments retrieved successfully",
      data: {
        comments,
        stats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalComments,
          pages: Math.ceil(totalComments / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
