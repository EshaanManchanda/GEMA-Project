import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { Blog } from '../../types/blog';
import { getPlaceholderUrl, handleImageError } from '../../utils/placeholderImage';
import logger from '../../utils/logger';
import { getImageAlt } from '../../utils/imageAlt';

interface FeaturedBlogsSectionProps {
  blogs?: Blog[];
  loading?: boolean;
}

const FeaturedBlogsSection: React.FC<FeaturedBlogsSectionProps> = ({
  blogs: propBlogs,
  loading = false
}) => {

  const getFallbackBlogs = (): Blog[] => [
    {
      _id: '1',
      title: 'Winter Camps: How To Keep The Kids Engaged During The Long School Break',
      content: 'This winter, Abu Dhabi and Dubai are brimming with incredible holiday camps...',
      excerpt: 'This winter, Abu Dhabi and Dubai are brimming with incredible holiday camps that turn the school break into a season of fun, electricity, and adventure.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Events', 'Family', 'Winter Camps'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'winter-camps-keeping-kids-engaged',
      readTime: 5,
      category: 'Family',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    },
    {
      _id: '2',
      title: 'Your Ultimate Family Guide to Eid El Etihad 2025',
      content: 'Celebrate UAE National Day with family-friendly events...',
      excerpt: 'Celebrate UAE National Day with family-friendly events and activities across Dubai and Abu Dhabi.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['National Day', 'Family', 'Events'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'eid-el-etihad-2025-guide',
      readTime: 7,
      category: 'Events',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    },
    {
      _id: '3',
      title: 'From Playdates to Thrill Dates: What Families Are Loving on Kidrove',
      content: 'Discover the most popular family activities on Kidrove...',
      excerpt: 'Discover the most popular family activities on Kidrove - from soft play centers to adventure parks.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Activities', 'Family'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'popular-family-activities-kidrove',
      readTime: 6,
      category: 'Activities',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    },
    {
      _id: '4',
      title: 'Planning the Perfect Kids Birthday Party',
      content: 'Tips and tricks for organizing unforgettable celebrations...',
      excerpt: 'Make your child\'s birthday extra special with these expert tips and venue recommendations.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Birthday', 'Planning'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'perfect-kids-birthday-party',
      readTime: 8,
      category: 'Family',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    },
    {
      _id: '5',
      title: 'Educational Activities for Children',
      content: 'Fun and educational activities to keep kids engaged...',
      excerpt: 'Learning can be fun with these engaging educational activities for kids of all ages.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Education', 'Activities'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'educational-activities-children',
      readTime: 5,
      category: 'Education',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    },
    {
      _id: '6',
      title: 'Best Indoor Play Areas in Dubai',
      content: 'Escape the heat with these amazing indoor play centers...',
      excerpt: 'Beat the Dubai heat with our curated list of the best indoor play areas for kids.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Indoor', 'Dubai'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'best-indoor-play-dubai',
      readTime: 6,
      category: 'Activities',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    },
    {
      _id: '7',
      title: 'Summer Activities to Keep Kids Active',
      content: 'Stay active during summer break with these fun activities...',
      excerpt: 'Keep your kids active and healthy this summer with outdoor sports and activities.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Summer', 'Sports'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'summer-activities-kids-active',
      readTime: 7,
      category: 'Sports',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    },
    {
      _id: '8',
      title: 'Weekend Family Getaways Near Dubai',
      content: 'Explore family-friendly destinations for weekend trips...',
      excerpt: 'Discover amazing weekend getaway destinations perfect for families near Dubai.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Travel', 'Family'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'weekend-family-getaways-dubai',
      readTime: 9,
      category: 'Travel',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    },
    {
      _id: '9',
      title: 'Arts & Crafts Ideas for Rainy Days',
      content: 'Creative indoor activities when you can\'t go outside...',
      excerpt: 'Keep kids entertained on rainy days with these fun arts and crafts projects.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Arts', 'Crafts'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'arts-crafts-rainy-days',
      readTime: 5,
      category: 'Arts',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    },
    {
      _id: '10',
      title: 'Healthy Lunch Box Ideas for School',
      content: 'Nutritious and delicious lunch ideas kids will love...',
      excerpt: 'Pack healthy and appealing school lunches with these creative ideas and recipes.',
      author: { name: `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`, email: 'team@kidrove.com' },
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Health', 'Nutrition'],
      featured: true,
      status: 'published' as const,
      featuredImage: '/assets/images/placeholder.jpg',
      slug: 'healthy-lunch-box-ideas',
      readTime: 6,
      category: 'Health',
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      seo: {}
    }
  ];

  // Use provided blogs or fallback data
  const blogs = propBlogs && propBlogs.length > 0 ? propBlogs : getFallbackBlogs();

  // Debug logs (gated)
  // Debug logs
  logger.debug('📝 [FEATURED BLOGS SECTION] Rendering:');
  logger.debug('   - Prop blogs received:', propBlogs?.length || 0);
  logger.debug('   - Using:', propBlogs && propBlogs.length > 0 ? 'API data' : 'Fallback data');
  logger.debug('   - Total blogs to display:', blogs.length);
  if (blogs.length > 0) {
    logger.debug('   - First blog:', {
      title: blogs[0].title,
      hasFeaturedImage: !!blogs[0].featuredImage,
      hasFeaturedImageAsset: !!(blogs[0] as any).featuredImageAsset
    });
  }

  const getImageUrl = (blog: Blog): string => {
    // Priority: populated asset > legacy string > placeholder
    if (blog.featuredImageAsset?.url) {
      return blog.featuredImageAsset.url;
    }
    if (blog.featuredImage && blog.featuredImage.trim()) {
      return blog.featuredImage;
    }
    return getPlaceholderUrl('blogThumbnail', blog.title);
  };

  if (loading) {
    return (
      <section className="w-full py-10 sm:py-16 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center mb-8">
            <div className="w-64 h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Large card skeleton */}
            <div className="lg:col-span-2 lg:row-span-2 bg-gray-200 rounded-xl animate-pulse min-h-[600px]"></div>
            {/* Small cards skeleton */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <div key={i} className="bg-gray-200 rounded-xl animate-pulse min-h-[280px]"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (blogs.length === 0) {
    return (
      <section className="w-full py-10 sm:py-16 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Our Latest Blogs</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Discover insights about kids activities, parenting advice, and event planning.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center px-6 py-3 rounded-lg text-white font-medium transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Explore Our Blog
              <FaArrowRight className="ml-2" size={14} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-10 sm:py-16 bg-white">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-900">Get Our Latest Blogs</h2>
          <Link
            to="/blog"
            className="text-sm md:text-base font-medium hover:underline transition-colors"
            style={{ color: 'var(--primary-color)' }}
          >
            See All
          </Link>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog, index) => {
            const isLargeCard = index === 0;

            return (
              <Link
                key={blog._id}
                to={`/blog/${blog.slug || blog._id}`}
                className={`
                  group relative rounded-xl overflow-hidden
                  ${isLargeCard ? 'lg:col-span-2 lg:row-span-2 min-h-[300px] sm:min-h-[600px]' : 'min-h-[200px] sm:min-h-[280px]'}
                  transition-transform duration-300 hover:scale-[1.02]
                `}
              >
                {/* Background Image */}
                <img
                  src={getImageUrl(blog)}
                  alt={getImageAlt(blog.featuredImageAsset, blog.title)}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  onError={(e) => handleImageError(e, 'blogThumbnail', blog.title)}
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Content Overlay */}
                <div className="relative z-10 p-6 h-full flex flex-col justify-end text-white">
                  {/* Badge */}
                  <span className="absolute top-4 left-4 px-3 py-1 bg-yellow-400 text-black text-xs md:text-sm font-semibold rounded">
                    {blog.author?.name || `${import.meta.env.VITE_APP_NAME || 'Kidrove'} Team`}
                  </span>

                  {/* Title - Larger for big card */}
                  <h3 className={`
                    font-bold mb-3 line-clamp-2
                    ${isLargeCard ? 'text-lg sm:text-2xl md:text-3xl lg:text-4xl' : 'text-base sm:text-xl lg:text-2xl'}
                  `}>
                    {blog.title}
                  </h3>

                  {/* Excerpt */}
                  <p className={`
                    text-gray-200 mb-4
                    ${isLargeCard ? 'text-sm md:text-base line-clamp-3 lg:line-clamp-4' : 'text-sm line-clamp-2'}
                  `}>
                    {blog.excerpt}
                  </p>

                  {/* Read More Indicator */}
                  <div className="flex items-center text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="mr-2">Read More</span>
                    <FaArrowRight size={12} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedBlogsSection;
