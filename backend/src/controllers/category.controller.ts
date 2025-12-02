import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Category, Event, ICategory } from '../models/index';
import { AppError } from '../middleware/index';
import { ApiResponse } from '../types/index';
import { cacheService } from '../services/cache.service';

/**
 * Get all categories (tree structure)
 *
 * OPTIMIZATION: Aggressive caching (1 hour TTL) - categories rarely change
 * Critical for reducing repeated tree rebuilding on KVM1
 */
export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tree = 'true', includeInactive = 'false' } = req.query;

    // Generate cache key based on query parameters
    const cacheKey = `categories:${tree}:${includeInactive}`;

    // Try to get cached data first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json({
        success: true,
        cached: true,
        data: cached,
        message: 'Categories retrieved successfully (cached)'
      });
      return;
    }

    // Cache miss - update event counts to ensure accuracy
    // This adds ~1-2s latency once per hour, which is acceptable
    await Category.updateEventCounts();

    if (tree === 'true') {
      // Get categories as tree structure with populated MediaAssets
      const query: any = { isActive: true };
      if (includeInactive === 'true') {
        delete query.isActive;
      }

      const categories = await Category.find(query)
        .sort({ sortOrder: 1, name: 1 })
        .populate('iconAsset', 'url publicId altText')
        .populate('featuredImageAsset', 'url publicId altText')
        .lean();

      // Build tree structure from populated categories
      const buildTree = (parentId: any = null): any[] => {
        return categories
          .filter((cat: any) =>
            parentId ? cat.parentId?.toString() === parentId.toString() : !cat.parentId
          )
          .map((cat: any) => ({
            ...cat,
            children: buildTree(cat._id),
          }));
      };

      const categoryTree = buildTree();

      // Cache for 1 hour (3600 seconds) - categories rarely change
      await cacheService.set(cacheKey, categoryTree, { ttl: 3600 });

      res.status(200).json({
        success: true,
        cached: false,
        data: categoryTree,
        message: 'Categories retrieved successfully'
      });
    } else {
      // Get flat list of categories
      const query: any = {};
      if (includeInactive !== 'true') {
        query.isActive = true;
      }

      const categories = await Category.find(query)
        .sort({ level: 1, sortOrder: 1, name: 1 })
        .populate('parentId', 'name slug')
        .populate('iconAsset', 'url publicId altText')
        .populate('featuredImageAsset', 'url publicId altText');

      // Cache for 1 hour
      await cacheService.set(cacheKey, categories, { ttl: 3600 });

      res.status(200).json({
        success: true,
        cached: false,
        data: categories,
        message: 'Categories retrieved successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get single category by ID or slug
 */
export const getCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if id is a valid ObjectId format before querying by ID
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);

    let category = null;

    // Try to find by ID first (only if valid ObjectId), then by slug
    if (isValidObjectId) {
      category = await Category.findById(id)
        .populate('parentId', 'name slug')
        .populate('iconAsset')
        .populate('featuredImageAsset');
    }

    if (!category) {
      category = await Category.findOne({ slug: id })
        .populate('parentId', 'name slug')
        .populate('iconAsset')
        .populate('featuredImageAsset');
    }

    if (!category) {
      return next(new AppError('Category not found', 404));
    }
    
    // Get children categories
    const children = await Category.find({ parentId: category._id, isActive: true })
      .sort({ sortOrder: 1, name: 1 });
    
    // Get events count for this category
    const eventCount = await Event.countDocuments({
      category: category.slug,
      isApproved: true,
      isDeleted: false
    });
    
    const categoryData = {
      ...category.toJSON(),
      children,
      eventCount
    };
    
    res.status(200).json({
      success: true,
      data: categoryData,
      message: 'Category retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new category
 */
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categoryData = req.body;

    // Handle field aliases for backward compatibility
    if (categoryData.order !== undefined && categoryData.sortOrder === undefined) {
      categoryData.sortOrder = categoryData.order;
      delete categoryData.order;
    }
    if (categoryData.seo !== undefined && categoryData.seoMeta === undefined) {
      categoryData.seoMeta = categoryData.seo;
      delete categoryData.seo;
    }

    // Check if parent exists (if parentId provided)
    if (categoryData.parentId) {
      const parent = await Category.findById(categoryData.parentId);
      if (!parent) {
        return next(new AppError('Parent category not found', 404));
      }

      // Check maximum depth
      if (parent.level >= 4) { // Max 5 levels (0-4)
        return next(new AppError('Maximum category depth exceeded', 400));
      }
    }

    // Check if slug already exists
    if (categoryData.slug) {
      const existingCategory = await Category.findOne({ slug: categoryData.slug });
      if (existingCategory) {
        return next(new AppError('Category slug already exists', 400));
      }
    }

    const category = new Category(categoryData);
    await category.save();

    // Invalidate category cache after creation
    await cacheService.deletePattern('categories:*');

    await category.populate('parentId', 'name slug');
    await category.populate('iconAsset');
    await category.populate('featuredImageAsset');

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Category slug already exists', 400));
    }
    next(error);
  }
};

/**
 * Update category
 */
export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle field aliases for backward compatibility
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
      return next(new AppError('Category not found', 404));
    }

    // If changing parent, validate it
    if (updateData.parentId && updateData.parentId !== category.parentId?.toString()) {
      const parent = await Category.findById(updateData.parentId);
      if (!parent) {
        return next(new AppError('Parent category not found', 404));
      }

      // Check if new parent would create circular reference
      const allChildren = await category.getAllChildren();
      const childIds = allChildren.map(c => c._id.toString());
      if (childIds.includes(updateData.parentId)) {
        return next(new AppError('Cannot set child category as parent (circular reference)', 400));
      }

      // Check maximum depth
      if (parent.level >= 4) {
        return next(new AppError('Maximum category depth exceeded', 400));
      }
    }

    // Check if slug is being changed and doesn't conflict
    if (updateData.slug && updateData.slug !== category.slug) {
      const existingCategory = await Category.findOne({ slug: updateData.slug });
      if (existingCategory && existingCategory._id.toString() !== id) {
        return next(new AppError('Category slug already exists', 400));
      }
    }

    Object.assign(category, updateData);
    await category.save();

    // Invalidate category cache after update
    await cacheService.deletePattern('categories:*');

    await category.populate('parentId', 'name slug');
    await category.populate('iconAsset');
    await category.populate('featuredImageAsset');

    res.status(200).json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Category slug already exists', 400));
    }
    next(error);
  }
};

/**
 * Delete category (soft delete by setting inactive)
 */
export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return next(new AppError('Category not found', 404));
    }
    
    // Check if category has children
    const children = await Category.find({ parentId: id, isActive: true });
    if (children.length > 0) {
      return next(new AppError('Cannot delete category with active subcategories', 400));
    }
    
    // Check if category has events
    const eventCount = await Event.countDocuments({
      category: category.slug,
      isApproved: true,
      isDeleted: false
    });
    
    if (eventCount > 0) {
      return next(new AppError('Cannot delete category with active events', 400));
    }
    
    // Soft delete by setting inactive
    category.isActive = false;
    await category.save();

    // Invalidate category cache after deletion
    await cacheService.deletePattern('categories:*');

    res.status(200).json({
      success: true,
      data: null,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get root categories only
 */
export const getRootCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await Category.getRootCategories();
    
    res.status(200).json({
      success: true,
      data: categories,
      message: 'Root categories retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get categories by parent ID
 */
export const getCategoriesByParent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { parentId } = req.params;
    
    const categories = await Category.find({
      parentId: parentId === 'null' ? null : parentId,
      isActive: true
    }).sort({ sortOrder: 1, name: 1 });
    
    res.status(200).json({
      success: true,
      data: categories,
      message: 'Categories retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category sort order
 */
export const updateCategorySortOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { categories } = req.body; // Array of { id, sortOrder }
    
    if (!Array.isArray(categories)) {
      return next(new AppError('Categories must be an array', 400));
    }
    
    // Update sort order for each category
    const updatePromises = categories.map(async ({ id, sortOrder }) => {
      return Category.findByIdAndUpdate(
        id,
        { sortOrder },
        { new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.status(200).json({
      success: true,
      data: null,
      message: 'Category sort order updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update event counts for all categories
 */
export const updateEventCounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await Category.updateEventCounts();
    
    res.status(200).json({
      success: true,
      data: null,
      message: 'Event counts updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search categories
 */
export const searchCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return next(new AppError('Search query is required', 400));
    }
    
    const categories = await Category.find({
      $text: { $search: q as string },
      isActive: true
    })
    .limit(parseInt(limit as string))
    .sort({ score: { $meta: 'textScore' } })
    .populate('parentId', 'name slug')
    .populate('iconAsset')
    .populate('featuredImageAsset');
    
    res.status(200).json({
      success: true,
      data: categories,
      message: 'Categories search completed'
    });
  } catch (error) {
    next(error);
  }
};