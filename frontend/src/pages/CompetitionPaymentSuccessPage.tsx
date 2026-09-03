import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCheck, FiAlertCircle, FiLoader } from 'react-icons/fi';
import SEO from '@/components/common/SEO';
import competitionAPI from '@/services/api/competitionAPI';

type State = 'loading' | 'success' | 'error';

export default function CompetitionPaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const [submissionRef, setSubmissionRef] = useState('');
  const [studentName, setStudentName] = useState('');
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
        const result = await competitionAPI.finalizeSubmission(submissionId, sessionId);
        if (result.success) {
          setSubmissionRef(result.data.submissionRef);
          setStudentName(result.data.studentName);
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

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#0E1525] flex items-center justify-center px-4">
        <SEO title="Confirming Payment — KidRove AI Art Competition 2026" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <FiLoader size={36} className="text-amber-400 animate-spin" />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Confirming your payment…</h1>
          <p className="text-slate-400 text-sm">Please wait while we verify your payment and secure your entry.</p>
        </motion.div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-[#0E1525] flex items-center justify-center px-4 py-16">
        <SEO title="Payment Issue — KidRove AI Art Competition 2026" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800/50 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 md:p-12 max-w-lg w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle size={40} className="text-red-400" />
          </div>
          <h1 className="text-white text-2xl font-bold mb-3">Payment Confirmation Failed</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{errorMessage}</p>
          <div className="space-y-3">
            <a
              href="/ai-art-competition"
              className="block w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all"
            >
              Return to Competition Page
            </a>
            <a
              href="mailto:support@kidrove.com"
              className="block w-full py-3 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 font-semibold text-sm transition-all"
            >
              Contact Support
            </a>
          </div>
          <p className="text-slate-600 text-xs mt-6">
            If you were charged and see this error, please email us with your session ID from the URL.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0E1525] text-slate-350 flex items-center justify-center px-4 py-16 font-sans">
      <SEO title="Submission Successful — KidRove AI Art Competition 2026" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center relative overflow-hidden"
      >
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 15 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
        >
          <FiCheck size={48} className="text-white stroke-[3]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-white text-3xl font-black mb-2"
        >
          🎉 Entry Submitted!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-slate-400 mb-6 text-sm"
        >
          {studentName ? `${studentName}'s` : 'Your'} AI Art competition entry has been received and payment confirmed.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-4 inline-block mb-8 text-center"
        >
          <span className="text-slate-500 text-xs uppercase font-extrabold tracking-widest block mb-1">
            Your Submission ID
          </span>
          <span className="text-amber-300 font-extrabold text-2xl tracking-wider select-all">
            {submissionRef}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="text-left bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6"
        >
          <h2 className="text-white font-extrabold text-base mb-4 flex items-center gap-2">
            <span>📌</span> What happens next?
          </h2>
          {[
            { icon: '📩', title: 'Email Confirmation', desc: 'You will receive an email confirmation containing your submission ID shortly.' },
            { icon: '📜', title: 'Participation Certificate', desc: 'Every qualifying student will receive a Kidrove Certificate of Participation.' },
            { icon: '🏆', title: 'Winners will be Announced', desc: 'Entries will be evaluated by our judging panel. Winners receive Gold, Silver or Bronze medals!' },
            { icon: '🎨', title: 'Virtual Exhibition', desc: 'Outstanding creations will be exhibited in the Kidrove AI Art Gallery.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.08 }}
              className="flex gap-3 items-start mb-4 last:mb-0 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3"
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <h4 className="text-white font-bold text-xs">{item.title}</h4>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8">
          <a
            href="/ai-art-competition"
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all border border-slate-600 inline-block"
          >
            Submit Another Entry
          </a>
        </div>
      </motion.div>
    </div>
  );
}
