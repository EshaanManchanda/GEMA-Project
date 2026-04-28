/**
 * Category Type Definitions
 * Centralized types for category-related data structures
 */

export interface MediaAsset {
  _id: string;
  url: string;
  publicId: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;

  // Icon fields
  icon?: string; // Legacy: emoji or text
  iconAsset?: MediaAsset | string; // New: MediaAsset reference (can be populated or ID)

  // Image fields
  featuredImage?: string; // Legacy: URL string
  featuredImageAsset?: MediaAsset | string; // New: MediaAsset reference

  color?: string;
  parentId?: string;
  parent?: { _id: string; name: string; slug?: string }; // Populated parent
  level: number;
  isActive: boolean;
  sortOrder: number;

  // SEO
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };

  // Computed fields
  eventCount?: number;
  children?: Category[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
  iconAsset?: string; // MediaAsset ID
  color?: string;
  featuredImageAsset?: string; // MediaAsset ID
  parentId?: string;
  isActive?: boolean;
  sortOrder?: number;
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

export interface GetCategoriesParams {
  tree?: boolean;
  includeInactive?: boolean;
  populate?: string;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
