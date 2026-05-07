import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { reviewLinkAPI, type ReviewLinkContext } from '../services/api/reviewLinkAPI';

type Step = 'details' | 'loading' | 'form' | 'done' | 'already' | 'error';

const StarRating: React.FC<{ value: number; onChange: (v: number) => void }> = ({
  value,
  onChange,
}) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className={`text-3xl transition-colors ${star <= value ? 'text-yellow-400' : 'text-gray-300'}`}
      >
        ★
      </button>
    ))}
  </div>
);

const ReviewLinkPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>('details');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [ctx, setCtx] = useState<ReviewLinkContext | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If email pre-filled in URL, skip directly to resolving context
  useEffect(() => {
    if (email && eventId) {
      resolveContext(email);
    }
  }, []);

  const resolveContext = async (emailAddr: string) => {
    setStep('loading');
    try {
      const res = await reviewLinkAPI.getContext(eventId!, emailAddr, { firstName, lastName, schoolName });
      const data = res.data.data;
      setCtx(data);
      setStep(data.alreadyReviewed ? 'already' : 'form');
    } catch {
      setStep('error');
      setError('Could not load review page. Please try again later.');
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    resolveContext(email.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { setError('Please select a rating.'); return; }

    setSubmitting(true);
    setError('');
    try {
      await reviewLinkAPI.submitReview(eventId!, {
        email,
        rating,
        comment: comment.trim() || undefined,
      });
      setStep('done');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Submission failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Share Your Experience</h1>
          {ctx?.eventTitle && (
            <p className="text-gray-500 mt-1 text-sm">{ctx.eventTitle}</p>
          )}
        </div>

        {step === 'loading' && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <p className="text-gray-600 text-sm">Enter your details to submit your review.</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="School / Institution (optional)"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 transition"
            >
              Continue
            </button>
          </form>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Tell us about your experience…"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !rating}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-semibold text-gray-900">Thank you!</h2>
            <p className="text-gray-500 text-sm">
              Your review has been submitted. Check your email for your certificate of participation.
            </p>
          </div>
        )}

        {step === 'already' && (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-semibold text-gray-900">Already reviewed</h2>
            <p className="text-gray-500 text-sm">
              You have already submitted a review for this event. Thank you!
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-6 space-y-3">
            <div className="text-5xl">⚠️</div>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewLinkPage;
