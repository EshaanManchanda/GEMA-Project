import mongoose from "mongoose";
import { User } from "../models/index";
import { Category } from "../models/index";
import { Event } from "../models/index";
import { Blog } from "../models/index";
import { AppError } from "../middleware/error";
import { RelationshipResolution } from "../types/bulk-import.types";

/**
 * Relationship Resolver Utility
 * Accepts both readable names (vendorEmail, categorySlug) and IDs
 * Validates foreign keys exist
 * Caches lookups for batch efficiency
 */

export class RelationshipResolver {
  private cache: Map<string, any>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Resolve vendor reference (accepts vendorEmail or vendorId)
   */
  async resolveVendor(record: any): Promise<RelationshipResolution> {
    const field = "vendorId";

    // Try email first (preferred readable format)
    if (record.vendorEmail) {
      const cacheKey = `vendor:email:${record.vendorEmail.toLowerCase()}`;

      if (this.cache.has(cacheKey)) {
        const vendor = this.cache.get(cacheKey);
        return {
          field,
          inputValue: record.vendorEmail,
          resolvedId: vendor._id.toString(),
          resolvedName: vendor.email,
        };
      }

      const vendor = await User.findOne({
        email: record.vendorEmail.toLowerCase(),
        role: "vendor",
      }).select("_id email firstName lastName");

      if (!vendor) {
        return {
          field,
          inputValue: record.vendorEmail,
          error: `Vendor with email '${record.vendorEmail}' not found`,
        };
      }

      this.cache.set(cacheKey, vendor);

      return {
        field,
        inputValue: record.vendorEmail,
        resolvedId: vendor._id.toString(),
        resolvedName: vendor.email,
      };
    }

    // Fallback to ID (precise format)
    if (record.vendorId) {
      if (!mongoose.Types.ObjectId.isValid(record.vendorId)) {
        return {
          field,
          inputValue: record.vendorId,
          error: `Invalid vendorId format: ${record.vendorId}`,
        };
      }

      const cacheKey = `vendor:id:${record.vendorId}`;

      if (this.cache.has(cacheKey)) {
        const vendor = this.cache.get(cacheKey);
        return {
          field,
          inputValue: record.vendorId,
          resolvedId: vendor._id.toString(),
          resolvedName: vendor.email,
        };
      }

      const vendor = await User.findById(record.vendorId).select(
        "_id email role",
      );

      if (!vendor) {
        return {
          field,
          inputValue: record.vendorId,
          error: `Vendor with ID '${record.vendorId}' not found`,
        };
      }

      if (vendor.role !== "vendor") {
        return {
          field,
          inputValue: record.vendorId,
          error: `User '${record.vendorId}' is not a vendor (role: ${vendor.role})`,
        };
      }

      this.cache.set(cacheKey, vendor);

      return {
        field,
        inputValue: record.vendorId,
        resolvedId: vendor._id.toString(),
        resolvedName: vendor.email,
      };
    }

    return {
      field,
      inputValue: null,
      error: "Either vendorEmail or vendorId is required",
    };
  }

  /**
   * Resolve category reference (accepts categorySlug or categoryId)
   */
  async resolveCategory(record: any): Promise<RelationshipResolution> {
    const field = "category";

    // Try slug first (preferred readable format)
    if (record.categorySlug) {
      const cacheKey = `category:slug:${record.categorySlug.toLowerCase()}`;

      if (this.cache.has(cacheKey)) {
        const category = this.cache.get(cacheKey);
        return {
          field,
          inputValue: record.categorySlug,
          resolvedId: category._id.toString(),
          resolvedName: category.slug,
        };
      }

      const category = await Category.findOne({
        slug: record.categorySlug.toLowerCase(),
        isActive: true,
      }).select("_id slug name");

      if (!category) {
        return {
          field,
          inputValue: record.categorySlug,
          error: `Category with slug '${record.categorySlug}' not found`,
        };
      }

      this.cache.set(cacheKey, category);

      return {
        field,
        inputValue: record.categorySlug,
        resolvedId: category._id.toString(),
        resolvedName: category.slug,
      };
    }

    // Fallback to ID
    if (record.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(record.categoryId)) {
        return {
          field,
          inputValue: record.categoryId,
          error: `Invalid categoryId format: ${record.categoryId}`,
        };
      }

      const cacheKey = `category:id:${record.categoryId}`;

      if (this.cache.has(cacheKey)) {
        const category = this.cache.get(cacheKey);
        return {
          field,
          inputValue: record.categoryId,
          resolvedId: category._id.toString(),
          resolvedName: category.slug,
        };
      }

      const category = await Category.findById(record.categoryId).select(
        "_id slug name isActive",
      );

      if (!category) {
        return {
          field,
          inputValue: record.categoryId,
          error: `Category with ID '${record.categoryId}' not found`,
        };
      }

      if (!category.isActive) {
        return {
          field,
          inputValue: record.categoryId,
          error: `Category '${category.slug}' is inactive`,
        };
      }

      this.cache.set(cacheKey, category);

      return {
        field,
        inputValue: record.categoryId,
        resolvedId: category._id.toString(),
        resolvedName: category.slug,
      };
    }

    // Category might be optional for some models
    return {
      field,
      inputValue: null,
      error: undefined,
    };
  }

  /**
   * Resolve user reference by email or ID
   */
  async resolveUser(
    record: any,
    fieldPrefix: string = "user",
  ): Promise<RelationshipResolution> {
    const emailField = `${fieldPrefix}Email`;
    const idField = `${fieldPrefix}Id`;
    const field = idField;

    // Try email first
    if (record[emailField]) {
      const cacheKey = `user:email:${record[emailField].toLowerCase()}`;

      if (this.cache.has(cacheKey)) {
        const user = this.cache.get(cacheKey);
        return {
          field,
          inputValue: record[emailField],
          resolvedId: user._id.toString(),
          resolvedName: user.email,
        };
      }

      const user = await User.findOne({
        email: record[emailField].toLowerCase(),
      }).select("_id email role");

      if (!user) {
        return {
          field,
          inputValue: record[emailField],
          error: `User with email '${record[emailField]}' not found`,
        };
      }

      this.cache.set(cacheKey, user);

      return {
        field,
        inputValue: record[emailField],
        resolvedId: user._id.toString(),
        resolvedName: user.email,
      };
    }

    // Fallback to ID
    if (record[idField]) {
      if (!mongoose.Types.ObjectId.isValid(record[idField])) {
        return {
          field,
          inputValue: record[idField],
          error: `Invalid ${idField} format: ${record[idField]}`,
        };
      }

      const cacheKey = `user:id:${record[idField]}`;

      if (this.cache.has(cacheKey)) {
        const user = this.cache.get(cacheKey);
        return {
          field,
          inputValue: record[idField],
          resolvedId: user._id.toString(),
          resolvedName: user.email,
        };
      }

      const user = await User.findById(record[idField]).select(
        "_id email role",
      );

      if (!user) {
        return {
          field,
          inputValue: record[idField],
          error: `User with ID '${record[idField]}' not found`,
        };
      }

      this.cache.set(cacheKey, user);

      return {
        field,
        inputValue: record[idField],
        resolvedId: user._id.toString(),
        resolvedName: user.email,
      };
    }

    return {
      field,
      inputValue: null,
      error: `Either ${emailField} or ${idField} is required`,
    };
  }

  /**
   * Resolve event reference (by title or ID)
   */
  async resolveEvent(
    record: any,
    fieldPrefix: string = "event",
  ): Promise<RelationshipResolution> {
    const titleField = `${fieldPrefix}Title`;
    const idField = `${fieldPrefix}Id`;
    const field = idField;

    // Try title first (less reliable - titles not unique globally)
    if (record[titleField]) {
      const events = await Event.find({
        title: record[titleField],
        isDeleted: false,
      })
        .select("_id title slug")
        .limit(2);

      if (events.length === 0) {
        return {
          field,
          inputValue: record[titleField],
          error: `Event with title '${record[titleField]}' not found`,
        };
      }

      if (events.length > 1) {
        return {
          field,
          inputValue: record[titleField],
          error: `Multiple events found with title '${record[titleField]}'. Use eventId instead.`,
        };
      }

      return {
        field,
        inputValue: record[titleField],
        resolvedId: events[0]._id.toString(),
        resolvedName: events[0].title,
      };
    }

    // Fallback to ID (preferred)
    if (record[idField]) {
      if (!mongoose.Types.ObjectId.isValid(record[idField])) {
        return {
          field,
          inputValue: record[idField],
          error: `Invalid ${idField} format: ${record[idField]}`,
        };
      }

      const event = await Event.findOne({
        _id: record[idField],
        isDeleted: false,
      }).select("_id title slug");

      if (!event) {
        return {
          field,
          inputValue: record[idField],
          error: `Event with ID '${record[idField]}' not found`,
        };
      }

      return {
        field,
        inputValue: record[idField],
        resolvedId: event._id.toString(),
        resolvedName: event.title,
      };
    }

    return {
      field,
      inputValue: null,
      error: `Either ${titleField} or ${idField} is required`,
    };
  }

  /**
   * Resolve parent category (for Category import)
   */
  async resolveParentCategory(record: any): Promise<RelationshipResolution> {
    const field = "parentId";

    if (!record.parentSlug && !record.parentId) {
      // No parent - root category
      return {
        field,
        inputValue: null,
        resolvedId: undefined,
        resolvedName: undefined,
      };
    }

    // Try slug first
    if (record.parentSlug) {
      const cacheKey = `category:slug:${record.parentSlug.toLowerCase()}`;

      if (this.cache.has(cacheKey)) {
        const parent = this.cache.get(cacheKey);
        return {
          field,
          inputValue: record.parentSlug,
          resolvedId: parent._id.toString(),
          resolvedName: parent.slug,
        };
      }

      const parent = await Category.findOne({
        slug: record.parentSlug.toLowerCase(),
      }).select("_id slug name level");

      if (!parent) {
        return {
          field,
          inputValue: record.parentSlug,
          error: `Parent category with slug '${record.parentSlug}' not found`,
        };
      }

      // Check max depth
      if (parent.level >= 4) {
        return {
          field,
          inputValue: record.parentSlug,
          error: `Parent category '${record.parentSlug}' is at max depth (level ${parent.level}). Cannot add child.`,
        };
      }

      this.cache.set(cacheKey, parent);

      return {
        field,
        inputValue: record.parentSlug,
        resolvedId: parent._id.toString(),
        resolvedName: parent.slug,
      };
    }

    // Fallback to ID
    if (record.parentId) {
      if (!mongoose.Types.ObjectId.isValid(record.parentId)) {
        return {
          field,
          inputValue: record.parentId,
          error: `Invalid parentId format: ${record.parentId}`,
        };
      }

      const parent = await Category.findById(record.parentId).select(
        "_id slug name level",
      );

      if (!parent) {
        return {
          field,
          inputValue: record.parentId,
          error: `Parent category with ID '${record.parentId}' not found`,
        };
      }

      if (parent.level >= 4) {
        return {
          field,
          inputValue: record.parentId,
          error: `Parent category is at max depth (level ${parent.level}). Cannot add child.`,
        };
      }

      return {
        field,
        inputValue: record.parentId,
        resolvedId: parent._id.toString(),
        resolvedName: parent.slug,
      };
    }

    return {
      field,
      inputValue: null,
      error: undefined,
    };
  }

  /**
   * Resolve blog category reference (accepts categoryName or categoryId)
   */
  async resolveBlogCategory(record: any): Promise<RelationshipResolution> {
    const field = "category";
    const BlogCategory = mongoose.model("BlogCategory");

    // Try name first (readable format)
    if (record.categoryName) {
      const cacheKey = `blogcategory:name:${record.categoryName.toLowerCase()}`;

      if (this.cache.has(cacheKey)) {
        const category = this.cache.get(cacheKey);
        return {
          field,
          inputValue: record.categoryName,
          resolvedId: category._id.toString(),
          resolvedName: category.name,
        };
      }

      const category = await BlogCategory.findOne({
        name: record.categoryName,
        isActive: true,
      }).select("_id name slug");

      if (!category) {
        return {
          field,
          inputValue: record.categoryName,
          error: `BlogCategory with name '${record.categoryName}' not found`,
        };
      }

      this.cache.set(cacheKey, category);

      return {
        field,
        inputValue: record.categoryName,
        resolvedId: category._id.toString(),
        resolvedName: category.name,
      };
    }

    // Fallback to ID
    if (record.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(record.categoryId)) {
        return {
          field,
          inputValue: record.categoryId,
          error: `Invalid categoryId format: ${record.categoryId}`,
        };
      }

      const cacheKey = `blogcategory:id:${record.categoryId}`;

      if (this.cache.has(cacheKey)) {
        const category = this.cache.get(cacheKey);
        return {
          field,
          inputValue: record.categoryId,
          resolvedId: category._id.toString(),
          resolvedName: category.name,
        };
      }

      const category = await BlogCategory.findById(record.categoryId).select(
        "_id name slug isActive",
      );

      if (!category) {
        return {
          field,
          inputValue: record.categoryId,
          error: `BlogCategory with ID '${record.categoryId}' not found`,
        };
      }

      if (!category.isActive) {
        return {
          field,
          inputValue: record.categoryId,
          error: `BlogCategory '${category.name}' is inactive`,
        };
      }

      this.cache.set(cacheKey, category);

      return {
        field,
        inputValue: record.categoryId,
        resolvedId: category._id.toString(),
        resolvedName: category.name,
      };
    }

    // Category might be optional for Blog
    return {
      field,
      inputValue: null,
      error: undefined,
    };
  }

  /**
   * Validate circular parent reference (Category only)
   */
  async validateCategoryParent(
    categoryId: string | undefined,
    parentId: string,
  ): Promise<void> {
    if (!parentId) return;

    const visited = new Set<string>();
    let current: string | undefined = parentId;

    // Traverse up the parent chain
    while (current) {
      if (current === categoryId?.toString()) {
        throw new AppError("Circular parent reference detected", 400);
      }

      if (visited.has(current)) {
        throw new AppError(
          "Circular parent reference detected in existing data",
          400,
        );
      }

      visited.add(current);

      const parent = await Category.findById(current).select("parentId");
      if (!parent) break;

      current = parent.parentId?.toString();
    }
  }

  /**
   * Clear cache (call between batches)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
