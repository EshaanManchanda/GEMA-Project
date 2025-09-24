/**
 * SEO Utilities for validation, optimization, and content generation
 */

export interface SEOValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
  score: number; // 0-100
}

export interface SEOAnalysis {
  titleLength: number;
  descriptionLength: number;
  keywordCount: number;
  titleScore: number;
  descriptionScore: number;
  keywordScore: number;
  overallScore: number;
}

export interface SEOSuggestion {
  type: 'title' | 'description' | 'keywords';
  priority: 'high' | 'medium' | 'low';
  message: string;
  suggestion?: string;
}

// SEO Limits and best practices
export const SEO_LIMITS = {
  TITLE: {
    MIN: 30,
    MAX: 60,
    OPTIMAL_MIN: 50,
    OPTIMAL_MAX: 60
  },
  DESCRIPTION: {
    MIN: 120,
    MAX: 160,
    OPTIMAL_MIN: 150,
    OPTIMAL_MAX: 160
  },
  KEYWORDS: {
    MIN: 3,
    MAX: 10,
    OPTIMAL: 5
  }
};

/**
 * Validate SEO fields and provide optimization suggestions
 */
export const validateSEO = (seoData: {
  title?: string;
  description?: string;
  keywords?: string[];
}): SEOValidationResult => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  const { title = '', description = '', keywords = [] } = seoData;

  // Title validation
  let titleScore = 0;
  if (!title.trim()) {
    warnings.push('Title is required');
  } else {
    const titleLength = title.length;
    if (titleLength < SEO_LIMITS.TITLE.MIN) {
      warnings.push(`Title is too short (${titleLength} chars). Aim for ${SEO_LIMITS.TITLE.MIN}-${SEO_LIMITS.TITLE.MAX} characters.`);
      titleScore = 30;
    } else if (titleLength > SEO_LIMITS.TITLE.MAX) {
      warnings.push(`Title is too long (${titleLength} chars). It may be truncated in search results.`);
      titleScore = 60;
    } else if (titleLength >= SEO_LIMITS.TITLE.OPTIMAL_MIN && titleLength <= SEO_LIMITS.TITLE.OPTIMAL_MAX) {
      titleScore = 100;
      suggestions.push('Title length is optimal for search engines.');
    } else {
      titleScore = 80;
    }

    // Check for brand mention
    if (!title.toLowerCase().includes('gema')) {
      suggestions.push('Consider including "Gema Events" in your title for brand recognition.');
    }

    // Check for location
    if (!title.toLowerCase().includes('uae') && !title.toLowerCase().includes('dubai')) {
      suggestions.push('Consider including location (UAE, Dubai) in your title for local SEO.');
    }
  }

  // Description validation
  let descriptionScore = 0;
  if (!description.trim()) {
    warnings.push('Meta description is required');
  } else {
    const descLength = description.length;
    if (descLength < SEO_LIMITS.DESCRIPTION.MIN) {
      warnings.push(`Description is too short (${descLength} chars). Aim for ${SEO_LIMITS.DESCRIPTION.MIN}-${SEO_LIMITS.DESCRIPTION.MAX} characters.`);
      descriptionScore = 30;
    } else if (descLength > SEO_LIMITS.DESCRIPTION.MAX) {
      warnings.push(`Description is too long (${descLength} chars). It may be truncated in search results.`);
      descriptionScore = 60;
    } else if (descLength >= SEO_LIMITS.DESCRIPTION.OPTIMAL_MIN && descLength <= SEO_LIMITS.DESCRIPTION.OPTIMAL_MAX) {
      descriptionScore = 100;
      suggestions.push('Description length is optimal for search engines.');
    } else {
      descriptionScore = 80;
    }

    // Check for call-to-action
    const hasCallToAction = /\b(book|register|join|discover|find|explore|learn)\b/i.test(description);
    if (!hasCallToAction) {
      suggestions.push('Consider adding a call-to-action (book, register, join, etc.) in your description.');
    }
  }

  // Keywords validation
  let keywordScore = 0;
  if (keywords.length === 0) {
    warnings.push('Keywords are recommended for better SEO');
    keywordScore = 0;
  } else if (keywords.length < SEO_LIMITS.KEYWORDS.MIN) {
    suggestions.push(`Consider adding more keywords. Current: ${keywords.length}, Recommended: ${SEO_LIMITS.KEYWORDS.MIN}-${SEO_LIMITS.KEYWORDS.MAX}`);
    keywordScore = 50;
  } else if (keywords.length > SEO_LIMITS.KEYWORDS.MAX) {
    warnings.push(`Too many keywords (${keywords.length}). Focus on ${SEO_LIMITS.KEYWORDS.MAX} most relevant keywords.`);
    keywordScore = 60;
  } else {
    keywordScore = 100;
    if (keywords.length === SEO_LIMITS.KEYWORDS.OPTIMAL) {
      suggestions.push('Keyword count is optimal.');
    }
  }

  // Calculate overall score
  score = Math.round((titleScore + descriptionScore + keywordScore) / 3);

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
    score
  };
};

/**
 * Analyze SEO content and provide detailed metrics
 */
export const analyzeSEO = (seoData: {
  title?: string;
  description?: string;
  keywords?: string[];
}): SEOAnalysis => {
  const { title = '', description = '', keywords = [] } = seoData;

  const titleLength = title.length;
  const descriptionLength = description.length;
  const keywordCount = keywords.length;

  // Calculate individual scores
  const titleScore = calculateTitleScore(titleLength);
  const descriptionScore = calculateDescriptionScore(descriptionLength);
  const keywordScore = calculateKeywordScore(keywordCount);

  const overallScore = Math.round((titleScore + descriptionScore + keywordScore) / 3);

  return {
    titleLength,
    descriptionLength,
    keywordCount,
    titleScore,
    descriptionScore,
    keywordScore,
    overallScore
  };
};

/**
 * Generate SEO suggestions based on content analysis
 */
export const generateSEOSuggestions = (
  content: {
    title?: string;
    description?: string;
    keywords?: string[];
    category?: string;
    location?: string;
    type?: 'event' | 'blog';
  }
): SEOSuggestion[] => {
  const suggestions: SEOSuggestion[] = [];
  const { title = '', description = '', keywords = [], category, location, type } = content;

  // Title suggestions
  if (!title) {
    suggestions.push({
      type: 'title',
      priority: 'high',
      message: 'Add a compelling title that includes your main keywords'
    });
  } else if (title.length < SEO_LIMITS.TITLE.MIN) {
    const suggestion = type === 'event'
      ? `${title} | Kids ${category} in ${location || 'UAE'} | Gema Events`
      : `${title} | Kids Activities Guide | Gema Events`;

    suggestions.push({
      type: 'title',
      priority: 'high',
      message: 'Title is too short. Consider expanding it.',
      suggestion
    });
  }

  // Description suggestions
  if (!description) {
    suggestions.push({
      type: 'description',
      priority: 'high',
      message: 'Add a meta description to improve click-through rates'
    });
  } else if (description.length < SEO_LIMITS.DESCRIPTION.MIN) {
    suggestions.push({
      type: 'description',
      priority: 'medium',
      message: 'Expand your description to provide more context for search engines'
    });
  }

  // Keyword suggestions
  if (keywords.length === 0) {
    const defaultKeywords = type === 'event'
      ? ['kids activities', 'events', location || 'UAE', category || 'entertainment']
      : ['kids activities', 'parenting tips', 'family fun', 'UAE'];

    suggestions.push({
      type: 'keywords',
      priority: 'medium',
      message: 'Add relevant keywords to improve discoverability',
      suggestion: defaultKeywords.join(', ')
    });
  }

  return suggestions;
};

/**
 * Generate auto-complete SEO based on content
 */
export const generateAutoSEO = (content: {
  title: string;
  description: string;
  category?: string;
  location?: string;
  tags?: string[];
  type: 'event' | 'blog';
}): { title: string; description: string; keywords: string[] } => {
  const { title, description, category, location, tags = [], type } = content;

  // Generate SEO title
  let seoTitle = title;
  if (type === 'event') {
    if (!seoTitle.toLowerCase().includes('gema')) {
      seoTitle = `${title} | Kids ${category || 'Activities'} in ${location || 'UAE'} | Gema Events`;
    }
  } else {
    if (!seoTitle.toLowerCase().includes('gema')) {
      seoTitle = `${title} | Kids Activities Guide | Gema Events`;
    }
  }

  // Ensure title is within limits
  if (seoTitle.length > SEO_LIMITS.TITLE.MAX) {
    seoTitle = `${title} | Gema Events`;
  }

  // Generate SEO description
  let seoDescription = description;
  if (seoDescription.length > SEO_LIMITS.DESCRIPTION.MAX) {
    seoDescription = `${description.substring(0, 157)}...`;
  } else if (seoDescription.length < SEO_LIMITS.DESCRIPTION.MIN) {
    const suffix = type === 'event'
      ? ` Book now for an unforgettable experience with Gema Events in ${location || 'UAE'}.`
      : ' Discover expert tips and guides for family activities with Gema Events.';

    if (seoDescription.length + suffix.length <= SEO_LIMITS.DESCRIPTION.MAX) {
      seoDescription += suffix;
    }
  }

  // Generate keywords
  const baseKeywords = type === 'event'
    ? ['kids activities', 'events', 'family fun']
    : ['kids activities', 'parenting tips', 'family guide'];

  const contextKeywords = [
    location || 'UAE',
    category,
    ...tags.slice(0, 3)
  ].filter(Boolean);

  const keywords = [...baseKeywords, ...contextKeywords].slice(0, SEO_LIMITS.KEYWORDS.MAX);

  return {
    title: seoTitle,
    description: seoDescription,
    keywords
  };
};

// Helper functions
function calculateTitleScore(length: number): number {
  if (length === 0) return 0;
  if (length < SEO_LIMITS.TITLE.MIN) return 30;
  if (length > SEO_LIMITS.TITLE.MAX) return 60;
  if (length >= SEO_LIMITS.TITLE.OPTIMAL_MIN && length <= SEO_LIMITS.TITLE.OPTIMAL_MAX) return 100;
  return 80;
}

function calculateDescriptionScore(length: number): number {
  if (length === 0) return 0;
  if (length < SEO_LIMITS.DESCRIPTION.MIN) return 30;
  if (length > SEO_LIMITS.DESCRIPTION.MAX) return 60;
  if (length >= SEO_LIMITS.DESCRIPTION.OPTIMAL_MIN && length <= SEO_LIMITS.DESCRIPTION.OPTIMAL_MAX) return 100;
  return 80;
}

function calculateKeywordScore(count: number): number {
  if (count === 0) return 0;
  if (count < SEO_LIMITS.KEYWORDS.MIN) return 50;
  if (count > SEO_LIMITS.KEYWORDS.MAX) return 60;
  if (count === SEO_LIMITS.KEYWORDS.OPTIMAL) return 100;
  return 85;
}

/**
 * Format SEO score for display
 */
export const formatSEOScore = (score: number): { color: string; label: string } => {
  if (score >= 85) return { color: 'green', label: 'Excellent' };
  if (score >= 70) return { color: 'yellow', label: 'Good' };
  if (score >= 50) return { color: 'orange', label: 'Needs Improvement' };
  return { color: 'red', label: 'Poor' };
};

/**
 * Extract keywords from content text
 */
export const extractKeywords = (text: string, maxKeywords: number = 5): string[] => {
  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'will', 'would', 'should', 'could', 'can', 'may', 'might'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Count word frequency
  const wordCount = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
};