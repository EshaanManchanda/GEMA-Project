import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiCamera, FiUpload,
  FiCheck, FiChevronRight, FiChevronLeft, FiAlertCircle,
  FiAward, FiStar, FiImage, FiTrash2,
} from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi2';
import SEO from '@/components/common/SEO';
import competitionAPI, { CompetitionSubmitPayload } from '@/services/api/competitionAPI';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

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
  { id: 5, label: 'Declare', icon: FiCheck },
  { id: 6, label: 'Consent', icon: FiAward },
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
  processScreenshot: File | null;
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
  processScreenshot: null, changesAfterGeneration: '', changesDescription: '',
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
  }
  if (step === 6) {
    if (!form.parentGuardianConsent) errors.push('Parent/Guardian confirmation is required');
    if (!form.artworkDisplayPermission) errors.push('Please select your artwork display preference');
    if (!form.competitionUpdatesConsent)
      errors.push('Competition communications consent is required');
  }
  return errors;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

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
    setCurrentStep((s) => Math.min(6, s + 1));
    const submitSection = document.getElementById('submit-entry');
    if (submitSection) {
      submitSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setErrors([]);
    setCurrentStep((s) => Math.max(1, s - 1));
    const submitSection = document.getElementById('submit-entry');
    if (submitSection) {
      submitSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    const errs = validateStep(6, form);
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
        processScreenshot: form.processScreenshot,
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
      <div className="min-h-screen bg-[#070B10] text-slate-350 flex items-center justify-center px-4 py-16 font-sans">
        <SEO title="Submission Successful — Kidrove AI Art Competition 2026" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-slate-900/60 backdrop-blur-xl border border-slate-850 rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center relative overflow-hidden"
        >
          {/* Ambient light blobs */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

          {/* Animated checkmark */}
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
            Your AI Art competition entry has been received successfully.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-4 inline-block mb-8 text-center"
          >
            <span className="text-slate-500 text-xs uppercase font-extrabold tracking-widest block mb-1">Your Submission ID</span>
            <span className="text-amber-300 font-extrabold text-2xl tracking-wider select-all">{submissionRef}</span>
          </motion.div>

          {/* What happens next */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-left bg-slate-950/40 border border-slate-900 rounded-2xl p-6"
          >
            <h2 className="text-white font-extrabold text-base mb-4 flex items-center gap-2">
              <span>📌</span> What happens next?
            </h2>
            {[
              { icon: '📩', title: 'Email Confirmation', desc: 'You will receive an email confirmation containing your submission ID shortly.' },
              { icon: '📜', title: 'Participation Certificate', desc: 'Every qualifying student will receive a Kidrove Certificate of Participation.' },
              { icon: '🏆', title: 'Winners Announced', desc: 'Entries will be evaluated by our judging panel. Winners receive Gold, Silver & Bronze medals!' },
              { icon: '🎨', title: 'Virtual Exhibition', desc: 'Outstanding creations will be exhibited in the Kidrove AI Art Gallery.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="flex gap-3 items-start mb-4 last:mb-0 bg-slate-900/40 border border-slate-850/50 rounded-xl p-3"
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
            <button
              onClick={() => {
                setIsSubmitted(false);
                setForm(initialFormState);
                setCurrentStep(1);
              }}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-xl transition-all border border-slate-700"
            >
              Submit Another Entry
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main Page Layout ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#070B10] text-slate-350 font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-x-hidden">
      <SEO
        title="AI Art Competition 2026 — If AI Could Draw My UAE | Kidrove"
        description="Enter the Kidrove 'If AI Could Draw My UAE…' Generative AI Art Competition 2026. Open to all UAE school students. Submit your AI-generated artwork and win Gold, Silver & Bronze medals."
      />

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="relative pt-28 pb-20 overflow-hidden bg-[#0A0F16] border-b border-slate-900/60">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[60%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[50%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold px-4.5 py-2 rounded-full text-xs tracking-wider uppercase mb-8 shadow-sm">
            <HiOutlineSparkles className="text-amber-400 animate-pulse text-lg" />
            <span>Kidrove AI Art Competition 2026</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight select-none">
            If AI Could Draw <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 drop-shadow-md">
              My UAE…
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Welcome to the ultimate generative art challenge for UAE school students. Combine human imagination with artificial intelligence to show us the future of the Emirates.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#submit-entry"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black rounded-full shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all text-center flex items-center justify-center gap-2 text-sm"
            >
              Submit Your Entry <FiChevronRight className="stroke-[3] text-lg" />
            </a>
            <a
              href="#guidelines"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-full hover:bg-slate-850 hover:text-white transition-all text-center text-sm"
            >
              Read Rules & Prizes
            </a>
          </div>

          {/* Highlights Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto mt-20 text-slate-350">
            {[
              { label: 'Gold, Silver & Bronze', value: '🏆 Medals', desc: 'Badges & trophies' },
              { label: 'Participation', value: '📜 Certificates', desc: 'For every student' },
              { label: 'Exhibition', value: '🎨 Public Gallery', desc: 'Showcasing top talent' },
              { label: 'Open to Grades 1–12', value: '🧑‍🎓 All UAE Students', desc: 'Any UAE school' },
            ].map((item, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 hover:-translate-y-2 transition-all duration-300 text-center shadow-xl shadow-black/30 group">
                <span className="text-3xl md:text-4xl block mb-3 group-hover:scale-110 transition-transform">{item.value.split(' ')[0]}</span>
                <span className="text-lg md:text-xl font-black text-white block mb-1">{item.value.split(' ').slice(1).join(' ')}</span>
                <span className="text-sm font-bold text-amber-400 block mb-1">{item.label}</span>
                <span className="text-xs text-slate-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Theme Inspiration Section ───────────────────────────────────── */}
      <div id="guidelines" className="py-10 md:py-20 bg-white text-slate-600 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">🎨 Express Your Imagination</h2>
            <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              How do you see the future of your home? Explore these creative directions or generate your own masterpiece.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: '🌱 Sustainable Future',
                desc: 'Green wind towers, vertical gardens, electric flying cars over Dubai Creek, and self-sufficient desert communities.',
                prompt: 'A hyperrealistic futuristic city in Abu Dhabi, solar powered dome structures, flying electric buses, lush hanging gardens, sunset, 8k resolution, cinematic lighting.',
                color: 'from-emerald-500/10 to-teal-500/5',
                borderColor: 'hover:border-emerald-500/30'
              },
              {
                title: '🚀 Space Exploration',
                desc: 'UAE spaceports on Mars, young Emirati scientists working alongside robots, or research stations on distant planets.',
                prompt: 'Emirati girl astronaut in space suit standing on a red planet looking at a futuristic biodome city, glowing neon lights, digital art, high detail, masterpiece.',
                color: 'from-blue-500/10 to-indigo-500/5',
                borderColor: 'hover:border-blue-500/30'
              },
              {
                title: '🏺 Heritage Meets Future',
                desc: 'Traditional wind towers (Barjeel) integrated with smart, high-tech glass towers, showing our culture merging with tomorrow.',
                prompt: 'Traditional Barjeel wind towers standing next to glowing cyberpunk skyscrapers, Dubai, night scene, holographic displays, cinematic lighting, ultra-detailed.',
                color: 'from-amber-500/10 to-orange-500/5',
                borderColor: 'hover:border-amber-500/30'
              }
            ].map((item, i) => (
              <div key={i} className={`bg-gradient-to-b ${item.color} border border-slate-200 rounded-3xl p-8 hover:scale-[1.02] transition-all flex flex-col justify-between ${item.borderColor} shadow-sm hover:shadow-md`}>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 text-xs md:text-sm leading-relaxed mb-6">{item.desc}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-600">
                  <span className="text-amber-600 font-bold block mb-1">💡 Sample Prompt:</span>
                  "{item.prompt}"
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Awards Section ──────────────────────────────────────────────── */}
      <div className="py-20 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="bg-amber-100 text-amber-700 border border-amber-200 text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block">Recognition</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">🏆 Prizes & Recognition</h2>
            <p className="text-slate-600 text-sm md:text-base max-w-xl mx-auto">Every student who participates receives official recognition from Kidrove.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { emoji: '🥇', rank: 'Gold Winner', desc: 'Outstanding creativity, highly refined prompting, and powerful vision.', badge: 'from-yellow-400 to-amber-600' },
              { emoji: '🥈', rank: 'Silver Winner', desc: 'Exceptional artistic quality, detailed composition, and unique interpretation.', badge: 'from-slate-300 to-slate-500' },
              { emoji: '🥉', rank: 'Bronze Winner', desc: 'Superb creative effort, clean visual details, and smart use of AI tools.', badge: 'from-amber-600 to-amber-800' },
              { emoji: '📜', rank: 'Participation', desc: 'All qualifying submissions receive an official certificate of participation.', badge: 'from-blue-500 to-indigo-600' },
            ].map((prize, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-300 transition-all text-center shadow-sm hover:shadow-md">
                <div className="flex flex-col items-center">
                  <span className="text-5xl mb-4 block animate-bounce" style={{ animationDelay: `${idx * 150}ms`, animationDuration: '3s' }}>{prize.emoji}</span>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{prize.rank}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed mb-6">{prize.desc}</p>
                </div>
                <div className={`py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${prize.badge}`}>
                  Official Medal & Certificate
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form Section ─────────────────────────────────────────────────── */}
      <div id="submit-entry" className="py-20 bg-[#070B10] relative overflow-hidden">
        {/* Yellow and Blue Glow Theme Background */}
        <div className="absolute top-[-5%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[150px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="text-4xl">🚀</span>
            <h2 className="text-3xl md:text-5xl font-black text-white mt-3 mb-4">Submission Form</h2>
            <p className="text-slate-400 text-sm">Complete the 6 quick steps below to submit your artwork to the judges.</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-12 max-w-2xl mx-auto">
            <div className="flex justify-between gap-1 flex-wrap md:flex-nowrap">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isDone = currentStep > step.id;
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center gap-2 flex-1 min-w-[70px] max-w-[120px] transition-opacity duration-300 ${isActive || isDone ? 'opacity-100' : 'opacity-50'
                      }`}
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${isDone
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : isActive
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-800/80 border border-slate-700 text-slate-200'
                      }`}>
                      {isDone ? (
                        <FiCheck size={18} className="stroke-[3]" />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider uppercase text-center ${isActive ? 'text-amber-400' : isDone ? 'text-emerald-400' : 'text-slate-300'
                      }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-900 rounded-3xl p-6 md:p-10 shadow-2xl mb-8 relative">
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
                    <SectionHeader icon="👤" title="Participant Details" step="Section 1 of 6" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-1">
                      <InputField label="Parent/Guardian Name" required value={form.parentName}
                        onChange={(v) => update('parentName', v)} placeholder="Parent/Guardian full name" />
                      <InputField label="Parent/Guardian Email" required type="email" value={form.parentEmail}
                        onChange={(v) => update('parentEmail', v)} placeholder="parent@example.com" />
                      <InputField label="Parent/Guardian Mobile" required type="tel" value={form.parentPhone}
                        onChange={(v) => update('parentPhone', v)} placeholder="+971 50 000 0000" />
                      <InputField label="Student Full Name" required value={form.studentFullName}
                        onChange={(v) => update('studentFullName', v)} placeholder="Student full name" />
                      <InputField label="Student Age" required type="number" value={form.studentAge}
                        onChange={(v) => update('studentAge', v)} placeholder="e.g. 12" min="4" max="20" />
                      <SelectField label="Grade" required value={form.grade}
                        onChange={(v) => update('grade', v)}
                        options={GRADES.map((g) => ({ value: g, label: g }))} />
                      <SelectField label="Gender" value={form.gender}
                        onChange={(v) => update('gender', v)}
                        placeholder="Select gender (optional)"
                        options={[
                          { value: 'Male', label: 'Male' },
                          { value: 'Female', label: 'Female' },
                          { value: 'Prefer not to say', label: 'Prefer not to say' },
                        ]} />
                      <InputField label="School Name" required value={form.schoolName}
                        onChange={(v) => update('schoolName', v)} placeholder="Your school name" />
                    </div>
                    <div className="mt-1">
                      <SelectField label="School Emirate" required value={form.schoolEmirate}
                        onChange={(v) => update('schoolEmirate', v)}
                        options={EMIRATES.map((e) => ({ value: e, label: e }))} />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Artwork Entry ─────────────────────────────────── */}
                {currentStep === 2 && (
                  <div>
                    <SectionHeader icon="🎨" title="Competition Entry" step="Section 2 of 6" />
                    <InputField label="Artwork Title" required value={form.artworkTitle}
                      onChange={(v) => update('artworkTitle', v)}
                      placeholder="e.g. The UAE of Tomorrow" />
                    <div className="mt-5">
                      <label className="block text-slate-300 text-sm font-semibold mb-1">
                        What does your artwork show?
                        <span className="text-amber-500 ml-1">*</span>
                      </label>
                      <p className="text-slate-500 text-xs mb-3 leading-relaxed">
                        What did you create? What does it represent? Why did you choose this idea? (Max 100 words)
                      </p>
                      <textarea
                        value={form.artworkDescription}
                        onChange={(e) => update('artworkDescription', e.target.value)}
                        placeholder="Write a short description of your artwork…"
                        rows={5}
                        className={`w-full bg-slate-950/60 border hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 placeholder-slate-650 transition-all outline-none text-sm resize-none ${wordCount(form.artworkDescription) > 100 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800'
                          }`}
                      />
                      <div className={`text-right text-xs mt-2 ${wordCount(form.artworkDescription) > 100 ? 'text-red-400 font-bold' : 'text-slate-500'
                        }`}>
                        {wordCount(form.artworkDescription)} / 100 words
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 3: AI Creation ───────────────────────────────────── */}
                {currentStep === 3 && (
                  <div>
                    <SectionHeader icon="🤖" title="Your AI Creation" step="Section 3 of 6" />
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed bg-slate-950/40 p-4 border border-slate-900 rounded-2xl">
                      Provide details about the tools and creative process used. AI usage is an integral part of this challenge.
                    </p>

                    {/* AI Tools */}
                    <div className="mb-6 text-white">
                      <FieldLabel required>Which AI tool(s) did you use?</FieldLabel>
                      <p className="text-slate-550 text-xs mb-3">You can select multiple tools.</p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AI_TOOLS.map((tool) => {
                          const isSelected = form.aiTools.includes(tool);
                          return (
                            <button
                              key={tool}
                              type="button"
                              onClick={() => toggleTool(tool)}
                              className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${isSelected
                                ? 'bg-amber-500/10 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                : 'bg-slate-950/40 border-slate-855 text-slate-450 hover:border-slate-700 hover:text-slate-200'
                                }`}
                            >
                              <span className="text-2xl mb-2">{getToolIcon(tool)}</span>
                              <span className="text-xs font-semibold leading-snug">{tool.split(' / ')[0]}</span>
                              {isSelected && <FiCheck className="text-amber-500 text-xs mt-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(form.aiTools.includes('Other AI image-generation tool') ||
                      form.aiTools.includes('Other AI creative tool')) && (
                        <InputField label="Please specify the tool name" value={form.otherToolName}
                          onChange={(v) => update('otherToolName', v)}
                          placeholder="e.g. Midjourney, DALL-E 3…" />
                      )}

                    {/* Creation type */}
                    <div className="mb-6 text-white">
                      <FieldLabel required>Select the option that best describes your creation process</FieldLabel>
                      <div className="flex flex-col gap-3 mt-3 text-slate-400">
                        {CREATION_TYPES.map((ct) => (
                          <RadioCard
                            key={ct.value}
                            value={ct.value}
                            label={ct.label}
                            description={ct.desc}
                            selected={form.creationType === ct.value}
                            onChange={() => update('creationType', ct.value)}
                          />
                        ))}
                      </div>
                      <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                        Note: Your choice does not penalize your score. Judges assess the student's creative vision, theme interpretation, and creative control.
                      </p>
                    </div>

                    {/* Main prompt */}
                    <div className="mb-6 text-white">
                      <FieldLabel required>Main AI Prompt</FieldLabel>
                      <p className="text-slate-400 text-xs mb-3">
                        Provide the main prompt or instruction sent to the AI tool to generate your artwork.
                      </p>
                      <textarea
                        value={form.mainPrompt}
                        onChange={(e) => update('mainPrompt', e.target.value)}
                        placeholder="e.g. Create a futuristic UAE in 2050 at sunset, Burj Khalifa with green hanging gardens, flying cars, clean energy..."
                        rows={4}
                        className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 placeholder-slate-650 transition-all outline-none text-sm resize-none"
                      />
                    </div>

                    {/* More prompts */}
                    <div className="mb-6 text-white">
                      <FieldLabel>Did you use more than one prompt to refine your art?</FieldLabel>
                      <div className="flex gap-6 mt-2 mb-4">
                        {['Yes', 'No'].map((opt) => (
                          <label key={opt} className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300 select-none">
                            <input
                              type="radio"
                              name="usedMorePrompts"
                              value={opt}
                              checked={form.usedMorePrompts === opt}
                              onChange={() => update('usedMorePrompts', opt)}
                              className="w-4 h-4 rounded-full border-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-950"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>

                      {form.usedMorePrompts === 'Yes' && (
                        <div className="flex flex-col gap-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl p-4">
                          <p className="text-slate-500 text-[11px]">You may list up to 3 refinement prompts.</p>
                          {['additionalPrompt1', 'additionalPrompt2', 'additionalPrompt3'].map((key, i) => (
                            <textarea
                              key={key}
                              value={form[key as keyof FormState] as string}
                              onChange={(e) => update(key as keyof FormState, e.target.value as any)}
                              placeholder={`Refinement prompt ${i + 1}…`}
                              rows={2}
                              className="w-full bg-slate-950/60 border border-slate-850 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-2 placeholder-slate-650 transition-all outline-none text-xs resize-none"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Screenshot */}
                    <div className="mb-4 text-white">
                      <FieldLabel>Optional: Upload a process screenshot</FieldLabel>
                      <p className="text-slate-500 text-xs mb-3">Upload a screenshot showing your prompt, generation history, or editor timeline.</p>
                      <input
                        ref={screenshotInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => update('processScreenshot', e.target.files?.[0] || null)}
                      />
                      <div className="flex items-center gap-3.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => screenshotInputRef.current?.click()}
                          className="px-5 py-3 rounded-xl border border-dashed border-slate-850 bg-slate-950/40 text-slate-400 text-xs font-bold flex items-center gap-2 hover:border-slate-700 hover:text-slate-200 transition-all"
                        >
                          <FiCamera className="text-base" /> {form.processScreenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                        </button>
                        {form.processScreenshot && (
                          <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4.5 py-2.5 rounded-xl text-xs">
                            <FiCheck className="stroke-[3]" />
                            <span className="truncate max-w-[200px] font-semibold">{form.processScreenshot.name}</span>
                            <button
                              type="button"
                              onClick={() => update('processScreenshot', null)}
                              className="text-red-450 hover:text-red-400 font-bold ml-1.5"
                              title="Remove screenshot"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Changes after generation */}
                    <div className="mt-6 text-white">
                      <FieldLabel required>Did you manually edit or modify the artwork after generation?</FieldLabel>
                      <div className="flex flex-col gap-2.5 mt-3">
                        {CHANGES_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-350 select-none">
                            <input
                              type="radio"
                              name="changesAfterGeneration"
                              value={opt.value}
                              checked={form.changesAfterGeneration === opt.value}
                              onChange={() => update('changesAfterGeneration', opt.value)}
                              className="w-4 h-4 rounded-full border-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-950"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>

                      {form.changesAfterGeneration && form.changesAfterGeneration !== 'No changes' && (
                        <div className="mt-4 bg-slate-950/40 border border-slate-900 rounded-2xl p-4">
                          <label className="block text-slate-300 text-xs font-semibold mb-1">
                            Describe the manual changes you made:
                          </label>
                          <p className="text-slate-500 text-[10px] mb-2.5">
                            e.g. Color grading, compositing other elements, text addition, retouching, etc.
                          </p>
                          <textarea
                            value={form.changesDescription}
                            onChange={(e) => update('changesDescription', e.target.value)}
                            placeholder="Describe your edits…"
                            rows={3}
                            className="w-full bg-slate-950/60 border border-slate-855 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-2 placeholder-slate-650 transition-all outline-none text-xs resize-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Step 4: Artwork Upload ────────────────────────────────── */}
                {currentStep === 4 && (
                  <div>
                    <SectionHeader icon="🖼️" title="Artwork Upload" step="Section 4 of 6" />
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                      Upload your finalized high-resolution artwork. Valid formats: <span className="text-white font-bold">JPG, JPEG, PNG</span>. Max file size: <span className="text-white font-bold">10 MB</span>.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => handleArtworkFile(e.target.files?.[0] || null)}
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleArtworkFile(e.dataTransfer.files?.[0] || null);
                      }}
                      className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${form.artwork
                        ? 'bg-emerald-500/5 border-emerald-500/40 hover:border-emerald-500'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                    >
                      {form.artworkPreview ? (
                        <div className="flex flex-col items-center">
                          <img
                            src={form.artworkPreview}
                            alt="Final Artwork Preview"
                            className="max-h-80 rounded-2xl object-contain mb-4 border border-slate-800 shadow-2xl"
                          />
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-450 font-bold text-sm flex items-center gap-1.5">
                              <FiCheck className="stroke-[3] text-emerald-400" /> Uploaded: {form.artwork?.name}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                update('artwork', null);
                                update('artworkPreview', '');
                              }}
                              className="text-red-400 hover:text-red-300 font-bold p-1 bg-slate-900 border border-slate-850 rounded-lg"
                              title="Remove artwork"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                          <p className="text-slate-500 text-xs mt-3 select-none">
                            Click or drag a new image here to replace this file
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-6">
                          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                            <FiUpload size={24} />
                          </div>
                          <h3 className="text-white font-bold text-base mb-1">Upload your artwork</h3>
                          <p className="text-slate-555 text-xs">Drag and drop your file here, or click to browse</p>
                          <p className="text-slate-600 text-[10px] mt-4">JPG, JPEG, PNG (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Step 5: Declarations ──────────────────────────────────── */}
                {currentStep === 5 && (
                  <div>
                    <SectionHeader icon="✍️" title="Declarations" step="Section 5 of 6" />
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                      Please review and accept the official Kidrove AI Art competition declarations below.
                    </p>

                    <div className="space-y-6">
                      {/* Responsible AI */}
                      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                            <HiOutlineSparkles size={20} />
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-sm">Responsible AI Declaration</h3>
                            <p className="text-slate-500 text-xs">Pledge for ethical generation</p>
                          </div>
                        </div>

                        <div className="space-y-2.5 max-h-48 overflow-y-auto mb-6 pr-1 custom-scrollbar text-slate-400 text-xs leading-relaxed bg-slate-950/30 rounded-2xl p-4 border border-slate-900">
                          {[
                            'I understand that AI is a creative tool and that the submitted work must represent my own creative idea.',
                            'I have not copied another participant\'s artwork.',
                            'I have not downloaded an existing AI-generated image from the internet and submitted it as my own creation.',
                            'I have not knowingly used copyrighted artwork, characters, logos or other protected material in a way that violates applicable rights.',
                            'My artwork does not contain hate speech, discriminatory content, explicit material, graphic violence or inappropriate content.',
                            'I have not used AI to create misleading or inappropriate representations of real people.',
                            'I have not entered private, confidential or sensitive personal information into an AI tool for this competition.',
                            'I have followed the applicable age requirements and terms of the AI tool(s) I used.',
                            'I understand that Kidrove may request additional information or evidence regarding the creation process if necessary.',
                          ].map((item, i) => (
                            <div key={i} className="flex gap-2.5 items-start">
                              <FiCheck size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                              <p>{item}</p>
                            </div>
                          ))}
                        </div>

                        <CheckboxItem
                          label="I confirm and sign the Responsible AI Declaration above."
                          checked={form.responsibleAiDeclaration}
                          onChange={(v) => update('responsibleAiDeclaration', v)}
                          accent
                        />
                      </div>

                      {/* Originality */}
                      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-850 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500">
                            <FiAward size={20} />
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-sm">Originality Declaration</h3>
                            <p className="text-slate-500 text-xs">Pledge for unique concept creation</p>
                          </div>
                        </div>

                        <div className="space-y-2.5 max-h-48 overflow-y-auto mb-6 pr-1 custom-scrollbar text-slate-400 text-xs leading-relaxed bg-slate-950/30 rounded-2xl p-4 border border-slate-900">
                          {[
                            'This is my original competition entry.',
                            'The concept and creative direction were developed by me.',
                            'Where AI was used, I used it as a creative tool and did not simply submit someone else\'s work.',
                            'The artwork has not been submitted under another student\'s name.',
                            'The information provided in this form is accurate.',
                          ].map((item, i) => (
                            <div key={i} className="flex gap-2.5 items-start">
                              <FiCheck size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                              <p>{item}</p>
                            </div>
                          ))}
                        </div>

                        <CheckboxItem
                          label="I confirm and sign the Originality Declaration above."
                          checked={form.originalityDeclaration}
                          onChange={(v) => update('originalityDeclaration', v)}
                          accent
                        />
                      </div>

                      {/* Terms & Conditions */}
                      <div className="bg-slate-900/40 border border-slate-855 rounded-3xl p-6">
                        <CheckboxItem
                          label={
                            <span>
                              I agree to all{' '}
                              <a
                                href="https://docs.google.com/spreadsheets/u/0/d/1jZLZINqvvbIEG0Sg451tIlE4P2KuVuSpQXhEKPokanw/edit"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-500 hover:underline font-bold"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Terms & Conditions
                              </a>{' '}
                              as laid by Kidrove.
                            </span>
                          }
                          checked={form.agreeTerms}
                          onChange={(v) => update('agreeTerms', v)}
                          accent
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 6: Consent & Permissions ─────────────────────────── */}
                {currentStep === 6 && (
                  <div>
                    <SectionHeader icon="✅" title="Consent & Permissions" step="Section 6 of 6" />
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                      Final step: setup permissions and guardian consent.
                    </p>

                    <div className="space-y-6">
                      {/* Parent guardian confirmation */}
                      <div className="bg-slate-900/40 border border-slate-850 rounded-3xl p-6">
                        <h3 className="text-white font-bold text-sm mb-2">Parent/Guardian Confirmation</h3>
                        <p className="text-slate-500 text-xs mb-4 leading-relaxed">
                          I confirm that I am the parent/legal guardian of the participating student and give permission for them to participate in the AI Art Competition 2026.
                        </p>
                        <div className="space-y-2 mb-4 bg-slate-950/30 rounded-2xl p-4 border border-slate-900 text-xs text-slate-400">
                          {[
                            'The competition involves the use of Generative AI creative tools.',
                            'AI tools may have their own age guidelines and terms of use.',
                            'Students may require adult supervision when operating AI tools.',
                          ].map((item, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <FiCheck size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                              <p>{item}</p>
                            </div>
                          ))}
                        </div>
                        <CheckboxItem
                          label="I confirm this as Parent/Guardian."
                          checked={form.parentGuardianConsent}
                          onChange={(v) => update('parentGuardianConsent', v)}
                          accent
                        />
                      </div>

                      {/* Permission to showcase */}
                      <div className="bg-slate-900/40 border border-slate-855 rounded-3xl p-6">
                        <h3 className="text-white font-bold text-sm mb-1">Permission to Showcase Artwork</h3>
                        <p className="text-slate-500 text-xs mb-4">
                          Let Kidrove celebrate student talent in public galleries and social media.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <button
                            type="button"
                            onClick={() => update('artworkDisplayPermission', 'yes')}
                            className={`p-5 rounded-2xl border text-left transition-all flex gap-3.5 ${form.artworkDisplayPermission === 'yes'
                              ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                              : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-755'
                              }`}
                          >
                            <div className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.artworkDisplayPermission === 'yes' ? 'border-emerald-500 bg-emerald-500 text-slate-955' : 'border-slate-600'
                              }`}>
                              {form.artworkDisplayPermission === 'yes' && <FiCheck size={13} className="stroke-[3]" />}
                            </div>
                            <div>
                              <h4 className={`font-bold text-xs mb-1 ${form.artworkDisplayPermission === 'yes' ? 'text-white' : 'text-slate-300'}`}>
                                Yes, Display Publicly
                              </h4>
                              <p className="text-[11px] text-slate-400 leading-normal">
                                Showcase in our digital art gallery, social channels, and event promotions.
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => update('artworkDisplayPermission', 'no')}
                            className={`p-5 rounded-2xl border text-left transition-all flex gap-3.5 ${form.artworkDisplayPermission === 'no'
                              ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                              : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-755'
                              }`}
                          >
                            <div className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.artworkDisplayPermission === 'no' ? 'border-rose-500 bg-rose-500 text-slate-955' : 'border-slate-600'
                              }`}>
                              {form.artworkDisplayPermission === 'no' && <FiCheck size={13} className="stroke-[3]" />}
                            </div>
                            <div>
                              <h4 className={`font-bold text-xs mb-1 ${form.artworkDisplayPermission === 'no' ? 'text-white' : 'text-slate-350'}`}>
                                No, Keep Private
                              </h4>
                              <p className="text-[11px] text-slate-400 leading-normal">
                                Only show the artwork to judges for award evaluation purposes.
                              </p>
                            </div>
                          </button>
                        </div>

                        {form.artworkDisplayPermission === 'yes' && (
                          <div className="mt-4 p-4.5 bg-slate-950/40 border border-slate-900 rounded-2xl">
                            <label className="block text-slate-300 text-xs font-semibold mb-1">
                              Student Name Display Credit:
                            </label>
                            <p className="text-slate-400 text-[10px] mb-3">
                              Select how the student should be credited in showcase exhibitions:
                            </p>
                            <div className="flex flex-col gap-2.5">
                              {[
                                { value: 'yes', label: 'Full Credit (Show first name, grade, and school name)' },
                                { value: 'no', label: 'Anonymous (Only show grade and school name)' },
                              ].map((opt) => (
                                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                                  <input
                                    type="radio"
                                    name="nameDisplay"
                                    value={opt.value}
                                    checked={form.nameDisplayPermission === opt.value}
                                    onChange={() => update('nameDisplayPermission', opt.value)}
                                    className="w-4 h-4 rounded-full border-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-950 mt-0.5"
                                  />
                                  <span className="leading-snug">{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Communication Consent */}
                      <div className="bg-slate-900/40 text-white border border-slate-850 rounded-3xl p-6">
                        <h3 className="text-white font-bold text-sm mb-2">Communication Preferences</h3>
                        <div className="flex flex-col gap-3">
                          <CheckboxItem
                            label="I agree to receive important updates, results notifications, and certificate delivery details."
                            checked={form.competitionUpdatesConsent}
                            onChange={(v) => update('competitionUpdatesConsent', v)}
                            accent
                          />
                          <CheckboxItem
                            label="Optional: I would like to receive notifications about future workshops, challenges, and educational events."
                            checked={form.marketingConsent}
                            onChange={(v) => update('marketingConsent', v)}
                          />
                        </div>
                      </div>

                      {/* Important warning */}
                      <div className="flex gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                        <FiAlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-red-300 font-bold text-xs mb-1">Disqualification Clause</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Kidrove reserves the right to disqualify entries violating rules, utilizing inappropriate content, copying, or infringing copyright. Judging panel decision is final.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Errors Panel ────────────────────────────────────────── */}
                {errors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 bg-red-500/10 border border-red-500/25 rounded-2xl p-4"
                  >
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

          {/* Navigation Action Panel */}
          <div className="flex justify-between items-center gap-4">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-300 text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <FiChevronLeft className="text-lg" /> Back
              </button>
            ) : <div />}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-955 text-sm font-bold flex items-center gap-2 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all active:scale-[0.98]"
              >
                Next <FiChevronRight className="stroke-[3] text-lg" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-955 text-sm font-black flex items-center gap-2 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
              >
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

          {/* Step Count Footer */}
          <p className="text-center text-slate-500 text-xs mt-6 select-none">
            Step {currentStep} of {STEPS.length}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, step }: { icon: string; title: string; step: string }) {
  return (
    <div className="mb-6 pb-4 border-b border-slate-800">
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
        className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 placeholder-slate-600 transition-all outline-none text-sm"
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
        className="w-full bg-slate-950/60 border border-slate-850 hover:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 cursor-pointer transition-all outline-none text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%2522%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%252394a3b8%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
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
        : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:border-slate-700 hover:text-slate-200'
        }`}
    >
      <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${checked ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-[0_0_6px_rgba(245,158,11,0.2)]' : 'bg-slate-950 border-slate-700'
        }`}>
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
        : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:border-slate-700 hover:text-slate-200'
        }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${selected ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'border-slate-700 bg-transparent'
        }`} />
      <div>
        <div className={`font-bold text-sm mb-1 ${selected ? 'text-white' : 'text-slate-300'}`}>{label}</div>
        <div className="text-slate-550 text-xs leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
