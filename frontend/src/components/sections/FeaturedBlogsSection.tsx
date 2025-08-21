import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaClock, FaUser, FaArrowRight } from 'react-icons/fa';
import blogAPI from '../../services/api/blogAPI';
import { Blog } from '../../types/blog';

const FeaturedBlogsSection: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedBlogs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await blogAPI.getFeaturedBlogs(3);
        if (response.success) {
          setBlogs(response.data.blogs || []);
        } else {
          // Fallback to recent blogs if no featured blogs
          const recentResponse = await blogAPI.getRecentBlogs(3);
          if (recentResponse.success) {
            setBlogs(recentResponse.data.blogs || []);
          }
        }
      } catch (err: any) {
        console.error('Error fetching featured blogs:', err);
        setError('Unable to load blog articles');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedBlogs();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryName = (category: any): string => {
    return typeof category === 'object' ? category.name : category;
  };

  const getCategoryColor = (category: any): string => {
    return typeof category === 'object' ? category.color : '#3B82F6';
  };

  if (loading) {
    return (
      <section className="w-full py-20 bg-white">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="w-32 h-6 bg-gray-200 rounded mx-auto mb-4 animate-pulse"></div>
            <div className="w-64 h-8 bg-gray-200 rounded mx-auto mb-4 animate-pulse"></div>
            <div className="w-96 h-4 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="w-20 h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="w-full h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="w-3/4 h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="w-2/3 h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="w-16 h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="w-12 h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || blogs.length === 0) {
    return (
      <section className="w-full py-20 bg-white">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="text-center">
            <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
              <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>Our Blog</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Latest Articles & Tips</h2>
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
    <section className="w-full py-20 bg-white">
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
            <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>Our Blog</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Latest Articles & Tips</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover insights about kids activities, parenting advice, and event planning tips from our experts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {blogs.map((blog) => (
            <Link
              key={blog._id}
              to={`/blog/${blog.slug}`}
              className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="h-48 overflow-hidden">
                <img 
                  src={blog.featuredImage || '/assets/images/placeholder.jpg'} 
                  alt={blog.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/assets/images/placeholder.jpg';
                  }}
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span 
                    className="px-2 py-1 text-xs font-medium text-white rounded-full"
                    style={{ backgroundColor: getCategoryColor(blog.category) }}
                  >
                    {getCategoryName(blog.category)}
                  </span>
                  {blog.featured && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Featured
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {blog.title}
                </h3>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {blog.excerpt}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <FaUser size={12} />
                    <span>{blog.author.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <FaClock size={12} />
                      <span>{blog.readTime} min read</span>
                    </div>
                    <span>{blog.publishedAt ? formatDate(blog.publishedAt) : formatDate(blog.createdAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/blog"
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            View All Articles
            <FaArrowRight className="ml-2" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedBlogsSection;