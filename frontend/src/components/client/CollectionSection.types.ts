import { ReactNode } from 'react';

export type LayoutVariant = 'grid' | 'carousel' | 'horizontal-scroll' | 'stacked' | 'masonry';
export type EventCardVariant = 'default' | 'featured' | 'compact' | 'horizontal' | 'vertical-tall' | 'overlay' | 'minimal' | 'magazine' | 'list-item';
export type GapSize = 'sm' | 'md' | 'lg' | 'xl';
export type PaddingSize = 'none' | 'sm' | 'md' | 'lg';
export type TitleSize = 'sm' | 'md' | 'lg' | 'xl';
export type AnimationType = 'fade' | 'slide-up' | 'slide-in' | 'scale' | 'none';
export type CardHoverEffect = 'lift' | 'scale' | 'shadow' | 'none';
export type Alignment = 'left' | 'center';

export interface EventLocation {
  city?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

export interface EventDateSchedule {
  startDate: string;
  endDate: string;
}

export interface EventVendor {
  businessName: string;
}

export interface Event {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  images?: string[];
  image?: string;
  price?: number;
  currency?: string;
  location?: EventLocation | string;
  category?: string;
  categories?: string[];
  ageRange?: [number, number] | { min: number; max: number };
  ageGroup?: string;
  dateSchedule?: EventDateSchedule[];
  date?: string;
  isFeatured?: boolean;
  viewsCount?: number;
  bookingsCount?: number;
  rating?: number;
  reviewsCount?: number;
  vendorId?: EventVendor;
}

export interface GridColumnConfig {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface CollectionSectionProps {
  // Content props
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  events: Event[];

  // Layout variants
  layout?: LayoutVariant;

  // EventCard customization
  eventCardVariant?: EventCardVariant;
  showPrice?: boolean;
  showLocation?: boolean;
  showDate?: boolean;
  showTime?: boolean;
  showDescription?: boolean;
  showStats?: boolean;
  showCategory?: boolean;
  showVendor?: boolean;
  showAgeGroup?: boolean;
  showFeaturedBadge?: boolean;
  showWishlist?: boolean;

  // View more CTA
  viewAllLink?: string;
  viewAllLabel?: string;
  onViewAll?: () => void;

  // Display options
  maxItems?: number;
  enablePagination?: boolean;

  // Carousel-specific options
  autoplay?: boolean;
  autoplayInterval?: number;
  showNavigation?: boolean;
  showDots?: boolean;

  // Spacing customization
  gap?: GapSize;
  containerPadding?: PaddingSize;

  // Color customization
  titleColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  secondaryAccentColor?: string;

  // Typography
  titleSize?: TitleSize;
  titleAlignment?: Alignment;

  // Card styling
  cardBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  cardShadow?: 'none' | 'sm' | 'md' | 'lg';
  cardHoverEffect?: CardHoverEffect;

  // Grid-specific
  gridCols?: GridColumnConfig;

  // Animation options
  enableAnimations?: boolean;
  animationType?: AnimationType;
  animationDuration?: number;
  animationDelay?: number;
  animationStagger?: boolean;

  // Styling
  className?: string;
  backgroundColor?: string;

  // Loading/Error states
  isLoading?: boolean;
  error?: string | null;
  emptyStateMessage?: string;
  emptyStateIcon?: ReactNode;

  // Wishlist integration
  wishlistIds?: string[];
  onWishlistToggle?: (eventId: string) => void;
}

export interface CollectionSectionHeaderProps {
  badge?: string;
  badgeColor?: string;
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  viewAllLabel?: string;
  onViewAll?: () => void;
  titleColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  titleSize?: TitleSize;
  titleAlignment?: Alignment;
}
