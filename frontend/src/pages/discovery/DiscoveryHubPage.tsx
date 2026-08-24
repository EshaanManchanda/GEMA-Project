import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import eventsAPI from '../../services/api/eventsAPI';
import collectionsAPI from '../../services/api/collectionsAPI';
import EventCard from '../../components/client/EventCard';
import SEO from '../../components/common/SEO';
import { config as appConfig } from '../../config';
import { getPlaceholderUrl } from '../../utils/placeholderImage';
import logger from '@/utils/logger';

export interface DiscoverySegment {
  label: string;
  params: Record<string, any>;
}

export interface DiscoveryHubConfig {
  slug: string;
  h1: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  baseFilters: Record<string, any>;
  sortBy?: string;
  segments?: DiscoverySegment[];
  faqs: { question: string; answer: string }[];
  relatedHubs: { label: string; path: string }[];
  emptyStateMessage: string;
  /** Slug of an admin-curated Collection to feature above the auto-filtered results. */
  pinnedCollectionSlug?: string;
}

const getEventImage = (images?: string[], title?: string): string => {
  if (images && images.length > 0) return images[0];
  return getPlaceholderUrl('eventCard', title || 'Event');
};

const getEventDate = (dateSchedule?: any[]): string => {
  if (!dateSchedule || dateSchedule.length === 0) return '';
  const firstSchedule = dateSchedule[0];
  return firstSchedule.date || firstSchedule.startDate || '';
};

const renderEventCard = (event: any) => (
  <EventCard
    key={event._id || event.id}
    id={event._id || event.id}
    _id={event._id}
    slug={event.slug}
    title={event.title}
    description={event.description}
    images={event.images}
    image={getEventImage(event.images, event.title)}
    price={event.price}
    currency={event.currency}
    location={event.location}
    category={event.category}
    venueType={event.venueType}
    ageRange={event.ageRange}
    ageGroup={event.ageGroup}
    dateSchedule={event.dateSchedule}
    date={getEventDate(event.dateSchedule)}
    viewsCount={event.viewsCount}
    rating={event.averageRating}
    reviewsCount={event.reviewCount}
    vendorId={event.vendorId}
    showStats={true}
  />
);

const DiscoveryHubPage: React.FC<{ config: DiscoveryHubConfig }> = ({ config }) => {
  const [activeSegment, setActiveSegment] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [pinnedEvents, setPinnedEvents] = useState<any[]>([]);
  const [pinnedTitle, setPinnedTitle] = useState<string | null>(null);

  const segment = config.segments?.[activeSegment];

  // Pinned collection is independent of the age/segment tabs — fetch once per hub.
  useEffect(() => {
    let cancelled = false;

    if (!config.pinnedCollectionSlug) {
      setPinnedEvents([]);
      setPinnedTitle(null);
      return;
    }

    collectionsAPI.getCollectionById(config.pinnedCollectionSlug)
      .then((result) => {
        if (cancelled) return;
        setPinnedEvents(Array.isArray(result?.collection?.events) ? result.collection.events : []);
        setPinnedTitle(result?.collection?.title || null);
      })
      .catch((err) => {
        logger.error(`[DiscoveryHubPage:${config.slug}] Failed to fetch pinned collection`, err);
        if (!cancelled) {
          setPinnedEvents([]);
          setPinnedTitle(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config.slug, config.pinnedCollectionSlug]);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const DISPLAY_COUNT = 12;
        const params = {
          ...config.baseFilters,
          ...(segment?.params || {}),
          // Over-fetch: Venue-type listings get filtered out client-side below,
          // so request more than we display to still fill the grid.
          limit: DISPLAY_COUNT * 3,
          sortBy: config.sortBy || 'averageRating',
          sortOrder: 'desc',
        };
        const result = await eventsAPI.getEvents(params);
        if (!cancelled) {
          const pinnedIds = new Set(pinnedEvents.map((event: any) => event._id || event.id));
          // Venue-type listings are bare locations, not activities, and their
          // default ageRange [0,100] trivially matches every age/segment filter —
          // exclude them so discovery hubs surface actual kids activities.
          // Also drop anything already shown in the pinned collection above.
          const activityEvents = (Array.isArray(result?.events) ? result.events : [])
            .filter((event: any) => event.type !== 'Venue' && !pinnedIds.has(event._id || event.id))
            .slice(0, DISPLAY_COUNT);
          setEvents(activityEvents);
        }
      } catch (err) {
        logger.error(`[DiscoveryHubPage:${config.slug}] Failed to fetch events`, err);
        if (!cancelled) {
          setHasError(true);
          setEvents([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchEvents();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.slug, activeSegment, pinnedEvents]);

  const baseUrl = appConfig.appUrl;

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: config.h1, url: `/${config.slug}` },
  ];

  const faqStructuredData = config.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  } : null;

  const allListedEvents = [...pinnedEvents, ...events];
  const itemListStructuredData = allListedEvents.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: config.h1,
    description: config.seoDescription,
    itemListElement: allListedEvents.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${baseUrl}/events/${event.slug || event._id}`,
      name: event.title,
    })),
  } : null;

  const structuredData = [faqStructuredData, itemListStructuredData].filter(Boolean);

  return (
    <>
      <SEO
        title={config.seoTitle}
        description={config.seoDescription}
        keywords={config.seoKeywords}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData.length === 1 ? structuredData[0] : structuredData}
        speakableSelectors={['.hub-intro', 'h1']}
      />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">{config.h1}</h1>
        <p className="hub-intro text-lg text-gray-700 max-w-3xl mb-8">{config.intro}</p>

        {pinnedEvents.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">{pinnedTitle || 'Featured Picks'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pinnedEvents.map(renderEventCard)}
            </div>
          </div>
        )}

        {config.segments && config.segments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label={`${config.h1} filters`}>
            {config.segments.map((seg, index) => (
              <button
                key={seg.label}
                type="button"
                role="tab"
                aria-selected={activeSegment === index}
                onClick={() => setActiveSegment(index)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  activeSegment === index
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {events.map(renderEventCard)}
          </div>
        ) : pinnedEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md mb-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-medium mb-2">{config.emptyStateMessage}</h3>
            {hasError && (
              <p className="text-gray-600 mb-4">We couldn't reach the server just now — please try again shortly.</p>
            )}
            <Link
              to="/events"
              className="inline-block px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Browse All Events
            </Link>
          </div>
        ) : null}

        {config.relatedHubs.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">Explore More Discovery Guides</h2>
            <div className="flex flex-wrap gap-3">
              {config.relatedHubs.map((hub) => (
                <Link
                  key={hub.path}
                  to={hub.path}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
                >
                  {hub.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {config.faqs.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {config.faqs.map((faq) => (
                <div key={faq.question} className="faq-item bg-white rounded-lg shadow-sm p-4">
                  <h3 className="faq-question font-semibold mb-1">{faq.question}</h3>
                  <p className="faq-answer text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DiscoveryHubPage;
