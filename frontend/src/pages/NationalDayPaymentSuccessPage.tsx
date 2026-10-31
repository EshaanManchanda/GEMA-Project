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
  const [grade, setGrade] = useState('');
  const [category, setCategory] = useState('');
  const [isLittleArtist, setIsLittleArtist] = useState(false);
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
          setGrade(result.data.grade || '');
          setCategory(result.data.category || '');
          setIsLittleArtist(Boolean(result.data.isLittleArtist));
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
        <SEO title="Confirming Registration — Kidrove Eid Al Etihad Children's Art Competition 2026" />
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
        <SEO title="Payment Issue — Kidrove Eid Al Etihad Children's Art Competition 2026" />
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
      <SEO title="Registration Confirmed! — Kidrove Eid Al Etihad Children's Art Competition 2026" />

      {/* UAE themed soft ambient backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-200/30 via-rose-200/20 to-amber-200/30 blur-[130px] pointer-events-none rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 md:p-12 max-w-xl w-full text-center shadow-xl shadow-slate-200/50"
      >
        {/* Success badge */}
        <div className="relative inline-block mb-4">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center mx-auto shadow-sm">
            <FiCheck size={40} className="text-emerald-600 stroke-[2.5]" />
          </div>
        </div>

        <p className="text-emerald-800 text-xs font-bold uppercase tracking-widest mb-1.5">
          Eid Al Etihad Children's Art Competition 2026
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
          Registration & Payment Confirmed!
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mb-6">
          Thank you! Entry fee for <strong className="text-slate-900 font-bold">{studentName}</strong> (
          {grade ? `${grade} · ` : ''}{category}) has been successfully paid (AED 50.00).
        </p>

        {/* Reference details card */}
        <div className="bg-[#FAF8F5] border-2 border-dashed border-amber-300 rounded-2xl p-5 sm:p-6 text-center mb-6">
          <span className="text-amber-900 text-xs uppercase font-extrabold tracking-wider block mb-1">
            Official Reference Number
          </span>
          <div className="font-mono font-black text-amber-700 text-2xl sm:text-3xl tracking-widest my-1 select-all">
            {submissionRef}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            This reference has also been emailed to the registered parent email address.
          </p>
        </div>

        {/* Dynamic Phase 2 Action Card */}
        {isLittleArtist ? (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 border-2 border-emerald-300 rounded-2xl p-6 text-left mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📥</span>
              <h3 className="text-base font-black text-emerald-950">
                Download Official Colouring Template
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              For <strong>Kindergarten to Grade 2</strong> students: download and print your official UAE National Day outline templates.
            </p>
            <div className="bg-amber-100/80 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 font-bold mb-4 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <span><strong>Please Note:</strong> The PDF contains 3 different template designs. Please <u>choose and colour any ONE template only</u> of your choice (you do not need to colour all 3).</span>
            </div>
            <a
              href="/assets/eid-al-etihad-colouring-template.pdf"
              download="eid-al-etihad-colouring-template.pdf"
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/25 hover:scale-[1.01]"
            >
              <span>📥 Download Colouring Template (PDF - 3 Options)</span>
            </a>
            <div className="mt-4 pt-4 border-t border-emerald-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-slate-600">Finished colouring?</span>
              <Link
                to={`/national-day-art-competition/submit?ref=${encodeURIComponent(submissionRef)}`}
                className="text-emerald-800 font-extrabold hover:underline flex items-center gap-1"
              >
                Upload Colored Template Here <FiArrowRight />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 border-2 border-blue-200 rounded-2xl p-6 text-left mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎨</span>
              <h3 className="text-base font-black text-blue-950">
                Phase 2: Submit Original Artwork
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              For <strong>{category} ({grade})</strong>: create your original traditional drawing or painting based on <em>"My UAE, My Pride"</em>. When ready, upload a clear photo or scan (&lt;1 MB) before the <strong>15 December 2026</strong> deadline.
            </p>
            <Link
              to={`/national-day-art-competition/submit?ref=${encodeURIComponent(submissionRef)}`}
              className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/25 hover:scale-[1.01]"
            >
              <span>🎨 Go to Artwork Submission Page</span> <FiArrowRight />
            </Link>
          </div>
        )}

        {/* Timeline & Next Steps */}
        <div className="text-left bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
          <h4 className="text-slate-900 text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <span>🗓️</span> Important Deadlines & Next Steps
          </h4>
          <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <li>• <strong>15 Dec 2026:</strong> Final deadline to upload artwork or coloured template.</li>
            <li>• <strong>16–29 Dec 2026:</strong> Judging panel review across all seven emirates.</li>
            <li>• <strong>30 Dec 2026:</strong> Official winners announcement online.</li>
            <li>• <strong>31 Jan 2027:</strong> Grand Award Ceremony in the UAE.</li>
            <li>• Every eligible student receives a physical certificate honoring their effort.</li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={`/national-day-art-competition/submit?ref=${encodeURIComponent(submissionRef)}`}
            className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            Submit Artwork <FiArrowRight />
          </Link>
          <Link
            to="/national-day-art-competition"
            className="py-3 px-5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center justify-center"
          >
            Competition Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
