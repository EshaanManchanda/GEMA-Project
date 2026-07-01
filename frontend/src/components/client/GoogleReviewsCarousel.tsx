import React, { useEffect, useRef, useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import reviewsAPI from '@/services/api/reviewsAPI';
import logger from '@/utils/logger';

interface CarouselReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

const CARD_WIDTH = 320; // px — matches the card min-w below

const GoogleReviewsCarousel: React.FC = () => {
  const [reviews, setReviews] = useState<CarouselReview[]>([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await reviewsAPI.getHomepageGoogleReviews(12);
        if (!cancelled) setReviews(response.data?.reviews ?? []);
      } catch (err) {
        logger.error('Failed to load homepage Google reviews:', err);
        // Render nothing on error — no fake trust numbers
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? CARD_WIDTH + 16 : -(CARD_WIDTH + 16), behavior: 'smooth' });
  };

  // Render nothing when empty or loading (no placeholders, no fake data)
  if (loading || reviews.length === 0) return null;

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">What families are saying</h2>
            <p className="text-sm text-gray-500 mt-1">Real reviews from Google Maps</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel track */}
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-2 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {reviews.map((review, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 snap-start w-80 bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition"
            >
              {/* Author */}
              <div className="flex items-center gap-3 mb-3">
                {review.profile_photo_url ? (
                  <img
                    src={review.profile_photo_url}
                    alt={review.author_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {review.author_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  {review.author_url ? (
                    <a
                      href={review.author_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-gray-900 hover:text-blue-600 transition truncate block text-sm"
                    >
                      {review.author_name}
                    </a>
                  ) : (
                    <div className="font-semibold text-gray-900 truncate text-sm">{review.author_name}</div>
                  )}
                  <div className="text-xs text-gray-500">{review.relative_time_description}</div>
                </div>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>

              {/* Text */}
              {review.text && (
                <p className="text-gray-700 text-sm leading-relaxed line-clamp-4">{review.text}</p>
              )}
            </div>
          ))}
        </div>

        {/* Google attribution — required by TOS */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="text-xs text-gray-500">Reviews from</span>
          <img
            src="https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg"
            alt="Google"
            className="h-4"
          />
          <span className="text-xs text-gray-500">Maps</span>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviewsCarousel;
