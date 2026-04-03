import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle, XCircle, EyeOff, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import reviewsAPI from '@/services/api/reviewsAPI';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';

interface ReviewUser {
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface ReviewEvent {
  _id: string;
  title: string;
  slug?: string;
}

interface Review {
  _id: string;
  user: ReviewUser;
  event?: ReviewEvent;
  rating: number;
  title?: string;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  verified: boolean;
  createdAt: string;
  responses: { message: string; createdAt: string }[];
}

type TabType = 'pending' | 'all';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  hidden: 'bg-gray-100 text-gray-700',
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ))}
  </div>
);

const AdminReviewsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [moderating, setModerating] = useState<string | null>(null);

  const LIMIT = 20;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (activeTab === 'pending') {
        data = await reviewsAPI.getPendingReviews({ page, limit: LIMIT });
      } else {
        data = await reviewsAPI.getReviews({ page, limit: LIMIT });
      }
      const list: Review[] = data?.data?.reviews || data?.reviews || [];
      const total = data?.data?.pagination?.totalPages || data?.pagination?.totalPages || 1;
      setReviews(list);
      setTotalPages(total);
    } catch (err) {
      logger.error('Failed to fetch reviews', err);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Reset to page 1 when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    setRespondingTo(null);
  };

  const handleModerate = async (reviewId: string, status: 'approved' | 'rejected' | 'hidden') => {
    setModerating(reviewId);
    try {
      await reviewsAPI.moderateReview(reviewId, status);
      toast.success(`Review ${status}`);
      // Update local state immediately
      setReviews((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, status } : r))
      );
      // If on pending tab and now approved/rejected/hidden, remove from list
      if (activeTab === 'pending') {
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      }
    } catch (err) {
      logger.error('Moderation failed', err);
      toast.error('Failed to update review status');
    } finally {
      setModerating(null);
    }
  };

  const handleRespond = async (reviewId: string) => {
    if (!responseMessage.trim()) return;
    setSubmittingResponse(true);
    try {
      await reviewsAPI.respondToReview(reviewId, responseMessage.trim());
      toast.success('Response posted');
      setRespondingTo(null);
      setResponseMessage('');
      fetchReviews();
    } catch (err) {
      logger.error('Failed to post response', err);
      toast.error('Failed to post response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>
        <button
          onClick={fetchReviews}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['pending', 'all'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'pending' ? 'Pending' : 'All Reviews'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Star className="mx-auto w-10 h-10 text-gray-300 mb-3" />
              <p className="font-medium">No {activeTab === 'pending' ? 'pending' : ''} reviews</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Left: Review content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {review.user?.firstName} {review.user?.lastName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[review.status] || STATUS_BADGE.hidden}`}>
                          {review.status}
                        </span>
                        {review.verified && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Verified
                          </span>
                        )}
                      </div>

                      <StarRating rating={review.rating} />

                      {review.event && (
                        <Link
                          to={`/events/${review.event.slug || review.event._id}`}
                          className="text-sm text-blue-600 hover:underline mt-1 block truncate"
                        >
                          {review.event.title}
                        </Link>
                      )}

                      {review.title && (
                        <p className="font-medium text-gray-900 mt-2">{review.title}</p>
                      )}
                      {review.comment && (
                        <p className="text-gray-700 mt-1 text-sm leading-relaxed">{review.comment}</p>
                      )}

                      <p className="text-xs text-gray-400 mt-2">{formatDate(review.createdAt)}</p>

                      {/* Existing responses */}
                      {review.responses && review.responses.length > 0 && (
                        <div className="mt-3 pl-3 border-l-2 border-blue-200 space-y-1">
                          {review.responses.map((resp, i) => (
                            <p key={i} className="text-sm text-gray-600 italic">"{resp.message}"</p>
                          ))}
                        </div>
                      )}

                      {/* Respond form */}
                      {respondingTo === review._id && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                            placeholder="Write an official response..."
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            maxLength={1000}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespond(review._id)}
                              disabled={submittingResponse || !responseMessage.trim()}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {submittingResponse ? 'Posting...' : 'Post Response'}
                            </button>
                            <button
                              onClick={() => { setRespondingTo(null); setResponseMessage(''); }}
                              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col gap-2 flex-shrink-0">
                      {review.status !== 'approved' && (
                        <button
                          onClick={() => handleModerate(review._id, 'approved')}
                          disabled={moderating === review._id}
                          title="Approve"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}
                      {review.status !== 'rejected' && (
                        <button
                          onClick={() => handleModerate(review._id, 'rejected')}
                          disabled={moderating === review._id}
                          title="Reject"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      )}
                      {review.status !== 'hidden' && (
                        <button
                          onClick={() => handleModerate(review._id, 'hidden')}
                          disabled={moderating === review._id}
                          title="Hide"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setRespondingTo(respondingTo === review._id ? null : review._id);
                          setResponseMessage('');
                        }}
                        title="Respond"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Respond
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReviewsPage;
