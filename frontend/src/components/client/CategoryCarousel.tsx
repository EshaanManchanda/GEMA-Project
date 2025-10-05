import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/scrollbar';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Scrollbar, Navigation, Pagination, Autoplay } from 'swiper/modules';
import { FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Default fallback categories with placeholder images
const defaultCategories = [
  { id: '1', name: 'Entertainment', icon: '🎭', image: 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=80&h=80&fit=crop&crop=center', count: '45+ activities' },
  { id: '2', name: 'Education', icon: '📚', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=80&h=80&fit=crop&crop=center', count: '32+ activities' },
  { id: '3', name: 'Arts', icon: '🎨', image: 'https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?w=80&h=80&fit=crop&crop=center', count: '20+ activities' },
  { id: '4', name: 'Sports', icon: '⚽', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center', count: '15+ activities' },
  { id: '5', name: 'Adventure', icon: '🏕️', image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=80&h=80&fit=crop&crop=center', count: '28+ activities' },
];

interface Category {
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

interface CategoryCarouselProps {
  categories?: Category[];
}

// Utility functions for category data transformation
const getCategoryImage = (category: Category): string => {
  if (category.featuredImage) return category.featuredImage;
  if (category.image) return category.image;
  // Return default image based on category name
  const imageMap: Record<string, string> = {
    'Entertainment': 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=80&h=80&fit=crop&crop=center',
    'Education': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=80&h=80&fit=crop&crop=center',
    'Arts': 'https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?w=80&h=80&fit=crop&crop=center',
    'Sports': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center',
    'Adventure': 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=80&h=80&fit=crop&crop=center',
  };
  // Use fallback for unknown categories
  const initials = category.name.slice(0, 2).toUpperCase();
  const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#3b82f6"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" font-weight="500" text-anchor="middle" dominant-baseline="middle" fill="#ffffff">${initials}</text></svg>`;
  return imageMap[category.name] || `data:image/svg+xml;base64,${btoa(svg)}`;
};

const getCategoryIcon = (category: Category): string => {
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
  };
  return iconMap[category.name] || '📂';
};

const getCategoryCount = (category: Category): string => {
  if (category.count) return category.count;
  if (category.eventCount !== undefined) return `${category.eventCount}+ activities`;
  return `${Math.floor(Math.random() * 50) + 10}+ activities`;
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

  // Transform API categories and use provided categories or fallback to default
  const transformedApiCategories = categories.map(transformCategory);
  const displayCategories = transformedApiCategories.length > 0 ? transformedApiCategories : defaultCategories;

  // Debug logging in development
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API === 'true') {
    console.log('CategoryCarousel - Original categories:', categories);
    console.log('CategoryCarousel - Transformed categories:', transformedApiCategories);
  }

  const handleCategoryClick = (category: Category) => {
    const slug = category.slug || category.id || category._id;
    if (!slug) {
      console.error('Category missing slug:', category);
      return;
    }
    navigate(`/categories/${slug}`);
  };
  
  const handleViewAllCategories = () => {
    navigate('/categories');
  };
  
  return (
    <div className="w-full px-6 py-16 bg-gradient-to-b" style={{ background: 'linear-gradient(to bottom, var(--secondary-color) 0%, rgba(255,255,255,0) 100%)' }}>
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="mb-4 md:mb-0">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-2" 
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
              EXPLORE
            </div>
            <h2 className="text-3xl font-bold text-white">Browse By Categories</h2>
            <p className="text-white/80 mt-2 max-w-md">Discover the perfect activities for your kids based on their interests</p>
          </div>
          <button 
            onClick={handleViewAllCategories}
            className="flex items-center gap-2 text-white bg-white/20 hover:bg-white/30 transition-all duration-300 px-4 py-2 rounded-full font-medium"
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
                      style={{ backgroundColor: 'var(--secondary-color)', opacity: 0.1 }}>
                      {cat.image ? (
                        <img 
                          src={cat.image} 
                          alt={cat.name} 
                          className="w-16 h-16 object-cover rounded-full" 
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                            }
                          }}
                        />
                      ) : null}
                      <span 
                        className="text-3xl"
                        style={{ display: cat.image ? 'none' : 'block' }}
                      >
                        {cat.icon}
                      </span>
                    </div>
                    <p className="text-base font-semibold mb-1" style={{ color: 'var(--primary-color)' }}>{cat.name}</p>
                    <p className="text-xs text-gray-500">{cat.count}</p>
                    {cat.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cat.description}</p>
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
