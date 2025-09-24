import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  twitterCard?: 'summary' | 'summary_large_image';
  structuredData?: any;
  noIndex?: boolean;
  noFollow?: boolean;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * SEO Hook for managing meta tags and structured data
 */
export const useSEO = (seoData: SEOData = {}) => {
  const location = useLocation();
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://gema-events.com';

  useEffect(() => {
    // Set default values
    const {
      title = 'Gema Events - Discover Amazing Kids Activities & Events in UAE',
      description = 'Find and book the best kids activities, educational programs, and family events in the UAE. Safe, fun, and memorable experiences for children of all ages.',
      keywords = ['kids activities', 'events', 'UAE', 'Dubai', 'family fun', 'children', 'booking'],
      canonicalUrl = `${baseUrl}${location.pathname}`,
      ogImage = `${baseUrl}/assets/images/og-default.jpg`,
      ogType = 'website',
      twitterCard = 'summary_large_image',
      structuredData = null,
      noIndex = false,
      noFollow = false
    } = seoData;

    // Update document title
    document.title = title;

    // Helper function to update or create meta tags
    const updateMetaTag = (property: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${property}"]` : `meta[name="${property}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;

      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
      }

      meta.setAttribute('content', content);
    };

    // Helper function to update or create link tags
    const updateLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;

      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }

      link.setAttribute('href', href);
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords.join(', '));

    // Robots meta tag
    const robotsContent = [];
    if (noIndex) robotsContent.push('noindex');
    if (noFollow) robotsContent.push('nofollow');
    if (robotsContent.length === 0) robotsContent.push('index', 'follow');
    updateMetaTag('robots', robotsContent.join(', '));

    // Canonical URL
    updateLinkTag('canonical', canonicalUrl);

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', ogType, true);
    updateMetaTag('og:url', canonicalUrl, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:site_name', 'Gema Events', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', twitterCard);
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);

    // Structured data
    if (structuredData) {
      // Remove existing structured data
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Add new structured data
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    // Cleanup function to remove SEO tags when component unmounts
    return () => {
      // Note: We don't remove meta tags on cleanup as they should persist
      // for the page until replaced by new SEO data
    };
  }, [seoData, location.pathname, baseUrl]);

  // Helper functions that can be used by components
  const generateEventSEO = (event: any): SEOData => {
    const eventTitle = `${event.title} | Kids Events in ${event.location?.city || 'UAE'} | Gema Events`;
    const eventDescription = event.description.length > 160
      ? `${event.description.substring(0, 157)}...`
      : event.description;

    return {
      title: eventTitle,
      description: eventDescription,
      keywords: ['kids activities', 'events', 'UAE', event.location?.city, event.category, ...event.tags].filter(Boolean),
      canonicalUrl: `${baseUrl}/events/${event._id}`,
      ogImage: event.images?.[0] || `${baseUrl}/assets/images/og-default.jpg`,
      ogType: 'article',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description: event.description,
        startDate: event.dateSchedule?.[0]?.startDate || event.dateSchedule?.[0]?.date,
        endDate: event.dateSchedule?.[0]?.endDate,
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
          availability: 'https://schema.org/InStock'
        },
        organizer: {
          '@type': 'Organization',
          name: 'Gema Events',
          url: baseUrl
        }
      }
    };
  };

  const generateBlogSEO = (blog: any): SEOData => {
    return {
      title: blog.seo?.metaTitle || `${blog.title} | Gema Events Blog`,
      description: blog.seo?.metaDescription || blog.excerpt,
      keywords: blog.seo?.metaKeywords || ['kids activities', 'events', 'UAE', 'parenting', ...blog.tags].filter(Boolean),
      canonicalUrl: blog.seo?.canonicalUrl || `${baseUrl}/blog/${blog.slug}`,
      ogImage: blog.featuredImage || `${baseUrl}/assets/images/og-default.jpg`,
      ogType: 'article',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blog.title,
        description: blog.excerpt,
        image: blog.featuredImage,
        datePublished: blog.publishedAt || blog.createdAt,
        dateModified: blog.updatedAt,
        author: {
          '@type': 'Person',
          name: blog.author?.name || 'Gema Events Team'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Gema Events',
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/assets/images/logo.png`
          }
        }
      }
    };
  };

  const generateCategorySEO = (category: any): SEOData => {
    return {
      title: `${category.name} Events for Kids | Gema Events`,
      description: category.seoMeta?.description || `Discover amazing ${category.name.toLowerCase()} activities and events for children in the UAE. Book now for unforgettable experiences.`,
      keywords: category.seoMeta?.keywords || ['kids activities', 'events', 'UAE', category.name.toLowerCase(), 'activities'],
      canonicalUrl: `${baseUrl}/categories/${category.slug || category._id}`,
      ogType: 'website'
    };
  };

  const generateBreadcrumbStructuredData = (breadcrumbs: BreadcrumbItem[]) => {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: `${baseUrl}${crumb.url}`
      }))
    };
  };

  return {
    generateEventSEO,
    generateBlogSEO,
    generateCategorySEO,
    generateBreadcrumbStructuredData,
    baseUrl
  };
};

export default useSEO;