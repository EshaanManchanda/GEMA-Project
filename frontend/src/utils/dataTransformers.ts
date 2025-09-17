import { getPlaceholderUrl } from './placeholderImage';

// Event related interfaces
export interface EventData {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  images?: string[];
  image?: string;
  price?: number;
  currency?: string;
  location?: {
    city?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  } | string;
  category?: string;
  categories?: string[];
  ageRange?: {
    min: number;
    max: number;
  };
  ageGroup?: string;
  dateSchedule?: Array<{
    startDate: string;
    endDate: string;
  }>;
  date?: string;
  isFeatured?: boolean;
  viewsCount?: number;
  vendorId?: {
    businessName: string;
  };
}

// Category related interfaces
export interface CategoryData {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  featuredImage?: string;
  eventCount?: number;
  count?: string;
  image?: string;
}

// Event transformation utilities
export const formatPrice = (price?: number, currency: string = 'AED'): string => {
  if (!price) return '';
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(price);
};

export const getEventLocation = (location?: EventData['location']): string => {
  if (!location) return 'Location TBD';
  if (typeof location === 'string') return location;
  return location.city || location.address || 'Location TBD';
};

export const getEventImage = (event: EventData): string => {
  if (event.image) return event.image;
  if (event.images && event.images.length > 0) return event.images[0];
  return getPlaceholderUrl('eventCard', event.title);
};

export const getAgeGroup = (event: EventData): string => {
  if (event.ageGroup) return event.ageGroup;
  if (event.ageRange) {
    return `${event.ageRange.min}-${event.ageRange.max} years`;
  }
  return '';
};

export const getEventDate = (event: EventData): string => {
  if (event.date) return new Date(event.date).toLocaleDateString();
  if (event.dateSchedule?.[0]) {
    return new Date(event.dateSchedule[0].startDate).toLocaleDateString();
  }
  return 'Date TBD';
};

export const getEventTime = (event: EventData): string => {
  if (event.dateSchedule?.[0]) {
    const start = new Date(event.dateSchedule[0].startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(event.dateSchedule[0].endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${start} - ${end}`;
  }
  return '10:00 AM - 4:00 PM';
};

export const transformEventForAPI = (event: EventData): EventData => {
  return {
    ...event,
    id: event.id || event._id || '',
    image: getEventImage(event),
    ageGroup: getAgeGroup(event),
    viewsCount: event.viewsCount || 0,
  };
};

// Alias for backward compatibility and consistent naming
export const transformEvent = transformEventForAPI;

// Category transformation utilities
export const getCategoryImage = (category: CategoryData): string => {
  if (category.featuredImage) return category.featuredImage;
  if (category.image) return category.image;
  
  // Return default image based on category name
  const imageMap: Record<string, string> = {
    'Entertainment': 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=80&h=80&fit=crop&crop=center',
    'Education': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=80&h=80&fit=crop&crop=center',
    'Arts': 'https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?w=80&h=80&fit=crop&crop=center',
    'Sports': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center',
    'Adventure': 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=80&h=80&fit=crop&crop=center',
    'Food': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=80&h=80&fit=crop&crop=center',
    'Music': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop&crop=center',
    'Science': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=80&h=80&fit=crop&crop=center',
    'Technology': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=80&h=80&fit=crop&crop=center',
    'Nature': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=80&h=80&fit=crop&crop=center',
  };
  
  return imageMap[category.name] || getPlaceholderUrl('categoryIcon', category.name.slice(0, 2));
};

export const getCategoryIcon = (category: CategoryData): string => {
  if (category.icon) return category.icon;
  
  // Return default icon based on category name
  const iconMap: Record<string, string> = {
    'Entertainment': '🎭',
    'Education': '📚',
    'Arts': '🎨',
    'Sports': '⚽',
    'Adventure': '🏕️',
    'Food': '🍕',
    'Music': '🎵',
    'Science': '🔬',
    'Technology': '💻',
    'Nature': '🌳',
    'Health': '🏥',
    'Fashion': '👗',
    'Gaming': '🎮',
    'Photography': '📷',
    'Cooking': '👨‍🍳',
    'Dance': '💃',
  };
  
  return iconMap[category.name] || '📂';
};

export const getCategoryCount = (category: CategoryData): string => {
  if (category.count) return category.count;
  if (category.eventCount !== undefined) return `${category.eventCount}+ activities`;
  return `${Math.floor(Math.random() * 50) + 10}+ activities`;
};

export const generateCategorySlug = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
};

export const transformCategoryForAPI = (category: CategoryData): CategoryData => {
  return {
    ...category,
    id: category.id || category._id || generateCategorySlug(category.name),
    slug: category.slug || generateCategorySlug(category.name),
    icon: getCategoryIcon(category),
    image: getCategoryImage(category),
    count: getCategoryCount(category),
  };
};

// General utility functions
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-AE', options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-AE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Validation utilities
export const isValidEvent = (event: any): event is EventData => {
  return event && typeof event.title === 'string' && event.title.length > 0;
};

export const isValidCategory = (category: any): category is CategoryData => {
  return category && typeof category.name === 'string' && category.name.length > 0;
};

// Array transformation utilities
export const transformEventsArray = (events: any[]): EventData[] => {
  return events.filter(isValidEvent).map(transformEventForAPI);
};

export const transformCategoriesArray = (categories: any[]): CategoryData[] => {
  return categories.filter(isValidCategory).map(transformCategoryForAPI);
};