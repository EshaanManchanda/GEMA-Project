import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiCheck, FiChevronRight, FiChevronLeft,
  FiAward, FiInfo, FiX, FiArrowRight,
  FiPlay, FiChevronDown, FiAlertCircle, FiCreditCard
} from 'react-icons/fi';
import SEO from '@/components/common/SEO';
import toast from 'react-hot-toast';
import nationalDayAPI from '@/services/api/nationalDayAPI';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMELINE = [
  {
    step: '1',
    date: '1 Nov 2026',
    title: 'Competition Opens',
    desc: 'Registration starts for all participants across the UAE',
    color: 'emerald',
    badgeBg: 'bg-emerald-500',
    shadowColor: 'shadow-emerald-500/30',
    iconBg: 'bg-emerald-500',
    textColor: 'text-emerald-600',
  },
  {
    step: '2',
    date: '15 Dec 2026',
    title: 'Registration Deadline',
    desc: 'Last date for student and school registration',
    color: 'amber',
    badgeBg: 'bg-amber-400',
    shadowColor: 'shadow-amber-400/30',
    iconBg: 'bg-amber-400',
    textColor: 'text-amber-600',
  },
  {
    step: '3',
    date: '15 Dec 2026',
    title: 'Submission Deadline',
    desc: 'Submit your original artwork (JPG or PNG)',
    color: 'rose',
    badgeBg: 'bg-rose-500',
    shadowColor: 'shadow-rose-500/30',
    iconBg: 'bg-rose-500',
    textColor: 'text-rose-600',
  },
  {
    step: '4',
    date: '16-29 Dec 2026',
    title: 'Judging Period',
    desc: 'Entries will be evaluated by our expert panel',
    color: 'blue',
    badgeBg: 'bg-sky-500',
    shadowColor: 'shadow-sky-500/30',
    iconBg: 'bg-sky-500',
    textColor: 'text-sky-600',
  },
  {
    step: '5',
    date: '30 Dec 2026',
    title: 'Results Announcement',
    desc: 'Winners will be officially revealed online',
    color: 'purple',
    badgeBg: 'bg-purple-500',
    shadowColor: 'shadow-purple-500/30',
    iconBg: 'bg-purple-500',
    textColor: 'text-purple-600',
  },
  {
    step: '6',
    date: '31 Jan 2027',
    title: 'Award Ceremony',
    desc: 'Celebrating young talent across the UAE for National Day',
    color: 'orange',
    badgeBg: 'bg-amber-500',
    shadowColor: 'shadow-amber-500/30',
    iconBg: 'bg-amber-500',
    textColor: 'text-amber-600',
  },
];

const CATEGORIES = [
  {
    id: 1,
    name: 'Little Artists',
    grades: 'Kindergarten – Grade 2',
    cardBg: 'bg-gradient-to-br from-[#E8FAF0] via-[#F4FDF8] to-[#D5F5E3] border-[#A3E9C4] text-emerald-950 shadow-emerald-500/10',
    accent: 'text-emerald-800',
    badge: 'bg-white/80 text-emerald-800 border border-emerald-300/60 shadow-xs',
    subtleGlow: 'bg-[#86efac]/20',
    icon: '🌱',
    desc: 'Joyful creative colouring on the official outline template celebrating the UAE.',
  },
  {
    id: 2,
    name: 'Young Creators',
    grades: 'Grades 3 – 5',
    cardBg: 'bg-gradient-to-br from-[#FEF8E7] via-[#FFFDF5] to-[#FDE7B4] border-[#FCD586] text-amber-950 shadow-amber-500/10',
    accent: 'text-amber-800',
    badge: 'bg-white/80 text-amber-800 border border-amber-300/60 shadow-xs',
    subtleGlow: 'bg-[#fcd34d]/20',
    icon: '✨',
    desc: 'Expressing cultural milestones, heritage forts, date palms, dynamic skylines, and friendship across the seven emirates.',
  },
  {
    id: 3,
    name: 'Creative Visionaries',
    grades: 'Grades 6 – 8',
    cardBg: 'bg-gradient-to-br from-[#FAF0FE] via-[#FCF7FF] to-[#E9D5FD] border-[#D8B4FE] text-purple-950 shadow-purple-500/10',
    accent: 'text-purple-800',
    badge: 'bg-white/80 text-purple-800 border border-purple-300/60 shadow-xs',
    subtleGlow: 'bg-[#d8b4fe]/25',
    icon: '🔭',
    desc: 'Showcasing unity, artistic depth, architectural marvels, space achievements, and harmony between tradition and modern progress.',
  },
  {
    id: 4,
    name: 'Emerging Artists',
    grades: 'Grades 9 – 12',
    cardBg: 'bg-gradient-to-br from-[#EDF7FE] via-[#F7FBFF] to-[#CDE9FE] border-[#93C5FD] text-blue-950 shadow-blue-500/10',
    accent: 'text-blue-800',
    badge: 'bg-white/80 text-blue-800 border border-blue-300/60 shadow-xs',
    subtleGlow: 'bg-[#7dd3fc]/25',
    icon: '🌟',
    desc: 'Mastery of medium, profound conceptual commentary, sustainability, visionary futures, and emotional homage to the nation.',
  },
];


const JUDGING_CRITERIA = [
  { label: 'Creativity & Originality', weight: '30%', color: 'bg-emerald-600', desc: 'Fresh perspective, unique artistic voice, and innovative storytelling.' },
  { label: 'Relevance to Theme', weight: '30%', color: 'bg-amber-600', desc: 'How well the artwork embodies “My UAE, My Pride” and the spirit of Eid Al Etihad.' },
  { label: 'Artistic Execution', weight: '25%', color: 'bg-rose-600', desc: 'Technique, control of chosen traditional media, color balance, and composition.' },
  { label: 'Visual Presentation', weight: '15%', color: 'bg-cyan-600', desc: 'Clarity, neatness, overall aesthetic appeal, and emotional resonance.' },
];

const ACCEPTED_MEDIA = [
  'Pencil Drawing / Graphite / Charcoal',
  'Crayons & Oil Pastels',
  'Watercolours & Gouache',
  'Acrylics & Oil Painting',
  'Pen & Ink',
  'Mixed Traditional Painting Media',
];

const GRADES = [
  'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
];

const EMIRATES = [
  'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman',
  'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah',
];

const FAQS = [
  {
    q: 'Do students need to draw from scratch for the UAE National Day contest, or will a template be provided?',
    a: 'Kindergarten, Grade 1, and Grade 2 (Little Artists category) receive official Eid Al Etihad colouring templates. The downloaded PDF contains 3 different template designs—students simply choose and colour ANY ONE template of their choice (you do NOT need to colour all 3). Students in Grades 3 to 12 create their own original traditional drawing or painting from scratch based on the theme “My UAE, My Pride”.',
  },
  {
    q: 'For Kindergarten to Grade 2, do we need to colour all 3 templates in the PDF or only one?',
    a: 'You only need to colour ONE template! The PDF includes 3 beautiful Eid Al Etihad outline designs so your child can choose their favourite one. Please submit only one completed template per participant.',
  },
  {
    q: 'Can students use AI tools for this competition?',
    a: 'No. The Eid Al Etihad Children\'s Art Competition 2026 is strictly a traditional art competition. KG to Grade 2 entries must be hand-coloured on the official outline template, and Grades 3 to 12 entries must be original traditional drawings/paintings made by hand using traditional mediums (paints, crayons, pastels, or pencils). AI-generated and digital copies will be disqualified.',
  },
  {
    q: 'Who is eligible to participate?',
    a: 'Any student currently studying in Kindergarten through Grade 12 in the United Arab Emirates across all seven emirates.',
  },
  {
    q: 'How does School Bulk Registration work?',
    a: 'Schools registering 25 or more students benefit from a discounted rate of AED 40 per student (instead of AED 50). Art coordinators can use our School Bulk Inquiry form to receive the coordinator pack, KG–G2 colouring templates, and single school invoice.',
  },
  {
    q: 'Can a student submit multiple artworks?',
    a: 'Each student is allowed one original artwork submission to ensure our judges can dedicate fair and deep attention to each piece.',
  },
  {
    q: 'What format should the artwork upload be?',
    a: 'Upload a clear, high-resolution photograph or scan in JPG, PNG, or PDF format (under 1MB). Ensure the lighting is bright and even without harsh shadows, glares, or digital filters.',
  },
  {
    q: 'Will every participant receive a certificate?',
    a: 'Yes! Every valid entry receives an official, Participation Certificate featuring the student’s name, school, category, and the Eid Al Etihad competition insignia.',
  },
];

// Helper: category from grade
function getCategoryFromGrade(grade: string): string {
  if (!grade) return 'Little Artists';
  if (['Kindergarten', 'Grade 1', 'Grade 2'].includes(grade)) return 'Little Artists';
  if (['Grade 3', 'Grade 4', 'Grade 5'].includes(grade)) return 'Young Creators';
  if (['Grade 6', 'Grade 7', 'Grade 8'].includes(grade)) return 'Creative Visionaries';
  return 'Emerging Artists';
}

// ─── Registration Form State Interface ────────────────────────────────────────

interface FormState {
  // Step 1: Participant Info
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentFullName: string;
  studentAge: string;
  grade: string;
  gender: string;
  schoolName: string;
  schoolEmirate: string;
  schoolBulkRef: string;

  // Step 2: Artwork Info
  artworkTitle: string;
  artworkDescription: string;
  medium: string;
  themePillar: string;

  // Step 3: Artwork File
  artwork: File | null;
  artworkPreview: string;

  // Step 4: Consent & Declarations
  agreeTerms: boolean;
  traditionalOnlyDeclaration: boolean;
  originalityDeclaration: boolean;
  parentGuardianConsent: boolean;
  artworkDisplayPermission: 'yes' | 'no';
  nameDisplayPermission: boolean;
  competitionUpdatesConsent: boolean;
  marketingConsent: boolean;
}

const initialFormState: FormState = {
  parentName: '',
  parentEmail: '',
  parentPhone: '',
  studentFullName: '',
  studentAge: '',
  grade: '',
  gender: '',
  schoolName: '',
  schoolEmirate: '',
  schoolBulkRef: '',

  artworkTitle: '',
  artworkDescription: '',
  medium: 'Pencil Drawing / Graphite / Charcoal',
  themePillar: 'Heritage & Traditions',

  artwork: null,
  artworkPreview: '',

  agreeTerms: false,
  traditionalOnlyDeclaration: false,
  originalityDeclaration: false,
  parentGuardianConsent: false,
  artworkDisplayPermission: 'yes',
  nameDisplayPermission: true,
  competitionUpdatesConsent: false,
  marketingConsent: false,
};

export default function NationalDayCompetitionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeclarationsModal, setShowDeclarationsModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    schoolName: '',
    contactPerson: '',
    email: '',
    phone: '',
    emirate: 'Dubai',
    estimatedStudents: 30,
    notes: '',
  });
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  const registrationSectionRef = useRef<HTMLDivElement>(null);

  const scrollToRegistration = () => {
    registrationSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setErrors([]);
  };

  const validateStep = (step: number): string[] => {
    const errs: string[] = [];
    if (step === 1) {
      if (!form.parentName.trim()) errs.push('Parent / Guardian name is required');
      if (!form.parentEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) {
        errs.push('A valid parent/guardian email address is required');
      }
      if (!form.parentPhone.trim()) errs.push('Parent mobile phone number is required');
      if (!form.studentFullName.trim()) errs.push('Student full name is required');
      if (!form.studentAge || isNaN(Number(form.studentAge)) || Number(form.studentAge) < 3) {
        errs.push('Valid student age is required (ages 3–18)');
      }
      if (!form.grade) errs.push('Please select student grade / class');
      if (!form.schoolName.trim()) errs.push('School name is required');
      if (!form.schoolEmirate) errs.push('School emirate is required');
    }
    if (step === 2) {
      if (!form.agreeTerms) errs.push('You must agree to the competition Terms & Conditions');
      if (!form.traditionalOnlyDeclaration) errs.push('You must confirm this is a 100% traditional artwork created without AI');
      if (!form.originalityDeclaration) errs.push('You must confirm this is the student’s original work');
      if (!form.parentGuardianConsent) errs.push('Parent or guardian consent is mandatory');
      if (!form.competitionUpdatesConsent) errs.push('Consent to receive competition updates is required');
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(currentStep);
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setCurrentStep((s) => Math.min(3, s + 1));
    registrationSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors([]);
    setCurrentStep((s) => Math.max(1, s - 1));
    registrationSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit Phase 1 Registration and redirect to Stripe
  const handleProceedToPayment = async () => {
    const errs = validateStep(2);
    if (errs.length) {
      setErrors(errs);
      setCurrentStep(2);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
      const payload: any = {
        registrationType: form.schoolBulkRef ? 'school_bulk' : 'individual',
        parentName: form.parentName.trim(),
        parentEmail: form.parentEmail.trim().toLowerCase(),
        parentPhone: form.parentPhone.trim(),
        studentFullName: form.studentFullName.trim(),
        studentAge: Number(form.studentAge),
        grade: form.grade,
        category: getCategoryFromGrade(form.grade),
        gender: form.gender || undefined,
        schoolName: form.schoolName.trim(),
        schoolEmirate: form.schoolEmirate,
        schoolBulkRef: form.schoolBulkRef?.trim() || undefined,

        agreeTerms: form.agreeTerms,
        traditionalOnlyDeclaration: form.traditionalOnlyDeclaration,
        originalityDeclaration: form.originalityDeclaration,

        parentGuardianConsent: form.parentGuardianConsent,
        artworkDisplayPermission: form.artworkDisplayPermission,
        nameDisplayPermission: form.nameDisplayPermission,
        competitionUpdatesConsent: form.competitionUpdatesConsent,
        marketingConsent: form.marketingConsent,
      };

      // 1. Save Phase 1 registration
      const regRes: any = await nationalDayAPI.register(payload);
      const isSuccess = regRes?.success !== false;
      const submissionId = regRes?.data?.submissionId || regRes?.submissionId;

      if (!isSuccess || !submissionId) {
        throw new Error(regRes?.message || 'Failed to save registration details.');
      }

      // 2. Create Stripe Checkout session (AED 50)
      const sessionRes: any = await nationalDayAPI.createCheckoutSession(submissionId);
      const sessionUrl = sessionRes?.data?.sessionUrl || sessionRes?.sessionUrl;
      if (!sessionUrl) {
        throw new Error('Failed to initiate secure payment session');
      }

      // 3. Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please check your connection.';
      toast.error(msg);
      setErrors([msg]);
      setIsSubmitting(false);
    }
  };

  // Dev bypass helper
  const handleDevBypass = async () => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        registrationType: form.schoolBulkRef ? 'school_bulk' : 'individual',
        parentName: form.parentName || 'Test Parent',
        parentEmail: form.parentEmail || 'test@kidrove.com',
        parentPhone: form.parentPhone || '+971500000000',
        studentFullName: form.studentFullName || 'Zayed Al Mansoori',
        studentAge: Number(form.studentAge) || 10,
        grade: form.grade || 'Grade 5',
        category: getCategoryFromGrade(form.grade || 'Grade 5'),
        gender: form.gender || 'Male',
        schoolName: form.schoolName || 'Dubai International Academy',
        schoolEmirate: form.schoolEmirate || 'Dubai',
        schoolBulkRef: form.schoolBulkRef || undefined,

        agreeTerms: true,
        traditionalOnlyDeclaration: true,
        originalityDeclaration: true,

        parentGuardianConsent: true,
        artworkDisplayPermission: 'yes',
        nameDisplayPermission: true,
        competitionUpdatesConsent: true,
        marketingConsent: false,
      };

      const regRes: any = await nationalDayAPI.register(payload);
      const submissionId = regRes?.data?.submissionId || regRes?.submissionId;
      if (!submissionId) {
        throw new Error(regRes?.message || 'Failed to save test registration');
      }
      window.location.href = `/national-day-art-competition/payment-success?session_id=TEST_PAYMENT_SKIP&submission_id=${submissionId}`;
    } catch (err: any) {
      toast.error(err?.message || 'Bypass failed');
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.schoolName || !bulkForm.contactPerson || !bulkForm.email || !bulkForm.phone) {
      toast.error('Please complete all required fields.');
      return;
    }
    setIsSendingBulk(true);
    try {
      await nationalDayAPI.sendSchoolInquiry(bulkForm);
      toast.success('Inquiry submitted! Our school coordinator will contact you shortly.');
      setShowBulkModal(false);
      setBulkForm({
        schoolName: '',
        contactPerson: '',
        email: '',
        phone: '',
        emirate: 'Dubai',
        estimatedStudents: 30,
        notes: '',
      });
    } catch (err: any) {
      toast.error('Could not submit inquiry. Please email info@kidrove.com directly.');
    } finally {
      setIsSendingBulk(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      <SEO
        title="Kidrove Eid Al Etihad Children's Art Competition 2026 — My UAE, My Pride"
        description="Celebrate Eid Al Etihad with the UAE's premier children's art competition. Open to Kindergarten through Grade 12 across all 7 emirates. Register now!"
      />

      {/* ─── Hero Section: Banner Image with Soft Whitish Fog Glow ────────────────── */}
      <section className="relative overflow-hidden">
        {/* Banner background image container */}
        <div className="relative min-h-[520px] sm:min-h-[580px] lg:min-h-[620px] flex flex-col justify-between">
          {/* Background image covering the banner area */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img
              src="/assets/nationalart.png"
              alt="My UAE, My Pride — Children's Art Competition Banner"
              className="w-full h-full object-cover object-[center_right] lg:object-center"
            />
            {/* Subtle gentle whitish fog overlay: reduced on the left so banner shows naturally */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/35 to-transparent max-w-2xl pointer-events-none" />
            {/* Soft subtle radial ambient glow right behind headline */}
            <div className="absolute top-1/4 left-4 w-[380px] h-[300px] bg-white/30 blur-[60px] rounded-full pointer-events-none" />
          </div>

          {/* Hero Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-14 pb-8 sm:pb-12 relative z-10 w-full">
            <div className="max-w-2xl text-left">
              {/* Pill Header Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50/90 border border-amber-200/90 backdrop-blur-md mb-5 shadow-sm"
              >
                <span className="text-amber-600 font-bold text-xs">✦</span>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                  Eid Al Etihad Children's Art Competition 2026
                </span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.0] text-slate-900 mb-4 drop-shadow-sm font-sans"
              >
                My UAE,<br />
                <span className="text-amber-700">My Pride</span>
              </motion.h1>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed mb-6 max-w-xl"
              >
                A creative journey to celebrate the UAE through the eyes and imagination of its young generation.
              </motion.p>

              {/* Feature Mini Chips */}
              {/* Feature Highlights: Sleek Frosted Glass Pills */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap items-center gap-3 mb-8"
              >
                <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-300/80 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all group">
                  <div className="w-8 h-8 rounded-full bg-emerald-100/90 text-emerald-800 flex items-center justify-center text-sm font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    🎓
                  </div>
                  <div className="text-left pr-1">
                    <p className="text-xs font-black text-slate-900 leading-tight">Grades 1–12</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight">All UAE students</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-300/80 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all group">
                  <div className="w-8 h-8 rounded-full bg-emerald-100/90 text-emerald-800 flex items-center justify-center text-sm font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    👤
                  </div>
                  <div className="text-left pr-1">
                    <p className="text-xs font-black text-slate-900 leading-tight">Individual Entry</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight">1 artwork per child</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-300/80 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md hover:border-amber-500 transition-all group">
                  <div className="w-8 h-8 rounded-full bg-amber-100/90 text-amber-800 flex items-center justify-center text-sm font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    🎨
                  </div>
                  <div className="text-left pr-1">
                    <p className="text-xs font-black text-slate-900 leading-tight">Traditional Media</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight">Drawing, Paint & Pastels</p>
                  </div>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-3.5 mb-2"
              >
                <button
                  onClick={scrollToRegistration}
                  className="px-8 py-3.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm shadow-lg shadow-emerald-900/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>Register Your Entry</span>
                  <FiChevronRight className="stroke-[3]" />
                </button>
                <Link
                  to="/national-day-art-competition/submit"
                  className="px-6 py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-all shadow-md shadow-amber-500/25 flex items-center gap-2"
                >
                  <span>Already Registered? Submit Artwork</span>
                  <FiArrowRight />
                </Link>
                <button
                  onClick={() => {
                    const section = document.getElementById('why-participate');
                    if (section) section.scrollIntoView({ behavior: 'smooth' });
                    else scrollToRegistration();
                  }}
                  className="px-6 py-3.5 rounded-full bg-white/90 hover:bg-white border border-amber-200/90 text-amber-900 font-bold text-sm transition-all shadow-xs flex items-center gap-2"
                >
                  <FiPlay className="text-amber-700 text-xs fill-amber-700" />
                  <span>Learn More</span>
                </button>
              </motion.div>
            </div>
          </div>

          {/* ── 4-Metric Highlights: Transparent cards matching page theme ── */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 mt-8 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {/* Submission Deadline */}
              <div className="bg-white/40 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-6 md:p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] group hover:-translate-y-1 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
                <span className="text-5xl md:text-6xl block mb-4 md:mb-5 relative z-10 drop-shadow-xs">📅</span>
                <h3 className="text-lg font-black text-slate-900 mb-1 relative z-10">Submission Deadline</h3>
                <p className="text-emerald-700 text-sm font-extrabold mb-1 relative z-10">15 December 2026</p>
                <p className="text-slate-600 text-xs font-medium relative z-10">Submit artwork online</p>
              </div>

              {/* Results Announcement */}
              <div className="bg-white/40 backdrop-blur-md border border-amber-500/30 rounded-3xl p-6 md:p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] group hover:-translate-y-1 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                <span className="text-5xl md:text-6xl block mb-4 md:mb-5 relative z-10 drop-shadow-xs">🏆</span>
                <h3 className="text-lg font-black text-slate-900 mb-1 relative z-10">Results Announcement</h3>
                <p className="text-amber-700 text-sm font-extrabold mb-1 relative z-10">30 December 2026</p>
                <p className="text-slate-600 text-xs font-medium relative z-10">Winners announced online</p>
              </div>

              {/* Nominal Fee */}
              <div className="bg-white/40 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-6 md:p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] group hover:-translate-y-1 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
                <span className="text-5xl md:text-6xl block mb-4 md:mb-5 relative z-10 drop-shadow-xs">💰</span>
                <h3 className="text-lg font-black text-slate-900 mb-1 relative z-10">Nominal Fee</h3>
                <p className="text-teal-700 text-sm font-extrabold mb-0.5 relative z-10">AED 50 /student(individual)</p>
                <p className="text-slate-600 text-xs font-medium relative z-10"> AED 40/student (school bulk)</p>
              </div>

              {/* Medals & Certificates */}
              <div className="bg-white/40 backdrop-blur-md border border-purple-500/30 rounded-3xl p-6 md:p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] group hover:-translate-y-1 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
                <span className="text-5xl md:text-6xl block mb-4 md:mb-5 relative z-10 drop-shadow-xs">🎖️</span>
                <h3 className="text-lg font-black text-slate-900 mb-1 relative z-10">Medals & Certificates</h3>
                <p className="text-purple-700 text-sm font-extrabold mb-1 relative z-10">For Top Performers</p>
                <p className="text-slate-600 text-xs font-medium relative z-10">Gold, Silver, Bronze Medals & Certs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Seamless Flow: All Sections Stacked Clearly One After Another ─── */}
      <div className="space-y-24 pt-20 sm:pt-24 pb-16">

        {/* 1. OVERVIEW & THEME */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 1. Theme & Why Participate Grid (Matching Image 1 bottom cards) */}
          <div id="why-participate" className="grid lg:grid-cols-12 gap-8 items-start mb-16">
            {/* Left Column: One Country. Seven Emirates. Countless Stories. One Canvas. */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-sm flex flex-col justify-between h-full">
              <div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-4">
                  Theme & Inspiration
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-[1.15] mb-4">
                  One Country.<br />
                  Seven Emirates.<br />
                  Countless Stories.<br />
                  <span className="text-amber-700">One Canvas.</span>
                </h2>
                <p className="text-slate-600 leading-relaxed text-sm mb-6">
                  From futuristic cities to desert skies, from rich traditions to a greener tomorrow — this is your chance to imagine the UAE through your creativity and let your voice be seen.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-amber-200/80 text-amber-950 text-xs font-medium">
                💡 <strong>Theme: “My UAE, My Pride”</strong> — Broad and emotional, encouraging students from Kindergarten to Grade 12 to tell their own unique stories.
              </div>
            </div>

            {/* Right Column: Why Participate? Gold gradient styling like AiArtCompetitionPage */}
            <div className="lg:col-span-7 bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-orange-400/5 border border-amber-400/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden group shadow-lg flex flex-col justify-center h-full">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/15 blur-[60px] pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-amber-900 mb-6 flex items-center gap-2.5">
                  <span className="text-2xl">🌟</span> Why Participate?
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                  {[
                    { icon: '🎨', text: 'Express Your Artistry' },
                    { icon: '✨', text: 'Showcase Your Talent' },
                    { icon: '💡', text: 'Celebrate Eid Al Etihad' },
                    { icon: '🏆', text: 'Compete Nationwide' },
                    { icon: '📜', text: 'Official Certificate' },
                    { icon: '⭐', text: 'Win Prestigious Medals' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 items-center bg-white/80 backdrop-blur-sm border border-amber-300/60 p-4 rounded-2xl shadow-xs hover:border-amber-400 hover:bg-white hover:shadow-md transition-all"
                    >
                      <span className="text-xl sm:text-2xl drop-shadow-xs">{item.icon}</span>
                      <span className="text-xs sm:text-sm font-bold text-amber-950 leading-tight">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Age-Specific Guidance: KG-G2 Template vs Grades 3-12 Original Drawing */}
          <div className="bg-gradient-to-br from-amber-500/10 via-white to-emerald-500/10 border-2 border-amber-300/80 rounded-3xl p-8 sm:p-12 mb-16 shadow-sm relative overflow-hidden">
            <div className="max-w-3xl mb-8">
              <span className="inline-block text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-3.5 py-1.5 rounded-full border border-amber-300 mb-3 shadow-2xs">
                🎨 Age-Appropriate Format
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
                Colouring Template (KG–G2) & Original Art (G3–G12)
              </h3>
              <p className="text-slate-700 text-sm sm:text-base leading-relaxed mb-3">
                Students in <strong>Kindergarten, Grade 1, and Grade 2</strong> receive official Eid Al Etihad colouring templates containing 3 design options to download and print—<strong>simply choose and colour any ONE template only</strong>. Students in <strong>Grades 3 to 12</strong> create their own original traditional artwork from scratch.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-amber-200/90 shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-black mb-4">
                  1
                </div>
                <h4 className="font-black text-slate-900 text-base mb-2">Register & Receive Details</h4>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Upon registration, parents and schools receive confirmation along with instructions: the 3 colouring template designs for KG–G2 (choose any 1 to colour), and theme guidelines (“My UAE, My Pride”) for Grades 3–12.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-emerald-200/90 shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-black mb-4">
                  2
                </div>
                <h4 className="font-black text-slate-900 text-base mb-2">Create Handcrafted Art</h4>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  KG–G2 pick their favourite single template out of the 3 options and colour it creatively with crayons, pastels, or paints. Grades 3–12 paint or draw original artwork on the theme using traditional media.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-sky-200/90 shadow-xs hover:shadow-md transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center text-xl font-black mb-4">
                  3
                </div>
                <h4 className="font-black text-slate-900 text-base mb-2">Upload Completed Artwork</h4>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Take a clear photograph or scan of the finished piece (under 1 MB, JPG/PNG/PDF) and upload it using your Reference Number before 15 Dec 2026.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 border border-amber-200/80 text-slate-800 text-xs sm:text-sm leading-relaxed flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <p>
                <strong>Tailored for every age!</strong> Little ones enjoy easy coloring with the provided template, while senior students showcase their original painting and drawing talents.
              </p>
            </div>
          </div>

          {/* Timeline Milestones Roadmap (Styled as connected timeline from Image 2) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-sm">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Competition Roadmap</h3>
              <p className="text-slate-500 text-sm mt-1.5 font-medium">
                Important milestones from registration to the final results.
              </p>
            </div>

            {/* Continuous Horizontal Connected Stepper */}
            <div className="relative">
              {/* Dashed connector line across desktop */}
              <div className="hidden lg:block absolute top-[28px] left-[8%] right-[8%] h-[2px] border-t-2 border-dashed border-slate-300 z-0 pointer-events-none" />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-4 relative z-10">
                {TIMELINE.map((item) => (
                  <div key={item.step} className="flex flex-col items-center text-center group">
                    {/* Circle icon badge on connector */}
                    <div
                      className={`w-14 h-14 rounded-full ${item.badgeBg} text-white flex items-center justify-center text-xl shadow-lg ${item.shadowColor} border-4 border-white mb-5 transition-transform duration-300 group-hover:scale-110`}
                    >
                      {item.step === '1' && '🚀'}
                      {item.step === '2' && '📝'}
                      {item.step === '3' && '🎨'}
                      {item.step === '4' && '🔍'}
                      {item.step === '5' && '🏆'}
                      {item.step === '6' && '🎖️'}
                    </div>

                    {/* Date */}
                    <p className="text-sm font-black text-slate-900 mb-1 tracking-tight">
                      {item.date}
                    </p>

                    {/* Milestone title */}
                    <h4 className="text-xs font-bold text-slate-800 mb-1.5 leading-snug">
                      {item.title}
                    </h4>

                    {/* Subtitle / desc */}
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-[170px]">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2. CATEGORIES */}
        <section className="bg-gradient-to-b from-[#F5F2EB] to-[#FAF8F5] py-20 border-y border-amber-100/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-2">
                2. Age Divisions
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Four Competition Categories</h2>
              <p className="text-slate-600 text-sm mt-2">
                Fair, developmentally balanced divisions. Students enter according to their grade level, ensuring peers compete together.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  className={`border-2 rounded-3xl p-6 md:p-7 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden group ${cat.cardBg}`}
                >
                  {/* Subtle soft organic watercolor-like glow effect */}
                  <div className={`absolute -bottom-8 -right-8 w-40 h-40 rounded-full blur-2xl pointer-events-none ${cat.subtleGlow}`} />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 blur-xl pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-4xl drop-shadow-xs">{cat.icon}</span>
                      <span className={`text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-full backdrop-blur-md ${cat.badge}`}>
                        Category {cat.id}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">{cat.name}</h3>
                    <p className={`text-xs font-bold mb-3 ${cat.accent}`}>{cat.grades}</p>
                    <p className="text-xs text-slate-700/90 font-medium leading-relaxed mb-6">{cat.desc}</p>
                  </div>
                  <div className="pt-4 border-t border-black/10 flex items-center justify-between text-[11px] relative z-10">
                    <span className="text-slate-600 font-medium">Evaluation:</span>
                    <span className="text-slate-900 font-black">Age-scaled rubric</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Permitted Media */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span>🖌️</span> Permitted Traditional Painting & Drawing Media
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm mb-6">
                Children should create the artwork themselves with traditional materials. We celebrate authentic physical hands-on craft:
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {ACCEPTED_MEDIA.map((medium, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-[#FAF8F5] p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                    <FiCheck className="text-emerald-600 shrink-0 stroke-[3]" />
                    <span>{medium}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                <FiInfo className="text-rose-600 shrink-0 text-base mt-0.5" />
                <span>
                  <strong>Strict Traditional Art Rule:</strong> AI-generated artwork, computer graphics, and traced internet reproductions are strictly prohibited. The student must personally create their piece.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. AWARDS & RECOGNITION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-2">
              3. Honors & Trophies
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Awards and Recognition</h2>
            <p className="text-slate-600 text-sm mt-2">
              Rewarding excellence, dedication, and school pride across all seven emirates.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {/* Category Medals */}
            <div className="bg-white border border-amber-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-4xl mb-4">🥇🥈🥉</div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Category Medals</h3>
              <p className="text-amber-800 font-bold text-xs uppercase tracking-wider mb-3">12 Winners Across 4 Categories</p>
              <p className="text-slate-600 text-xs leading-relaxed mb-6">
                Top 3 artworks in each age category receive Gold, Silver, and Bronze award certificates accompanied by commemorative medals.
              </p>
              <ul className="text-xs text-slate-700 space-y-2.5 font-medium">
                <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Gold, Silver & Bronze Medals</li>
                <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Formal Winner Distinction Certificate</li>
                <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Featured in the Digital Art Gallery</li>
              </ul>
            </div>

            {/* Overall Best Artwork */}
            <div className="bg-gradient-to-b from-amber-50 to-white border-2 border-amber-300 rounded-3xl p-8 shadow-md relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                Grand Prize
              </div>
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Overall Best Artwork</h3>
              <p className="text-amber-900 font-bold text-xs uppercase tracking-wider mb-3">One Champion Across All UAE</p>
              <p className="text-slate-600 text-xs leading-relaxed mb-6">
                The singular most impactful, creative, and evocative submission in each age category will receive the prestigious Grand Champion Trophy.
              </p>
              <ul className="text-xs text-slate-800 space-y-2.5 font-semibold">
                <li className="flex items-center gap-2"><span className="text-amber-600">★</span> National Champion Trophy</li>
                <li className="flex items-center gap-2"><span className="text-amber-600">★</span> Special Distinction Certificate</li>
                <li className="flex items-center gap-2"><span className="text-amber-600">★</span> Featured Front Cover on Online Gallery</li>
              </ul>
            </div>

            {/* School Recognition */}
            <div className="bg-white border border-emerald-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="text-4xl mb-4">🏫</div>
              <h3 className="text-xl font-black text-slate-900 mb-1">Best School Participation</h3>
              <p className="text-emerald-800 font-bold text-xs uppercase tracking-wider mb-3">Trophy for the Top UAE School</p>
              <p className="text-slate-600 text-xs leading-relaxed mb-6">
                Awarded to all partner schools with eligible registered entries, honoring the school, its leadership, and its art department.
              </p>
              <ul className="text-xs text-slate-700 space-y-2.5 font-medium">
                <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Prestigious School Trophy</li>
                <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Art Department Commendation</li>
                <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> School Leader Honor Certificate</li>
              </ul>
            </div>
          </div>

          {/* Certificate & Gallery Highlight */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 text-xl">
                📜
              </div>
              <div>
                <h4 className="text-slate-900 font-bold text-base mb-1">Participation Certificate</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every eligible participant receives a personalized physical copy of certificate celebrating their contribution to Eid Al Etihad 2026.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0 text-xl">
                🖼️
              </div>
              <div>
                <h4 className="text-slate-900 font-bold text-base mb-1">Kidrove Online National Gallery</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Selected artworks will be showcased in an online gallery, subject to parental consent, allowing friends, families, and schools to celebrate their pride.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. RULES & JUDGING */}
        <section className="bg-gradient-to-b from-[#F5F2EB] to-[#FAF8F5] py-20 border-y border-amber-100/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-2">
                ⚖️ Guidelines & Evaluation
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                Competition Rules & <span className="text-amber-700">Judging Criteria</span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
                A transparent, rigorous evaluation framework led by UAE-based art educators, curators, and cultural specialists.
              </p>
            </div>

            {/* Judging Criteria Bento Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {JUDGING_CRITERIA.map((crit, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">{crit.weight}</span>
                      <span className={`w-3.5 h-3.5 rounded-full ${crit.color} shadow-xs ring-4 ring-slate-100`} />
                    </div>
                    {/* Progress Bar styled like AiArtCompetitionPage */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                      <motion.div
                        className={`h-full rounded-full ${crit.color}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: crit.weight }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                      />
                    </div>
                    <h4 className="text-slate-900 font-extrabold text-base mb-1.5 group-hover:text-amber-700 transition-colors">
                      {crit.label}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {crit.desc}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>Score Weight</span>
                    <span className="text-slate-700 font-bold">{crit.weight} of 100</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Key Rules Checklist Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                    <span>📜</span> Key Rules for Entry
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1">
                    Please ensure your artwork follows these core guidelines to qualify for official judging.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold shrink-0">
                  <FiCheck className="stroke-[3]" /> 100% Traditional Handcrafted Art
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700">
                <div className="flex items-start gap-3.5 bg-[#FAF8F5] p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold shadow-xs">
                    1
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 text-sm mb-1">KG–G2 Template vs Grades 3–12 Original Art</h5>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Kindergarten, Grade 1, and Grade 2 students receive the official ready-made colouring PDF containing 3 designs upon registration—<strong>choose and colour any ONE template only</strong>. Grades 3 to 12 create their own original traditional drawing or painting on the theme “My UAE, My Pride”.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-[#FAF8F5] p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold shadow-xs">
                    2
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 text-sm mb-1">Child’s Own Handcrafted Creativity</h5>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Artwork colouring and drawing must be completed solely by the student using traditional physical mediums (crayons, paints, pastels, pencils). Parents/teachers may assist only with photography and uploading.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-[#FAF8F5] p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold shadow-xs">
                    3
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 text-sm mb-1">Format & File Size (Under 1 MB)</h5>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Submit a clear photograph or flatbed scan in JPG, PNG, or PDF format. The file size must be under 1 MB, taken under even bright light without glares or digital filters.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-[#FAF8F5] p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold shadow-xs">
                    4
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 text-sm mb-1">One Entry per Student</h5>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Each student may submit one entry (coloured template for KG–G2 or original artwork for Grades 3–12) expressing their love for the UAE under the theme “My UAE, My Pride”.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. SCHOOL COORDINATORS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-amber-50/90 via-white to-emerald-50/60 border-2 border-amber-300/80 rounded-3xl p-8 sm:p-12 md:p-14 shadow-lg shadow-amber-900/5 relative overflow-hidden">
            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/15 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/10 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-950 bg-amber-200/80 px-4 py-1.5 rounded-full border border-amber-400/60 shadow-xs">
                  <span>🏫</span> Educators & Art Coordinators
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-3.5 py-1.5 rounded-full border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" /> School Bulk Program 2026
                </span>
              </div>

              <div className="max-w-4xl mb-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
                  School Bulk Registration <span className="whitespace-nowrap text-amber-700">(AED 40 / student)</span>
                </h2>
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  Inspire your entire school community to celebrate Eid Al Etihad! For schools registering 25 or more students, we provide a discounted bulk rate of <strong className="text-slate-900 ">AED 40 per child</strong> (saving AED 10 per entry vs AED 50 individual rate), ready-made colouring templates for Kindergarten to Grade 2, dedicated coordinator support, and entry into the prestigious <strong className="text-emerald-800">Top School Participation Trophy</strong>.
                </p>
              </div>

              {/* 3 Pillar Cards */}
              <div className="grid sm:grid-cols-3 gap-5 mb-10">
                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-amber-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl mb-3">
                    💰
                  </div>
                  <span className="text-amber-800 font-black text-3xl block mb-1">AED 40</span>
                  <p className="text-sm text-slate-900 font-bold mb-1">Discounted Bulk Rate</p>
                  <p className="text-xs text-slate-500 leading-relaxed">For 25+ students (saving AED 10/child vs AED 50 regular rate)</p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-xl mb-3">
                    📄
                  </div>
                  <span className="text-slate-900 font-black text-3xl block mb-1">1 Single</span>
                  <p className="text-sm text-slate-900 font-bold mb-1">Consolidated Invoice</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Official school invoice payable via bank transfer or credit card</p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl mb-3">
                    🏆
                  </div>
                  <span className="text-emerald-700 font-black text-3xl block mb-1">Official Trophy</span>
                  <p className="text-sm text-slate-900 font-bold mb-1">Top School Award</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Recognising schools with student participation & winning art</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm transition-all shadow-lg shadow-amber-600/25 hover:scale-105 active:scale-95 flex items-center gap-2.5"
                >
                  <span>Inquire for School Bulk Registration & Coordinator Pack</span>
                  <FiChevronRight className="stroke-[3]" />
                </button>
                <a
                  href="https://docs.google.com/spreadsheets/d/1T3sos6JH3kVPfuS0-Gq9rqdojUZmCDGN/edit?usp=sharing&ouid=105721430558491971288&rtpof=true&sd=true"
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-4 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm transition-all shadow-xs flex items-center gap-2"
                >
                  <span>📥 Download Bulk Student Sheet</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQS — Styled like "Wondering how it works?" on White Background */}
        <section className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200/80 rounded-3xl max-w-7xl mx-auto shadow-xs">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
            {/* Left Column: Sticky Title */}
            <div className="lg:w-1/3 lg:sticky lg:top-28">
              <span className="inline-block text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200 text-[10px] font-extrabold uppercase tracking-[0.16em] mb-4">
                Questions, meet answers
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.05] tracking-tight mb-4">
                Wondering <br />
                <span className="font-serif italic font-normal text-amber-700">how it works?</span>
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Everything you need to know about submissions, traditional art eligibility, school bulk entries, and certificates.
              </p>
            </div>

            {/* Right Column: Numbered Clean Accordion */}
            <div className="lg:w-2/3 w-full">
              <div className="border-t border-slate-200">
                {FAQS.map((faq, index) => (
                  <details
                    key={index}
                    open={index === 0}
                    className="group border-b border-slate-200 transition-colors"
                  >
                    <summary className="flex items-center justify-between cursor-pointer py-6 outline-none list-none [&::-webkit-details-marker]:hidden hover:text-emerald-800 transition-colors">
                      <span className="flex items-center gap-4 sm:gap-6 font-bold text-slate-900 text-base sm:text-lg text-left pr-4">
                        <span className="text-amber-600 text-xs font-black tracking-widest shrink-0">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {faq.q}
                      </span>
                      <FiChevronDown className="h-5 w-5 text-slate-400 shrink-0 transition-transform duration-300 group-open:-rotate-180 group-open:text-amber-600" />
                    </summary>
                    <div className="pb-8 pt-0 pl-8 sm:pl-[42px] text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. REGISTRATION WIZARD ────────────────────────────────────── */}
        <section
          id="registration-wizard"
          ref={registrationSectionRef}
          className="pt-20 pb-28 bg-white border-t border-slate-200 relative overflow-hidden"
        >
          {/* Yellow and Green spotlight glows behind form */}
          <div className="absolute top-[-5%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/15 blur-[150px] pointer-events-none" />
          <div className="absolute bottom-[20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-amber-400/20 blur-[150px] pointer-events-none" />
          <div className="absolute top-[40%] right-[-5%] w-[40%] h-[40%] rounded-full bg-yellow-400/15 blur-[140px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[20%] w-[45%] h-[45%] rounded-full bg-emerald-400/15 blur-[160px] pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <span className="text-4xl block mb-2">🚀</span>
              <span className="inline-block text-xs font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 mb-3">
                Phase 1: Student Registration
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                Registration & Entry Fee
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-xl mx-auto">
                Complete student details and pay entry fee (AED 50). You will immediately receive your official Reference No. and coloring template (for KG–G2). Artwork can be submitted anytime before Dec 15!
              </p>
            </div>

            {/* Stepper Progress Indicator: 3 Steps */}
            <div className="mb-12 max-w-xl mx-auto">
              <div className="flex justify-between items-center gap-2">
                {[
                  { id: 1, label: 'Student Info', icon: FiUser },
                  { id: 2, label: 'Consent & Declarations', icon: FiAward },
                  { id: 3, label: 'Payment', icon: FiCreditCard },
                ].map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isDone = currentStep > step.id;
                  return (
                    <div
                      key={step.id}
                      className="flex flex-col items-center gap-2 flex-1 transition-opacity duration-300"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isDone
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-300'
                          : isActive
                            ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-4 ring-amber-200'
                            : 'bg-white border-2 border-slate-300 text-slate-700 shadow-xs'
                          }`}
                      >
                        {isDone ? <FiCheck size={20} className="stroke-[3]" /> : <Icon size={18} className="stroke-[2.5]" />}
                      </div>
                      <span
                        className={`text-xs font-black tracking-wider uppercase text-center ${isActive
                          ? 'text-amber-900 font-black'
                          : isDone
                            ? 'text-emerald-900 font-black'
                            : 'text-slate-500 font-extrabold'
                          }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Banner */}
            {errors.length > 0 && (
              <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm space-y-1 shadow-xs">
                {errors.map((err, i) => (
                  <p key={i} className="flex items-center gap-2">
                    <span className="text-rose-500 font-bold">•</span> {err}
                  </p>
                ))}
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl shadow-slate-900/5 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {/* Step 1: Participant */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="mb-6 pb-4 border-b border-slate-100">
                        <span className="text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                          Step 1 of 3
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                          <span>👤</span> Student & Parent Details
                        </h3>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">
                          Enter participant details. You will receive your competition Reference No. upon payment confirmation.
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Parent / Guardian Full Name <span className="text-amber-600">*</span>
                          </label>
                          <input
                            type="text"
                            name="parentName"
                            value={form.parentName}
                            onChange={handleInputChange}
                            placeholder="e.g. Fatima Al Hosani"
                            className="w-full bg-[#FAF8F5] border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Parent Email Address <span className="text-amber-600">*</span>
                          </label>
                          <input
                            type="email"
                            name="parentEmail"
                            value={form.parentEmail}
                            onChange={handleInputChange}
                            placeholder="fatima@example.com"
                            className="w-full bg-[#FAF8F5] border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Parent Mobile Number (WhatsApp) <span className="text-amber-600">*</span>
                          </label>
                          <input
                            type="tel"
                            name="parentPhone"
                            value={form.parentPhone}
                            onChange={handleInputChange}
                            placeholder="+971 50 123 4567"
                            className="w-full bg-[#FAF8F5] border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Student Full Name <span className="text-amber-600">*</span>
                          </label>
                          <input
                            type="text"
                            name="studentFullName"
                            value={form.studentFullName}
                            onChange={handleInputChange}
                            placeholder="e.g. Rashid Al Hosani"
                            className="w-full bg-[#FAF8F5] border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Student Age <span className="text-amber-600">*</span>
                          </label>
                          <input
                            type="number"
                            name="studentAge"
                            min="3"
                            max="19"
                            value={form.studentAge}
                            onChange={handleInputChange}
                            placeholder="Age (e.g. 9)"
                            className="w-full bg-[#FAF8F5] border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Grade / Year <span className="text-amber-600">*</span>
                          </label>
                          <select
                            name="grade"
                            value={form.grade}
                            onChange={handleInputChange}
                            className="w-full bg-[#FAF8F5] border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                          >
                            <option value="">Select Grade</option>
                            {GRADES.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Assigned Category
                          </label>
                          <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-900 font-black truncate shadow-xs">
                            {form.grade ? getCategoryFromGrade(form.grade) : 'Select grade above'}
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            School Name <span className="text-amber-600">*</span>
                          </label>
                          <input
                            type="text"
                            name="schoolName"
                            value={form.schoolName}
                            onChange={handleInputChange}
                            placeholder="e.g. Dubai International Academy"
                            className="w-full bg-[#FAF8F5] border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            School Emirate <span className="text-amber-600">*</span>
                          </label>
                          <select
                            name="schoolEmirate"
                            value={form.schoolEmirate}
                            onChange={handleInputChange}
                            className="w-full bg-[#FAF8F5] border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                          >
                            <option value="">Select Emirate</option>
                            {EMIRATES.map((e) => (
                              <option key={e} value={e}>{e}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Step 2: Declarations & Consent ──────────────────────────────────── */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="mb-6 pb-4 border-b border-slate-100">
                        <span className="text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                          Step 2 of 3
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                          <span>✅</span> Declarations & Consent
                        </h3>
                        <p className="text-slate-600 text-xs sm:text-sm mt-1">
                          Please review and confirm the official declarations and parent/guardian permissions.
                        </p>
                      </div>

                      {/* Declarations Card */}
                      <div className="bg-[#FAF8F5] border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
                          <div>
                            <h4 className="text-slate-900 font-black text-base">Official Declarations & Ethics</h4>
                            <p className="text-slate-600 text-xs mt-0.5">Handmade traditional art eligibility, original artwork creation, and competition rules.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDeclarationsModal(true)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shadow-xs"
                          >
                            Read Full Declarations
                          </button>
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={form.agreeTerms && form.traditionalOnlyDeclaration && form.originalityDeclaration && form.parentGuardianConsent}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setForm((prev) => ({
                                ...prev,
                                agreeTerms: v,
                                traditionalOnlyDeclaration: v,
                                originalityDeclaration: v,
                                parentGuardianConsent: v,
                              }));
                              setErrors([]);
                            }}
                            className="mt-1 w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            <span className="font-bold text-slate-900 block group-hover:text-emerald-800 transition-colors">
                              I confirm and agree to all the Official Declarations and Parent/Guardian Consent.
                            </span>
                            <span>(Handmade traditional artwork declaration, 100% originality, parental consent, and official terms).</span>
                          </div>
                        </label>
                      </div>

                      {/* Showcase Permission */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                        <h4 className="text-slate-900 font-bold text-base mb-1">Permission to Showcase Artwork</h4>
                        <p className="text-slate-600 text-xs sm:text-sm mb-4">Let Kidrove celebrate your child’s creative talent in public exhibitions and UAE National Day tributes.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, artworkDisplayPermission: 'yes' }))}
                            className={`p-5 rounded-2xl border text-left transition-all flex gap-3.5 ${form.artworkDisplayPermission === 'yes'
                              ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                              : 'bg-[#FAF8F5] border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.artworkDisplayPermission === 'yes' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'
                              }`}>
                              {form.artworkDisplayPermission === 'yes' && <FiCheck size={12} className="stroke-[3]" />}
                            </div>
                            <div>
                              <h5 className={`font-bold text-sm mb-0.5 ${form.artworkDisplayPermission === 'yes' ? 'text-emerald-950 font-black' : 'text-slate-800'}`}>
                                Yes, Display Publicly
                              </h5>
                              <p className="text-xs text-slate-600 leading-normal">
                                Showcase in digital art gallery, National Day celebrations & social media.
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, artworkDisplayPermission: 'no' }))}
                            className={`p-5 rounded-2xl border text-left transition-all flex gap-3.5 ${form.artworkDisplayPermission === 'no'
                              ? 'bg-rose-50 border-rose-500 shadow-sm ring-1 ring-rose-500'
                              : 'bg-[#FAF8F5] border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.artworkDisplayPermission === 'no' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-400'
                              }`}>
                              {form.artworkDisplayPermission === 'no' && <FiCheck size={12} className="stroke-[3]" />}
                            </div>
                            <div>
                              <h5 className={`font-bold text-sm mb-0.5 ${form.artworkDisplayPermission === 'no' ? 'text-rose-950 font-black' : 'text-slate-800'}`}>
                                No, Keep Private
                              </h5>
                              <p className="text-xs text-slate-600 leading-normal">
                                Only show the artwork to the official judging panel for award evaluation.
                              </p>
                            </div>
                          </button>
                        </div>


                      </div>

                      {/* Communication Preferences */}
                      <div className="bg-[#FAF8F5] border border-slate-200 rounded-3xl p-6">
                        <h4 className="text-slate-900 font-bold text-base mb-2">Communication Preferences</h4>
                        <div className="flex flex-col gap-3">
                          <label className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-slate-700">
                            <input
                              type="checkbox"
                              name="competitionUpdatesConsent"
                              checked={form.competitionUpdatesConsent}
                              onChange={handleInputChange}
                              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>I agree to receive communications regarding competition verification, certificates, and results on 30th December 2026.</span>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-slate-700">
                            <input
                              type="checkbox"
                              name="marketingConsent"
                              checked={form.marketingConsent}
                              onChange={handleInputChange}
                              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Optional: Keep me updated on future student creative competitions and exhibitions.</span>
                          </label>
                        </div>
                      </div>

                      {/* Disqualification Clause */}
                      <div className="flex gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 text-red-900">
                        <FiAlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold text-xs sm:text-sm text-red-900 mb-0.5">Rules & Disqualification Clause</h5>
                          <p className="text-xs text-red-800 leading-relaxed">
                            Kidrove reserves the right to disqualify entries violating rules, utilizing digital generation/AI tools, copying existing artists, or containing inappropriate content. The judging panel decision is final.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Step 3: Payment ──────────────────────────────────── */}
                  {currentStep === 3 && (
                    <div className="bg-[#FAF8F5] border border-slate-200/90 rounded-3xl p-6 sm:p-10 max-w-lg mx-auto text-center" id="submit-entry">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
                        <FiCreditCard className="w-8 h-8" />
                      </div>
                      <span className="text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                        Step 3 of 3
                      </span>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">Pay Entry Fee</h3>
                      <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
                        Please complete your entry fee payment of <strong className="text-slate-900 font-extrabold">AED 50.00</strong>. You will be redirected to our secure Stripe checkout and returned with instant download access and your Reference Number.
                      </p>

                      {/* Order Summary */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 mb-6 text-left space-y-2.5 text-xs sm:text-sm shadow-xs">
                        <div className="flex justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-500">Student:</span>
                          <span className="font-bold text-slate-900">{form.studentFullName}</span>
                        </div>
                        <div className="flex justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-500">Grade / Category:</span>
                          <span className="font-bold text-emerald-800">{form.grade} · {getCategoryFromGrade(form.grade)}</span>
                        </div>
                        <div className="flex justify-between pb-2 border-b border-slate-100">
                          <span className="text-slate-500">Artwork Deadline:</span>
                          <span className="font-bold text-slate-900">15 December 2026</span>
                        </div>
                        <div className="flex justify-between pt-1 text-base font-black">
                          <span className="text-slate-900">Total Entry Fee:</span>
                          <span className="text-emerald-700">AED 50.00</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleProceedToPayment}
                          disabled={isSubmitting}
                          className="w-full py-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          {isSubmitting ? (
                            <span className="flex items-center gap-2">
                              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Connecting to Stripe…
                            </span>
                          ) : (
                            'Pay AED 50.00 & Complete Registration'
                          )}
                        </button>

                        {import.meta.env.DEV && (
                          <button
                            type="button"
                            onClick={handleDevBypass}
                            disabled={isSubmitting}
                            className="text-xs text-slate-400 hover:text-amber-700 underline font-medium pt-1"
                          >
                            [Dev Only] Bypass Stripe Checkout
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Stepper Footer Navigation */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-3 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 font-black text-xs flex items-center gap-2 transition-all"
                  >
                    <FiChevronLeft className="stroke-[3]" /> Back
                  </button>
                ) : <div />}

                {currentStep < 3 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-8 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    Next Step <FiChevronRight className="stroke-[3]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── WhatsApp Contact Card ────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-4 relative z-10 mt-8 mb-20 md:mb-28">
          <div className="bg-gradient-to-br from-emerald-500/10 via-white to-teal-500/10 border border-emerald-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-emerald-900/5 hover:border-emerald-500/50 transition-colors group">
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-5">
              <div className="w-14 h-14 bg-emerald-500/15 rounded-full flex items-center justify-center border border-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <svg className="w-7 h-7 text-emerald-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1.5">Need help or have questions?</h3>
                <p className="text-slate-600 text-sm">Our support team is available on WhatsApp to assist you.</p>
              </div>
            </div>
            <a
              href="https://wa.me/971529881170"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 active:scale-95"
            >
              Message Us <FiChevronRight className="stroke-[3] text-lg" />
            </a>
          </div>
        </div>
      </div>

      {/* ─── School Bulk Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <button
                onClick={() => setShowBulkModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
              >
                <FiX size={20} />
              </button>

              <div className="mb-6">
                <span className="text-amber-800 text-[10px] font-bold uppercase tracking-widest block mb-1">
                  School Bulk Program · AED 40/Student
                </span>
                <h3 className="text-2xl font-black text-slate-900">School Bulk Registration Inquiry</h3>
                <p className="text-xs text-slate-600 mt-1">
                  For schools registering 25 or more students. Our coordinator will provide the school upload spreadsheet and single school invoice.
                </p>
              </div>

              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">School Name *</label>
                  <input
                    type="text"
                    required
                    value={bulkForm.schoolName}
                    onChange={(e) => setBulkForm({ ...bulkForm, schoolName: e.target.value })}
                    placeholder="e.g. Dubai British School"
                    className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Coordinator Name *</label>
                    <input
                      type="text"
                      required
                      value={bulkForm.contactPerson}
                      onChange={(e) => setBulkForm({ ...bulkForm, contactPerson: e.target.value })}
                      placeholder="Mr./Ms. Art Teacher"
                      className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">School Emirate *</label>
                    <select
                      value={bulkForm.emirate}
                      onChange={(e) => setBulkForm({ ...bulkForm, emirate: e.target.value })}
                      className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                    >
                      {EMIRATES.map((em) => (
                        <option key={em} value={em}>{em}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">School Email *</label>
                    <input
                      type="email"
                      required
                      value={bulkForm.email}
                      onChange={(e) => setBulkForm({ ...bulkForm, email: e.target.value })}
                      placeholder="art@school.sch.ae"
                      className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Coordinator Phone *</label>
                    <input
                      type="tel"
                      required
                      value={bulkForm.phone}
                      onChange={(e) => setBulkForm({ ...bulkForm, phone: e.target.value })}
                      placeholder="+971 50 123 4567"
                      className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Students</label>
                  <input
                    type="number"
                    min="25"
                    value={bulkForm.estimatedStudents}
                    onChange={(e) => setBulkForm({ ...bulkForm, estimatedStudents: parseInt(e.target.value, 10) || 25 })}
                    className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Additional Notes</label>
                  <textarea
                    rows={2}
                    value={bulkForm.notes}
                    onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                    placeholder="Specific requests, school purchase order details, or grade groups..."
                    className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingBulk}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/20 disabled:opacity-60"
                >
                  {isSendingBulk ? 'Submitting Inquiry…' : 'Submit School Inquiry (Get Coordinator Pack)'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Declarations Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeclarationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-800"
            >
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    Official UAE National Day Competition Rules
                  </span>
                  <h3 className="text-slate-900 font-black text-xl mt-1.5">Official Declarations & Ethics</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeclarationsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-6 flex-1 text-xs sm:text-sm">
                {/* Traditional Medium (No AI) */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">🎨</span>
                    <h4 className="text-slate-900 font-bold text-sm">1. Handmade Traditional Artwork (Strict No-AI Policy)</h4>
                  </div>
                  <div className="space-y-2 bg-[#FAF8F5] rounded-2xl p-4 border border-slate-200 text-slate-700 text-xs leading-relaxed">
                    {[
                      'The artwork must be 100% created by the student using traditional painting or drawing mediums (pencils, pastels, watercolours, acrylics, etc.).',
                      'No Generative AI tools (Midjourney, DALL-E, Canva AI, etc.) or computer-generated artwork are permitted.',
                      'No digital tracing, photo filters, or digital manipulations are allowed.',
                      'The original physical piece must be preserved in case judges request physical verification before medal conferral.',
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <FiCheck size={14} className="text-emerald-600 flex-shrink-0 mt-0.5 stroke-[3]" />
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Originality & Integrity */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">✨</span>
                    <h4 className="text-slate-900 font-bold text-sm">2. Originality & Theme Authenticity</h4>
                  </div>
                  <div className="space-y-2 bg-[#FAF8F5] rounded-2xl p-4 border border-slate-200 text-slate-700 text-xs leading-relaxed">
                    {[
                      'The artwork must be an authentic, original creation representing the theme “My UAE, My Pride”.',
                      'The creative concept and execution must belong entirely to the participating student.',
                      'No plagiarizing or directly replicating other existing artists’ work without transformative creative expression.',
                      'All details submitted regarding the student age, grade, and school must be genuine and accurate.',
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <FiCheck size={14} className="text-amber-600 flex-shrink-0 mt-0.5 stroke-[3]" />
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parent / Guardian Confirmation */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">👤</span>
                    <h4 className="text-slate-900 font-bold text-sm">3. Parent / Guardian Consent</h4>
                  </div>
                  <div className="space-y-2 bg-[#FAF8F5] rounded-2xl p-4 border border-slate-200 text-slate-700 text-xs leading-relaxed">
                    <p className="font-semibold text-slate-800 mb-1">
                      By checking the consent box, the parent or legal guardian confirms:
                    </p>
                    {[
                      'I have read the competition criteria and approve my child’s participation.',
                      'I grant Kidrove permission to review, display, and celebrate the student’s artwork in accordance with the chosen privacy preferences.',
                      'I acknowledge that the decisions of the judging committee are impartial, professional, and final.',
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <FiCheck size={14} className="text-blue-600 flex-shrink-0 mt-0.5 stroke-[3]" />
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Kidrove Eid Al Etihad Children's Art Competition 2026</span>
                <button
                  type="button"
                  onClick={() => setShowDeclarationsModal(false)}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                >
                  I Understand & Agree
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
