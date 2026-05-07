import React from 'react';
import { useAuthContext } from '@/hooks/useAuthContext';
import { useReviewStatus } from '@/hooks/useReviewStatus';
import ReviewSubmissionForm from './ReviewSubmissionForm';
import { Loader } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface UserReviewStatusProps {
  eventId: string;
  eventSlug?: string;
  onSubmitSuccess: () => void;
}

const UserReviewStatus: React.FC<UserReviewStatusProps> = ({
  eventId,
  eventSlug,
  onSubmitSuccess,
}) => {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: reviewStatus, isLoading, isError } = useReviewStatus(
    eventId,
    !!user, // Only fetch if user is logged in
  );

  const handleReviewSubmitted = () => {
    // Refetch the review status to update the component
    queryClient.invalidateQueries({
      queryKey: ['reviewStatus', eventId],
    });
    onSubmitSuccess();
  };

  // User not logged in - show message and login button
  if (!user) {
    return (
      <div className="bg-white rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Share your experience in one line
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-gray-700 mb-4">Please login to submit a review</p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Login to Review
          </a>
        </div>
      </div>
    );
  }

  // User is logged in - check booking and review status
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 flex justify-center items-center min-h-[200px]">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !reviewStatus) {
    // Fallback - show the review form anyway
    return (
      <ReviewSubmissionForm
        eventId={eventId}
        onSubmitSuccess={handleReviewSubmitted}
        hasAlreadyReviewed={false}
      />
    );
  }

  // User has not booked the event - show public reviews only, no form
  if (!reviewStatus.hasBooked) {
    return (
      <div className="bg-white rounded-xl p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-gray-700">
            <span className="font-semibold">You must book this event</span> to submit a review.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Book the event first to share your experience with other users.
          </p>
        </div>
      </div>
    );
  }

  // User has booked but already reviewed - show thank you message
  if (reviewStatus.hasReviewed) {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
          <p className="text-emerald-800 font-semibold">
            You have successfully booked this event.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/bookings/${eventSlug || eventId}`}
              className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
            >
              Go to Booking
            </a>
            <a
              href={`/booking/${eventSlug || eventId}`}
              className="inline-flex items-center px-4 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition text-sm font-medium"
            >
              Book Another Slot
            </a>
          </div>
        </div>
        <ReviewSubmissionForm
          eventId={eventId}
          onSubmitSuccess={handleReviewSubmitted}
          hasAlreadyReviewed={true}
        />
      </div>
    );
  }

  // User has booked and not reviewed yet - show review form
  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
        <p className="text-emerald-800 font-semibold">
          You have successfully booked this event.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/bookings/${eventSlug || eventId}`}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
          >
            Go to Booking
          </a>
          <a
            href={`/booking/${eventSlug || eventId}`}
            className="inline-flex items-center px-4 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition text-sm font-medium"
          >
            Book Another Slot
          </a>
        </div>
      </div>
      <ReviewSubmissionForm
        eventId={eventId}
        onSubmitSuccess={handleReviewSubmitted}
        hasAlreadyReviewed={false}
      />
    </div>
  );
};

export default UserReviewStatus;
