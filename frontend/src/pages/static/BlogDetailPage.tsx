import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaCalendar,
  FaClock,
  FaUser,
  FaTag,
  FaHeart,
  FaShare,
  FaSpinner,
  FaExclamationTriangle,
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaWhatsapp
} from 'react-icons/fa';
import blogAPI from '../../services/api/blogAPI';
import { Blog, SingleBlogResponse } from '../../types/blog';
import { getCurrentPageUrl } from '../../utils/urlHelper';
import CommentSection from '../../components/blog/CommentSection';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!slug) {
      navigate('/blog');
      return;
    }

    fetchBlogData(slug);
  }, [slug, navigate]);

  const fetchBlogData = async (blogSlug: string) => {
    try {
      setLoading(true);
      setError(null);

      const [blogResponse, relatedResponse] = await Promise.all([
        blogAPI.getBlogBySlug(blogSlug),
        blogAPI.getRelatedBlogs(blogSlug, 4)
      ]);

      if (blogResponse.success && blogResponse.data.blog) {
        setBlog(blogResponse.data.blog);
        setLikeCount(blogResponse.data.blog.likeCount);
      } else {
        throw new Error('Blog not found');
      }

      if (relatedResponse.success) {
        setRelatedBlogs(relatedResponse.data.blogs || []);
      }
    } catch (err: any) {
      console.error('Error fetching blog:', err);
      if (err.response?.status === 404) {
        setError('Blog post not found');
      } else {
        setError(err?.response?.data?.message || 'Failed to load blog post');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!blog || liked) return;

    try {
      const response = await blogAPI.likeBlog(blog.slug);
      if (response.success) {
        setLiked(true);
        setLikeCount(response.data.likeCount);
      }
    } catch (err) {
      console.error('Error liking blog:', err);
    }
  };

  const handleShare = async (platform?: string) => {
    if (!blog) return;

    try {
      await blogAPI.shareBlog(blog.slug);
    } catch (err) {
      console.error('Error recording share:', err);
    }

    const url = getCurrentPageUrl();
    const title = blog.title;
    const text = blog.excerpt;

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(title + ' - ' + url)}`, '_blank');
        break;
      default:
        if (navigator.share) {
          navigator.share({ title, text, url });
        } else {
          navigator.clipboard.writeText(url);
          alert('Link copied to clipboard!');
        }
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

  const getCategoryName = (category: any): string => {
    return typeof category === 'object' ? category.name : category;
  };

  const getCategoryColor = (category: any): string => {
    return typeof category === 'object' ? category.color : '#3B82F6';
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
      >
        <div className="animate-pulse">
          <div className="mb-8">
            <div className="w-32 h-6 bg-gray-200 rounded mb-4"></div>
          </div>
          <div className="w-3/4 h-10 bg-gray-200 rounded mb-6"></div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="w-full h-64 bg-gray-200 rounded mb-8"></div>
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-full h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
      >
        <div className="text-center py-12">
          <FaExclamationTriangle className="mx-auto text-5xl text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-900">{error}</h2>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
          <div className="space-x-4">
            <Link
              to="/blog"
              className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <FaArrowLeft className="mr-2" />
              Back to Blog
            </Link>
            <button
              onClick={() => fetchBlogData(slug!)}
              className="inline-flex items-center px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!blog) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
    >
      <Helmet>
        <title>{blog.seo?.metaTitle || blog.title} | Kidzapp Blog</title>
        <meta name="description" content={blog.seo?.metaDescription || blog.excerpt} />
        <meta name="keywords" content={blog.seo?.metaKeywords?.join(', ') || blog.tags.join(', ')} />
        {blog.seo?.canonicalUrl && <link rel="canonical" href={blog.seo.canonicalUrl} />}
        
        {/* Open Graph tags */}
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={blog.excerpt} />
        <meta property="og:image" content={blog.featuredImage} />
        <meta property="og:url" content={getCurrentPageUrl()} />
        <meta property="og:type" content="article" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blog.title} />
        <meta name="twitter:description" content={blog.excerpt} />
        <meta name="twitter:image" content={blog.featuredImage} />
      </Helmet>

      {/* Back navigation */}
      <div className="mb-8">
        <Link 
          to="/blog" 
          className="inline-flex items-center text-gray-600 hover:text-primary-600 transition-colors"
        >
          <FaArrowLeft className="mr-2" />
          <span>Back to Blog</span>
        </Link>
      </div>

      {/* Blog header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span 
            className="px-3 py-1 text-sm font-medium text-white rounded-full"
            style={{ backgroundColor: getCategoryColor(blog.category) }}
          >
            {getCategoryName(blog.category)}
          </span>
          {blog.featured && (
            <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
              Featured
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
          {blog.title}
        </h1>

        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {blog.author.avatar ? (
                <img 
                  src={blog.author.avatar} 
                  alt={blog.author.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-600">
                    {blog.author.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{blog.author.name}</p>
                <div className="flex items-center text-sm text-gray-500 gap-4">
                  <span className="flex items-center gap-1">
                    <FaCalendar className="text-xs" />
                    {blog.publishedAt ? formatDate(blog.publishedAt) : formatDate(blog.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaClock className="text-xs" />
                    {blog.readTime} min read
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                liked 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FaHeart className={liked ? 'text-red-500' : ''} />
              <span>{likeCount}</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleShare()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FaShare />
                <span>Share</span>
              </button>
              
              {/* Social sharing buttons */}
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => handleShare('facebook')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  aria-label="Share on Facebook"
                >
                  <FaFacebook />
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="p-2 text-sky-500 hover:bg-sky-50 rounded transition-colors"
                  aria-label="Share on Twitter"
                >
                  <FaTwitter />
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="p-2 text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  aria-label="Share on LinkedIn"
                >
                  <FaLinkedin />
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                  aria-label="Share on WhatsApp"
                >
                  <FaWhatsapp />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <FaTag className="text-gray-400 text-sm" />
            {blog.tags.map((tag, index) => (
              <span 
                key={index}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Featured image */}
      <div className="mb-8">
        <img 
          src={blog.featuredImage} 
          alt={blog.title}
          className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/assets/images/placeholder.jpg';
          }}
        />
      </div>

      {/* Blog excerpt */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border-l-4 border-primary-500">
        <p className="text-lg text-gray-700 leading-relaxed italic">
          {blog.excerpt}
        </p>
      </div>

      {/* Blog content */}
      <article className="prose prose-lg max-w-none mb-12">
        <div 
          className="blog-content"
          dangerouslySetInnerHTML={{ 
            __html: blog.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
          }}
        />
      </article>

      {/* Author bio */}
      {blog.author.bio && (
        <div className="mb-12 p-6 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-4">
            {blog.author.avatar ? (
              <img 
                src={blog.author.avatar} 
                alt={blog.author.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xl font-bold text-primary-600">
                  {blog.author.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                About {blog.author.name}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {blog.author.bio}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Related blogs */}
      {relatedBlogs.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedBlogs.map((relatedBlog) => (
              <Link
                key={relatedBlog._id}
                to={`/blog/${relatedBlog.slug}`}
                className="group"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-40 overflow-hidden">
                    <img
                      src={relatedBlog.featuredImage}
                      alt={relatedBlog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {relatedBlog.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {relatedBlog.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{relatedBlog.author.name}</span>
                      <span>{relatedBlog.readTime} min read</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Comments Section */}
      <CommentSection
        blogPostId={blog._id}
        currentUserId={user?._id}
        isAuthenticated={isAuthenticated}
      />

      {/* Back to blog button */}
      <div className="text-center">
        <Link
          to="/blog"
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <FaArrowLeft className="mr-2" />
          Back to All Articles
        </Link>
      </div>
    </motion.div>
  );
};

export default BlogDetailPage;