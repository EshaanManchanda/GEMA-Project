import eventsAPI from './api/eventsAPI';
import blogAPI from './api/blogAPI';
import collectionsAPI from './api/collectionsAPI';
import vendorsAPI from './api/vendorsAPI';

interface ImageSitemapEntry {
  loc: string;
  images: {
    loc: string;
    caption?: string;
    title?: string;
    license?: string;
  }[];
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: {
    loc: string;
    caption?: string;
    title?: string;
    license?: string;
  }[];
}

class SEOService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_APP_URL || 'https://gema-events.com';
  }

  /**
   * Generate comprehensive sitemap including images
   */
  async generateSitemap(): Promise<string> {
    const entries: SitemapEntry[] = [];

    // Static pages
    entries.push(...this.getStaticPageEntries());

    // Dynamic content
    const [events, blogs, collections, vendors] = await Promise.allSettled([
      this.getEventEntries(),
      this.getBlogEntries(),
      this.getCollectionEntries(),
      this.getVendorEntries()
    ]);

    if (events.status === 'fulfilled') entries.push(...events.value);
    if (blogs.status === 'fulfilled') entries.push(...blogs.value);
    if (collections.status === 'fulfilled') entries.push(...collections.value);
    if (vendors.status === 'fulfilled') entries.push(...vendors.value);

    return this.generateSitemapXML(entries);
  }

  /**
   * Generate image-specific sitemap
   */
  async generateImageSitemap(): Promise<string> {
    const entries: ImageSitemapEntry[] = [];

    try {
      // Get entries with images
      const [events, blogs, collections, vendors] = await Promise.allSettled([
        this.getEventImageEntries(),
        this.getBlogImageEntries(),
        this.getCollectionImageEntries(),
        this.getVendorImageEntries()
      ]);

      if (events.status === 'fulfilled') entries.push(...events.value);
      if (blogs.status === 'fulfilled') entries.push(...blogs.value);
      if (collections.status === 'fulfilled') entries.push(...collections.value);
      if (vendors.status === 'fulfilled') entries.push(...vendors.value);

      return this.generateImageSitemapXML(entries);
    } catch (error) {
      console.error('Error generating image sitemap:', error);
      throw error;
    }
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(): string {
    const sitemapUrl = `${this.baseUrl}/sitemap.xml`;
    const imageSitemapUrl = `${this.baseUrl}/image-sitemap.xml`;

    return `User-agent: *
Allow: /

# Disallow admin, checkout, and private pages
Disallow: /admin/
Disallow: /checkout/
Disallow: /booking/
Disallow: /cart/
Disallow: /payment/
Disallow: /dashboard/
Disallow: /vendor/
Disallow: /employee/
Disallow: /analytics/
Disallow: /upload/
Disallow: /error/

# Allow important content
Allow: /events/
Allow: /blog/
Allow: /collections/
Allow: /vendors/
Allow: /categories/

# Crawl delay
Crawl-delay: 1

# Sitemaps
Sitemap: ${sitemapUrl}
Sitemap: ${imageSitemapUrl}

# Popular crawlers
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /
`;
  }

  private getStaticPageEntries(): SitemapEntry[] {
    const staticPages = [
      { path: '/', priority: 1.0, changefreq: 'weekly' as const },
      { path: '/events', priority: 0.9, changefreq: 'daily' as const },
      { path: '/blog', priority: 0.8, changefreq: 'daily' as const },
      { path: '/collections', priority: 0.8, changefreq: 'weekly' as const },
      { path: '/vendors', priority: 0.7, changefreq: 'weekly' as const },
      { path: '/categories', priority: 0.7, changefreq: 'weekly' as const },
      { path: '/about', priority: 0.5, changefreq: 'monthly' as const },
      { path: '/contact', priority: 0.5, changefreq: 'monthly' as const },
      { path: '/faq', priority: 0.5, changefreq: 'monthly' as const },
      { path: '/terms', priority: 0.3, changefreq: 'yearly' as const },
      { path: '/privacy', priority: 0.3, changefreq: 'yearly' as const },
      { path: '/help', priority: 0.4, changefreq: 'monthly' as const }
    ];

    return staticPages.map(page => ({
      loc: `${this.baseUrl}${page.path}`,
      priority: page.priority,
      changefreq: page.changefreq,
      lastmod: new Date().toISOString().split('T')[0]
    }));
  }

  private async getEventEntries(): Promise<SitemapEntry[]> {
    try {
      const response = await eventsAPI.getAllEvents({ limit: 1000 });
      if (!response.events) return [];

      return response.events.map(event => ({
        loc: `${this.baseUrl}/events/${event._id}`,
        lastmod: event.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        changefreq: 'weekly' as const,
        priority: 0.8,
        images: event.images?.map(image => ({
          loc: this.normalizeImageUrl(image),
          caption: `${event.title} - Kids Activity in ${event.location?.city || 'UAE'}`,
          title: event.title
        })) || []
      }));
    } catch (error) {
      console.error('Error fetching events for sitemap:', error);
      return [];
    }
  }

  private async getBlogEntries(): Promise<SitemapEntry[]> {
    try {
      const response = await blogAPI.getAllBlogs({ limit: 1000 });
      if (!response.data?.blogs) return [];

      return response.data.blogs.map(blog => ({
        loc: `${this.baseUrl}/blog/${blog.slug}`,
        lastmod: blog.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        changefreq: 'monthly' as const,
        priority: 0.7,
        images: blog.featuredImage ? [{
          loc: this.normalizeImageUrl(blog.featuredImage),
          caption: `${blog.title} - Kids Activities Blog`,
          title: blog.title
        }] : []
      }));
    } catch (error) {
      console.error('Error fetching blogs for sitemap:', error);
      return [];
    }
  }

  private async getCollectionEntries(): Promise<SitemapEntry[]> {
    try {
      const response = await collectionsAPI.getAllCollections({ limit: 100 });
      if (!response.collections) return [];

      return response.collections.map(collection => ({
        loc: `${this.baseUrl}/collections/${collection._id}`,
        lastmod: collection.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        changefreq: 'weekly' as const,
        priority: 0.7,
        images: collection.icon ? [{
          loc: this.normalizeImageUrl(collection.icon),
          caption: `${collection.title} - Curated Kids Activities Collection`,
          title: collection.title
        }] : []
      }));
    } catch (error) {
      console.error('Error fetching collections for sitemap:', error);
      return [];
    }
  }

  private async getVendorEntries(): Promise<SitemapEntry[]> {
    try {
      const response = await vendorsAPI.getAllVendors({ limit: 100 });
      if (!response.vendors) return [];

      return response.vendors.map(vendor => ({
        loc: `${this.baseUrl}/vendors/${vendor._id}`,
        lastmod: vendor.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        changefreq: 'monthly' as const,
        priority: 0.6,
        images: [vendor.logo, vendor.coverImage].filter(Boolean).map(image => ({
          loc: this.normalizeImageUrl(image!),
          caption: `${vendor.name} - Kids Events Organizer`,
          title: vendor.name
        }))
      }));
    } catch (error) {
      console.error('Error fetching vendors for sitemap:', error);
      return [];
    }
  }

  private async getEventImageEntries(): Promise<ImageSitemapEntry[]> {
    try {
      const response = await eventsAPI.getAllEvents({ limit: 1000 });
      if (!response.events) return [];

      return response.events
        .filter(event => event.images && event.images.length > 0)
        .map(event => ({
          loc: `${this.baseUrl}/events/${event._id}`,
          images: event.images!.map(image => ({
            loc: this.normalizeImageUrl(image),
            caption: `${event.title} - Kids Activity in ${event.location?.city || 'UAE'}`,
            title: event.title
          }))
        }));
    } catch (error) {
      console.error('Error fetching event images for sitemap:', error);
      return [];
    }
  }

  private async getBlogImageEntries(): Promise<ImageSitemapEntry[]> {
    try {
      const response = await blogAPI.getAllBlogs({ limit: 1000 });
      if (!response.data?.blogs) return [];

      return response.data.blogs
        .filter(blog => blog.featuredImage)
        .map(blog => ({
          loc: `${this.baseUrl}/blog/${blog.slug}`,
          images: [{
            loc: this.normalizeImageUrl(blog.featuredImage!),
            caption: `${blog.title} - Kids Activities Blog Article`,
            title: blog.title
          }]
        }));
    } catch (error) {
      console.error('Error fetching blog images for sitemap:', error);
      return [];
    }
  }

  private async getCollectionImageEntries(): Promise<ImageSitemapEntry[]> {
    try {
      const response = await collectionsAPI.getAllCollections({ limit: 100 });
      if (!response.collections) return [];

      return response.collections
        .filter(collection => collection.icon)
        .map(collection => ({
          loc: `${this.baseUrl}/collections/${collection._id}`,
          images: [{
            loc: this.normalizeImageUrl(collection.icon!),
            caption: `${collection.title} - Curated Kids Activities Collection`,
            title: collection.title
          }]
        }));
    } catch (error) {
      console.error('Error fetching collection images for sitemap:', error);
      return [];
    }
  }

  private async getVendorImageEntries(): Promise<ImageSitemapEntry[]> {
    try {
      const response = await vendorsAPI.getAllVendors({ limit: 100 });
      if (!response.vendors) return [];

      return response.vendors
        .filter(vendor => vendor.logo || vendor.coverImage)
        .map(vendor => ({
          loc: `${this.baseUrl}/vendors/${vendor._id}`,
          images: [vendor.logo, vendor.coverImage]
            .filter(Boolean)
            .map(image => ({
              loc: this.normalizeImageUrl(image!),
              caption: `${vendor.name} - Kids Events Organizer`,
              title: vendor.name
            }))
        }));
    } catch (error) {
      console.error('Error fetching vendor images for sitemap:', error);
      return [];
    }
  }

  private normalizeImageUrl(imageUrl: string): string {
    // Handle relative URLs
    if (imageUrl.startsWith('/')) {
      return `${this.baseUrl}${imageUrl}`;
    }

    // Handle full URLs
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // Handle other cases (prepend base URL)
    return `${this.baseUrl}/${imageUrl}`;
  }

  private generateSitemapXML(entries: SitemapEntry[]): string {
    const xmlEntries = entries.map(entry => {
      let xml = `  <url>
    <loc>${this.escapeXML(entry.loc)}</loc>`;

      if (entry.lastmod) {
        xml += `\n    <lastmod>${entry.lastmod}</lastmod>`;
      }

      if (entry.changefreq) {
        xml += `\n    <changefreq>${entry.changefreq}</changefreq>`;
      }

      if (entry.priority !== undefined) {
        xml += `\n    <priority>${entry.priority}</priority>`;
      }

      // Add image entries if present
      if (entry.images && entry.images.length > 0) {
        entry.images.forEach(image => {
          xml += `\n    <image:image>`;
          xml += `\n      <image:loc>${this.escapeXML(image.loc)}</image:loc>`;
          if (image.caption) {
            xml += `\n      <image:caption>${this.escapeXML(image.caption)}</image:caption>`;
          }
          if (image.title) {
            xml += `\n      <image:title>${this.escapeXML(image.title)}</image:title>`;
          }
          if (image.license) {
            xml += `\n      <image:license>${this.escapeXML(image.license)}</image:license>`;
          }
          xml += `\n    </image:image>`;
        });
      }

      xml += `\n  </url>`;
      return xml;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${xmlEntries}
</urlset>`;
  }

  private generateImageSitemapXML(entries: ImageSitemapEntry[]): string {
    const xmlEntries = entries.map(entry => {
      let xml = `  <url>
    <loc>${this.escapeXML(entry.loc)}</loc>`;

      entry.images.forEach(image => {
        xml += `\n    <image:image>`;
        xml += `\n      <image:loc>${this.escapeXML(image.loc)}</image:loc>`;
        if (image.caption) {
          xml += `\n      <image:caption>${this.escapeXML(image.caption)}</image:caption>`;
        }
        if (image.title) {
          xml += `\n      <image:title>${this.escapeXML(image.title)}</image:title>`;
        }
        if (image.license) {
          xml += `\n      <image:license>${this.escapeXML(image.license)}</image:license>`;
        }
        xml += `\n    </image:image>`;
      });

      xml += `\n  </url>`;
      return xml;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${xmlEntries}
</urlset>`;
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate sitemap index file for large sites
   */
  generateSitemapIndex(): string {
    const sitemaps = [
      { loc: `${this.baseUrl}/sitemap.xml`, lastmod: new Date().toISOString().split('T')[0] },
      { loc: `${this.baseUrl}/image-sitemap.xml`, lastmod: new Date().toISOString().split('T')[0] }
    ];

    const xmlEntries = sitemaps.map(sitemap => `  <sitemap>
    <loc>${this.escapeXML(sitemap.loc)}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</sitemapindex>`;
  }

  /**
   * Generate structured data for organization
   */
  generateOrganizationStructuredData() {
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
      }
    };
  }
}

// Export singleton instance
export const seoService = new SEOService();
export default seoService;