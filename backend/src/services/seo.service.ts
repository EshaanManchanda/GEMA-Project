import Event from '../models/Event';
import { Blog } from '../models/Blog';
import Category from '../models/Category';
import Collection from '../models/Collection';
import { SEO_CONFIG } from '../config/env';
import { getBrandConfig } from '../utils/brandConfig';

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

  constructor(baseUrl: string = process.env.APP_URL || 'https://kidrove.com') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Generate sitemap index for multi-region setup
   */
  async generateSitemapIndex(): Promise<string> {
    const domains = [
      { domain: 'kidrove.com', region: 'global' },
      { domain: 'kidrove.in', region: 'in' },
      { domain: 'kidrove.ae', region: 'ae' }
    ];

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const { domain } of domains) {
      const tld = domain.split('.')[1];
      sitemap += `  <sitemap>\n`;
      sitemap += `    <loc>https://${domain}/sitemap-${tld}.xml</loc>\n`;
      sitemap += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      sitemap += `  </sitemap>\n`;
    }

    sitemap += '</sitemapindex>';
    return sitemap;
  }

  /**
   * Generate XML sitemap for all public content
   * @param domain - The domain to generate sitemap for (e.g., 'kidrove.com', 'kidrove.in', 'kidrove.ae')
   */
  async generateSitemap(domain?: string): Promise<string> {
    const baseUrl = domain ? `https://${domain}` : this.baseUrl;
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
        urls.push(this.generateSitemapUrl(`${baseUrl}${page.url}`, new Date(), page.changefreq, page.priority));
      });

      // Events
      events.forEach(event => {
        const url = `${baseUrl}/events/${event._id}`;
        const lastmod = event.updatedAt || new Date();
        urls.push(this.generateSitemapUrl(url, lastmod, 'weekly', 0.8));
      });

      // Blogs
      blogs.forEach(blog => {
        const url = `${baseUrl}/blog/${blog.slug}`;
        const lastmod = blog.updatedAt || new Date();
        urls.push(this.generateSitemapUrl(url, lastmod, 'monthly', 0.7));
      });

      // Categories
      categories.forEach(category => {
        const url = `${baseUrl}/categories/${category.slug || category._id}`;
        const lastmod = category.updatedAt || new Date();
        urls.push(this.generateSitemapUrl(url, lastmod, 'weekly', 0.6));
      });

      // Collections
      collections.forEach(collection => {
        const url = `${baseUrl}/collections/${collection.slug || collection._id}`;
        const lastmod = collection.updatedAt || new Date();
        urls.push(this.generateSitemapUrl(url, lastmod, 'weekly', 0.6));
      });

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
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
   * @param domain - The domain to generate robots.txt for (e.g., 'kidrove.com', 'kidrove.in', 'kidrove.ae')
   */
  generateRobotsTxt(domain?: string, forceProduction = false): string {
    const baseUrl = domain ? `https://${domain}` : this.baseUrl;
    const isProduction = forceProduction || process.env.NODE_ENV === 'production';

    // Debug logging (TEMPORARY: Remove after issue is resolved)
    console.log('[robots.txt] NODE_ENV:', process.env.NODE_ENV, 'isProduction:', isProduction, 'domain:', domain, 'forceProduction:', forceProduction);

    // Check if domain is a production domain
    const isProductionDomain = domain && (
      domain.includes('kidrove.com') ||
      domain.includes('kidrove.in') ||
      domain.includes('kidrove.ae') ||
      domain.includes('gema-project.onrender.com')
    );

    if (!isProduction && !isProductionDomain) {
      // Block all crawlers in non-production environments
      console.log('[robots.txt] Blocking all crawlers - non-production environment');
      return `User-agent: *
Disallow: /

# Development/Staging Environment - No Indexing Allowed`;
    }

    console.log('[robots.txt] Allowing crawlers - production environment or production domain');

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
Sitemap: ${baseUrl}/sitemap.xml`;
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
        name: SEO_CONFIG.siteName,
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
        name: blog.author?.name || author?.name || `${SEO_CONFIG.siteName} Team`,
        ...(blog.author?.avatar && { image: blog.author.avatar })
      },
      publisher: {
        '@type': 'Organization',
        name: SEO_CONFIG.siteName,
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
    const brand = getBrandConfig();
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: brand.appNameFull,
      alternateName: ['Kidrove UAE', 'Kidrove India'],
      description: 'Discover and book amazing kids activities, events, and educational programs in the UAE',
      url: this.baseUrl,
      logo: `${this.baseUrl}/assets/images/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: brand.contactEmail
      },
      sameAs: [
        'https://kidrove.com',
        'https://kidrove.in',
        'https://kidrove.ae',
        'https://www.facebook.com/kidrove',
        'https://www.instagram.com/kidrove',
        'https://www.twitter.com/kidrove'
      ],
      areaServed: [
        {
          '@type': 'Country',
          name: 'United Arab Emirates'
        },
        {
          '@type': 'Country',
          name: 'India'
        }
      ],
      makesOffer: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Event Management',
            serviceType: 'Event Planning'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Kids Activities',
            serviceType: 'Children\'s Entertainment'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Educational Programs',
            serviceType: 'Education'
          }
        }
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
          title: `${data.title} | Kids Events in ${data.location?.city || 'UAE'} | ${SEO_CONFIG.siteName}`,
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
          title: data.seo?.metaTitle || `${data.title} | ${SEO_CONFIG.siteName} Blog`,
          description: data.seo?.metaDescription || data.excerpt,
          keywords: data.seo?.metaKeywords || [...baseKeywords, ...data.tags].filter(Boolean),
          canonicalUrl: data.seo?.canonicalUrl || `${this.baseUrl}/blog/${data.slug}`,
          ogImage: data.featuredImage,
          type: 'article'
        };

      case 'category':
        return {
          title: `${data.name} Events for Kids | ${SEO_CONFIG.siteName}`,
          description: `Discover amazing ${data.name.toLowerCase()} activities and events for children in the UAE. Book now for unforgettable experiences.`,
          keywords: [...baseKeywords, data.name.toLowerCase(), 'activities'],
          canonicalUrl: `${this.baseUrl}/categories/${data.slug || data._id}`,
          type: 'website'
        };

      case 'homepage':
        return {
          title: `${SEO_CONFIG.siteName} - Discover Amazing Kids Activities & Events in UAE`,
          description: 'Find and book the best kids activities, educational programs, and family events in the UAE. Safe, fun, and memorable experiences for children of all ages.',
          keywords: [...baseKeywords, 'education', 'entertainment', 'family activities'],
          canonicalUrl: this.baseUrl,
          type: 'website'
        };

      default:
        return {
          title: `${SEO_CONFIG.siteName} - Kids Activities & Family Entertainment`,
          description: 'Discover amazing kids activities and family events in the UAE',
          keywords: baseKeywords,
          canonicalUrl: this.baseUrl,
          type: 'website'
        };
    }
  }

  /**
   * Helper method to generate individual sitemap URL entry with hreflang alternates
   */
  private generateSitemapUrl(
    url: string,
    lastmod: Date,
    changefreq: string = 'weekly',
    priority: number = 0.5
  ): string {
    const formattedDate = lastmod.toISOString().split('T')[0];

    // Extract path from URL
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Generate hreflang alternates for multi-region
    const hreflangLinks = [
      `    <xhtml:link rel="alternate" hreflang="en" href="https://kidrove.com${path}" />`,
      `    <xhtml:link rel="alternate" hreflang="en-IN" href="https://kidrove.in${path}" />`,
      `    <xhtml:link rel="alternate" hreflang="en-AE" href="https://kidrove.ae${path}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="https://kidrove.com${path}" />`
    ].join('\n');

    return `  <url>
    <loc>${url}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflangLinks}
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
      title: this.truncateText(seoData.title || SEO_CONFIG.siteName, 60),
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

  /**
   * Generate WebSite structured data with SearchAction
   */
  generateWebSiteStructuredData(): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SEO_CONFIG.siteName,
      url: this.baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.baseUrl}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      },
      inLanguage: ['en', 'ar'],
      copyrightYear: 2017,
      publisher: {
        '@type': 'Organization',
        name: SEO_CONFIG.siteName
      }
    };
  }

  /**
   * Generate enhanced Organization structured data with stats
   */
  generateEnhancedOrganizationStructuredData(stats?: {
    averageRating?: number;
    totalReviews?: number;
    totalEvents?: number;
    totalVendors?: number;
  }): StructuredData {
    const brand = getBrandConfig();
    const baseData: StructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: brand.appNameFull,
      alternateName: SEO_CONFIG.siteName,
      description: 'UAE\'s leading platform for kids activities and family events',
      url: this.baseUrl,
      logo: `${this.baseUrl}/assets/images/logo.png`,
      foundingDate: '2017-01-01',
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        value: 75
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: brand.contactEmail,
        telephone: '+971-4-123-4567',
        areaServed: 'AE',
        availableLanguage: ['English', 'Arabic']
      },
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'AE',
        addressRegion: 'Dubai',
        addressLocality: 'Dubai'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 25.2048,
        longitude: 55.2708
      },
      sameAs: [
        'https://www.facebook.com/kidrove',
        'https://www.instagram.com/kidrove',
        'https://www.twitter.com/kidrove',
        'https://www.youtube.com/kidrove',
        'https://www.linkedin.com/company/kidrove'
      ],
      areaServed: {
        '@type': 'Country',
        name: 'United Arab Emirates'
      },
      knowsAbout: [
        'Kids Activities',
        'Event Management',
        'Family Entertainment',
        'Educational Programs',
        'Birthday Parties',
        'Summer Camps',
        'After School Activities',
        'Weekend Activities',
        'Indoor Play',
        'Outdoor Adventures'
      ],
      awards: [
        'Best Family Platform UAE 2023',
        'Top Rated Kids Activities App 2024',
        'UAE Family Choice Award 2023'
      ],
      slogan: 'Discover Amazing Kids Activities & Events in UAE'
    };

    // Add aggregate rating if stats are provided
    if (stats?.averageRating && stats?.totalReviews) {
      baseData.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: stats.averageRating,
        reviewCount: stats.totalReviews,
        bestRating: 5,
        worstRating: 1
      };
    }

    return baseData;
  }

  /**
   * Generate FAQPage structured data
   */
  generateHomepageFAQStructuredData(faqItems: Array<{
    question: string;
    answer: string;
  }>): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };
  }

  /**
   * Generate ItemList structured data for features
   */
  generateFeatureListStructuredData(features: Array<{
    title: string;
    description: string;
  }>): StructuredData {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Why Choose ' + SEO_CONFIG.siteName,
      description: 'Top reasons to use ' + SEO_CONFIG.siteName + ' for kids activities',
      itemListElement: features.map((feature, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: feature.title,
        description: feature.description
      }))
    };
  }
}

export const seoService = new SEOService();