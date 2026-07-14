import React, { useMemo, useEffect } from 'react';
import { FadeIn, ScrollReveal } from '@/components/animations';
import { useSelector } from 'react-redux';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getFullProfile } from '@/store/slices/authSlice';
import TrendingNearYou from '@/components/client/TrendingNearYou';
import RecommendedForYou from '@/components/client/RecommendedForYou';
import CollectionSection from '@/components/client/CollectionSection';
import CollectionPills from '@/components/client/CollectionPills';
import BannerCarousel from '@/components/client/BannerCarousel';
import { useHomepageQuery } from '@/hooks/queries/useHomepageQuery';
import ReelsFeed from '@/components/client/ReelsFeed';
import { HomeSEO } from '@/components/common/SEO';
import { selectSocialSettings } from '@/store/slices/settingsSlice';
import type { Event as UIEvent } from '@/components/client/CollectionSection.types';
import type { Event as ApiEvent } from '../types/event';
import { getPlaceholderUrl } from '../utils/placeholderImage';

// Imported Components
import FeaturedEventsCarousel, { FeaturedEvent } from '@/components/client/home/FeaturedEventsCarousel';
import StatsSection from '@/components/client/home/StatsSection';
import HomeSkeleton from '@/components/client/home/HomeSkeleton';

// Additional Sections
import ReviewCarouselSwiper from '@/components/client/ReviewCarouselKeen';
import GoogleReviewsCarousel from '@/components/client/GoogleReviewsCarousel';
import FeaturedBlogsSection from '@/components/sections/FeaturedBlogsSection';
import WhyChooseUs from '@/components/sections/WhyChooseUs';
import HomepageFAQs from '@/components/sections/HomepageFAQs';
import GiftCardPromo from '@/components/sections/GiftCardPromo';
import CitiesSection from '@/components/sections/CitiesSection';

import FeaturedInstructors from '@/components/sections/FeaturedInstructors';
import NewsletterSubscribe from '@/components/client/NewsletterSubscribe';

// Imported Utils
import { mapToUIEvent, mockEvents } from '@/utils/homePageUtils';

const HomePage: React.FC = () => {
  const socialSettings = useSelector(selectSocialSettings);
  const dispatch = useAppDispatch();

  // Single homepage query replaces 6 separate queries (400-600ms savings!)
  const { data: homepageData, isLoading: homepageLoading, error: homepageError } = useHomepageQuery();

  // "Trending Near You" needs the user's saved city — lazily fetch the full
  // profile only when logged in and it isn't already in the store (avoids an
  // extra request for guests / users who never touch this section).
  const { isAuthenticated, userProfile, isProfileLoading } = useAppSelector((s) => s.auth);
  useEffect(() => {
    if (isAuthenticated && !userProfile && !isProfileLoading) {
      dispatch(getFullProfile());
    }
  }, [isAuthenticated, userProfile, isProfileLoading, dispatch]);
  const nearYouCity = userProfile?.addresses?.find((a) => a.isDefault)?.city
    || userProfile?.addresses?.[0]?.city;

  // Only block on homepage query (critical data)
  const isLoading = homepageLoading;

  // Extract data from combined response with fallbacks
  // Cast to ApiEvent[] because useHomepageQuery returns API shape
  const apiEvents = (homepageData?.events || (homepageError ? mockEvents : [])) as unknown as ApiEvent[];

  // Transform API events to UI events
  const events: UIEvent[] = apiEvents.map(mapToUIEvent);

  const featuredEventsRaw = homepageData?.featuredEvents || [];
  const featuredBlogs = homepageData?.featuredBlogs || [];
  const reels = homepageData?.reels || [];
  const bannersData = { banners: homepageData?.banners || [] };
  const statsData = homepageData?.stats;
  const seoContentData = { seoContent: homepageData?.seoContent || null };
  const collectionsData = homepageData?.collections || [];

  // Transform featured events using the same mapper for consistency, but cast to FeaturedEvent
  const featuredEvents: FeaturedEvent[] = featuredEventsRaw.slice(0, 6).map((event: any) => ({
    ...mapToUIEvent(event), // Use helper first to get standard UI fields properly mapped
    buttonLabel: 'View Details',
    image: event.images?.[0] || getPlaceholderUrl('eventCard', event.title || ''),
  }));

  const stats = statsData || {
    totalEvents: Number(import.meta.env.VITE_STATS_TOTAL_EVENTS) || 2500,
    totalVendors: Number(import.meta.env.VITE_STATS_TOTAL_VENDORS) || 750,
    totalVenues: Number(import.meta.env.VITE_STATS_TOTAL_VENUES) || 500,
    totalReviews: Number(import.meta.env.VITE_STATS_TOTAL_REVIEWS) || 10000,
    totalBookings: Number(import.meta.env.VITE_STATS_TOTAL_BOOKINGS) || 50000,
    averageRating: Number(import.meta.env.VITE_STATS_AVERAGE_RATING) || 4.8
  };

  // Load Handpicked Experiences from collection data, fallback to top events by views
  const handpickedEvents = useMemo(() => {
    const handpickedCollection = collectionsData.find(
      (c: any) => c.slug === 'handpicked-experience' || c.slug === 'handpicked-experiences'
    );
    if (handpickedCollection?.events?.length) {
      return [...handpickedCollection.events]
        .map(mapToUIEvent)
        .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
        .slice(0, 16);
    }
    const featured = events.filter(e => e.isFeatured || (e.rating && e.rating >= 4.5));
    if (featured.length >= 8) {
      return featured.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 16);
    }
    return [...events]
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
      .slice(0, 16);
  }, [collectionsData, events]);
  const apiBestPriceEvents = (homepageData?.bestPriceEvents || (homepageError ? mockEvents : [])) as unknown as ApiEvent[];
  const bestPriceEventsRaw = apiBestPriceEvents.map(mapToUIEvent);

  const bestPriceEvents = useMemo(
    () => bestPriceEventsRaw.slice(0, 12),
    [bestPriceEventsRaw]
  );
  // Trending: use backend-sorted trendingEvents (viewsCount desc) — no client re-sort
  const trendingEventsRaw = (homepageData?.trendingEvents || []) as unknown as ApiEvent[];
  const trendingEvents = useMemo(
    () => trendingEventsRaw.map(mapToUIEvent),
    [trendingEventsRaw]
  );
  // Fetch Teaching Events from Homepage Data
  const teachingEventsData = homepageData?.teachingEvents || [];

  const teachingEvents = teachingEventsData.map(te => ({
    id: te._id,
    title: te.title,
    description: te.description,
    image: te.images?.[0] || (te as any).imageAssets?.[0]?.url || getPlaceholderUrl('eventCard', te.title),
    price: te.price,
    currency: te.currency,
    category: te.category,
    date: te.dateSchedule?.[0]?.startDate || te.dateSchedule?.[0]?.date,
    location: {
      city: te.location?.city || 'Online',
      address: te.location?.address
    },
    isFeatured: te.isFeatured,
    rating: 0,
    reviewsCount: 0,
    // Custom link to teaching event detail
    customLink: `/teaching-events/${te.slug || te._id}`
  }));

  if (isLoading) {
    return (
      <FadeIn>
        <HomeSkeleton />
      </FadeIn>
    );
  }

  // Extract first banner image for LCP preload optimization
  const firstBannerImage = bannersData?.banners?.[0]?.imageAsset?.url;

  return (
    <>
      <HomeSEO
        socialSettings={socialSettings}
        seoContent={seoContentData?.seoContent ?? undefined}
        stats={statsData}
        firstBannerImage={firstBannerImage}
      />
      <div className="w-full bg-gray-50">
        {/* Homepage Banner Carousel - No ScrollReveal for LCP */}
        {bannersData?.banners && bannersData.banners.length > 0 && (
          <BannerCarousel banners={bannersData.banners} />
        )}

        {/* Collections Pills */}
        <CollectionPills collections={collectionsData as any} />

        {/* Featured Events Carousel */}
        <FeaturedEventsCarousel
          featuredEvents={featuredEvents}
        />

        {/* Explore By City */}
        <CitiesSection />

        {/* Carousel Layout - Best Price Tickets */}
        <CollectionSection
          badge="Best Price"
          badgeColor="rgba(var(--color-primary-500), 0.1)"
          title="☀️ Best-Price Tickets to Make the Most of the Sunshine!"
          subtitle="Sunshine's out, fun's in! Grab best-price e-tickets now and make the most of this glorious weather."
          events={bestPriceEvents}
          layout="carousel"
          eventCardVariant="overlay"
          autoplay={true}
          autoplayInterval={5000}
          showNavigation={true}
          showDots={true}
          viewAllLink="/search?sortBy=price&sortOrder=asc"
          showPrice={true}
          showLocation={true}
          showWishlist={false}
          showAgeGroup={true}
        />

        {/* Horizontal Scroll Layout - Trending Now */}
        <CollectionSection
          badge="Trending"
          title="🔥 Trending Now"
          subtitle="What's popular right now in Dubai and UAE"
          events={trendingEvents}
          layout="horizontal-scroll"
          eventCardVariant="compact"
          maxItems={12}
          viewAllLink="/search?sort=trending"
          showPrice={true}
          showLocation={true}
          showStats={true}
          showWishlist={false}
          showAgeGroup={true}
        />

        {/* Recommended For You — only for logged-in users; backend returns
            empty until the user has view/favorite/order signal, so the
            component itself hides when there's nothing to personalize. */}
        {isAuthenticated && <RecommendedForYou />}

        {/* Trending Near You — only for logged-in users with a saved city */}
        {nearYouCity && <TrendingNearYou city={nearYouCity} />}

        {/* Reels Slider */}
        {reels && reels.length > 0 && (
          <ReelsFeed reels={reels} variant="slider" title="Trending Reels" />
        )}

        {/* Classes & Courses - Teaching Events */}
        {teachingEvents.length > 0 && (
          <CollectionSection
            badge="Education"
            badgeColor="rgba(var(--color-primary-500), 0.1)"
            title="📚 Classes & Courses"
            subtitle="Learn something new with expert-led classes and workshops"
            events={teachingEvents as any[]}
            layout="grid"
            eventCardVariant="default"
            maxItems={4}
            viewAllLink="/search?type=class" // Ideally search page supports filtering by teaching events
            showPrice={true}
            showLocation={true}
            showAgeGroup={true}
            showWishlist={false}
          />
        )}

        {/* Featured Instructors */}
        <FeaturedInstructors />

        {/* Grid Layout - Handpicked Experiences */}
        {handpickedEvents.length > 0 && (
          <CollectionSection
            badge="Handpicked"
            title="Handpicked Experiences"
            subtitle="Curated by our team of experts - only the best activities for your family"
            events={handpickedEvents}
            layout="grid"
            eventCardVariant="default"
            maxItems={16}
            enablePagination={true}
            viewAllLink="/collections/handpicked-experience"
            showPrice={true}
            showLocation={true}
            showAgeGroup={true}
            showWishlist={false}
          />
        )}

        {/* Why Choose Us */}
        <ScrollReveal>
          <WhyChooseUs />
        </ScrollReveal>

        {/* Customer Reviews */}
        <ScrollReveal>
          <ReviewCarouselSwiper />
        </ScrollReveal>

        {/* Google Reviews Carousel — renders nothing when empty */}
        <ScrollReveal>
          <GoogleReviewsCarousel />
        </ScrollReveal>

        {/* Latest Blogs */}
        {featuredBlogs && featuredBlogs.length > 0 && (
          <ScrollReveal>
            <FeaturedBlogsSection blogs={featuredBlogs} />
          </ScrollReveal>
        )}

        {/* FAQs */}
        <ScrollReveal>
          <HomepageFAQs faqItems={seoContentData?.seoContent?.faqItems} />
        </ScrollReveal>

        {/* Gift Card Promo */}
        <ScrollReveal>
          <GiftCardPromo />
        </ScrollReveal>

        {/* Stats Section */}
        <ScrollReveal>
          <StatsSection stats={stats} />
        </ScrollReveal>

        {/* Newsletter Subscribe */}
        <ScrollReveal>
          <NewsletterSubscribe />
        </ScrollReveal>
      </div>
    </>
  );
};

export default HomePage;