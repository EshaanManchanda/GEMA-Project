import mongoose, { Document, Schema, model } from 'mongoose';

export interface IBlogCategory extends Document {
  name: string;
  slug: string;
  description?: string;
  color: string;
  isActive: boolean;
  postsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const blogCategorySchema = new Schema<IBlogCategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    color: {
      type: String,
      default: '#3B82F6',
      validate: {
        validator: function(v: string) {
          return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Color must be a valid hex color code (3 or 6 digits)'
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    postsCount: {
      type: Number,
      default: 0,
      min: [0, 'Posts count cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
blogCategorySchema.index({ name: 1 }, { unique: true });
blogCategorySchema.index({ slug: 1 }, { unique: true });
blogCategorySchema.index({ isActive: 1 });

// Pre-save middleware to generate slug
blogCategorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Virtual for posts (if needed)
blogCategorySchema.virtual('posts', {
  ref: 'Blog',
  localField: '_id',
  foreignField: 'category',
});

export const BlogCategory = model<IBlogCategory>('BlogCategory', blogCategorySchema);