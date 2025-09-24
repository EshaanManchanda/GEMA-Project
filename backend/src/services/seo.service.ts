import Event from '../models/Event';
import { Blog } from '../models/Blog';
import Category from '../models/Category';
import Collection from '../models/Collection';

export interface SEOMetaData {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
  ogImage?: string;
  type?: string;
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export class SEOService {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.CLIENT_URL || 'https://gema-events.com') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Generate XML sitemap for all public content
   */
  async generateSitemap(): Promise<string> {
    try {
      const [events, blogs, categories, collections] = await Promise.all([
        Event.find({
          status: 'published',
          isActive: true,
          isApproved: true
        }).select('_id title updatedAt location.city').lean(),

        Blog.find({
          status: 'published'
        }).select('slug title updatedAt').lean(),

        Category.find({
          isActive: true
        }).select('_id name slug updatedAt').lean(),

        Collection.find({
          isActive: true
        }).select('_id name slug updatedAt').lean()
      ]);

      const urls: string[] = [];

      // Static pages
      const staticPages = [
        { url: '', priority: 1.0, changefreq: 'daily' },
        { url: '/events', priority: 0.9, changefreq: 'daily' },
        { url: '/categories', priority: 0.8, changefreq: 'weekly' },
        { url: '/collections', priority: 0.8, changefreq: 'weekly' },
        { url: '/vendors', priority: 0.7, changefreq: 'weekly' },
        { url: '/blog', priority: 0.8, changefreq: 'daily' },
        { url: '/about', priority: 0.5, changefreq: 'monthly' },
        { url: '/contact', priority: 0.5, changefreq: 'monthly' },
        { url: '/terms', priority: 0.3, changefreq: 'yearly' },
        { url: '/privacy', priority: 0.3, changefreq: 'yearly' },
        { url: '/faq', priority: 0.6, changefreq: 'monthly' }
      ];

      staticPages.forEach(page => {
        urls.push(this.generateSitemapUrl(`${this.baseUrl}${page.url}`, new Date(), page.changefreq, page.priority));
      });

      // Events
      events.forEach(event => {
        const url = `${this.baseUrl}/events/${event._id}`;
        const lastmod = event.updatedAt || new Date();
        urls.push(this.generateSitemapUrl(url, lastmod, 'weekly', 0.8));
      });

      // Blogs
      blogs.forEach(blog => {
        const url = `${this.baseUrl}/blog/${blog.slug}`;
        const lastmod = blog.updatedAt || new Date();
        urls.push(this.generateSitemapUrl(url, lastmod, 'monthly', 0.7));
      });

      // Categories
      categories.forEach(category => {
        const url = `${this.baseUrl}/categories/${category.slug || category._id}`;
        const lastmod = category.updatedAt || new Date();
        urls.push(this.generateSitemapUrl(url, lastmod, 'weekly', 0.6));
      });

      // Collections
      collections.forEach(collection => {
        const url = `${this.baseUrl}/collections/${collection.slug || collection._id}`;
        const lastmod = collection.updatedAt || new Date();
        urls.push(this.generateSitemapUrl(url, lastmod, 'weekly', 0.6));
      });

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

      return sitemap;
    } catch (error) {
      console.error('Error generating sitemap:', error);
      throw new Error('Failed to generate sitemap');
    }
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(): string {
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      // Block all crawlers in non-production environments
      return `User-agent: *
Disallow: /

# Development/Staging Environment - No Indexing Allowed`;
    }

    return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /vendor
Disallow: /employee
Disallow: /api
Disallow: /login
Disallow: /register
Disallow: /dashboard
Disallow: /profile
Disallow: /bookings
Disallow: /cart
Disallow: /checkout
Disallow: /payment

# Allow specific static assets
Allow: /assets/
Allow: /images/
Allow: /*.css
Allow: /*.js
Allow: /*.png
Allow: /*.jpg
Allow: /*.jpeg
Allow: /*.gif
Allow: /*.svg
Allow: /*.ico

# Sitemap location
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl-delay for being respectful to servers
Crawl-delay: 1`;
  }

  /**
   * Generate structured data for events
   */
  generateEventStructuredData(event: any): StructuredData {
    const baseData: StructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: event.description,
      startDate: event.dateSchedule?.[0]?.startDate || event.dateSchedule?.[0]?.date,
      endDate: event.dateSchedule?.[0]?.endDate,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: event.location?.address || 'Event Location',
        address: {
          '@type': 'PostalAddress',
          streetAddress: event.location?.address,
          addressLocality: event.location?.city,
          addressCountry: 'AE'
        }
      },
      offers: {
        '@type': 'Offer',
        price: event.price || event.dateSchedule?.[0]?.price || 0,
        priceCurrency: event.currency || 'AED',
        availability: 'https://schema.org/InStock',
        url: `${this.baseUrl}/events/${event._id}`
      },
      organizer: {
        '@type': 'Organization',
        name: 'Gema Events',
        url: this.baseUrl
      }
    };

    if (event.images && event.images.length > 0) {
      baseData.image = event.images;
    }

    if (event.ageRange) {
      baseData.audience = {
        '@type': 'PeopleAudience',
        suggestedMinAge: event.ageRange[0],
        suggestedMaxAge: event.ageRange[1]
      };
    }

    return baseData;
  }

  /**
   * Generate structured data for blogs
   */
  generateBlogStructuredData(blog: any, author?: any): StructuredData {
    const baseData: StructuredData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: blog.title,
      description: blog.excerpt,
      image: blog.featuredImage,
      datePublished: blog.publishedAt || blog.createdAt,
      dateModified: blog.updatedAt,
      author: {
        '@type': 'Person',
        name: blog.author?.name || author?.name || 'Gema Events Team',
        ...(blog.author?.avatar && { image: blog.author.avatar })
      },
      publisher: {
        '@type': 'Organization',
        name: 'Gema Events',
        logo: {
          '@type': 'ImageObject',
          url: `${this.baseUrl}/assets/images/logo.png`
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${this.baseUrl}/blog/${blog.slug}`
      },
      wordCount: blog.content ? blog.content.split(' ').length : undefined,
      timeRequired: `PT${blog.readTime || 5}M`,
      keywords: blog.tags?.join(', ') || blog.seo?.metaKeywords?.join(', ')
    };

    return baseData;
  }

  /**
   * Generate structured data for organization/business
   */
  generateOrganizationStructuredData(): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Gema Events',
      description: 'Discover and book amazing kids activities, events, and educational programs in the UAE',
      url: this.baseUrl,
      logo: `${this.baseUrl}/assets/images/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'info@gema-events.com'
      },
      sameAs: [
        'https://www.facebook.com/gemaevents',
        'https://www.instagram.com/gemaevents',
        'https://www.twitter.com/gemaevents'
      ],
      areaServed: {
        '@type': 'Country',
        name: 'United Arab Emirates'
      },
      serviceType: [
        'Event Management',
        'Kids Activities',
        'Educational Programs',
        'Family Entertainment'
      ]
    };
  }

  /**
   * Generate SEO meta data for different page types
   */
  generateSEOMetaData(type: string, data: any): SEOMetaData {
    const baseKeywords = ['kids activities', 'events', 'UAE', 'Dubai', 'family fun', 'children', 'booking'];

    switch (type) {
      case 'event':
        return {
          title: `${data.title} | Kids Events in ${data.location?.city || 'UAE'} | Gema Events`,
          description: data.description.length > 160
            ? `${data.description.substring(0, 157)}...`
            : data.description,
          keywords: [...baseKeywords, data.category, data.location?.city, ...data.tags].filter(Boolean),
          canonicalUrl: `${this.baseUrl}/events/${data._id}`,
          ogImage: data.images?.[0],
          type: 'article'
        };

      case 'blog':
        return {
          title: data.seo?.metaTitle || `${data.title} | Gema Events Blog`,
          description: data.seo?.metaDescription || data.excerpt,
          keywords: data.seo?.metaKeywords || [...baseKeywords, ...data.tags].filter(Boolean),
          canonicalUrl: data.seo?.canonicalUrl || `${this.baseUrl}/blog/${data.slug}`,
          ogImage: data.featuredImage,
          type: 'article'
        };

      case 'category':
        return {
          title: `${data.name} Events for Kids | Gema Events`,
          description: `Discover amazing ${data.name.toLowerCase()} activities and events for children in the UAE. Book now for unforgettable experiences.`,
          keywords: [...baseKeywords, data.name.toLowerCase(), 'activities'],
          canonicalUrl: `${this.baseUrl}/categories/${data.slug || data._id}`,
          type: 'website'
        };

      case 'homepage':
        return {
          title: 'Gema Events - Discover Amazing Kids Activities & Events in UAE',
          description: 'Find and book the best kids activities, educational programs, and family events in the UAE. Safe, fun, and memorable experiences for children of all ages.',
          keywords: [...baseKeywords, 'education', 'entertainment', 'family activities'],
          canonicalUrl: this.baseUrl,
          type: 'website'
        };

      default:
        return {
          title: 'Gema Events - Kids Activities & Family Entertainment',
          description: 'Discover amazing kids activities and family events in the UAE',
          keywords: baseKeywords,
          canonicalUrl: this.baseUrl,
          type: 'website'
        };
    }
  }

  /**
   * Helper method to generate individual sitemap URL entry
   */
  private generateSitemapUrl(
    url: string,
    lastmod: Date,
    changefreq: string = 'weekly',
    priority: number = 0.5
  ): string {
    const formattedDate = lastmod.toISOString().split('T')[0];
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }

  /**
   * Generate breadcrumb structured data
   */
  generateBreadcrumbStructuredData(breadcrumbs: Array<{ name: string; url: string }>): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: `${this.baseUrl}${crumb.url}`
      }))
    };
  }

  /**
   * Validate and clean SEO data
   */
  validateSEOData(seoData: Partial<SEOMetaData>): SEOMetaData {
    return {
      title: this.truncateText(seoData.title || 'Gema Events', 60),
      description: this.truncateText(seoData.description || '', 160),
      keywords: (seoData.keywords || []).slice(0, 10), // Limit to 10 keywords
      canonicalUrl: seoData.canonicalUrl,
      ogImage: seoData.ogImage,
      type: seoData.type || 'website'
    };
  }

  /**
   * Helper method to truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

export const seoService = new SEOService();