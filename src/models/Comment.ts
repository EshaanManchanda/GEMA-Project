import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComment extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  blogPost: mongoose.Types.ObjectId;
  parentComment?: mongoose.Types.ObjectId;
  replies?: mongoose.Types.ObjectId[];
  likes: mongoose.Types.ObjectId[];
  dislikes: mongoose.Types.ObjectId[];
  isEdited: boolean;
  isReported: boolean;
  reportCount: number;
  status: "pending" | "active" | "flagged" | "deleted";
  sanitizedContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommentModel extends Model<IComment> {
  getCommentsWithReplies(
    blogPostId: string,
    status: "pending" | "active" | "flagged" | "deleted",
    page: number,
    limit: number,
    sort: "newest" | "oldest" | "likes",
  ): Promise<{ comments: IComment[]; totalComments: number }>;
  getCommentStats(
    blogPostId: string,
    status?: "pending" | "active" | "flagged" | "deleted",
  ): Promise<any>;
}

const commentSchema: Schema = new Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      maxlength: [1000, "Comment content cannot exceed 1000 characters"],
      trim: true,
    },
    sanitizedContent: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Comment author is required"],
    },
    blogPost: {
      type: Schema.Types.ObjectId,
      ref: "BlogPost",
      required: [true, "Blog post reference is required"],
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    replies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dislikes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isReported: {
      type: Boolean,
      default: false,
    },
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "active", "flagged", "deleted"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for better performance
commentSchema.index({ blogPost: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ status: 1 });

// Virtual for like count
commentSchema.virtual("likeCount").get(function (this: IComment) {
  return this.likes?.length || 0;
});

// Virtual for dislike count
commentSchema.virtual("dislikeCount").get(function (this: IComment) {
  return this.dislikes?.length || 0;
});

// Virtual for reply count
commentSchema.virtual("replyCount").get(function (this: IComment) {
  return this.replies?.length || 0;
});

// Pre-save middleware to handle reply updates
commentSchema.pre("save", async function (this: IComment, next) {
  if (this.isNew && this.parentComment) {
    // Add this comment to parent's replies array
    await mongoose.model("Comment").findByIdAndUpdate(this.parentComment, {
      $addToSet: { replies: this._id },
    });
  }
  next();
});

// Pre-remove middleware to clean up references
commentSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (this: IComment) {
    // Remove from parent's replies if it's a reply
    if (this.parentComment) {
      await mongoose.model("Comment").findByIdAndUpdate(this.parentComment, {
        $pull: { replies: this._id },
      });
    }

    // Delete all replies to this comment
    await mongoose.model("Comment").deleteMany({ parentComment: this._id });
  },
);

// Static method to get comments with replies
commentSchema.statics.getCommentsWithReplies = async function (
  blogPostId: string,
  status: "pending" | "active" | "flagged" | "deleted" = "pending",
  page: number = 1,
  limit: number = 10,
  sort: "newest" | "oldest" | "likes" = "newest",
) {
  const skip = (page - 1) * limit;

  let sortObject: any = { createdAt: -1 }; // Default: newest first
  if (sort === "oldest") {
    sortObject = { createdAt: 1 };
  } else if (sort === "likes") {
    sortObject = { likeCount: -1, createdAt: -1 }; // Sort by likeCount (virtual) then createdAt
  }

  return this.aggregate([
    {
      $match: {
        blogPost: new mongoose.Types.ObjectId(blogPostId),
        parentComment: null,
        status: status, // Filter by status
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likes" },
        dislikeCount: { $size: "$dislikes" },
        replyCount: { $size: "$replies" },
      },
    },
    {
      $sort: sortObject,
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
        pipeline: [
          {
            $project: {
              name: { $concat: ["$firstName", " ", "$lastName"] },
              email: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$author",
    },
    {
      $lookup: {
        from: "comments",
        localField: "replies",
        foreignField: "_id",
        as: "replies",
        pipeline: [
          {
            $match: { status: status },
          },
          {
            $addFields: {
              likeCount: { $size: "$likes" },
              dislikeCount: { $size: "$dislikes" },
              replyCount: { $size: "$replies" },
            },
          },
          {
            $sort: { createdAt: 1 },
          },
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "author",
              pipeline: [
                {
                  $project: {
                    name: { $concat: ["$firstName", " ", "$lastName"] },
                    email: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$author",
          },
        ],
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likes" },
        dislikeCount: { $size: "$dislikes" },
        replyCount: { $size: "$replies" },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);
};

// Static method to get comment stats for a blog post
commentSchema.statics.getCommentStats = async function (
  blogPostId: string,
  status?: "pending" | "active" | "flagged" | "deleted",
) {
  const matchQuery: any = {
    blogPost: new mongoose.Types.ObjectId(blogPostId),
  };

  // Only filter by status if provided, otherwise count all
  if (status) {
    matchQuery.status = status;
  }

  const stats = await this.aggregate([
    {
      $match: matchQuery,
    },
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        totalLikes: { $sum: { $size: "$likes" } },
        totalReplies: {
          $sum: {
            $cond: [{ $ne: ["$parentComment", null] }, 1, 0],
          },
        },
        topLevelComments: {
          $sum: {
            $cond: [{ $eq: ["$parentComment", null] }, 1, 0],
          },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      totalComments: 0,
      totalLikes: 0,
      totalReplies: 0,
      topLevelComments: 0,
    }
  );
};

export default mongoose.model<IComment, ICommentModel>(
  "Comment",
  commentSchema,
);
