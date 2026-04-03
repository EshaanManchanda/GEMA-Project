import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/scrollbar';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Scrollbar, Navigation, Pagination, Autoplay } from 'swiper/modules';
import { FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import logger from '../../utils/logger';

// Default fallback categories with placeholder images
const defaultCategories: Category[] = [
  { id: '1', name: 'Entertainment', icon: '🎭', image: 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=80&h=80&fit=crop&crop=center', count: '45+ activities' },
  { id: '2', name: 'Education', icon: '📚', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=80&h=80&fit=crop&crop=center', count: '32+ activities' },
  { id: '3', name: 'Arts', icon: '🎨', image: 'https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?w=80&h=80&fit=crop&crop=center', count: '20+ activities' },
  { id: '4', name: 'Sports', icon: '⚽', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center', count: '15+ activities' },
  { id: '5', name: 'Adventure', icon: '🏕️', image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=80&h=80&fit=crop&crop=center', count: '28+ activities' },
];

interface MediaAsset {
  url: string;
  publicId?: string;
  altText?: string;
}

interface Category {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  iconAsset?: MediaAsset;
  color?: string;
  featuredImage?: string;
  featuredImageAsset?: MediaAsset;
  eventCount?: number;
  count?: string;
  image?: string;
}

interface CategoryCarouselProps {
  categories?: Category[];
}

// Utility functions for category data transformation
const getCategoryImage = (category: Category): string => {
  // Priority 1: featuredImageAsset from backend (MediaAsset object)
  if (category.featuredImageAsset?.url) {
    return category.featuredImageAsset.url;
  }

  // Priority 2: Legacy featuredImage URL
  if (category.featuredImage) {
    return category.featuredImage;
  }

  // Priority 3: Generic image property
  if (category.image) {
    return category.image;
  }

  // Priority 4: Generate placeholder from category initials
  const initials = category.name.slice(0, 2).toUpperCase();
  const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#3b82f6"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" font-weight="500" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const getCategoryIcon = (category: Category): string => {
  // Priority 1: iconAsset from backend (fallback to emoji icon)
  if (category.iconAsset?.url) {
    return category.iconAsset.url;
  }

  // Priority 2: Icon field (usually emoji)
  if (category.icon) return category.icon;

  // Priority 3: Default icon based on category name
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
  };
  return iconMap[category.name] || '📂';
};

const getCategoryCount = (category: Category): string => {
  // Priority 1: Use provided count string
  if (category.count) return category.count;

  // Priority 2: Use eventCount from backend
  if (category.eventCount !== undefined && category.eventCount > 0) {
    return `${category.eventCount}+ activities`;
  }

  // Priority 3: Stable fallback - no random numbers
  return 'View activities';
};

const transformCategory = (category: Category): Category => {
  // Ensure we have a valid name
  const categoryName = category.name || 'Unnamed Category';
  const slugFallback = categoryName.toLowerCase().replace(/\s+/g, '-');

  return {
    ...category,
    id: category.id || category._id || slugFallback,
    slug: category.slug || slugFallback,
    icon: getCategoryIcon(category),
    image: getCategoryImage(category),
    count: getCategoryCount(category),
  };
};

function CategoryCarousel({ categories = [] }: CategoryCarouselProps) {
  const navigate = useNavigate();

  // Transform API categories - show all categories regardless of event count
  const transformedApiCategories = categories.map(transformCategory);
  const displayCategories = transformedApiCategories.length > 0 ? transformedApiCategories : defaultCategories;

  // Debug logging (gated)
  // Debug logging
  logger.debug('🏷️ [CATEGORY CAROUSEL] Rendering:');
  logger.debug('   - Categories received:', categories.length);
  logger.debug('   - Using:', transformedApiCategories.length > 0 ? 'API data' : 'Default fallback');
  logger.debug('   - Total to display:', displayCategories.length);
  if (displayCategories.length > 0) {
    logger.debug('   - First category:', {
      name: displayCategories[0].name,
      icon: displayCategories[0].icon,
      hasIconAsset: !!(displayCategories[0] as any).iconAsset,
      eventCount: displayCategories[0].eventCount
    });
  }

  const handleCategoryClick = (category: Category) => {
    const slug = category.slug || category.id || category._id;
    if (!slug) {
      logger.error('Category missing slug:', category);
      return;
    }
    navigate(`/categories/${slug}`);
  };

  const handleViewAllCategories = () => {
    navigate('/categories');
  };

  return (
    <div className="w-full px-6 py-16 bg-gradient-to-b" style={{
      backgroundImage: 'url(/assets/images/categories-background.png), linear-gradient(to bottom, var(--secondary-color) 0%, rgba(255,255,255,0) 100%)',
      backgroundSize: 'cover, 100% 100%'
    }}>
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="mb-4 md:mb-0">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--primary-color)' }}>
              EXPLORE
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Browse By Categories</h2>
            <p className="text-gray-700 mt-2 max-w-md">Discover the perfect activities for your kids based on their interests</p>
          </div>
          <button
            onClick={handleViewAllCategories}
            className="flex items-center gap-2 text-gray-900 bg-white hover:bg-gray-50 transition-all duration-300 px-4 py-2 rounded-full font-medium shadow-sm"
          >
            View All Categories <FaArrowRight size={14} />
          </button>
        </div>

        <div className="relative">
          <Swiper
            slidesPerView={1.5}
            spaceBetween={20}
            pagination={{
              clickable: true,
              dynamicBullets: true
            }}
            navigation={{
              prevEl: '.swiper-button-prev',
              nextEl: '.swiper-button-next',
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              640: { slidesPerView: 2.5 },
              768: { slidesPerView: 3.5 },
              1024: { slidesPerView: 4.5 },
            }}
            modules={[Scrollbar, Navigation, Pagination, Autoplay]}
            className="pb-12"
          >
            {displayCategories.map((cat, index) => (
              <SwiperSlide key={cat.id || index}>
                <div
                  onClick={() => handleCategoryClick(cat)}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group h-full"
                >
                  <div className="p-6 flex flex-col items-center justify-center text-center h-full">
                    <div className="mb-4 p-3 rounded-full transition-all duration-300 group-hover:scale-110"
                      style={{ backgroundColor: 'var(--secondary-color)' }}>
                      {cat.iconAsset?.url ? (
                        <img
                          src={cat.iconAsset.url}
                          alt={cat.name}
                          className="w-16 h-16 object-cover"
                          loading="lazy"
                          width="64"
                          height="64"
                        />
                      ) : (
                        <span className="text-3xl">{cat.icon}</span>
                      )}
                    </div>
                    <p className="text-base font-semibold mb-1" style={{ color: 'var(--primary-color)' }}>{cat.name}</p>
                    <p className="text-xs text-gray-700">{cat.count}</p>
                    {cat.description && (
                      <p className="text-xs text-gray-700 mt-1 line-clamp-2">{cat.description}</p>
                    )}
                    <div
                      className="mt-4 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                      style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
                    >
                      <FaArrowRight size={12} />
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <button className="swiper-button-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center z-10 hover:shadow-lg">
            <FaChevronLeft size={16} style={{ color: 'var(--primary-color)' }} />
          </button>

          <button className="swiper-button-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center z-10 hover:shadow-lg">
            <FaChevronRight size={16} style={{ color: 'var(--primary-color)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when categories don't change
export default React.memo(CategoryCarousel);
