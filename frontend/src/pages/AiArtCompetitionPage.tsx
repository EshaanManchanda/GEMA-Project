import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiUpload,
  FiCheck, FiChevronRight, FiChevronLeft, FiAlertCircle,
  FiAward, FiStar, FiImage, FiTrash2, FiChevronDown, FiX, FiMail
} from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi2';
import SEO from '@/components/common/SEO';
import competitionAPI, { CompetitionSubmitPayload } from '@/services/api/competitionAPI';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const AT_A_GLANCE = [
  { icon: '🧑‍🎓', label: 'Who can participate', value: 'Grades 1–12' },
  { icon: '👤', label: 'Participation', value: 'Individual' },
  { icon: '🖼️', label: 'Submission', value: '1 AI-generated artwork' },
  { icon: '📁', label: 'Format', value: 'JPG / PNG' },
  { icon: '📝', label: 'Optional', value: '100-word description' },
  { icon: '🤖', label: 'AI Tools', value: 'Any Generative AI tool' },
];

const IMPORTANT_DATES = [
  { label: 'Competition Opens', date: '1st September 2026', icon: '🚀' },
  { label: 'Registration Deadline', date: '1st October 2026', icon: '📋' },
  { label: 'Submission Deadline', date: '15th October 2026', icon: '🎨' },
  { label: 'Results Announcement', date: '1st November 2026', icon: '🏆' },
];

const COHORTS = [
  { label: 'AI Dreamers 🌟', grades: 'Grades 1–3', color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30' },
  { label: 'AI Creators 🎨', grades: 'Grades 4–6', color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30' },
  { label: 'AI Explorers 🚀', grades: 'Grades 7–9', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30' },
  { label: 'AI Visionaries 💡', grades: 'Grades 10–12', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30' },
];

const JUDGING_CRITERIA = [
  { label: 'Creativity & Originality', marks: 30, color: 'bg-amber-500' },
  { label: 'Connection to Theme', marks: 25, color: 'bg-blue-500' },
  { label: 'Visual Impact', marks: 25, color: 'bg-emerald-500' },
  { label: 'Imagination', marks: 20, color: 'bg-purple-500' },
];

const WHAT_NOT_TO_DO = [
  "Submit an artwork downloaded from the internet.",
  "Submit artwork created entirely by another person.",
  "Submit another student's work.",
  "Copy or reproduce another participant's artwork.",
  "Use copyrighted characters, logos or artwork in a way that violates copyright or trademark rights.",
  "Create offensive, hateful, discriminatory or inappropriate content.",
  "Create content involving graphic violence, explicit material or disturbing imagery.",
  "Create political propaganda or content targeting political parties, governments or individuals.",
  "Use AI to impersonate real people in a misleading or inappropriate manner.",
  "Submit misleading or deceptive content presented as a real photograph.",
  "Use AI-generated content that violates the rules or terms of the AI platform being used.",
  "Submit someone else's AI artwork and claim it as their own.",
];

const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
];

const EMIRATES = [
  'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman',
  'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah',
];

const AI_TOOLS = [
  'Canva AI / Canva Magic Media',
  'Google Gemini',
  'ChatGPT',
  'Adobe Firefly',
  'Microsoft Designer / Copilot',
  'Other AI image-generation tool',
  'Other AI creative tool',
];

const CREATION_TYPES = [
  {
    value: 'AI Assisted',
    label: 'AI Assisted',
    desc: 'I created the main idea/artwork myself and used AI to assist, improve, enhance or modify my work.',
  },
  {
    value: 'AI Created',
    label: 'AI Created',
    desc: 'I used Generative AI to create most or all of the artwork from my instructions/prompts.',
  },
  {
    value: 'AI Created + Human Edited',
    label: 'AI Created + Human Edited',
    desc: 'AI generated the main artwork, and I significantly edited, modified or enhanced the final artwork myself.',
  },
  {
    value: 'AI Used by Parent/Teacher',
    label: 'AI Used by Parent/Teacher',
    desc: 'I developed the idea and instructions, but a parent or teacher operated the AI tool on my behalf.',
  },
];

const CHANGES_OPTIONS = [
  { value: 'No changes', label: 'No changes' },
  { value: 'I made small changes', label: 'I made small changes' },
  { value: 'I made significant changes', label: 'I made significant changes' },
];

const STEPS = [
  { id: 1, label: 'Participant', icon: FiUser },
  { id: 2, label: 'Artwork', icon: FiImage },
  { id: 3, label: 'AI Details', icon: HiOutlineSparkles },
  { id: 4, label: 'Upload', icon: FiUpload },
  { id: 5, label: 'Consent', icon: FiAward },
];

// ─── Form State ────────────────────────────────────────────────────────────────

interface FormState {
  // Step 1
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentFullName: string;
  studentAge: string;
  grade: string;
  gender: string;
  schoolName: string;
  schoolEmirate: string;
  // Step 2
  artworkTitle: string;
  artworkDescription: string;
  // Step 3
  aiTools: string[];
  otherToolName: string;
  creationType: string;
  mainPrompt: string;
  usedMorePrompts: string;
  additionalPrompt1: string;
  additionalPrompt2: string;
  additionalPrompt3: string;
  changesAfterGeneration: string;
  changesDescription: string;
  // Step 4
  artwork: File | null;
  artworkPreview: string;
  // Step 5
  agreeTerms: boolean;
  responsibleAiDeclaration: boolean;
  originalityDeclaration: boolean;
  // Step 6
  parentGuardianConsent: boolean;
  artworkDisplayPermission: string;
  nameDisplayPermission: string;
  competitionUpdatesConsent: boolean;
  marketingConsent: boolean;
}

const initialFormState: FormState = {
  parentName: '', parentEmail: '', parentPhone: '', studentFullName: '',
  studentAge: '', grade: '', gender: '', schoolName: '', schoolEmirate: '',
  artworkTitle: '', artworkDescription: '',
  aiTools: [], otherToolName: '', creationType: '',
  mainPrompt: '', usedMorePrompts: 'No',
  additionalPrompt1: '', additionalPrompt2: '', additionalPrompt3: '',
  changesAfterGeneration: '', changesDescription: '',
  artwork: null, artworkPreview: '',
  agreeTerms: false, responsibleAiDeclaration: false, originalityDeclaration: false,
  parentGuardianConsent: false, artworkDisplayPermission: '', nameDisplayPermission: 'yes',
  competitionUpdatesConsent: false, marketingConsent: false,
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step: number, form: FormState): string[] {
  const errors: string[] = [];
  if (step === 1) {
    if (!form.parentName.trim()) errors.push('Parent/Guardian name is required');
    if (!form.parentEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail))
      errors.push('A valid Parent/Guardian email is required');
    if (!form.parentPhone.trim()) errors.push('Parent/Guardian mobile is required');
    if (!form.studentFullName.trim()) errors.push('Student full name is required');
    if (!form.studentAge || isNaN(Number(form.studentAge)))
      errors.push('Student age is required');
    if (!form.grade) errors.push('Grade is required');
    if (!form.schoolName.trim()) errors.push('School name is required');
    if (!form.schoolEmirate) errors.push('School emirate is required');
  }
  if (step === 2) {
    if (!form.artworkTitle.trim()) errors.push('Artwork title is required');
    if (!form.artworkDescription.trim()) errors.push('Artwork description is required');
    const count = form.artworkDescription.trim().split(/\s+/).filter(Boolean).length;
    if (count > 100) errors.push('Artwork description must be 100 words or less');
  }
  if (step === 3) {
    if (form.aiTools.length === 0) errors.push('Please select at least one AI tool');
    if (!form.creationType) errors.push('Please select your creation type');
    if (!form.mainPrompt.trim()) errors.push('Main AI prompt is required');
    if (!form.changesAfterGeneration) errors.push('Please indicate changes after AI generation');
  }
  if (step === 4) {
    if (!form.artwork) errors.push('Please upload your final artwork');
  }
  if (step === 5) {
    if (!form.agreeTerms) errors.push('You must agree to the Terms & Conditions');
    if (!form.responsibleAiDeclaration) errors.push('Please confirm the Responsible AI Declaration');
    if (!form.originalityDeclaration) errors.push('Please confirm the Originality Declaration');
    if (!form.parentGuardianConsent) errors.push('Parent/Guardian confirmation is required');
    if (!form.artworkDisplayPermission) errors.push('Please select your artwork display preference');
    if (!form.competitionUpdatesConsent)
      errors.push('Competition communications consent is required');
  }
  return errors;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCohortFromGrade = (grade: string) => {
  const g = grade.toLowerCase();
  if (g.includes('1') || g.includes('2') || g.includes('3')) return 'AI Dreamers 🌟';
  if (g.includes('4') || g.includes('5') || g.includes('6')) return 'AI Creators 🎨';
  if (g.includes('7') || g.includes('8') || g.includes('9')) return 'AI Explorers 🚀';
  if (g.includes('10') || g.includes('11') || g.includes('12')) return 'AI Visionaries 💡';
  return '';
};

const wordCount = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

function getToolIcon(tool: string) {
  switch (tool) {
    case 'Canva AI / Canva Magic Media': return '🎨';
    case 'Google Gemini': return '✨';
    case 'ChatGPT': return '💬';
    case 'Adobe Firefly': return '🔥';
    case 'Microsoft Designer / Copilot': return '💻';
    case 'Other AI image-generation tool': return '🖼️';
    case 'Other AI creative tool': return '💡';
    default: return '🤖';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiArtCompetitionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionRef, setSubmissionRef] = useState('');
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [showDeclarationsModal, setShowDeclarationsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors([]);
  }, []);

  const toggleTool = (tool: string) => {
    setForm((prev) => ({
      ...prev,
      aiTools: prev.aiTools.includes(tool)
        ? prev.aiTools.filter((t) => t !== tool)
        : [...prev.aiTools, tool],
    }));
    setErrors([]);
  };

  const handleArtworkFile = (file: File | null) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors(['Only JPG/JPEG and PNG files are accepted']);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors(['File must be 10 MB or less']);
      return;
    }
    const preview = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, artwork: file, artworkPreview: preview }));
    setErrors([]);
  };

  const handleNext = () => {
    const errs = validateStep(currentStep, form);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setCurrentStep((s) => Math.min(5, s + 1));
    const submitSection = document.getElementById('submit-entry');
    if (submitSection) submitSection.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors([]);
    setCurrentStep((s) => Math.max(1, s - 1));
    const submitSection = document.getElementById('submit-entry');
    if (submitSection) submitSection.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const errs = validateStep(5, form);
    if (errs.length) { setErrors(errs); return; }

    if (!form.artwork) {
      setErrors(['Artwork file is missing — please go back and upload your artwork']);
      return;
    }

    setIsSubmitting(true);
    try {
      const additionalPrompts = [
        form.additionalPrompt1,
        form.additionalPrompt2,
        form.additionalPrompt3,
      ].filter(Boolean);

      const payload: CompetitionSubmitPayload = {
        parentName: form.parentName,
        parentEmail: form.parentEmail,
        parentPhone: form.parentPhone,
        studentFullName: form.studentFullName,
        studentAge: Number(form.studentAge),
        grade: form.grade,
        cohort: getCohortFromGrade(form.grade),
        gender: form.gender || undefined,
        schoolName: form.schoolName,
        schoolEmirate: form.schoolEmirate,
        artworkTitle: form.artworkTitle,
        artworkDescription: form.artworkDescription,
        aiTools: form.aiTools,
        otherToolName: form.otherToolName || undefined,
        creationType: form.creationType,
        mainPrompt: form.mainPrompt,
        additionalPrompts,
        changesAfterGeneration: form.changesAfterGeneration,
        changesDescription: form.changesDescription || undefined,
        artwork: form.artwork,
        agreeTerms: form.agreeTerms,
        responsibleAiDeclaration: form.responsibleAiDeclaration,
        originalityDeclaration: form.originalityDeclaration,
        parentGuardianConsent: form.parentGuardianConsent,
        artworkDisplayPermission: form.artworkDisplayPermission as 'yes' | 'no',
        nameDisplayPermission: form.nameDisplayPermission === 'yes',
        competitionUpdatesConsent: form.competitionUpdatesConsent,
        marketingConsent: form.marketingConsent,
      };

      const result = await competitionAPI.submitCompetition(payload);
      setSubmissionRef(result.data.submissionRef);
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Submission failed. Please try again.';
      toast.error(msg);
      setErrors([msg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success Screen ─────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0E1525] text-slate-350 flex items-center justify-center px-4 py-16 font-sans">
        <SEO title="Submission Successful — Kidrove AI Art Competition 2026" />
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
          <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-white text-3xl font-black mb-2">
            🎉 Entry Submitted!
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-slate-400 mb-6 text-sm">
            Your AI Art competition entry has been received successfully.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-4 inline-block mb-8 text-center">
            <span className="text-slate-500 text-xs uppercase font-extrabold tracking-widest block mb-1">Your Submission ID</span>
            <span className="text-amber-300 font-extrabold text-2xl tracking-wider select-all">{submissionRef}</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="text-left bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-white font-extrabold text-base mb-4 flex items-center gap-2"><span>📌</span> What happens next?</h2>
            {[
              { icon: '📩', title: 'Email Confirmation', desc: 'You will receive an email confirmation containing your submission ID shortly.' },
              { icon: '📜', title: 'Participation Certificate', desc: 'Every qualifying student will receive a Kidrove Certificate of Participation.' },
              { icon: '🏆', title: 'Winners will be Announced', desc: 'Entries will be evaluated by our judging panel. Winners receive Gold, Silver or Bronze medals!' },
              { icon: '🎨', title: 'Virtual Exhibition', desc: 'Outstanding creations will be exhibited in the Kidrove AI Art Gallery.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.08 }} className="flex gap-3 items-start mb-4 last:mb-0 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div>
                  <h4 className="text-white font-bold text-xs">{item.title}</h4>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-8">
            <button onClick={() => { setIsSubmitted(false); setForm(initialFormState); setCurrentStep(1); }} className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all border border-slate-600">
              Submit Another Entry
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Tab Content Panels ─────────────────────────────────────────────────────

  const TAB_OVERVIEW = (
    <div className="space-y-10">


      {/* The moments that matter - Timeline */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/25 rounded-3xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[60px] pointer-events-none" />

        <div className="mb-12 relative z-10 flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2">Put these on the calendar</p>
            <h3 className="text-3xl md:text-4xl font-black text-amber-400">
              The moments <span className="text-white italic font-serif font-normal">that matter.</span>
            </h3>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <span className="text-amber-400">📅</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Competition year / 2026</span>
          </div>
        </div>

        <div className="relative mt-8 relative z-10">
          {/* Horizontal Line */}
          <div className="absolute left-[7px] top-3 hidden h-[2px] w-[calc(100%-14px)] bg-gradient-to-r from-amber-500/50 via-yellow-500/50 to-orange-500/50 md:block" />

          <div className="grid gap-10 md:grid-cols-4 md:gap-6">
            {[
              { date: '1 Sep', year: '2026', title: 'Competition opens', copy: 'The prompt is live. Let your first idea be the spark.' },
              { date: '1 Oct', year: '2026', title: 'Registration closes', copy: 'Make sure your name and route into the competition are in.' },
              { date: '15 Oct', year: '2026', title: 'Artwork submission closes', copy: 'One final artwork, uploaded as a JPG or PNG.' },
              { date: '1 Nov', year: '2026', title: 'Results announced', copy: 'We reveal the students who made us see the UAE differently.' },
            ].map((item, index) => (
              <div key={item.date} className="relative grid grid-cols-[32px_1fr] gap-4 md:block">
                <div className="relative z-10 mt-0.5 h-4 w-4 rounded-full border-4 border-amber-500 bg-[#0E1525] md:mb-8 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <div>
                  <p className="text-3xl font-black text-white tracking-tight">
                    {item.date}<sup className="ml-1 text-xs font-normal text-amber-400">{item.year}</sup>
                  </p>
                  <h4 className="mt-3 text-base font-bold text-slate-200">{item.title}</h4>
                  <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-slate-400">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex items-center gap-3 border-t border-amber-500/20 pt-5 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Note</span>
          <p className="text-xs text-slate-400">Registration closes on 1st October 2026. Artwork submissions close on 15th October 2026.</p>
        </div>
      </div>

      {/* The Brief - 3 Steps */}
      <div className="mt-24">
        <div className="mb-8">
          <p className="text-amber-500 text-[10px] font-extrabold uppercase tracking-widest mb-2">The brief, in three moves</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            Your idea is the <span className="text-amber-400">main character.</span>
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl">
            We are not looking for the student who knows the most complicated AI tool. We want to see your idea, your imagination, and your use of AI.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { number: '01', icon: '💡', title: 'Imagine', copy: 'Find your own answer to "If AI Could Draw My UAE…" A place, a feeling, a future, a memory — start anywhere.', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400' },
            { number: '02', icon: '✨', title: 'Create with AI', copy: 'Explore prompts, styles, compositions, and suitable Generative AI tools. Experiment until it feels like you.', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400' },
            { number: '03', icon: '🚀', title: 'Let it travel', copy: 'Submit one original digital artwork as a high-quality JPG or PNG. Add up to 100 words about your idea if you like.', color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400' },
          ].map(({ number, icon, title, copy, color }) => (
            <article key={number} className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${color} border p-6 transition-transform duration-300 hover:-translate-y-1`}>
              <span className="text-xs font-bold opacity-70 mb-4 block">{number}</span>
              <span className="absolute right-6 top-6 text-3xl">{icon}</span>
              <div className="mt-8">
                <h3 className="text-2xl font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{copy}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-5">
          <div className="flex items-center gap-3">
            <FiCheck className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-300">Suitable for children and families. Your creative idea stays at the centre.</span>
          </div>
        </div>
      </div>

      {/* ── BENTO GRID ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-16">

        {/* At a Glance (Span 2) */}
        <div className="lg:col-span-2 bg-slate-800/30 border border-slate-700/40 rounded-3xl p-8 flex flex-col justify-between group hover:border-slate-600 transition-colors">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <span className="text-amber-400">⚡</span> At a Glance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {AT_A_GLANCE.map((item, idx) => (
              <div key={idx} className="bg-[#0B1220] p-4 rounded-2xl border border-slate-700/30 group-hover:border-amber-500/20 transition-colors">
                <span className="block text-2xl mb-2">{item.icon}</span>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{item.label}</span>
                <span className="block text-sm text-slate-200 font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Judging Criteria (Span 1) */}
        <div className="lg:col-span-1 bg-slate-800/30 border border-slate-700/40 rounded-3xl p-8 group hover:border-slate-600 transition-colors flex flex-col">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <span>⚖️</span> Judging Criteria
          </h3>
          <div className="space-y-5 flex-1 justify-center flex flex-col">
            {JUDGING_CRITERIA.map((crit, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-200 font-semibold text-sm">{crit.label}</span>
                  <span className="text-white font-black text-sm">{crit.marks}</span>
                </div>
                <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${crit.color}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${crit.marks}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submission Requirements (Span 1) */}
        <div className="lg:col-span-1 bg-slate-800/30 border border-slate-700/40 rounded-3xl p-8 group hover:border-slate-600 transition-colors flex flex-col">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <span>📸</span> Required format
          </h3>
          <div className="space-y-4 flex-1">
            {[
              { label: 'Format', value: 'JPG or PNG only' },
              { label: 'File Size', value: 'Max 1 MB' },
              { label: 'Quantity', value: 'ONE artwork only' },
              { label: 'Content', value: 'Must be AI-generated' },
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-center border-b border-slate-700/30 pb-3 last:border-0 last:pb-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{r.label}</span>
                <span className="text-slate-200 font-semibold text-sm">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Why Participate (Span 2) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[50px] pointer-events-none" />
          <h3 className="text-xl font-black text-amber-400 mb-6 flex items-center gap-2 relative z-10">
            <span>🌟</span> Why Participate?
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 relative z-10">
            {[
              { icon: '✨', text: 'Explore Generative AI' },
              { icon: '🎨', text: 'Turn ideas to art' },
              { icon: '🇦🇪', text: 'Vision of the UAE' },
              { icon: '🏆', text: 'Compete nationwide' },
              { icon: '📜', text: 'Official Certificate' },
              { icon: '⭐', text: 'Win a Medal' },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-3 items-center bg-[#0B1220]/50 border border-amber-500/10 p-3 rounded-2xl">
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs text-amber-100/70 font-medium leading-tight">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What NOT to Do (Span 3) */}
        <div className="lg:col-span-3 bg-rose-500/5 border border-rose-500/20 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-start">
          <div className="md:w-1/3">
            <h3 className="text-2xl font-black text-rose-400 mb-3 flex items-center gap-2">
              <span>🚫</span> The strict no-nos.
            </h3>
            <p className="text-sm text-rose-300/70">What students must absolutely avoid to prevent disqualification.</p>
          </div>
          <div className="md:w-2/3">
            <ul className="grid sm:grid-cols-2 gap-4 text-sm text-slate-300">
              {WHAT_NOT_TO_DO.map((rule, idx) => (
                <li key={idx} className="flex gap-3 items-start bg-[#0B1220]/50 p-4 rounded-2xl border border-rose-500/10">
                  <span className="text-rose-500 flex-shrink-0 mt-0.5">❌</span>
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );



  const TAB_SCHOOLS = (
    <div className="space-y-8">
      {/* Cohorts */}
      <div>
        <div className="mb-6">
          <p className="text-blue-400 text-[10px] font-extrabold uppercase tracking-widest mb-1">Find your pathway</p>
          <h3 className="text-2xl md:text-3xl font-black text-white">
            One theme. <span className="text-blue-400">Four ways to see it.</span>
          </h3>
          <p className="mt-3 text-sm text-slate-400 max-w-xl">
            Every student participates individually and submits their own artwork. Your grade group is your starting line, not a box.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          {[
            { grades: 'Grades 1–3', name: 'AI Dreamers', detail: 'Start with a wild idea. The sky is the first draft.', icon: '🌟', color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30' },
            { grades: 'Grades 4–6', name: 'AI Creators', detail: 'Turn what you picture into a world others can visit.', icon: '🎨', color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30' },
            { grades: 'Grades 7–9', name: 'AI Explorers', detail: 'Push the prompt further. Find a UAE nobody expected.', icon: '🚀', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30' },
            { grades: 'Grades 10–12', name: 'AI Visionaries', detail: 'Make a point of view. Show us the future you see.', icon: '💡', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30' },
          ].map((cohort, idx) => (
            <div key={idx} className={`bg-gradient-to-br ${cohort.color} border rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-transform`}>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 opacity-80">{cohort.grades}</span>
              <span className="absolute right-4 top-4 text-2xl">{cohort.icon}</span>
              <div>
                <h4 className="text-lg font-black text-white mb-2">{cohort.name}</h4>
                <p className="text-xs text-slate-300 leading-relaxed opacity-90">{cohort.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* Parent Route */}
        <div className="border border-white/10 bg-white/[0.02] p-8 rounded-3xl relative overflow-hidden group hover:border-[#F6B83F]/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F6B83F]/10 blur-[50px] pointer-events-none group-hover:bg-[#F6B83F]/20 transition-colors" />
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#151E33] flex items-center justify-center border border-white/10">
              <span className="text-2xl">👨‍👩‍👧</span>
            </div>
            <h4 className="text-lg font-bold text-white">FOR PARENTS</h4>
          </div>
          <div className="space-y-4 text-[#A9B1C3] relative z-10 mb-8">
            <p>Parents can register their child directly. You'll need to fill out the form at the bottom of this page, upload the artwork, and provide consent.</p>
            <p className="text-sm border-l-2 border-[#F6B83F] pl-4 py-1 text-slate-300">
              Adults must ensure tools comply with age guidelines. The idea and final artwork must belong to the student.
            </p>
          </div>
          <a href="#submit-entry" className="inline-flex items-center gap-2 text-[#F6B83F] font-bold text-sm hover:gap-3 transition-all relative z-10 uppercase tracking-wider">
            Register Your Child <FiChevronRight />
          </a>
        </div>

        {/* School Route */}
        <div className="border border-white/10 bg-white/[0.02] p-8 rounded-3xl relative overflow-hidden group hover:border-[#8B5CF6]/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B5CF6]/10 blur-[50px] pointer-events-none group-hover:bg-[#8B5CF6]/20 transition-colors" />
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#151E33] flex items-center justify-center border border-white/10">
              <span className="text-2xl">🏫</span>
            </div>
            <h4 className="text-lg font-bold text-white">FOR SCHOOLS</h4>
          </div>
          <div className="space-y-4 text-[#A9B1C3] relative z-10 mb-8">
            <p>Schools can share the competition link directly with parents. Alternatively, a coordinator can register multiple students collectively using our Registration Sheet.</p>
            <p className="text-sm">
              Schools with strong participation and exceptional entries are awarded Kidrove School Recognition.
            </p>
          </div>
          <a href="https://docs.google.com/spreadsheets/d/17geLB2uBJlrPnqaTKfHJlp7b5j7icz79_sEG7Odqmtg/edit?usp=sharing" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#8B5CF6] font-bold text-sm hover:gap-3 transition-all relative z-10 uppercase tracking-wider">
            Download Registration Sheet <FiChevronRight />
          </a>
        </div>
      </div>


      {/* School Recognition */}
      <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-500/25 rounded-3xl p-7">
        <h3 className="text-xl font-black text-blue-300 mb-2 flex items-center gap-2">
          <span>🏆</span> Kidrove School Recognition
        </h3>
        <p className="text-slate-400 text-sm mb-5">Schools are recognised for outstanding engagement in the competition:</p>
        <div className="grid grid-cols-2 gap-3">
          {['⭐ Strong Student Participation', '⭐ Outstanding Student Creativity', '⭐ High Number of Valid Entries', '⭐ Exceptional Winning Performance'].map((item, i) => (
            <div key={i} className="bg-[#0B1220]/80 border border-blue-500/15 rounded-xl px-4 py-3 text-sm text-blue-200">{item}</div>
          ))}
        </div>
      </div>


    </div>
  );

  // ── Main Page Layout ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0E1525] text-slate-350 font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-x-hidden">
      <SEO
        title="AI Art Competition 2026 — If AI Could Draw My UAE | Kidrove"
        description="Enter the Kidrove 'If AI Could Draw My UAE…' Generative AI Art Competition 2026. Open to all UAE school students. Submit your AI-generated artwork and win Gold, Silver or Bronze medals."
      />

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="relative pt-28 pb-24 overflow-hidden bg-gradient-to-b from-[#0B1220] to-[#0E1525] border-b border-slate-700/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_15%_30%,rgba(245,158,11,0.15),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_85%_70%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold px-4.5 py-2 rounded-full text-xs tracking-wider uppercase mb-8 shadow-sm">
            <HiOutlineSparkles className="text-amber-400 animate-pulse text-lg" />
            <span>Kidrove AI Art Competition 2026</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">
            If AI Could Draw <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 drop-shadow-md">
              My UAE…
            </span>
          </h1>

          <div className="max-w-3xl mx-auto mb-10 space-y-4">
            <p className="text-gray-400 font-semibold text-lg md:text-xl">
              Imagine the UAE through your eyes. Create it with AI. Let the world see your imagination.
            </p>
            <p className="text-amber-400 font-bold text-lg">Now it is your turn to imagine it.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <a href="#submit-entry" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black rounded-full shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all text-center flex items-center justify-center gap-2 text-sm">
              Submit Your Entry <FiChevronRight className="stroke-[3] text-lg" />
            </a>
            <a href="#competition-info" className="w-full sm:w-auto px-8 py-4 bg-slate-800/60 border border-slate-700/50 text-slate-300 font-bold rounded-full hover:bg-slate-800 hover:text-white transition-all text-center text-sm">
              Learn More
            </a>
          </div>

          {/* Highlights Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {[
              { label: 'Gold, Silver or Bronze', value: '🏆 Medals', desc: 'Medals for Top Performers' },
              { label: 'Participation', value: '📜 Certificate of', desc: 'For every student' },
              { label: 'Exhibition', value: '🎨 Public Gallery', desc: 'Showcasing top talent' },
              { label: 'Open to Grades 1–12', value: '🧑‍🎓 All UAE Students', desc: 'Any UAE school' },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-800/40 backdrop-blur-md border border-slate-700/40 rounded-3xl p-6 md:p-8 hover:-translate-y-1.5 transition-all duration-300 text-center shadow-xl shadow-black/30 group">
                <span className="text-4xl md:text-5xl block mb-4 group-hover:scale-110 transition-transform">{item.value.split(' ')[0]}</span>
                <span className="text-lg font-black text-white block mb-2">{item.value.split(' ').slice(1).join(' ')}</span>
                <span className="text-sm font-bold text-amber-400 block mb-1">{item.label}</span>
                <span className="text-sm text-slate-500">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Competition Guide — Vertical Layout ─────────────────────────────────────── */}
      <div id="competition-info" className="py-16 bg-[#0E1525] border-b border-slate-700/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-amber-500 text-[10px] font-extrabold uppercase tracking-[0.16em] mb-3">All the details</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Competition <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Guide</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm">Everything you need to know about the competition.</p>
          </div>

          <div className="space-y-24">
            <section>
              {TAB_OVERVIEW}
            </section>
          </div>
        </div>
      </div>

      {/* ── Awards Section ──────────────────────────────────────────────── */}
      <div className="py-24 bg-[#090D1A] border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(246,184,63,0.05),transparent_70%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/25 text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block">Recognition</span>
            <p className="text-3xl md:text-5xl font-black text-white">🏆 Prizes & Awards</p>
          </div>

          <div className="flex flex-col md:flex-row items-end justify-center gap-6 max-w-5xl mx-auto mb-16">
            {/* Silver (Left, smaller) */}
            <div className="order-2 md:order-1 w-full md:w-1/3 bg-white/[0.02] border border-slate-300/20 rounded-3xl p-6 text-center relative mt-8 md:mt-0 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-300 to-slate-400" />
              <span className="text-5xl block mb-4">🥈</span>
              <h3 className="text-xl font-bold text-white mb-1">Silver Winner</h3>
              <p className="text-[#A9B1C3] text-sm mb-6">Top 11–20 in each Cohort</p>
              <div className="text-xs font-bold text-slate-300 bg-slate-300/10 py-2 rounded-xl mb-4">Official Medal & Certificate</div>
              <p className="text-slate-400 text-xs">Exceptional artistic quality, detailed composition, and unique interpretation.</p>
            </div>

            {/* Gold (Center, largest) */}
            <div className="order-1 md:order-2 w-full md:w-1/3 bg-gradient-to-b from-[#F6B83F]/10 to-transparent border border-[#F6B83F]/30 rounded-3xl p-8 text-center relative z-10 shadow-[0_0_40px_rgba(246,184,63,0.1)] -mt-8 md:-mt-12 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-300 to-[#F6B83F]" />
              <span className="text-6xl block mb-4 relative">
                🥇
                <div className="absolute inset-0 bg-[#F6B83F] blur-2xl opacity-20 -z-10" />
              </span>
              <h3 className="text-2xl font-black text-white mb-1">Gold Winner</h3>
              <p className="text-[#F6B83F] text-sm font-bold mb-6">Top 10 in each Cohort</p>
              <div className="text-sm font-bold text-[#090D1A] bg-gradient-to-r from-yellow-400 to-[#F6B83F] py-2.5 rounded-xl mb-4 shadow-lg">Official Medal & Certificate</div>
              <p className="text-slate-300 text-sm">Outstanding creativity, highly refined prompting, and powerful vision.</p>
            </div>

            {/* Bronze (Right, smallest) */}
            <div className="order-3 md:order-3 w-full md:w-1/3 bg-white/[0.02] border border-amber-700/30 rounded-3xl p-6 text-center relative mt-12 md:mt-0 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-700" />
              <span className="text-5xl block mb-4">🥉</span>
              <h3 className="text-xl font-bold text-white mb-1">Bronze Winner</h3>
              <p className="text-[#A9B1C3] text-sm mb-6">Top 21–30 in each Cohort</p>
              <div className="text-xs font-bold text-amber-500 bg-amber-700/10 py-2 rounded-xl mb-4">Official Medal & Certificate</div>
              <p className="text-slate-400 text-xs">Superb creative effort, clean visual details, and smart use of AI tools.</p>
            </div>
          </div>

          <div className="bg-[#151E33] border border-white/10 rounded-2xl p-6 text-center max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
            <span className="text-3xl">📜</span>
            <div className="text-left">
              <h4 className="text-white font-bold">Participation Certificate</h4>
              <p className="text-[#A9B1C3] text-sm">All qualifying submissions receive an official Kidrove certificate.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Schools & FAQ ─────────────────────────────────────── */}
      <div className="py-16 bg-[#0E1525] border-b border-slate-700/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="space-y-24">
            <section>
              <div className="text-center mb-12">
                <p className="text-emerald-500 text-[10px] font-extrabold uppercase tracking-[0.16em] mb-3">Educators & Guardians</p>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                  For Schools <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">& Parents</span>
                </h2>
              </div>
              {TAB_SCHOOLS}
            </section>

            <section>
              <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
                {/* Left Column */}
                <div className="lg:w-1/3 sticky top-32">
                  <p className="text-amber-500 text-[10px] font-extrabold uppercase tracking-[0.16em] mb-4">Questions, meet answers</p>
                  <h2 className="text-5xl md:text-6xl font-black text-white leading-[0.9] tracking-tight mb-8">
                    Wondering <br />
                    <span className="font-serif italic font-normal text-amber-400">how it works?</span>
                  </h2>
                </div>

                {/* Right Column */}
                <div className="lg:w-2/3 w-full">
                  <div className="border-t border-slate-700/30">
                    {[
                      { q: 'Do I need to know how to code?', a: 'Not at all. This is about having an idea and bringing it to life with a Generative AI image tool. No coding or technical expertise is required.' },
                      { q: 'Can I use any AI image tool?', a: 'Yes. Students may use any suitable Generative AI image-generation, creative, design, or AI-assisted art tool. Please check its age requirements and terms with a parent, teacher, or responsible adult.' },
                      { q: 'Can my teacher or parent make the artwork for me?', a: 'They can help you understand a tool, especially if you are younger. But the creative idea and final submission must belong to you. Adults should not create the artwork on your behalf.' },
                      { q: 'How do schools register a group?', a: 'A school coordinator can register students collectively by emailing the Student registration Sheet to contact@kidrove.com. Schools can also share the official competition information so parents register directly.' },
                    ].map((faq, index) => (
                      <details key={index} open={index === 0} className="group border-b border-slate-700/30">
                        <summary className="flex items-center justify-between cursor-pointer py-6 outline-none list-none [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-6 font-bold text-white text-lg">
                            <span className="text-amber-500 text-xs font-black tracking-widest">0{index + 1}</span>
                            {faq.q}
                          </span>
                          <FiChevronDown className="h-5 w-5 text-slate-400 transition-transform group-open:-rotate-180" />
                        </summary>
                        <div className="pb-8 pt-0 pl-[42px] text-sm text-slate-400 leading-relaxed max-w-2xl font-medium">
                          {faq.a}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ── Form Section ─────────────────────────────────────────────────── */}
      <div id="submit-entry" className="py-20 bg-[#0E1525] relative overflow-hidden">
        <div className="absolute top-[-5%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/15 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-amber-500/15 blur-[150px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="text-4xl">🚀</span>
            <h2 className="text-3xl md:text-5xl font-black text-white mt-3 mb-4">Submission Form</h2>
            <p className="text-slate-400 text-sm">Complete the 5 quick steps below to submit your artwork to the judges.</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-12 max-w-2xl mx-auto">
            <div className="flex justify-between gap-1 flex-wrap md:flex-nowrap">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isDone = currentStep > step.id;
                return (
                  <div key={step.id} className={`flex flex-col items-center gap-2 flex-1 min-w-[70px] max-w-[120px] transition-opacity duration-300 ${isActive || isDone ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${isDone
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : isActive
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-800/80 border border-slate-700 text-slate-200'
                      }`}>
                      {isDone ? <FiCheck size={18} className="stroke-[3]" /> : <Icon size={18} />}
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider uppercase text-center ${isActive ? 'text-amber-400' : isDone ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/40 rounded-3xl p-6 md:p-10 shadow-2xl mb-8 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -25 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {/* ── Step 1: Participant Details ───────────────────────────── */}
                {currentStep === 1 && (
                  <div>
                    <SectionHeader icon="👤" title="Participant Details" step="Section 1 of 5" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-1">
                      <InputField label="Parent/Guardian Name" required value={form.parentName} onChange={(v) => update('parentName', v)} placeholder="Parent/Guardian full name" />
                      <InputField label="Parent/Guardian Email" required type="email" value={form.parentEmail} onChange={(v) => update('parentEmail', v)} placeholder="parent@example.com" />
                      <InputField label="Parent/Guardian Mobile" required type="tel" value={form.parentPhone} onChange={(v) => update('parentPhone', v)} placeholder="+971 50 000 0000" />
                      <InputField label="Student Full Name" required value={form.studentFullName} onChange={(v) => update('studentFullName', v)} placeholder="Student full name" />
                      <InputField label="Student Age" required type="number" value={form.studentAge} onChange={(v) => update('studentAge', v)} placeholder="e.g. 12" min="4" max="20" />
                      <SelectField label="Grade" required value={form.grade} onChange={(v) => update('grade', v)} options={GRADES.map((g) => ({ value: g, label: g }))} />
                      {form.grade && (
                        <div className="md:col-span-2 text-center text-sm font-bold text-amber-400 bg-amber-500/10 py-3 mt-1 mb-2 rounded-xl border border-amber-500/20 shadow-inner">
                          You are participating as: <span className="text-white ml-1">{getCohortFromGrade(form.grade)}</span>
                        </div>
                      )}
                      <SelectField label="Gender" value={form.gender} onChange={(v) => update('gender', v)} placeholder="Select gender (optional)" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Prefer not to say', label: 'Prefer not to say' }]} />
                      <InputField label="School Name" required value={form.schoolName} onChange={(v) => update('schoolName', v)} placeholder="Your school name" />
                    </div>
                    <div className="mt-1">
                      <SelectField label="School Emirate" required value={form.schoolEmirate} onChange={(v) => update('schoolEmirate', v)} options={EMIRATES.map((e) => ({ value: e, label: e }))} />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Artwork Entry ─────────────────────────────────── */}
                {currentStep === 2 && (
                  <div>
                    <SectionHeader icon="🎨" title="Competition Entry" step="Section 2 of 5" />
                    <InputField label="Artwork Title" required value={form.artworkTitle} onChange={(v) => update('artworkTitle', v)} placeholder="e.g. The UAE of Tomorrow" />
                    <div className="mt-5">
                      <label className="block text-slate-300 text-sm font-semibold mb-1">
                        What does your artwork show?<span className="text-amber-500 ml-1">*</span>
                      </label>
                      <p className="text-slate-500 text-xs mb-3 leading-relaxed">What did you create? What does it represent? Why did you choose this idea? (Max 100 words)</p>
                      <textarea
                        value={form.artworkDescription}
                        onChange={(e) => update('artworkDescription', e.target.value)}
                        placeholder="Write a short description of your artwork…"
                        rows={5}
                        className={`w-full bg-[#0B1220] border hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 placeholder-slate-600 transition-all outline-none text-sm resize-none ${wordCount(form.artworkDescription) > 100 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700/50'}`}
                      />
                      <div className={`text-right text-xs mt-2 ${wordCount(form.artworkDescription) > 100 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                        {wordCount(form.artworkDescription)} / 100 words
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 3: AI Creation ───────────────────────────────────── */}
                {currentStep === 3 && (
                  <div>
                    <SectionHeader icon="🤖" title="Your AI Creation" step="Section 3 of 5" />
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed bg-[#0B1220] p-4 border border-slate-700/30 rounded-2xl">
                      Provide details about the tools and creative process used. AI usage is an integral part of this challenge.
                    </p>

                    {/* AI Tools */}
                    <div className="mb-6 text-white">
                      <FieldLabel required>Which AI tool(s) did you use?</FieldLabel>
                      <p className="text-slate-500 text-xs mb-3">You can select multiple tools.</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AI_TOOLS.map((tool) => {
                          const isSelected = form.aiTools.includes(tool);
                          return (
                            <button key={tool} type="button" onClick={() => toggleTool(tool)} className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${isSelected ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#0B1220] border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}>
                              <span className="text-2xl mb-2">{getToolIcon(tool)}</span>
                              <span className="text-xs font-semibold leading-snug">{tool.split(' / ')[0]}</span>
                              {isSelected && <FiCheck className="text-amber-500 text-xs mt-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(form.aiTools.includes('Other AI image-generation tool') || form.aiTools.includes('Other AI creative tool')) && (
                      <InputField label="Please specify the tool name" value={form.otherToolName} onChange={(v) => update('otherToolName', v)} placeholder="e.g. Midjourney, DALL-E 3…" />
                    )}

                    {/* Creation type */}
                    <div className="mb-6 text-white">
                      <FieldLabel required>Select the option that best describes your creation process</FieldLabel>
                      <div className="flex flex-col gap-3 mt-3 text-slate-400">
                        {CREATION_TYPES.map((ct) => (
                          <RadioCard key={ct.value} value={ct.value} label={ct.label} description={ct.desc} selected={form.creationType === ct.value} onChange={() => update('creationType', ct.value)} />
                        ))}
                      </div>
                      <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                        Note: Your choice does not penalize your score. Judges assess the student's creative vision, theme interpretation, and creative control.
                      </p>
                    </div>

                    {/* Main prompt */}
                    <div className="mb-6 text-white">
                      <FieldLabel required>Main AI Prompt</FieldLabel>
                      <p className="text-slate-400 text-xs mb-3">Provide the main prompt or instruction sent to the AI tool to generate your artwork.</p>
                      <textarea
                        value={form.mainPrompt}
                        onChange={(e) => update('mainPrompt', e.target.value)}
                        placeholder="e.g. Create a futuristic UAE in 2050 at sunset, Burj Khalifa with green hanging gardens, flying cars, clean energy..."
                        rows={4}
                        className="w-full bg-[#0B1220] border border-slate-700/50 hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 placeholder-slate-600 transition-all outline-none text-sm resize-none"
                      />
                    </div>

                    {/* More prompts */}
                    <div className="mb-6 text-white">
                      <FieldLabel>Did you use more than one prompt to refine your art?</FieldLabel>
                      <div className="flex gap-6 mt-2 mb-4">
                        {['Yes', 'No'].map((opt) => (
                          <label key={opt} className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 select-none">
                            <input type="radio" name="usedMorePrompts" value={opt} checked={form.usedMorePrompts === opt} onChange={() => update('usedMorePrompts', opt)} className="w-4 h-4 rounded-full border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-900" />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                      {form.usedMorePrompts === 'Yes' && (
                        <div className="flex flex-col gap-3.5 bg-[#0B1220] border border-slate-700/30 rounded-2xl p-4">
                          <p className="text-slate-500 text-[11px]">You may list up to 3 refinement prompts.</p>
                          {['additionalPrompt1', 'additionalPrompt2', 'additionalPrompt3'].map((key, i) => (
                            <textarea key={key} value={form[key as keyof FormState] as string} onChange={(e) => update(key as keyof FormState, e.target.value as any)} placeholder={`Refinement prompt ${i + 1}…`} rows={2} className="w-full bg-slate-900/60 border border-slate-700/40 hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-2 placeholder-slate-600 transition-all outline-none text-xs resize-none" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Changes after generation */}
                    <div className="mt-6 text-white">
                      <FieldLabel required>Did you manually edit or modify the artwork after generation?</FieldLabel>
                      <div className="flex flex-col gap-2.5 mt-3">
                        {CHANGES_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-350 select-none">
                            <input type="radio" name="changesAfterGeneration" value={opt.value} checked={form.changesAfterGeneration === opt.value} onChange={() => update('changesAfterGeneration', opt.value)} className="w-4 h-4 rounded-full border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-900" />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      {form.changesAfterGeneration && form.changesAfterGeneration !== 'No changes' && (
                        <div className="mt-4 bg-[#0B1220] border border-slate-700/30 rounded-2xl p-4">
                          <label className="block text-slate-300 text-xs font-semibold mb-1">Describe the manual changes you made:</label>
                          <p className="text-slate-500 text-[10px] mb-2.5">e.g. Color grading, compositing other elements, text addition, retouching, etc.</p>
                          <textarea value={form.changesDescription} onChange={(e) => update('changesDescription', e.target.value)} placeholder="Describe your edits…" rows={3} className="w-full bg-slate-900/60 border border-slate-700/40 hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-2 placeholder-slate-600 transition-all outline-none text-xs resize-none" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Step 4: Artwork Upload ────────────────────────────────── */}
                {currentStep === 4 && (
                  <div>
                    <SectionHeader icon="🖼️" title="Artwork Upload" step="Section 4 of 5" />
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                      Upload your finalized high-resolution artwork. Valid formats: <span className="text-white font-bold">JPG, JPEG, PNG</span>. Max file size: <span className="text-white font-bold">10 MB</span>.
                    </p>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleArtworkFile(e.target.files?.[0] || null)} />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); handleArtworkFile(e.dataTransfer.files?.[0] || null); }}
                      className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${form.artwork ? 'bg-emerald-500/5 border-emerald-500/40 hover:border-emerald-500' : 'bg-[#0B1220] border-slate-700/50 hover:border-slate-600'}`}
                    >
                      {form.artworkPreview ? (
                        <div className="flex flex-col items-center">
                          <img src={form.artworkPreview} alt="Final Artwork Preview" className="max-h-80 rounded-2xl object-contain mb-4 border border-slate-700/50 shadow-2xl" />
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-450 font-bold text-sm flex items-center gap-1.5">
                              <FiCheck className="stroke-[3] text-emerald-400" /> Uploaded: {form.artwork?.name}
                            </span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); update('artwork', null); update('artworkPreview', ''); }} className="text-red-400 hover:text-red-300 font-bold p-1 bg-slate-800 border border-slate-700/50 rounded-lg" title="Remove artwork">
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                          <p className="text-slate-500 text-xs mt-3 select-none">Click or drag a new image here to replace this file</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-6">
                          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                            <FiUpload size={24} />
                          </div>
                          <h3 className="text-white font-bold text-base mb-1">Upload your artwork</h3>
                          <p className="text-slate-500 text-xs">Drag and drop your file here, or click to browse</p>
                          <p className="text-slate-600 text-[10px] mt-4">JPG, JPEG, PNG (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Step 5: Declarations & Consent ──────────────────────────────────── */}
                {currentStep === 5 && (
                  <div>
                    <SectionHeader icon="✅" title="Declarations & Consent" step="Section 5 of 5" />
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">Please review and accept the official Kidrove AI Art competition declarations and Parent/Guardian consent.</p>

                    <div className="space-y-6">
                      {/* Declarations Checkbox */}
                      <div className="bg-[#0B1220] backdrop-blur-xl border border-slate-700/40 rounded-3xl p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <h3 className="text-white font-bold text-sm">Official Declarations & Consent</h3>
                            <p className="text-slate-500 text-xs mt-1">Responsible AI, Originality, Terms & Conditions, and Parent/Guardian Consent.</p>
                          </div>
                          <button type="button" onClick={() => setShowDeclarationsModal(true)} className="px-5 py-2.5 bg-slate-800 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/30 hover:bg-slate-700 transition-colors whitespace-nowrap">
                            Read Declarations
                          </button>
                        </div>
                        <CheckboxItem
                          label="I confirm and agree to all the Official Declarations and Parent/Guardian Consent."
                          checked={form.agreeTerms && form.responsibleAiDeclaration && form.originalityDeclaration && form.parentGuardianConsent}
                          onChange={(v) => {
                            update('agreeTerms', v);
                            update('responsibleAiDeclaration', v);
                            update('originalityDeclaration', v);
                            update('parentGuardianConsent', v);
                          }}
                          accent
                        />
                      </div>

                      {/* Showcase Permission */}
                      <div className="bg-[#0B1220] border border-slate-700/40 rounded-3xl p-6">
                        <h3 className="text-white font-bold text-sm mb-1">Permission to Showcase Artwork</h3>
                        <p className="text-slate-500 text-xs mb-4">Let Kidrove celebrate student talent in public galleries and social media.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <button type="button" onClick={() => update('artworkDisplayPermission', 'yes')} className={`p-5 rounded-2xl border text-left transition-all flex gap-3.5 ${form.artworkDisplayPermission === 'yes' ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-900/40 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}>
                            <div className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.artworkDisplayPermission === 'yes' ? 'border-emerald-500 bg-emerald-500 text-slate-955' : 'border-slate-600'}`}>{form.artworkDisplayPermission === 'yes' && <FiCheck size={13} className="stroke-[3]" />}</div>
                            <div><h4 className={`font-bold text-xs mb-1 ${form.artworkDisplayPermission === 'yes' ? 'text-white' : 'text-slate-300'}`}>Yes, Display Publicly</h4><p className="text-[11px] text-slate-400 leading-normal">Showcase in our digital art gallery, social channels, and event promotions.</p></div>
                          </button>
                          <button type="button" onClick={() => update('artworkDisplayPermission', 'no')} className={`p-5 rounded-2xl border text-left transition-all flex gap-3.5 ${form.artworkDisplayPermission === 'no' ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'bg-slate-900/40 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}>
                            <div className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.artworkDisplayPermission === 'no' ? 'border-rose-500 bg-rose-500 text-slate-955' : 'border-slate-600'}`}>{form.artworkDisplayPermission === 'no' && <FiCheck size={13} className="stroke-[3]" />}</div>
                            <div><h4 className={`font-bold text-xs mb-1 ${form.artworkDisplayPermission === 'no' ? 'text-white' : 'text-slate-350'}`}>No, Keep Private</h4><p className="text-[11px] text-slate-400 leading-normal">Only show the artwork to judges for award evaluation purposes.</p></div>
                          </button>
                        </div>
                        {form.artworkDisplayPermission === 'yes' && (
                          <div className="mt-4 p-4.5 bg-slate-900/40 border border-slate-700/30 rounded-2xl">
                            <label className="block text-slate-300 text-xs font-semibold mb-1">Student Name Display Credit:</label>
                            <p className="text-slate-400 text-[10px] mb-3">Select how the student should be credited in showcase exhibitions:</p>
                            <div className="flex flex-col gap-2.5">
                              {[{ value: 'yes', label: 'Full Credit (Show first name, grade, and school name)' }, { value: 'no', label: 'Anonymous (Only show grade and school name)' }].map((opt) => (
                                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                                  <input type="radio" name="nameDisplay" value={opt.value} checked={form.nameDisplayPermission === opt.value} onChange={() => update('nameDisplayPermission', opt.value)} className="w-4 h-4 rounded-full border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-900 mt-0.5" />
                                  <span className="leading-snug">{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Communication Preferences */}
                      <div className="bg-[#0B1220] text-white border border-slate-700/40 rounded-3xl p-6">
                        <h3 className="text-white font-bold text-sm mb-2">Communication Preferences</h3>
                        <div className="flex flex-col gap-3">
                          <CheckboxItem label="I agree to receive important updates, results notifications, and certificate delivery details." checked={form.competitionUpdatesConsent} onChange={(v) => update('competitionUpdatesConsent', v)} accent />
                          <CheckboxItem label="Optional: I would like to receive notifications about future workshops, challenges, and educational events." checked={form.marketingConsent} onChange={(v) => update('marketingConsent', v)} />
                        </div>
                      </div>

                      {/* Disqualification Clause */}
                      <div className="flex gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                        <FiAlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-red-300 font-bold text-xs mb-1">Disqualification Clause</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed">Kidrove reserves the right to disqualify entries violating rules, utilizing inappropriate content, copying, or infringing copyright. Judging panel decision is final.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Errors Panel ────────────────────────────────────────── */}
                {errors.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-red-500/10 border border-red-500/25 rounded-2xl p-4">
                    {errors.map((err, i) => (
                      <div key={i} className="flex gap-2 items-start mb-2.5 last:mb-0">
                        <FiAlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-red-300 text-xs">{err}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center gap-4">
            {currentStep > 1 ? (
              <button type="button" onClick={handleBack} className="px-6 py-3 rounded-xl border border-slate-700/50 hover:border-slate-600 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98]">
                <FiChevronLeft className="text-lg" /> Back
              </button>
            ) : <div />}

            {currentStep < 5 ? (
              <button type="button" onClick={handleNext} className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-955 text-sm font-bold flex items-center gap-2 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all active:scale-[0.98]">
                Next <FiChevronRight className="stroke-[3] text-lg" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-955 text-sm font-black flex items-center gap-2 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </span>
                ) : (
                  <>Submit Entry <FiStar className="text-lg" /></>
                )}
              </button>
            )}
          </div>

          <p className="text-center text-slate-500 text-xs mt-6 select-none">Step {currentStep} of {STEPS.length}</p>
        </div>
      </div>

      {/* ── Declarations Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeclarationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0B1220] border border-slate-700/50 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/40">
                <div>
                  <h3 className="text-white font-bold text-lg">Official Declarations & Consent</h3>
                  <p className="text-slate-500 text-xs mt-1">Please read the following carefully.</p>
                </div>
                <button
                  onClick={() => setShowDeclarationsModal(false)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-6 flex-1 custom-scrollbar">
                {/* Responsible AI */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500"><HiOutlineSparkles size={16} /></div>
                    <h4 className="text-white font-bold text-sm">Responsible AI Declaration</h4>
                  </div>
                  <div className="space-y-2 text-slate-400 text-xs leading-relaxed bg-slate-900/30 rounded-2xl p-4 border border-slate-700/30">
                    {[
                      'I understand that AI is a creative tool and that the submitted work must represent my own creative idea.',
                      "I have not copied another participant's artwork.",
                      'I have not downloaded an existing AI-generated image from the internet and submitted it as my own creation.',
                      'I have not knowingly used copyrighted artwork, characters, logos or other protected material in a way that violates applicable rights.',
                      'My artwork does not contain hate speech, discriminatory content, explicit material, graphic violence or inappropriate content.',
                      'I have not used AI to create misleading or inappropriate representations of real people.',
                      'I have not entered private, confidential or sensitive personal information into an AI tool for this competition.',
                      'I have followed the applicable age requirements and terms of the AI tool(s) I used.',
                      'I understand that Kidrove may request additional information or evidence regarding the creation process if necessary.',
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2.5 items-start"><FiCheck size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" /><p>{item}</p></div>
                    ))}
                  </div>
                </div>

                {/* Originality */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500"><FiAward size={16} /></div>
                    <h4 className="text-white font-bold text-sm">Originality Declaration</h4>
                  </div>
                  <div className="space-y-2 text-slate-400 text-xs leading-relaxed bg-slate-900/30 rounded-2xl p-4 border border-slate-700/30">
                    {[
                      'This is my original competition entry.',
                      'The concept and creative direction were developed by me.',
                      "Where AI was used, I used it as a creative tool and did not simply submit someone else's work.",
                      "The artwork has not been submitted under another student's name.",
                      'The information provided in this form is accurate.',
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2.5 items-start"><FiCheck size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" /><p>{item}</p></div>
                    ))}
                  </div>
                </div>

                {/* Terms */}
                <div>
                  <div className="bg-slate-900/30 rounded-2xl p-4 border border-slate-700/30">
                    <p className="text-slate-400 text-xs">
                      I agree to all{' '}
                      <a href="https://docs.google.com/spreadsheets/u/0/d/1jZLZINqvvbIEG0Sg451tIlE4P2KuVuSpQXhEKPokanw/edit" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline font-bold">
                        Terms & Conditions
                      </a>{' '}
                      as laid by Kidrove.
                    </p>
                  </div>
                </div>

                {/* Parent/Guardian */}
                <div>
                  <h4 className="text-white font-bold text-sm mb-3">Parent/Guardian Confirmation</h4>
                  <div className="space-y-2 bg-slate-900/30 rounded-2xl p-4 border border-slate-700/30 text-xs text-slate-400">
                    <p className="mb-2 leading-relaxed">I confirm that I am the parent/legal guardian of the participating student and give permission for them to participate in the AI Art Competition 2026.</p>
                    {[
                      'The competition involves the use of Generative AI creative tools.',
                      'AI tools may have their own age guidelines and terms of use.',
                      'Students may require adult supervision when operating AI tools.',
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2 items-start"><FiCheck size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" /><p>{item}</p></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700/40 text-right">
                <button
                  onClick={() => setShowDeclarationsModal(false)}
                  className="px-6 py-2 bg-amber-500 text-slate-950 text-sm font-bold rounded-xl hover:bg-amber-400 transition-colors"
                >
                  Close & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, step }: { icon: string; title: string; step: string }) {
  return (
    <div className="mb-6 pb-4 border-b border-slate-700/40">
      <p className="text-amber-500 text-[10px] font-extrabold uppercase tracking-widest mb-1">{step}</p>
      <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
        <span className="text-3xl">{icon}</span> {title}
      </h2>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-slate-350 text-sm font-semibold mb-2">
      {children}
      {required && <span className="text-amber-500 ml-1">*</span>}
    </label>
  );
}

function InputField({
  label, required, type = 'text', value, onChange, placeholder, min, max,
}: {
  label: string; required?: boolean; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; min?: string; max?: string;
}) {
  return (
    <div className="mb-5">
      <label className="block text-slate-300 text-sm font-semibold mb-1.5">
        {label}{required && <span className="text-amber-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full bg-[#0B1220] border border-slate-700/50 hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 placeholder-slate-600 transition-all outline-none text-sm"
      />
    </div>
  );
}

function SelectField({
  label, required, value, onChange, options, placeholder,
}: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <div className="mb-5">
      <label className="block text-slate-300 text-sm font-semibold mb-1.5">
        {label}{required && <span className="text-amber-500 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0B1220] border border-slate-700/50 hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 cursor-pointer transition-all outline-none text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%2522%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%252394a3b8%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
      >
        <option value="" className="bg-slate-950 text-slate-400">{placeholder || `Select ${label}`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-950 text-white">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function CheckboxItem({
  label, checked, onChange, accent,
}: {
  label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; accent?: boolean;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3.5 cursor-pointer py-3.5 px-4 rounded-xl border transition-all ${checked
        ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.15)]'
        : 'bg-slate-900/40 border-slate-700/40 text-slate-450 hover:border-slate-600 hover:text-slate-200'
        }`}
    >
      <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${checked ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-[0_0_6px_rgba(245,158,11,0.2)]' : 'bg-slate-900 border-slate-700'}`}>
        {checked && <FiCheck size={12} className="stroke-[3]" />}
      </div>
      <span className={`text-xs select-none leading-relaxed ${accent ? 'font-semibold text-white' : 'text-slate-455'}`}>
        {label}
      </span>
    </div>
  );
}

function RadioCard({
  value: _value, label, description, selected, onChange,
}: {
  value: string; label: string; description: string; selected: boolean; onChange: () => void;
}) {
  return (
    <div
      onClick={onChange}
      className={`border rounded-2xl p-5 cursor-pointer transition-all flex gap-4 ${selected
        ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
        : 'bg-[#0B1220] border-slate-700/50 text-slate-450 hover:border-slate-600 hover:text-slate-200'
        }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${selected ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'border-slate-700 bg-transparent'}`} />
      <div>
        <div className={`font-bold text-sm mb-1 ${selected ? 'text-white' : 'text-slate-300'}`}>{label}</div>
        <div className="text-slate-500 text-xs leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
