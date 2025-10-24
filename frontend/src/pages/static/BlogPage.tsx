import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import blogAPI from '../../services/api/blogAPI';
import { Blog, BlogCategory, BlogsResponse, BlogCategoriesResponse } from '../../types/blog';
import SEO from '../../components/common/SEO';


const BlogPage: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchData = useCallback(async (page: number = 1, category?: string, isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
      }
      setError(null);

      const [blogsResponse, categoriesResponse] = await Promise.all([
        blogAPI.getAllBlogs({
          page,
          limit: 12,
          category: category && category !== 'All' ? category : undefined,
          sortBy: 'publishedAt',
          sortOrder: 'desc'
        }),
        page === 1 ? blogAPI.getBlogCategories() : Promise.resolve({ data: { categories } })
      ]);
      console.log('blogsResponse', blogsResponse);
      console.log('categoriesResponse', categoriesResponse);
      if (blogsResponse.blogs) {
        setBlogs(blogsResponse.blogs || []);
        if (blogsResponse.pagination) {
          setCurrentPage(blogsResponse.pagination.currentPage);
          setTotalPages(blogsResponse.pagination.totalPages);
          setHasMore(blogsResponse.pagination.hasNextPage);
        }
      }

      if (page === 1 && categoriesResponse.categories) {
        setCategories(categoriesResponse.categories || []);
      }
    } catch (err: any) {
      console.error('Error fetching blog data:', err);
      setError(err?.response?.data?.message || 'Failed to load blog posts');
      if (blogs.length === 0) {
        // Fallback to empty state if no data loaded
        setBlogs([]);
      }
    } finally {
      setLoading(false);
    }
  }, [blogs.length, categories]);

  useEffect(() => {
    fetchData(1, selectedCategory);
  }, [selectedCategory]);

  const handleCategoryChange = (category: string) => {
    if (category !== selectedCategory) {
      setSelectedCategory(category);
      setCurrentPage(1);
    }
  };

  const handlePageChange = (page: number) => {
    if (page !== currentPage && page > 0 && page <= totalPages) {
      setCurrentPage(page);
      fetchData(page, selectedCategory);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryName = (categoryId: string | BlogCategory): string => {
    if (typeof categoryId === 'object') {
      return categoryId.name;
    }
    const category = categories.find(cat => cat._id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const allCategories = ['All', ...categories.map(cat => cat.name)];

  // Generate SEO data based on current state
  const generateSEOData = () => {
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://gema-events.com';
    const isFiltered = selectedCategory !== 'All';
    const categoryName = isFiltered ? selectedCategory : '';

    const title = isFiltered
      ? `${categoryName} Articles | Kids Activities Blog | Gema Events`
      : 'Kids Activities Blog - Tips, Ideas & Event Guides | Gema Events';

    const description = isFiltered
      ? `Discover ${categoryName.toLowerCase()} articles about kids activities, events, and family fun in the UAE. Expert tips and guides for parents.`
      : 'Explore our comprehensive blog with expert tips, activity ideas, and guides for kids events and family activities in the UAE. Stay informed with the latest parenting insights.';

    const keywords = isFiltered
      ? ['kids activities blog', categoryName.toLowerCase(), 'UAE family activities', 'parenting tips', 'children events']
      : ['kids activities blog', 'parenting tips', 'family activities', 'UAE events', 'children activities', 'kids events'];

    const canonicalUrl = isFiltered
      ? `${baseUrl}/blog?category=${encodeURIComponent(categoryName)}`
      : `${baseUrl}/blog`;

    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' }
    ];

    if (isFiltered) {
      breadcrumbs.push({ name: categoryName, url: `/blog?category=${encodeURIComponent(categoryName)}` });
    }

    // Generate structured data for blog listing
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Gema Events Blog',
      description: 'Expert tips and guides for kids activities, events, and family fun',
      url: `${baseUrl}/blog`,
      publisher: {
        '@type': 'Organization',
        name: 'Gema Events',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/assets/images/logo.png`
        }
      },
      ...(blogs.length > 0 && {
        blogPost: blogs.slice(0, 5).map(blog => ({
          '@type': 'BlogPosting',
          headline: blog.title,
          description: blog.excerpt,
          url: `${baseUrl}/blog/${blog.slug}`,
          datePublished: blog.publishedAt || blog.createdAt,
          dateModified: blog.updatedAt,
          author: {
            '@type': 'Person',
            name: blog.author?.name || 'Gema Events Team'
          },
          image: blog.featuredImage,
          wordCount: blog.content ? blog.content.split(' ').length : undefined
        }))
      })
    };

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      breadcrumbs,
      structuredData
    };
  };

  const seoData = generateSEOData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-8 px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto"
    >
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonicalUrl={seoData.canonicalUrl}
        breadcrumbs={seoData.breadcrumbs}
        structuredData={seoData.structuredData}
      />

      {/* Back button */}
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors">
          <FaArrowLeft className="mr-2" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
          Our Blog
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Discover the latest articles, tips, and insights about kids activities, events, and parenting advice.
        </p>
      </div>

      {/* Categories Filter */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        {allCategories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === selectedCategory 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            style={category === selectedCategory ? { backgroundColor: 'var(--primary-color)' } : {}}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-full bg-gray-200 rounded mb-1"></div>
                <div className="h-4 w-full bg-gray-200 rounded mb-1"></div>
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full mr-2"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <FaExclamationTriangle className="mx-auto text-5xl text-red-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-gray-900">Unable to load blog posts</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchData(currentPage, selectedCategory, true)}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Try Again
          </button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2 text-gray-900">
            {selectedCategory === 'All' ? 'No blog posts available' : `No posts found in ${selectedCategory}`}
          </h3>
          <p className="text-gray-600">Check back later for new content!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog) => (
            <div key={blog._id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="h-48 overflow-hidden">
                <img 
                  src={blog.featuredImage || '/assets/images/placeholder.jpg'} 
                  alt={blog.title} 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/assets/images/placeholder.jpg';
                  }}
                />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                  <span>{getCategoryName(blog.category)}</span>
                  <span>{blog.readTime} min read</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 hover:text-primary-600 transition-colors">
                  <Link to={`/blog/${blog.slug}`} style={{ color: 'var(--primary-color)' }}>
                    {blog.title}
                  </Link>
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{blog.excerpt}</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex items-center justify-center">
                      {blog.author.avatar ? (
                        <img 
                          src={blog.author.avatar} 
                          alt={blog.author.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-gray-600">
                          {blog.author.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{blog.author.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {blog.publishedAt ? formatDate(blog.publishedAt) : formatDate(blog.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-12 flex justify-center">
          <nav className="inline-flex rounded-md shadow">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-4 py-2 border-t border-b border-gray-300 text-sm font-medium ${
                    pageNum === currentPage
                      ? 'bg-primary-50 text-primary-600 border-primary-500'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                  style={pageNum === currentPage ? { color: 'var(--primary-color)', borderColor: 'var(--primary-color)' } : {}}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                ...
              </span>
            )}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </nav>
        </div>
      )}

      {/* Newsletter Signup */}
      {!loading && blogs.length > 0 && (
        <div className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            Subscribe to Our Newsletter
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Stay updated with our latest articles, tips, and upcoming events for kids and families.
          </p>
          <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-2">
            <input 
              type="email" 
              placeholder="Your email address" 
              className="flex-grow px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Email address for newsletter"
            />
            <button 
              className="px-6 py-2 rounded-md text-white font-medium transition-colors hover:opacity-90" 
              style={{ backgroundColor: 'var(--accent-color)' }}
              onClick={() => {
                // TODO: Implement newsletter signup
                alert('Newsletter signup coming soon!');
              }}
            >
              Subscribe
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BlogPage;