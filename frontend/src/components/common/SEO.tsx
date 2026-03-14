import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getAppNameFull } from '../../utils/brandConfig';
import { useLocation } from 'react-router-dom';
import { config } from '../../config';
import { getCloudinaryWebP } from '@/utils/cloudinaryHelpers';

export interface SEOProps {
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
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  // AI/Voice assistant optimization
  speakableSelectors?: string[];
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords = [],
  canonicalUrl,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  structuredData,
  noIndex = false,
  noFollow = false,
  author,
  publishedTime,
  modifiedTime,
  breadcrumbs,
  speakableSelectors
}) => {
  const location = useLocation();
  const baseUrl = config.appUrl;

  // Default values
  const defaultTitle = import.meta.env.VITE_SITE_NAME
    ? `${import.meta.env.VITE_SITE_NAME} - Discover Amazing Kids Activities & Events in UAE`
    : 'Kidrove - Discover Amazing Kids Activities & Events in UAE';
  const defaultDescription = import.meta.env.VITE_SITE_DESCRIPTION || 'Find and book the best kids activities, educational programs, and family events in the UAE. Safe, fun, and memorable experiences for children of all ages.';
  const defaultKeywords = import.meta.env.VITE_SITE_KEYWORDS?.split(',') || ['kids activities', 'events', 'UAE', 'Dubai', 'family fun', 'children', 'booking'];
  const defaultImage = import.meta.env.VITE_SITE_LOGO || `${baseUrl}/assets/images/Kidrove-log-new.png`;

  // Construct final values
  const finalTitle = title || defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalKeywords = keywords.length > 0 ? keywords : defaultKeywords;

  // Normalize canonical URL to prevent duplicate content (Phase 5 SEO Optimization)
  const finalCanonicalUrl = (() => {
    const canonical = canonicalUrl || `${baseUrl}${location.pathname}`;
    // Ensure no trailing slash unless it's root
    return canonical === `${baseUrl}/` ? canonical : canonical.replace(/\/$/, '');
  })();

  const finalOgImage = ogImage || defaultImage;

  // Robots content
  const robotsContent = [];
  if (noIndex) robotsContent.push('noindex');
  if (noFollow) robotsContent.push('nofollow');
  if (robotsContent.length === 0) robotsContent.push('index', 'follow');

  // Generate breadcrumb structured data if provided
  const breadcrumbStructuredData = breadcrumbs ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${baseUrl}${crumb.url}`
    }))
  } : null;

  // Generate speakable structured data for voice assistants (AI/GEO optimization)
  const speakableStructuredData = speakableSelectors && speakableSelectors.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: finalTitle,
    url: finalCanonicalUrl,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: speakableSelectors
    }
  } : null;

  // Combine structured data
  const combinedStructuredData = [];
  if (structuredData) {
    combinedStructuredData.push(structuredData);
  }
  if (breadcrumbStructuredData) {
    combinedStructuredData.push(breadcrumbStructuredData);
  }
  if (speakableStructuredData) {
    combinedStructuredData.push(speakableStructuredData);
  }

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords.join(', ')} />
      <meta name="robots" content={robotsContent.join(', ')} />

      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonicalUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={finalCanonicalUrl} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:site_name" content={import.meta.env.VITE_SITE_NAME || "Kidrove"} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalOgImage} />

      {/* Article specific meta tags */}
      {ogType === 'article' && author && (
        <meta name="author" content={author} />
      )}
      {ogType === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {ogType === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* Additional SEO meta tags */}
      <meta name="theme-color" content="#3B82F6" />
      <meta name="msapplication-TileColor" content="#3B82F6" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Structured Data */}
      {combinedStructuredData.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify(combinedStructuredData.length === 1 ? combinedStructuredData[0] : combinedStructuredData)}
        </script>
      )}

      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://res.cloudinary.com" />

      {/* Dynamic Multi-Region Hreflang Tags */}
      <link rel="alternate" hrefLang="en" href={`https://kidrove.com${location.pathname}${location.search}`} />
      <link rel="alternate" hrefLang="en-IN" href={`https://kidrove.in${location.pathname}${location.search}`} />
      <link rel="alternate" hrefLang="en-AE" href={`https://kidrove.ae${location.pathname}${location.search}`} />
      <link rel="alternate" hrefLang="x-default" href={`https://kidrove.com${location.pathname}${location.search}`} />
    </Helmet>
  );
};

// Helper component for common page types
export const EventSEO: React.FC<{ event: any; breadcrumbs?: SEOProps['breadcrumbs'] }> = ({ event, breadcrumbs }) => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://gema-events.com';

  // Use custom SEO meta if available, otherwise generate from event data
  const generateTitle = () => {
    if (event.seoMeta?.title) {
      return event.seoMeta.title;
    }
    return `${event.title} | Kids Events in ${event.location?.city || 'UAE'} | ${getAppNameFull()}`;
  };

  const generateDescription = () => {
    if (event.seoMeta?.description) {
      return event.seoMeta.description;
    }
    return event.description.length > 160
      ? `${event.description.substring(0, 157)}...`
      : event.description;
  };

  const generateKeywords = () => {
    if (event.seoMeta?.keywords && event.seoMeta.keywords.length > 0) {
      return event.seoMeta.keywords;
    }
    return ['kids activities', 'events', 'UAE', event.location?.city, event.category, ...event.tags].filter(Boolean);
  };

  const seoData: SEOProps = {
    title: generateTitle(),
    description: generateDescription(),
    keywords: generateKeywords(),
    canonicalUrl: `${baseUrl}/events/${event.slug || event._id}`,
    ogImage: event.images?.[0],
    ogType: 'article',
    breadcrumbs,
    structuredData: {
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
        url: `${baseUrl}/events/${event.slug || event._id}`
      },
      organizer: {
        '@type': 'Organization',
        name: `${getAppNameFull()}`,
        url: baseUrl
      },
      ...(event.images && event.images.length > 0 && { image: event.images }),
      ...(event.ageRange && {
        audience: {
          '@type': 'PeopleAudience',
          suggestedMinAge: event.ageRange[0],
          suggestedMaxAge: event.ageRange[1]
        }
      })
    }
  };

  return <SEO {...seoData} />;
};

export const BlogSEO: React.FC<{ blog: any; breadcrumbs?: SEOProps['breadcrumbs'] }> = ({ blog, breadcrumbs }) => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://gema-events.com';

  const seoData: SEOProps = {
    title: blog.seo?.metaTitle || `${blog.title} | ${getAppNameFull()} Blog`,
    description: blog.seo?.metaDescription || blog.excerpt,
    keywords: blog.seo?.metaKeywords || ['kids activities', 'events', 'UAE', 'parenting', ...blog.tags].filter(Boolean),
    canonicalUrl: blog.seo?.canonicalUrl || `${baseUrl}/blog/${blog.slug}`,
    ogImage: blog.featuredImage,
    ogType: 'article',
    author: blog.author?.name,
    publishedTime: blog.publishedAt || blog.createdAt,
    modifiedTime: blog.updatedAt,
    breadcrumbs,
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
        name: blog.author?.name || `${getAppNameFull()} Team`,
        ...(blog.author?.avatar && { image: blog.author.avatar })
      },
      publisher: {
        '@type': 'Organization',
        name: `${getAppNameFull()}`,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/assets/images/logo.png`
        }
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${baseUrl}/blog/${blog.slug}`
      },
      wordCount: blog.content ? blog.content.split(' ').length : undefined,
      timeRequired: `PT${blog.readTime || 5}M`,
      keywords: blog.tags?.join(', ') || blog.seo?.metaKeywords?.join(', ')
    }
  };

  return <SEO {...seoData} />;
};

export const CategorySEO: React.FC<{ category: any; breadcrumbs?: SEOProps['breadcrumbs'] }> = ({ category, breadcrumbs }) => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://gema-events.com';

  const seoData: SEOProps = {
    title: category.seoMeta?.title || `${category.name} Events for Kids | ${getAppNameFull()}`,
    description: category.seoMeta?.description || `Discover amazing ${category.name.toLowerCase()} activities and events for children in the UAE. Book now for unforgettable experiences.`,
    keywords: category.seoMeta?.keywords || ['kids activities', 'events', 'UAE', category.name.toLowerCase(), 'activities'],
    canonicalUrl: `${baseUrl}/categories/${category.slug || category._id}`,
    breadcrumbs
  };

  return <SEO {...seoData} />;
};

export const VendorSEO: React.FC<{ vendor: any; breadcrumbs?: SEOProps['breadcrumbs'] }> = ({ vendor, breadcrumbs }) => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://gema-events.com';

  const seoData: SEOProps = {
    title: `${vendor.name} - Kids Events Vendor | ${getAppNameFull()}`,
    description: vendor.description.length > 160
      ? `${vendor.description.substring(0, 157)}...`
      : vendor.description,
    keywords: ['kids events vendor', 'event organizer', vendor.name, vendor.location, ...vendor.categories].filter(Boolean),
    canonicalUrl: `${baseUrl}/vendors/${vendor.id}`,
    ogImage: vendor.logo || vendor.coverImage,
    breadcrumbs,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${baseUrl}/vendors/${vendor.id}`,
      name: vendor.name,
      description: vendor.description,
      image: vendor.logo || vendor.coverImage,
      url: `${baseUrl}/vendors/${vendor.id}`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: vendor.location,
        addressCountry: 'AE'
      },
      aggregateRating: vendor.rating ? {
        '@type': 'AggregateRating',
        ratingValue: vendor.rating,
        reviewCount: vendor.reviewCount || 0,
        bestRating: 5,
        worstRating: 1
      } : undefined,
      serviceType: vendor.categories,
      areaServed: 'United Arab Emirates',
      priceRange: '$$',
      knowsAbout: ['Kids Activities', 'Event Management', 'Family Entertainment']
    }
  };

  return <SEO {...seoData} />;
};

export const CollectionSEO: React.FC<{ collection: any; breadcrumbs?: SEOProps['breadcrumbs'] }> = ({ collection, breadcrumbs }) => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://gema-events.com';

  const seoData: SEOProps = {
    title: collection.seo?.metaTitle || `${collection.title} - Kids Activities Collection | ${getAppNameFull()}`,
    description: collection.seo?.metaDescription || collection.description,
    keywords: collection.seo?.metaKeywords || ['kids activities collection', collection.title, collection.category, 'UAE events'].filter(Boolean),
    canonicalUrl: collection.seo?.canonicalUrl || `${baseUrl}/collections/${collection.slug || collection._id}`,
    ogImage: collection.featuredImage || collection.icon,
    breadcrumbs,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Collection',
      name: collection.title,
      description: collection.description,
      url: `${baseUrl}/collections/${collection.slug || collection._id}`,
      image: collection.featuredImage || collection.icon,
      numberOfItems: collection.events?.length || parseInt(collection.count) || 0,
      category: collection.category,
      provider: {
        '@type': 'Organization',
        name: `${getAppNameFull()}`,
        url: baseUrl
      }
    }
  };

  return <SEO {...seoData} />;
};

export const HomeSEO: React.FC<{
  breadcrumbs?: SEOProps['breadcrumbs'];
  socialSettings?: {
    facebookUrl?: string;
    twitterUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    linkedinUrl?: string;
  };
  seoContent?: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    faqItems: Array<{ question: string; answer: string }>;
    features: Array<{ title: string; description: string }>;
  };
  stats?: {
    averageRating?: number;
    totalReviews?: number;
    totalEvents?: number;
    totalVendors?: number;
  };
  firstBannerImage?: string;
}> = ({ breadcrumbs, socialSettings, seoContent, stats, firstBannerImage }) => {
  const location = useLocation();
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://gema-events.com';

  // Build sameAs array from social settings, filtering out empty values
  const sameAsLinks = socialSettings ? [
    socialSettings.facebookUrl,
    socialSettings.twitterUrl,
    socialSettings.instagramUrl,
    socialSettings.youtubeUrl,
    socialSettings.linkedinUrl
  ].filter(Boolean) : [];

  // 1. WebSite Schema with SearchAction
  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${getAppNameFull()}`,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    inLanguage: ['en', 'ar'],
    copyrightYear: 2017,
    publisher: {
      '@type': 'Organization',
      name: `${getAppNameFull()}`
    }
  };

  // 2. Enhanced Organization Schema
  const organizationStructuredData: any = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: `${getAppNameFull()}`,
    alternateName: getAppNameFull(),
    description: 'UAE\'s leading platform for kids activities and family events',
    url: baseUrl,
    logo: `${baseUrl}/assets/images/logo.png`,
    foundingDate: '2017-01-01',
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      value: 75
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'info@gema-events.com',
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
    ...(sameAsLinks.length > 0 && { sameAs: sameAsLinks }),
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

  // Add aggregate rating if stats available
  if (stats?.averageRating && stats?.totalReviews) {
    organizationStructuredData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: stats.averageRating,
      reviewCount: stats.totalReviews,
      bestRating: 5,
      worstRating: 1
    };
  }

  // 3. FAQPage Schema (if FAQs available)
  const faqStructuredData = seoContent?.faqItems && seoContent.faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: seoContent.faqItems.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  } : null;

  // 4. ItemList Schema for Features (if features available)
  const featuresStructuredData = seoContent?.features && seoContent.features.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Why Choose ${getAppNameFull()}`,
    description: `Top reasons to use ${getAppNameFull()} for kids activities`,
    itemListElement: seoContent.features.map((feature, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: feature.title,
      description: feature.description
    }))
  } : null;

  // Combine all structured data
  const allStructuredData = [
    websiteStructuredData,
    organizationStructuredData,
    faqStructuredData,
    featuresStructuredData
  ].filter(Boolean);

  const seoData: SEOProps = {
    title: seoContent?.metaTitle || `${getAppNameFull()} - Discover Amazing Kids Activities & Events in UAE`,
    description: seoContent?.metaDescription || 'Find and book the best kids activities, educational programs, and family events in the UAE. Safe, fun, and memorable experiences for children of all ages.',
    keywords: seoContent?.keywords || ['kids activities', 'events', 'UAE', 'Dubai', 'family fun', 'children', 'booking', 'education', 'entertainment'],
    structuredData: allStructuredData,
    breadcrumbs
  };

  return (
    <>
      <SEO {...seoData} />
      <Helmet>
        {/* Preload hero image for LCP optimization (Phase 4) */}
        {firstBannerImage && (
          <link
            rel="preload"
            as="image"
            href={getCloudinaryWebP(firstBannerImage, 1920)}
            type="image/webp"
            // @ts-expect-error - fetchpriority not in standard yet
            fetchpriority="high"
          />
        )}

        {/* hreflang tags for multilingual support */}
        <link rel="alternate" hrefLang="en" href={`${baseUrl}${location.pathname}`} />
        <link rel="alternate" hrefLang="ar" href={`${baseUrl}/ar${location.pathname}`} />
        <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${location.pathname}`} />
      </Helmet>
    </>
  );
};

// Standalone FAQ Page SEO component
export const FAQPageSEO: React.FC<{
  faqs: Array<{ question: string; answer: string }>;
  breadcrumbs?: SEOProps['breadcrumbs'];
}> = ({ faqs, breadcrumbs }) => {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://kidrove.com';

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  const seoData: SEOProps = {
    title: `Frequently Asked Questions | ${getAppNameFull()}`,
    description: 'Find answers to common questions about Kidrove, kids activities, event bookings, vendor partnerships, and more.',
    keywords: ['FAQ', 'frequently asked questions', 'kidrove help', 'kids activities questions', 'event booking help', 'UAE events FAQ'],
    canonicalUrl: `${baseUrl}/faq`,
    breadcrumbs,
    structuredData: faqStructuredData,
    speakableSelectors: ['.faq-question', '.faq-answer', 'h1', 'h2']
  };

  return <SEO {...seoData} />;
};

export default SEO;