import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  iconAsset?: mongoose.Types.ObjectId;
  color?: string;
  featuredImage?: string;
  featuredImageAsset?: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  level: number;
  isActive: boolean;
  sortOrder: number;
  seoMeta: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  children?: ICategory[];
  eventCount?: number;
  createdAt: Date;
  updatedAt: Date;

  order: number;
  seo: any;
  parent: any;

  getFullPath(): string;
  getAllChildren(): Promise<ICategory[]>;
}

export interface ICategoryModel extends mongoose.Model<ICategory> {
  getCategoryTree(): Promise<any[]>;
  getRootCategories(): Promise<ICategory[]>;
  updateEventCounts(): Promise<void>;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: [true, "Category slug is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9-]+$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
      type: String,
    },
    iconAsset: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    color: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^#[0-9A-F]{6}$/i.test(v);
        },
        message: "Color must be a valid hex color code",
      },
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    level: {
      type: Number,
      default: 0,
      min: [0, "Level cannot be negative"],
      max: [5, "Maximum category depth is 5 levels"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    seoMeta: {
      title: {
        type: String,
        maxlength: [60, "SEO title cannot exceed 60 characters"],
      },
      description: {
        type: String,
        maxlength: [160, "SEO description cannot exceed 160 characters"],
      },
      keywords: {
        type: [String],
        default: [],
      },
    },
    featuredImage: {
      type: String,
    },
    featuredImageAsset: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    eventCount: {
      type: Number,
      default: 0,
      min: [0, "Event count cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentId: 1 });
categorySchema.index({ isActive: 1, level: 1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ name: "text", description: "text" });

categorySchema.pre("save", async function (next) {
  if (this.isModified("name") && this.name) {
    this.name = this.name
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'");
  }

  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  if (this.parentId) {
    const Category = this.constructor as any;
    const parent = await Category.findById(this.parentId);
    if (parent) {
      this.level = parent.level + 1;
    }
  } else {
    this.level = 0;
  }

  next();
});

categorySchema.virtual("fullPath").get(function () {
  return this.getFullPath();
});

categorySchema
  .virtual("order")
  .get(function () {
    return this.sortOrder;
  })
  .set(function (value: number) {
    this.sortOrder = value;
  });

categorySchema
  .virtual("seo")
  .get(function () {
    return this.seoMeta;
  })
  .set(function (value: any) {
    this.seoMeta = value;
  });

categorySchema.virtual("parent").get(function () {
  return this.populated("parentId") || this.parentId;
});

categorySchema.methods.getFullPath = async function (): Promise<string> {
  if (!this.parentId) {
    return this.name;
  }

  const parent = await this.model("Category").findById(this.parentId);
  if (parent) {
    const parentPath = await parent.getFullPath();
    return `${parentPath} > ${this.name}`;
  }

  return this.name;
};

categorySchema.methods.getAllChildren = async function (): Promise<
  ICategory[]
> {
  const Category = this.constructor as any;
  const children = await Category.find({ parentId: this._id });
  let allChildren = [...children];

  for (const child of children) {
    const grandChildren = await child.getAllChildren();
    allChildren = allChildren.concat(grandChildren);
  }

  return allChildren;
};

categorySchema.statics.getCategoryTree = async function () {
  const categories = await this.find({ isActive: true }).sort({
    sortOrder: 1,
    name: 1,
  });

  const buildTree = (parentId: any = null): any[] => {
    return categories
      .filter((cat: any) =>
        parentId
          ? cat.parentId?.toString() === parentId.toString()
          : !cat.parentId,
      )
      .map((cat: any) => ({
        ...cat.toJSON(),
        children: buildTree(cat._id),
      }));
  };

  return buildTree();
};

categorySchema.statics.getRootCategories = function () {
  return this.find({ parentId: null, isActive: true }).sort({
    sortOrder: 1,
    name: 1,
  });
};

categorySchema.statics.updateEventCounts = async function () {
  const mongoose = require("mongoose");
  const Event = mongoose.model("Event");
  const categories = await this.find();

  for (const category of categories) {
    const eventCount = await Event.countDocuments({
      category: category.slug,
      isApproved: true,
      isDeleted: false,
    });

    category.eventCount = eventCount;
    await category.save();
  }
};

const Category = mongoose.model<ICategory, ICategoryModel>(
  "Category",
  categorySchema,
);

export default Category;
