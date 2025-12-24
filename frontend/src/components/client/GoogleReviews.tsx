import React from 'react';
import { Star } from 'lucide-react';

interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface GoogleReviewsProps {
  reviews: GoogleReview[];
  averageRating: number;
  totalRatings: number;
}

const GoogleReviews: React.FC<GoogleReviewsProps> = ({
  reviews,
  averageRating,
  totalRatings,
}) => {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mx-auto text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
        <p className="text-gray-600 text-lg">No Google reviews available</p>
        <p className="text-gray-500 text-sm mt-2">Check back later for Google Maps reviews</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Rating Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-600">
              {averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1 mt-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(averageRating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-600 mt-2 font-medium">
              Based on {totalRatings.toLocaleString()} {totalRatings === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          <div className="flex-1 border-l border-blue-200 pl-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              What customers say on Google Maps
            </h3>
            <p className="text-sm text-gray-600">
              These reviews are sourced from Google Maps and represent real customer experiences.
              Showing the {reviews.length} most recent reviews.
            </p>
          </div>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.map((review, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-200 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              {/* Author Avatar */}
              {review.profile_photo_url ? (
                <img
                  src={review.profile_photo_url}
                  alt={review.author_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                  {review.author_name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Author Name & Rating */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {review.author_url ? (
                        <a
                          href={review.author_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-gray-900 hover:text-blue-600 transition truncate"
                        >
                          {review.author_name}
                        </a>
                      ) : (
                        <div className="font-semibold text-gray-900 truncate">
                          {review.author_name}
                        </div>
                      )}
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Google User
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        {review.relative_time_description}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {review.text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Google Attribution - REQUIRED by Google TOS */}
      <div className="text-center py-6 border-t border-gray-200">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-full shadow-sm">
          <span className="text-sm text-gray-600 font-medium">Powered by</span>
          <img
            src="https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg"
            alt="Google"
            className="h-5"
          />
          <span className="text-sm text-gray-600">Maps</span>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Reviews are sourced from Google Maps and may not represent all customer experiences
        </p>
      </div>
    </div>
  );
};

export default GoogleReviews;
