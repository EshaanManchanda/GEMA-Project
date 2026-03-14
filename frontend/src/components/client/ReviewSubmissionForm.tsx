import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
import reviewsAPI from '@/services/api/reviewsAPI';
import toast from 'react-hot-toast';
import { logger } from '@/utils/logger';
import { useAuthContext } from '@/hooks/useAuthContext';
import { useNavigate } from 'react-router-dom';

interface ReviewSubmissionFormProps {
  eventId: string;
  onSubmitSuccess: () => void;
}

const ReviewSubmissionForm: React.FC<ReviewSubmissionFormProps> = ({
  eventId,
  onSubmitSuccess,
}) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is logged in
    if (!user) {
      toast.error('Please login to submit a review');
      navigate('/login');
      return;
    }

    // Validate rating
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    // Validate comment
    if (!comment.trim()) {
      toast.error('Please write a review');
      return;
    }

    try {
      setSubmitting(true);

      await reviewsAPI.createReview({
        type: 'event',
        targetId: eventId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });

      toast.success('Review submitted successfully! It will appear after approval.');

      // Reset form
      setRating(0);
      setTitle('');
      setComment('');

      // Notify parent to refresh reviews
      onSubmitSuccess();
    } catch (error: any) {
      logger.error('Failed to submit review:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to submit review. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Star className="w-6 h-6 text-blue-600" />
        Write a Review
      </h3>

      {!user ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-gray-700 mb-4">Please login to submit a review</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Login to Review
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Your Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-all duration-200 transform hover:scale-110"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`w-10 h-10 ${star <= (hoverRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                      }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-3 self-center text-gray-700 font-medium">
                  {rating} {rating === 1 ? 'star' : 'stars'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Click to select your rating (1 = Poor, 5 = Excellent)
            </p>
          </div>

          {/* Review Title (Optional) */}
          <div>
            <label htmlFor="review-title" className="block text-sm font-semibold text-gray-700 mb-2">
              Review Title <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id="review-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Sum up your experience in one line..."
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                e.g., "Amazing experience!", "Great for kids!"
              </p>
              <span className="text-xs text-gray-500">
                {title.length}/100
              </span>
            </div>
          </div>

          {/* Review Comment */}
          <div>
            <label htmlFor="review-comment" className="block text-sm font-semibold text-gray-700 mb-2">
              Your Review <span className="text-red-500">*</span>
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={5}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
              placeholder="Share your experience with this event. What did you enjoy? What could be improved? Help others make an informed decision..."
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                Be specific and constructive. Minimum 10 characters.
              </p>
              <span className="text-xs text-gray-500">
                {comment.length}/2000
              </span>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Review Guidelines:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Be honest and constructive in your feedback</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Focus on your personal experience with the event</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Keep your review respectful and appropriate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">✗</span>
                <span>Don't include personal contact information</span>
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || rating === 0 || !comment.trim() || comment.trim().length < 10}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none font-semibold"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Review
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Your review will be published after moderation (usually within 24-48 hours)
          </p>
        </form>
      )}
    </div>
  );
};

export default ReviewSubmissionForm;
