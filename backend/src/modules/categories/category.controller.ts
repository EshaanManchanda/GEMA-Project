import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Category from "./category.model";
import { AppError } from "../../middleware/index";
import { ApiResponse } from "../../types/index";
import { cacheService } from "../../shared/services/cache.service";

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { tree = "true", includeInactive = "false" } = req.query;

    const cacheKey = `categories:${tree}:${includeInactive}`;

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.setHeader(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=600",
      );
      res.status(200).json({
        success: true,
        cached: true,
        data: cached,
        message: "Categories retrieved successfully (cached)",
      });
      return;
    }

    await Category.updateEventCounts();

    if (tree === "true") {
      const query: any = { isActive: true };
      if (includeInactive === "true") {
        delete query.isActive;
      }

      const categories = await Category.find(query)
        .sort({ sortOrder: 1, name: 1 })
        .populate("iconAsset", "url publicId altText")
        .populate("featuredImageAsset", "url publicId altText")
        .lean();

      const buildTree = (parentId: any = null): any[] => {
        return categories
          .filter((cat: any) =>
            parentId
              ? cat.parentId?.toString() === parentId.toString()
              : !cat.parentId,
          )
          .map((cat: any) => ({
            ...cat,
            children: buildTree(cat._id),
          }));
      };

      const categoryTree = buildTree();

      await cacheService.set(cacheKey, categoryTree, { ttl: 3600 });

      res.setHeader(
        "Cache-Control",
        "public, max-age=300, stale-while-revalidate=600",
      );
      res.status(200).json({
        success: true,
        cached: false,
        data: categoryTree,
        message: "Categories retrieved successfully",
      });
    } else {
      const query: any = {};
      if (includeInactive !== "true") {
        query.isActive = true;
      }

      const categories = await Category.find(query)
        .sort({ level: 1, sortOrder: 1, name: 1 })
        .populate("parentId", "name slug")
        .populate("iconAsset", "url publicId altText")
        .populate("featuredImageAsset", "url publicId altText");

      await cacheService.set(cacheKey, categories, { ttl: 3600 });

      res.status(200).json({
        success: true,
        cached: false,
        data: categories,
        message: "Categories retrieved successfully",
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

    let category = null;

    if (isValidObjectId) {
      category = await Category.findById(id)
        .populate("parentId", "name slug")
        .populate("iconAsset")
        .populate("featuredImageAsset");
    }

    if (!category) {
      category = await Category.findOne({ slug: id })
        .populate("parentId", "name slug")
        .populate("iconAsset")
        .populate("featuredImageAsset");
    }

    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    const children = await Category.find({
      parentId: category._id,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });

    const Event = mongoose.model("Event");
    const eventCount = await Event.countDocuments({
      category: category.slug,
      isApproved: true,
      isDeleted: false,
    });

    const categoryData = {
      ...category.toJSON(),
      children,
      eventCount,
    };

    res.status(200).json({
      success: true,
      data: categoryData,
      message: "Category retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const categoryData = req.body;

    if (
      categoryData.order !== undefined &&
      categoryData.sortOrder === undefined
    ) {
      categoryData.sortOrder = categoryData.order;
      delete categoryData.order;
    }
    if (categoryData.seo !== undefined && categoryData.seoMeta === undefined) {
      categoryData.seoMeta = categoryData.seo;
      delete categoryData.seo;
    }

    if (categoryData.parentId) {
      const parent = await Category.findById(categoryData.parentId);
      if (!parent) {
        return next(new AppError("Parent category not found", 404));
      }

      if (parent.level >= 4) {
        return next(new AppError("Maximum category depth exceeded", 400));
      }
    }

    if (categoryData.slug) {
      const existingCategory = await Category.findOne({
        slug: categoryData.slug,
      });
      if (existingCategory) {
        return next(new AppError("Category slug already exists", 400));
      }
    }

    const category = new Category(categoryData);
    await category.save();

    await cacheService.deletePattern("categories:*");

    await category.populate("parentId", "name slug");
    await category.populate("iconAsset");
    await category.populate("featuredImageAsset");

    res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("Category slug already exists", 400));
    }
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.order !== undefined && updateData.sortOrder === undefined) {
      updateData.sortOrder = updateData.order;
      delete updateData.order;
    }
    if (updateData.seo !== undefined && updateData.seoMeta === undefined) {
      updateData.seoMeta = updateData.seo;
      delete updateData.seo;
    }

    const category = await Category.findById(id);
    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    if (
      updateData.parentId &&
      updateData.parentId !== category.parentId?.toString()
    ) {
      const parent = await Category.findById(updateData.parentId);
      if (!parent) {
        return next(new AppError("Parent category not found", 404));
      }

      const allChildren = await category.getAllChildren();
      const childIds = allChildren.map((c) => c._id.toString());
      if (childIds.includes(updateData.parentId)) {
        return next(
          new AppError(
            "Cannot set child category as parent (circular reference)",
            400,
          ),
        );
      }

      if (parent.level >= 4) {
        return next(new AppError("Maximum category depth exceeded", 400));
      }
    }

    if (updateData.slug && updateData.slug !== category.slug) {
      const existingCategory = await Category.findOne({
        slug: updateData.slug,
      });
      if (existingCategory && existingCategory._id.toString() !== id) {
        return next(new AppError("Category slug already exists", 400));
      }
    }

    Object.assign(category, updateData);
    await category.save();

    await cacheService.deletePattern("categories:*");

    await category.populate("parentId", "name slug");
    await category.populate("iconAsset");
    await category.populate("featuredImageAsset");

    res.status(200).json({
      success: true,
      data: category,
      message: "Category updated successfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("Category slug already exists", 400));
    }
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    const children = await Category.find({ parentId: id, isActive: true });
    if (children.length > 0) {
      return next(
        new AppError("Cannot delete category with active subcategories", 400),
      );
    }

    const Event = mongoose.model("Event");
    const eventCount = await Event.countDocuments({
      category: category.slug,
      isApproved: true,
      isDeleted: false,
    });

    if (eventCount > 0) {
      return next(
        new AppError("Cannot delete category with active events", 400),
      );
    }

    category.isActive = false;
    await category.save();

    await cacheService.deletePattern("categories:*");

    res.status(200).json({
      success: true,
      data: null,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getRootCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const categories = await Category.getRootCategories();

    res.status(200).json({
      success: true,
      data: categories,
      message: "Root categories retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoriesByParent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { parentId } = req.params;

    const categories = await Category.find({
      parentId: parentId === "null" ? null : parentId,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: categories,
      message: "Categories retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategorySortOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return next(new AppError("Categories must be an array", 400));
    }

    const updatePromises = categories.map(async ({ id, sortOrder }) => {
      return Category.findByIdAndUpdate(id, { sortOrder }, { new: true });
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      data: null,
      message: "Category sort order updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateEventCounts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await Category.updateEventCounts();

    res.status(200).json({
      success: true,
      data: null,
      message: "Event counts updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const searchCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q) {
      return next(new AppError("Search query is required", 400));
    }

    const safeLimit = Math.min(100, Math.max(1, parseInt(limit as string) || 10));

    const categories = await Category.find({
      $text: { $search: q as string },
      isActive: true,
    })
      .limit(safeLimit)
      .sort({ score: { $meta: "textScore" } })
      .populate("parentId", "name slug")
      .populate("iconAsset")
      .populate("featuredImageAsset");

    res.status(200).json({
      success: true,
      data: categories,
      message: "Categories search completed",
    });
  } catch (error) {
    next(error);
  }
};
