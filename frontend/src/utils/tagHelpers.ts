/**
 * Tag parsing and validation utilities
 * Used for bulk tag/keyword input functionality
 */

export interface ParseTagsOptions {
  maxLength?: number;
  maxCount?: number;
}

export interface TagValidation {
  valid: boolean;
  error?: string;
}

/**
 * Parse bulk tag input (comma or newline separated)
 * Returns unique, trimmed, lowercase tags that pass validation
 */
export const parseBulkTags = (
  input: string,
  options?: ParseTagsOptions
): string[] => {
  const maxLength = options?.maxLength || 50;
  const maxCount = options?.maxCount;

  const tags = input
    .split(/[,\n]/) // Split by comma or newline
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length >= 2 && tag.length <= maxLength)
    .filter(Boolean)
    .filter((tag, idx, self) => self.indexOf(tag) === idx); // Unique only

  // Apply max count if specified
  if (maxCount !== undefined) {
    return tags.slice(0, maxCount);
  }

  return tags;
};

/**
 * Validate a single tag
 * Returns validation result with error message if invalid
 */
export const validateTag = (tag: string): TagValidation => {
  if (tag.length < 2) {
    return { valid: false, error: 'Min 2 chars' };
  }

  if (tag.length > 50) {
    return { valid: false, error: 'Max 50 chars' };
  }

  // Additional validation can be added here
  // e.g., check for special characters, profanity, etc.

  return { valid: true };
};

/**
 * Check if adding new tags would exceed the limit
 */
export const canAddTags = (
  currentTags: string[],
  newTags: string[],
  maxTags: number
): boolean => {
  return currentTags.length + newTags.length <= maxTags;
};

/**
 * Get unique tags from two arrays
 */
export const mergeUniqueTags = (
  existingTags: string[],
  newTags: string[]
): string[] => {
  const combined = [...existingTags, ...newTags];
  return combined.filter(
    (tag, idx, self) => self.indexOf(tag.toLowerCase()) === idx
  );
};
