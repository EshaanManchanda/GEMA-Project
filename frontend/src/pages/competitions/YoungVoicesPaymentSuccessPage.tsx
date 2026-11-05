import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiAlertCircle, FiLoader, FiArrowRight } from 'react-icons/fi';
import SEO from '@/components/common/SEO';
import gccCompetitionAPI from '@/services/api/gccCompetitionAPI';

type State = 'loading' | 'success' | 'error';

export default function YoungVoicesPaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const [submissionRef, setSubmissionRef] = useState('');
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
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
        const result = await gccCompetitionAPI.finalizeSubmission(submissionId, sessionId);
        if (result.success) {
          setSubmissionRef(result.data.submissionRef);
          setStudentName(result.data.studentName);
          setGrade(result.data.grade || '');
          setCategory(result.data.category || '');
          setCountry(result.data.country || '');
          setState('success');
        } else {
          setErrorMessage(result.message || 'Failed to confirm your registration.');
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
        <SEO title="Confirming Registration — Young Voices of the GCC 2027" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-teal-100 border border-teal-300 flex items-center justify-center mx-auto mb-6">
            <FiLoader size={36} className="text-teal-700 animate-spin" />
          </div>
          <h1 className="text-slate-900 text-2xl font-bold mb-2">Confirming your registration…</h1>
          <p className="text-slate-600 text-sm">Please wait while we verify your entry for Young Voices of the GCC 2027.</p>
        </motion.div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-16 font-sans">
        <SEO title="Payment Issue — Young Voices of the GCC 2027" />
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
              to="/competitions/young-voices-of-the-gcc"
              className="block w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition-all shadow-md shadow-teal-700/20"
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
      <SEO title="Registration Confirmed! — Young Voices of the GCC 2027" />

      {/* Ambient backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-teal-200/30 via-emerald-200/20 to-cyan-200/30 blur-[130px] pointer-events-none rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 md:p-12 max-w-xl w-full text-center shadow-xl shadow-slate-200/50"
      >
        {/* Success badge */}
        <div className="relative inline-block mb-4">
          <div className="w-20 h-20 rounded-full bg-teal-50 border-2 border-teal-300 flex items-center justify-center mx-auto shadow-sm">
            <FiCheck size={40} className="text-teal-700 stroke-[2.5]" />
          </div>
        </div>

        <p className="text-teal-800 text-xs font-bold uppercase tracking-widest mb-1.5">
          Young Voices of the GCC 2027
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
          Registration & Payment Confirmed!
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mb-6">
          Thank you! Entry fee for <strong className="text-slate-900 font-bold">{studentName}</strong> (
          {grade ? `${grade} · ` : ''}{category}{country ? ` · ${country}` : ''}) has been successfully paid (AED 50.00).
        </p>

        {/* Reference details card */}
        <div className="bg-[#FAFDFD] border-2 border-dashed border-teal-300 rounded-2xl p-5 sm:p-6 text-center mb-6">
          <span className="text-teal-900 text-xs uppercase font-extrabold tracking-wider block mb-1">
            Official Reference Number
          </span>
          <div className="font-mono font-black text-teal-800 text-2xl sm:text-3xl tracking-widest my-1 select-all">
            {submissionRef}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            This reference and login instructions have also been sent to your email.
          </p>
        </div>

        {/* Next step card */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50/70 border-2 border-teal-300 rounded-2xl p-6 text-left mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">✍️</span>
            <h3 className="text-base font-black text-teal-950">
              Submit Your Story Manuscript
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Theme: <em>&ldquo;Our Heritage, Our Story&rdquo;</em>. If you did not upload your completed manuscript during registration, you can upload it anytime before the <strong>31 January 2027</strong> deadline.
          </p>
          <Link
            to={`/competitions/young-voices-of-the-gcc/submit?ref=${encodeURIComponent(submissionRef)}`}
            className="w-full py-3.5 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-700/25 hover:scale-[1.01]"
          >
            <span>📖 Submit Story Online</span> <FiArrowRight />
          </Link>
        </div>

        {/* Timeline & Next Steps */}
        <div className="text-left bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
          <h4 className="text-slate-900 text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <span>🗓️</span> Important Deadlines & Next Steps
          </h4>
          <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <li>• <strong>31 Jan 2027:</strong> Final deadline to submit your story manuscript.</li>
            <li>• <strong>February 2027:</strong> Editorial jury assessment across all GCC member states.</li>
            <li>• <strong>March 2027:</strong> Official results announcement & anthology publication.</li>
            <li>• Every eligible participant receives a verifiable Kidrove Certificate of Participation.</li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={`/competitions/young-voices-of-the-gcc/submit?ref=${encodeURIComponent(submissionRef)}`}
            className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            Submit Story <FiArrowRight />
          </Link>
          <Link
            to="/competitions/young-voices-of-the-gcc"
            className="py-3 px-5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center justify-center"
          >
            Competition Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

