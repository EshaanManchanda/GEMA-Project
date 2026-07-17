import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { reviewLinkAPI, type ReviewLinkContext } from '../services/api/reviewLinkAPI';

type Step = 'details' | 'loading' | 'form' | 'done' | 'already' | 'error';

const MAX_MEDIA_FILES = 5;
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB, mirrors backend MAX_IMAGE_SIZE default
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB, mirrors backend MAX_VIDEO_SIZE default

interface PendingFile {
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
}

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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [mediaError, setMediaError] = useState('');
  const createdObjectUrls = useRef<string[]>([]);

  // Revoke every object URL ever created for this session on unmount
  useEffect(() => {
    const urls = createdObjectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file after removal
    if (selected.length === 0) return;

    setMediaError('');

    const room = MAX_MEDIA_FILES - pendingFiles.length;
    if (room <= 0) {
      setMediaError(`You can attach up to ${MAX_MEDIA_FILES} files.`);
      return;
    }

    const accepted: PendingFile[] = [];
    const rejected: string[] = [];

    for (const file of selected.slice(0, room)) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        rejected.push(`${file.name} (unsupported type)`);
        continue;
      }
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
      if (file.size > maxSize) {
        rejected.push(`${file.name} (too large)`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      createdObjectUrls.current.push(previewUrl);
      accepted.push({ file, previewUrl, kind: isImage ? 'image' : 'video' });
    }

    if (selected.length > room) {
      rejected.push(`Only ${room} more file(s) can be added (max ${MAX_MEDIA_FILES}).`);
    }
    if (rejected.length > 0) setMediaError(rejected.join(', '));

    setPendingFiles((prev) => [...prev, ...accepted]);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { setError('Please select a rating.'); return; }

    setSubmitting(true);
    setError('');
    try {
      let media: Array<{ type: 'image' | 'video'; url: string; order: number }> | undefined;

      if (pendingFiles.length > 0) {
        const uploadRes = await reviewLinkAPI.uploadMedia(
          eventId!,
          email,
          pendingFiles.map((p) => p.file),
        );
        media = uploadRes.data.data.media;
        if (uploadRes.data.data.failed.length > 0) {
          setMediaError(
            `Some files couldn't be uploaded: ${uploadRes.data.data.failed.map((f) => f.file).join(', ')}`,
          );
        }
      }

      await reviewLinkAPI.submitReview(eventId!, {
        email,
        rating,
        comment: comment.trim() || undefined,
        media,
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photos / Videos <span className="text-gray-400 font-normal">(optional, up to {MAX_MEDIA_FILES})</span>
              </label>

              {pendingFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {pendingFiles.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {p.kind === 'image' ? (
                        <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={p.previewUrl} className="w-full h-full object-cover" muted />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {pendingFiles.length < MAX_MEDIA_FILES && (
                <label className="flex items-center justify-center border border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition">
                  <span>Add photos or videos</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFilesSelected}
                    className="hidden"
                  />
                </label>
              )}

              {mediaError && <p className="text-amber-600 text-xs mt-1">{mediaError}</p>}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !rating}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (pendingFiles.length > 0 ? 'Uploading & submitting…' : 'Submitting…') : 'Submit Review'}
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
