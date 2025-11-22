import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { FaStar, FaStarHalfAlt, FaRegStar, FaQuoteLeft } from "react-icons/fa";
import reviewsAPI from '../../services/api/reviewsAPI';
import { Review, TestimonialReview } from '../../types/review';

// Fallback reviews for when API is unavailable
const fallbackReviews: TestimonialReview[] = [
  {
    _id: "fallback-1",
    title: "Orange Wheels Summer Camp: Wonder on Wheels - Dubai",
    comment: "The idea of exploring the different countries and cultures of the world is amazing. My kids learned so much while having fun!",
    rating: 5,
    user: {
      name: "Sarah M.",
    },
    date: "2 days ago",
    verified: true,
  },
  {
    _id: "fallback-2",
    title: "Fundraise with #TeamKidzApp",
    comment: "It's always important to help – kudos to Kidzapp and Al Jalila Foundation for this initiative. My family was happy to participate!",
    rating: 5,
    user: {
      name: "Ahmed K.",
    },
    date: "3 days ago",
    verified: true,
  },
  {
    _id: "fallback-3",
    title: "Kids Club Access at Atlantis",
    comment: "Great time!! The pool is amazing and the staff were all very friendly! My children didn't want to leave and are already asking when we can go back.",
    rating: 5,
    user: {
      name: "Jessica T.",
    },
    date: "1 week ago",
    verified: true,
  },
];

const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) stars.push(<FaStar key={i} className="text-yellow-400" />);
    else if (i - rating < 1) stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
    else stars.push(<FaRegStar key={i} className="text-gray-300" />);
  }
  return <div className="flex gap-1">{stars}</div>;
};

export default function ReviewCarouselSwiper() {
  const [reviews, setReviews] = useState<TestimonialReview[]>(fallbackReviews);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await reviewsAPI.getFeaturedReviews(10);
        
        if (response.success && response.data?.reviews?.length > 0) {
          // Transform API reviews to testimonial format
          const testimonials: TestimonialReview[] = response.data.reviews.map((review: Review) => ({
            _id: review._id,
            title: review.event?.title || review.title,
            comment: review.comment,
            rating: review.rating,
            user: {
              name: `${review.user.firstName} ${review.user.lastName.charAt(0)}.`,
              avatar: review.user.avatar
            },
            event: review.event ? {
              title: review.event.title,
              image: review.event.images?.[0]
            } : undefined,
            date: formatDate(review.createdAt),
            verified: review.verified
          }));
          
          setReviews(testimonials);
          setUsingFallback(false);
        } else {
          // Use fallback if no reviews found
          setReviews(fallbackReviews);
          setUsingFallback(true);
        }
      } catch (err: any) {
        // Silently handle 401 errors (unauthorized) - just use fallback data
        if (err.response?.status !== 401) {
          console.error('Error fetching reviews:', err);
        }
        setReviews(fallbackReviews);
        setUsingFallback(true);
        
        if (err.response?.status === 429) {
          setError('Loading reviews... Please wait a moment');
        } else if (err.response?.status === 401) {
          // Don't show error for unauthorized - just use fallback silently
          setError(null);
        } else {
          setError('Failed to load latest reviews');
        }
      } finally {
        setLoading(false);
      }
    };

    // Add delay to reduce API call frequency
    const timeoutId = setTimeout(fetchReviews, 800);
    return () => clearTimeout(timeoutId);
  }, []);

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Only enable loop if we have enough slides (minimum 6 for 3 slides per view)
  const enableLoop = reviews.length >= 6;
  
  return (
    <section className="w-full py-20 bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
            <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>Testimonials</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Kids Activities Reviews by Real Parents</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">See what families are saying about their experiences with activities booked through Kidzapp</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-14">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md p-8 min-h-[320px] animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded mb-4"></div>
                <div className="w-3/4 h-6 bg-gray-200 rounded mb-4"></div>
                <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                <div className="w-2/3 h-4 bg-gray-200 rounded mb-6"></div>
                <div className="flex items-center gap-4 mt-auto pt-4 border-t border-gray-100">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="w-16 h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <div key={star} className="w-4 h-4 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            navigation
            pagination={{ clickable: true }}
            spaceBetween={30}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 }
            }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            loop={enableLoop}
            className="pb-14"
          >
            {reviews.map((review) => (
              <SwiperSlide key={review._id}>
                <div className="bg-white rounded-xl shadow-md p-8 min-h-[320px] flex flex-col gap-4 hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <FaQuoteLeft className="text-3xl opacity-20" style={{ color: 'var(--primary-color)' }} />
                    {review.verified && (
                      <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Verified
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-lg line-clamp-1" style={{ color: 'var(--primary-color)' }}>{review.title}</h4>
                  <h3 className="text-xl font-bold">"My kids loved it!"</h3>
                  <p className="text-gray-700 flex-grow line-clamp-4">{review.comment}</p>
                  <div className="pt-4 mt-auto border-t border-gray-100 flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
                      {review.user.avatar ? (
                        <img src={review.user.avatar} alt={review.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold" style={{ color: 'var(--primary-color)' }}>
                          {review.user.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{review.user.name}</p>
                      <p className="text-sm text-gray-700">{review.date}</p>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-700">{review.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
        
        {usingFallback && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-700">
              {error ? 'Showing sample reviews. ' : 'Loading latest reviews...'}
              <span className="text-blue-600">Real reviews coming soon!</span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
