/**
 * Blog Response Transformation Utilities
 *
 * These utilities handle the transformation of blog documents to ensure
 * proper featured image URL extraction from MediaAsset references.
 * Maintains backward compatibility with old featuredImage string field.
 */

/**
 * Transform blog document to include proper featured image URL
 * Handles both old (featuredImage string) and new (featuredImageAsset reference) formats
 *
 * @param blog - Blog document (plain object from .lean())
 * @returns Transformed blog with featuredImage URL extracted
 */
export const transformBlogResponse = (blog: any) => {
  if (!blog) return null;

  // Create a copy to avoid mutating original
  const transformed = { ...blog };

  // Extract image URL from featuredImageAsset if populated
  if (blog.featuredImageAsset && typeof blog.featuredImageAsset === "object") {
    // New format: extract URL from populated MediaAsset
    transformed.featuredImage = blog.featuredImageAsset.url;
    transformed.featuredImageThumbnail = blog.featuredImageAsset.thumbnailUrl;
    transformed.featuredImageVariations = blog.featuredImageAsset.variations;
  } else if (!blog.featuredImage && blog.featuredImageAsset) {
    // featuredImageAsset exists but not populated - should not happen but handle gracefully
    transformed.featuredImage = "";
  }
  // else: use existing featuredImage string (backward compatibility with old data)

  return transformed;
};

/**
 * Transform array of blogs
 *
 * @param blogs - Array of blog documents
 * @returns Array of transformed blogs
 */
export const transformBlogsResponse = (blogs: any[]) => {
  return blogs.map(transformBlogResponse);
};
