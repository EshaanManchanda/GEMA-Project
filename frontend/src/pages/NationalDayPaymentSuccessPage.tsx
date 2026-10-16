import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiAlertCircle, FiLoader, FiArrowRight } from 'react-icons/fi';
import SEO from '@/components/common/SEO';
import nationalDayAPI from '@/services/api/nationalDayAPI';

type State = 'loading' | 'success' | 'error';

export default function NationalDayPaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const [submissionRef, setSubmissionRef] = useState('');
  const [studentName, setStudentName] = useState('');
  const [artworkTitle, setArtworkTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const hasFetched = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const submissionId = searchParams.get('submission_id');

    if (!sessionId || !submissionId) {
      setErrorMessage('Invalid payment confirmation link. Please contact support.');
      setState('error');
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const finalize = async () => {
      try {
        const result = await nationalDayAPI.finalizeSubmission(submissionId, sessionId);
        if (result.success) {
          setSubmissionRef(result.data.submissionRef);
          setStudentName(result.data.studentName);
          setArtworkTitle(result.data.artworkTitle || '');
          setState('success');
        } else {
          setErrorMessage(result.message || 'Failed to confirm your submission.');
          setState('error');
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          'We could not confirm your payment. If you were charged, please contact support with your session ID.';
        setErrorMessage(msg);
        setState('error');
      }
    };

    finalize();
  }, [searchParams]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 font-sans">
        <SEO title="Confirming Registration — Kidrove UAE National Day Art Competition 2026" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto mb-6">
            <FiLoader size={36} className="text-emerald-700 animate-spin" />
          </div>
          <h1 className="text-slate-900 text-2xl font-bold mb-2">Confirming your registration…</h1>
          <p className="text-slate-600 text-sm">Please wait while we verify your entry for Eid Al Etihad 2026.</p>
        </motion.div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-16 font-sans">
        <SEO title="Payment Issue — Kidrove UAE National Day Art Competition 2026" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-rose-200 rounded-3xl p-8 md:p-12 max-w-lg w-full text-center shadow-lg"
        >
          <div className="w-20 h-20 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle size={40} className="text-rose-600" />
          </div>
          <h1 className="text-slate-900 text-2xl font-bold mb-3">Verification Notice</h1>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">{errorMessage}</p>
          <div className="space-y-3">
            <Link
              to="/national-day-art-competition"
              className="block w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20"
            >
              Return to Competition Page
            </Link>
            <a
              href="mailto:support@kidrove.com"
              className="block w-full py-3.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all"
            >
              Contact Support
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-16 font-sans relative overflow-hidden">
      <SEO title="Registration Confirmed! — Kidrove UAE National Day Art Competition 2026" />

      {/* UAE themed soft ambient backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-200/30 via-rose-200/20 to-amber-200/30 blur-[130px] pointer-events-none rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 bg-white border border-slate-200/90 rounded-3xl p-8 md:p-12 max-w-xl w-full text-center shadow-xl shadow-slate-200/50"
      >
        {/* Success badge */}
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center mx-auto shadow-sm">
            <FiCheck size={48} className="text-emerald-600 stroke-[2.5]" />
          </div>
        </div>

        <p className="text-emerald-800 text-xs font-bold uppercase tracking-widest mb-2">
          Eid Al Etihad Celebration · 2026
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
          Entry Confirmed!
        </h1>
        <p className="text-slate-600 text-sm md:text-base mb-8">
          Thank you for celebrating the UAE with us! Your artwork entry for{' '}
          <strong className="text-slate-900 font-bold">{studentName}</strong> has been successfully received.
        </p>

        {/* Reference details card */}
        <div className="bg-[#FAF8F5] border border-slate-200 rounded-2xl p-6 text-left mb-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <span className="text-slate-500 text-xs uppercase font-bold">Submission Reference</span>
            <span className="font-mono font-bold text-amber-800 text-sm md:text-base tracking-wider">
              {submissionRef}
            </span>
          </div>
          {artworkTitle && (
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
              <span className="text-slate-500 text-xs uppercase font-bold">Artwork Title</span>
              <span className="text-slate-900 font-bold text-sm text-right truncate max-w-[240px]">
                "{artworkTitle}"
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
            <span className="text-slate-500 text-xs uppercase font-bold">Theme</span>
            <span className="text-slate-800 font-bold text-sm">
              My UAE, My Pride
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs uppercase font-bold">Results Day</span>
            <span className="text-emerald-800 font-bold text-sm">
              2 December 2026 (Eid Al Etihad)
            </span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="text-left bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 mb-8">
          <h4 className="text-emerald-950 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
            <span>📌</span> What Happens Next?
          </h4>
          <ul className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <li>• A confirmation email has been sent to your registered parent email address.</li>
            <li>• Our judging panel will evaluate the artwork across creativity, relevance, execution, and presentation.</li>
            <li>• Every eligible participant will receive an official <strong className="text-slate-900">Digital Participation Certificate</strong>.</li>
            <li>• Winners and selected gallery artworks will be revealed on 2 December 2026.</li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/national-day-art-competition"
            className="flex-1 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            Competition Page <FiArrowRight />
          </Link>
          <Link
            to="/"
            className="py-3.5 px-6 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all flex items-center justify-center"
          >
            Explore Kidrove
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
