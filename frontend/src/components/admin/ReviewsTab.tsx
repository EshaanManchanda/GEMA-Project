import React, { useState, useEffect } from 'react';
import { Star, MapPin, ExternalLink, RefreshCw, CheckCircle, XCircle, Eye, EyeOff, MessageSquare } from 'lucide-react';
import reviewsAPI from '@/services/api/reviewsAPI';
import adminAPI from '@/services/api/adminAPI';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';

interface Review {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  rating: number;
  title?: string;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  verified: boolean;
  createdAt: string;
  helpful: number;
  responses: any[];
}

interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface ReviewsTabProps {
  eventId: string;
  googlePlaceId: string;
  onGooglePlaceIdChange: (placeId: string) => void;
}

const ReviewsTab: React.FC<ReviewsTabProps> = ({
  eventId,
  googlePlaceId,
  onGooglePlaceIdChange,
}) => {
  const [platformReviews, setPlatformReviews] = useState<Review[]>([]);
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState(false);
  const [tempPlaceId, setTempPlaceId] = useState(googlePlaceId);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [googleRating, setGoogleRating] = useState(0);
  const [googleTotalRatings, setGoogleTotalRatings] = useState(0);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  // Fetch platform reviews
  useEffect(() => {
    if (eventId) {
      fetchPlatformReviews();
    }
  }, [eventId]);

  // Fetch Google reviews when Place ID exists
  useEffect(() => {
    if (googlePlaceId && eventId) {
      fetchGoogleReviews();
    }
  }, [googlePlaceId, eventId]);

  // Update temp Place ID when prop changes
  useEffect(() => {
    setTempPlaceId(googlePlaceId);
  }, [googlePlaceId]);

  const fetchPlatformReviews = async () => {
    try {
      setLoading(true);
      const response = await reviewsAPI.getEventReviews(eventId, {
        page: 1,
        limit: 50,
      });

      const reviews = response.data?.reviews || response.reviews || [];
      setPlatformReviews(reviews);

      // Calculate stats
      const totalReviews = reviews.length;
      const sum = reviews.reduce((acc: number, r: Review) => acc + r.rating, 0);
      const averageRating = totalReviews > 0 ? sum / totalReviews : 0;

      const distribution = reviews.reduce((acc: any, r: Review) => {
        acc[r.rating] = (acc[r.rating] || 0) + 1;
        return acc;
      }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

      setStats({ averageRating, totalReviews, distribution });
    } catch (error) {
      logger.error('Failed to load reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleReviews = async () => {
    if (!googlePlaceId) return;

    try {
      setGoogleLoading(true);
      const response = await reviewsAPI.getGoogleReviews(eventId);
      setGoogleReviews(response.data?.reviews || []);
      setGoogleRating(response.data?.rating || 0);
      setGoogleTotalRatings(response.data?.totalRatings || 0);
    } catch (error) {
      logger.error('Failed to load Google reviews:', error);
      toast.error('Failed to load Google reviews');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSavePlaceId = async () => {
    try {
      await adminAPI.updateEvent(eventId, { googlePlaceId: tempPlaceId });
      onGooglePlaceIdChange(tempPlaceId);
      setEditingPlaceId(false);
      toast.success('Google Place ID updated');

      // Fetch Google reviews if new ID is valid
      if (tempPlaceId) {
        fetchGoogleReviews();
      }
    } catch (error) {
      logger.error('Failed to update Google Place ID:', error);
      toast.error('Failed to update Google Place ID');
    }
  };

  const moderateReview = async (reviewId: string, status: string) => {
    try {
      await reviewsAPI.moderateReview(reviewId, status as 'approved' | 'rejected' | 'hidden');
      toast.success(`Review ${status}`);
      fetchPlatformReviews();
    } catch (error) {
      logger.error('Failed to moderate review:', error);
      toast.error('Failed to moderate review');
    }
  };

  const handleRespondToReview = async (reviewId: string) => {
    if (!responseMessage.trim()) {
      toast.error('Please enter a response message');
      return;
    }

    try {
      await reviewsAPI.respondToReview(reviewId, responseMessage);
      toast.success('Response posted successfully');
      setRespondingTo(null);
      setResponseMessage('');
      fetchPlatformReviews();
    } catch (error) {
      logger.error('Failed to respond to review:', error);
      toast.error('Failed to respond to review');
    }
  };

  const pendingCount = platformReviews.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-8">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 mt-1">Average Rating</div>
          <div className="flex items-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.round(stats.averageRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300'
                  }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">
            {stats.totalReviews}
          </div>
          <div className="text-sm text-gray-600 mt-1">Total Reviews</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">
            {pendingCount}
          </div>
          <div className="text-sm text-gray-600 mt-1">Pending Approval</div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">
            {googleReviews.length}
          </div>
          <div className="text-sm text-gray-600 mt-1">Google Reviews</div>
          {googleRating > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {googleRating.toFixed(1)} avg ({googleTotalRatings} total)
            </div>
          )}
        </div>
      </div>

      {/* Google Place ID Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
          Google Maps Integration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Place ID
            </label>
            {editingPlaceId ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempPlaceId}
                  onChange={(e) => setTempPlaceId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ChIJ..."
                />
                <button
                  onClick={handleSavePlaceId}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingPlaceId(false);
                    setTempPlaceId(googlePlaceId);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={googlePlaceId || 'Not configured'}
                  disabled
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                />
                <button
                  onClick={() => setEditingPlaceId(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Edit
                </button>
                {googlePlaceId && (
                  <button
                    onClick={fetchGoogleReviews}
                    disabled={googleLoading}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${googleLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Find your Place ID at{' '}
              <a
                href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Google Place ID Finder
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Platform Reviews Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Platform Reviews</h3>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading reviews...</div>
        ) : platformReviews.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No platform reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {platformReviews.map((review) => (
              <div
                key={review._id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">
                        {review.user.firstName} {review.user.lastName}
                      </div>
                      {review.verified && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          ✓ Verified
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${review.status === 'approved' ? 'bg-green-100 text-green-600' :
                          review.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                            review.status === 'hidden' ? 'bg-gray-100 text-gray-600' :
                              'bg-red-100 text-red-600'
                        }`}>
                        {review.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < review.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                            }`}
                        />
                      ))}
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {review.status === 'pending' && (
                      <>
                        <button
                          onClick={() => moderateReview(review._id, 'approved')}
                          className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200 transition"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moderateReview(review._id, 'rejected')}
                          className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {review.status === 'approved' && (
                      <button
                        onClick={() => moderateReview(review._id, 'hidden')}
                        className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                        title="Hide"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                    {review.status === 'hidden' && (
                      <button
                        onClick={() => moderateReview(review._id, 'approved')}
                        className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
                        title="Show"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setRespondingTo(respondingTo === review._id ? null : review._id)}
                      className="p-2 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition"
                      title="Respond"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {review.title && (
                  <div className="font-medium text-gray-900 mb-1">
                    {review.title}
                  </div>
                )}

                {review.comment && (
                  <div className="text-gray-600 text-sm mb-2">
                    {review.comment}
                  </div>
                )}

                {/* Response section */}
                {respondingTo === review._id && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Response
                    </label>
                    <textarea
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      rows={3}
                      placeholder="Write your response..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleRespondToReview(review._id)}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition"
                      >
                        Post Response
                      </button>
                      <button
                        onClick={() => {
                          setRespondingTo(null);
                          setResponseMessage('');
                        }}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {review.responses.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {review.responses.map((resp: any, idx: number) => (
                      <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="text-xs font-medium text-blue-900 mb-1">
                          {resp.isOfficial ? 'Official Response' : 'Response'}
                        </div>
                        <div className="text-sm text-gray-700">{resp.message}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4 text-xs text-gray-500 mt-2">
                  <span>Helpful: {review.helpful}</span>
                  <span>Responses: {review.responses.length}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Google Reviews Preview */}
      {googlePlaceId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Google Reviews Preview</h3>

          {googleLoading ? (
            <div className="text-center py-8 text-gray-500">Loading Google reviews...</div>
          ) : googleReviews.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No Google reviews available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {googleReviews.map((review, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    {review.profile_photo_url && (
                      <img
                        src={review.profile_photo_url}
                        alt={review.author_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{review.author_name}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                              }`}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-2">
                          {review.relative_time_description}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{review.text}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-center text-xs text-gray-500 py-2">
                Powered by Google
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
