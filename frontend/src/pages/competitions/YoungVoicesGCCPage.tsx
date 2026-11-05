import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiCheck, FiChevronRight, FiChevronLeft,
  FiAward, FiX, FiArrowRight,
  FiChevronDown, FiAlertCircle, FiCreditCard,
  FiEdit3, FiPlay
} from 'react-icons/fi';
import SEO from '@/components/common/SEO';
import toast from 'react-hot-toast';
import gccCompetitionAPI from '@/services/api/gccCompetitionAPI';

// ─── GCC Participating Countries ──────────────────────────────────────────────
const GCC_COUNTRIES = [
  { name: 'United Arab Emirates', code: 'UAE' },
  { name: 'Saudi Arabia', code: 'KSA' },
  { name: 'Qatar', code: 'QAT' },
  { name: 'Kuwait', code: 'KWT' },
  { name: 'Bahrain', code: 'BHR' },
  { name: 'Oman', code: 'OMN' },
];

// ─── Competition Details Timeline ─────────────────────────────────────────────
// ─── Age Categories ───────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 1,
    name: 'Little Storytellers',
    grades: 'Kindergarten – Grade 2',
    wordLimit: '100 – 200 words',
    icon: '🌱',
    cardBg: 'bg-gradient-to-br from-teal-50 via-white to-cyan-50/60 border-teal-200/80',
    badge: 'bg-teal-100 text-teal-900 border-teal-200',
    desc: 'Simple, charming tales celebrating family, animals, traditions, or friends. (Parents/teachers may assist in typing the child’s own words).',
  },
  {
    id: 2,
    name: 'Young Authors',
    grades: 'Grades 3 – 5',
    wordLimit: '200 – 400 words',
    icon: '📖',
    cardBg: 'bg-gradient-to-br from-cyan-50 via-white to-sky-50/60 border-cyan-200/80',
    badge: 'bg-cyan-100 text-cyan-900 border-cyan-200',
    desc: 'Captivating stories exploring meaningful community moments, memorable places, and heritage journeys across the Gulf.',
  },
  {
    id: 3,
    name: 'Creative Voices',
    grades: 'Grades 6 – 8',
    wordLimit: '400 – 700 words',
    icon: '🖋️',
    cardBg: 'bg-gradient-to-br from-sky-50 via-white to-indigo-50/60 border-sky-200/80',
    badge: 'bg-sky-100 text-sky-900 border-sky-200',
    desc: 'Engaging narratives developing rich character journeys, cross-cultural friendships, and imaginative adventures.',
  },
  {
    id: 4,
    name: 'Emerging Writers',
    grades: 'Grades 9 – 12',
    wordLimit: '700 – 1,000 words',
    icon: '📜',
    cardBg: 'bg-gradient-to-br from-slate-50 via-white to-teal-50/60 border-slate-200/90',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    desc: 'Sophisticated literary storytelling demonstrating deep thematic depth, vivid descriptions, cultural pride, and poetic imagination.',
  },
];

// ─── Judging Criteria ─────────────────────────────────────────────────────────
const CRITERIA = [
  {
    percentage: '30%',
    title: 'Creativity & Originality',
    desc: 'Fresh perspective, unique storytelling voice, imaginative narrative, and authentic student imagination.',
    icon: '💡',
    accent: 'border-teal-500/30 text-teal-700 bg-teal-50/60',
  },
  {
    percentage: '25%',
    title: 'Story Structure & Development',
    desc: 'Engaging beginning, well-paced narrative flow, character progression, and satisfying resolution.',
    icon: '📚',
    accent: 'border-cyan-500/30 text-cyan-700 bg-cyan-50/60',
  },
  {
    percentage: '25%',
    title: 'Connection to the Theme',
    desc: 'Thoughtful embodiment of “Our Heritage, Our Story” rooted in GCC heritage, community, traditions, or unity.',
    icon: '🌍',
    accent: 'border-sky-500/30 text-sky-700 bg-sky-50/60',
  },
  {
    percentage: '20%',
    title: 'Language & Expression',
    desc: 'Age-appropriate vocabulary, descriptive imagery, grammatical control, and evocative storytelling.',
    icon: '✍️',
    accent: 'border-indigo-500/30 text-indigo-700 bg-indigo-50/60',
  },
];

// ─── Awards & Recognition ─────────────────────────────────────────────────────
const AWARDS = [
  {
    title: 'Gold, Silver & Bronze Awards',
    subtitle: 'Per Age Category',
    desc: 'Prestigious winner honours bestowed upon the top literary entries in every individual grade bracket.',
    icon: '🏆',
    border: 'border-teal-300',
    bg: 'bg-teal-50/50',
  },
  {
    title: 'Special Recognition for Storytelling',
    subtitle: 'Jury Honours',
    desc: 'Selected accolades for remarkable creativity, poetic imagery, cultural resonance, and heartwarming themes.',
    icon: '🌟',
    border: 'border-cyan-300',
    bg: 'bg-cyan-50/50',
  },
  {
    title: 'Verified Participation Certificates',
    subtitle: 'For All Eligible Submissions',
    desc: 'Every participant receives an official, high-resolution certificate validating their participation.',
    icon: '📜',
    border: 'border-sky-300',
    bg: 'bg-sky-50/50',
  },
  {
    title: 'School Participation Recognition',
    subtitle: 'Leading Institutions',
    desc: 'School leadership citations honouring educational institutions actively fostering literacy and writing talent.',
    icon: '🏫',
    border: 'border-indigo-300',
    bg: 'bg-indigo-50/50',
  },
  {
    title: 'Kidrove GCC Digital Showcase',
    subtitle: 'Regional Feature',
    desc: 'Opportunity for selected outstanding stories to be featured in the Kidrove digital publication, subject to parental permission.',
    icon: '✨',
    border: 'border-teal-300',
    bg: 'bg-teal-50/50',
  },
];

// ─── Story Prompts ────────────────────────────────────────────────────────────
const STORY_PROMPTS = [
  {
    title: 'A Special Family Tradition',
    desc: 'A story about a gathering, culinary tradition, festival, or custom passed down through generations in your family.',
    icon: '☕',
  },
  {
    title: 'A Memorable Journey Through Your Country',
    desc: 'An inspiring adventure exploring an ancient fort, bustling souq, coastal port, desert dunes, or oasis.',
    icon: '🏜️',
  },
  {
    title: 'Friendship Across the GCC',
    desc: 'A bond between young people from different Gulf nations discovering their shared traditions and unity.',
    icon: '🤝',
  },
  {
    title: 'Traditional Craft & Lore',
    desc: 'A story inspired by pearl diving, falconry, maritime sailing, calligraphy, or traditional craftsmanship.',
    icon: '⛵',
  },
  {
    title: 'An Imaginative Gulf Adventure',
    desc: 'A creative fiction celebrating the warm hospitality, dreams, and vibrant future spirit of the GCC region.',
    icon: '🚀',
  },
];

// ─── FAQs ─────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'What is the theme of Young Voices of the GCC?',
    a: 'The theme is "Our Heritage, Our Story". Students are encouraged to write an original short story celebrating the cultures, traditions, memorable places, and people of the Gulf region.',
  },
  {
    q: 'Which countries are eligible to participate?',
    a: 'The challenge is open to all students residing in the six GCC member countries: Bahrain, Kuwait, Oman, Qatar, Saudi Arabia, and the United Arab Emirates.',
  },
  {
    q: 'Can parents or teachers help write the story?',
    a: 'No. The story must be entirely conceived and composed by the student. For Kindergarten to Grade 2, parents or teachers may assist only with typing or transcribing the child’s spoken words. AI generation, plagiarism, and adult re-writing are strictly disallowed.',
  },
  {
    q: 'Are poetry, video, speeches, or illustrations accepted?',
    a: 'Young Voices of the GCC is exclusively a written short-story competition. Artwork, audio, speeches, and video recordings are not accepted for this challenge.',
  },
  {
    q: 'What are the word count requirements?',
    a: 'Little Storytellers (KG–G2): 100–200 words; Young Authors (Grades 3–5): 200–400 words; Creative Voices (Grades 6–8): 400–700 words; Emerging Writers (Grades 9–12): 700–1,000 words.',
  },
  {
    q: 'How does School Bulk Registration work?',
    a: 'Schools can register multiple students through our institutional inquiry form to receive dedicated student packs, coordinator guidelines, and streamlined invoicing.',
  },
];

const GRADES = [
  'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
  'Grade 10', 'Grade 11', 'Grade 12',
];

function getCategoryFromGrade(grade: string): string {
  if (['Kindergarten', 'Grade 1', 'Grade 2'].includes(grade)) return 'Little Storytellers (KG–G2)';
  if (['Grade 3', 'Grade 4', 'Grade 5'].includes(grade)) return 'Young Authors (Grades 3–5)';
  if (['Grade 6', 'Grade 7', 'Grade 8'].includes(grade)) return 'Creative Voices (Grades 6–8)';
  return 'Emerging Writers (Grades 9–12)';
}

const YoungVoicesGCCPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [showDeclarationsModal, setShowDeclarationsModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState<boolean>(false);
  const [registeredData, setRegisteredData] = useState<{ submissionRef?: string; amount?: number } | null>(null);

  const registrationSectionRef = useRef<HTMLDivElement>(null);

  // Form State
  const [form, setForm] = useState({
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    studentFullName: '',
    studentAge: '',
    gender: '',
    grade: '',
    country: '',
    city: '',
    schoolName: '',
    schoolBulkRef: '',
    storyTitle: '',
    storySummary: '',

    // Declarations & Consents
    agreeTerms: false,
    originalityDeclaration: false,
    parentGuardianConsent: false,
    storyDisplayPermission: 'yes',
    competitionUpdatesConsent: true,
    marketingConsent: false,
  });

  // School Bulk Inquiry Form State
  const [bulkForm, setBulkForm] = useState({
    schoolName: '',
    contactPerson: '',
    email: '',
    phone: '',
    country: 'United Arab Emirates',
    estimatedStudents: 30,
    notes: '',
  });

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
      if (!form.parentPhone.trim()) errs.push('Parent mobile/WhatsApp phone number is required');
      if (!form.studentFullName.trim()) errs.push('Student full name is required');
      if (!form.studentAge || isNaN(Number(form.studentAge)) || Number(form.studentAge) < 3) {
        errs.push('Valid student age is required (ages 3–19)');
      }
      if (!form.grade) errs.push('Please select student grade level');
      if (!form.country) errs.push('Please select GCC country');
      if (!form.schoolName.trim()) errs.push('School name is required');
    }
    if (step === 2) {
      if (!form.agreeTerms) errs.push('You must agree to the competition Terms & Guidelines');
      if (!form.originalityDeclaration) errs.push('You must confirm this is an original story created without AI or plagiarism');
      if (!form.parentGuardianConsent) errs.push('Parent or guardian consent is mandatory');
      if (!form.competitionUpdatesConsent) errs.push('Consent to receive competition updates is required');
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(currentStep);
    if (errs.length > 0) {
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
    if (errs.length > 0) {
      setErrors(errs);
      setCurrentStep(2);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
      const payload = {
        registrationType: (form.schoolBulkRef ? 'school_bulk' : 'individual') as 'individual' | 'school_bulk',
        parentName: form.parentName.trim(),
        parentEmail: form.parentEmail.trim().toLowerCase(),
        parentPhone: form.parentPhone.trim(),
        studentFullName: form.studentFullName.trim(),
        studentAge: Number(form.studentAge) || 10,
        grade: form.grade,
        category: getCategoryFromGrade(form.grade),
        gender: form.gender || undefined,
        country: form.country.trim(),
        city: form.city?.trim() || undefined,
        schoolName: form.schoolName.trim(),
        schoolBulkRef: form.schoolBulkRef?.trim() || undefined,
        storyTitle: form.storyTitle?.trim() || undefined,
        storyDescription: form.storySummary?.trim() || undefined,

        agreeTerms: form.agreeTerms,
        originalityDeclaration: form.originalityDeclaration,
        parentGuardianConsent: form.parentGuardianConsent,
        storyDisplayPermission: (form.storyDisplayPermission === 'no' ? 'no' : 'yes') as 'yes' | 'no',
        nameDisplayPermission: true,
        competitionUpdatesConsent: form.competitionUpdatesConsent,
        marketingConsent: form.marketingConsent,
      };

      // 1. Save Phase 1 registration
      const regRes: any = await gccCompetitionAPI.register(payload);
      const isSuccess = regRes?.success !== false;
      const submissionId = regRes?.data?.submissionId || regRes?.submissionId;

      if (!isSuccess || !submissionId) {
        throw new Error(regRes?.message || 'Failed to save registration details.');
      }

      // 2. Create Stripe Checkout session (AED 50)
      const sessionRes: any = await gccCompetitionAPI.createCheckoutSession(submissionId);
      const sessionUrl = sessionRes?.data?.sessionUrl || sessionRes?.sessionUrl;
      if (!sessionUrl) {
        throw new Error('Failed to initiate secure payment session');
      }

      // 3. Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to initiate payment. Please try again.';
      toast.error(msg);
      setErrors([msg]);
      setIsSubmitting(false);
    }
  };

  // Dev bypass helper (Localhost test payment)
  const handleDevBypass = async () => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        registrationType: form.schoolBulkRef ? 'school_bulk' : 'individual',
        parentName: form.parentName || 'Test Parent',
        parentEmail: form.parentEmail || 'test@kidrove.com',
        parentPhone: form.parentPhone || '+971500000000',
        studentFullName: form.studentFullName || 'Ahmed Al Kaabi',
        studentAge: Number(form.studentAge) || 10,
        grade: form.grade || 'Grade 5',
        category: getCategoryFromGrade(form.grade || 'Grade 5'),
        gender: form.gender || 'Male',
        country: form.country || 'United Arab Emirates',
        schoolName: form.schoolName || 'Dubai International Academy',
        schoolBulkRef: form.schoolBulkRef || undefined,

        agreeTerms: true,
        originalityDeclaration: true,
        parentGuardianConsent: true,
        storyDisplayPermission: 'yes',
        nameDisplayPermission: true,
        competitionUpdatesConsent: true,
        marketingConsent: false,
      };

      const regRes: any = await gccCompetitionAPI.register(payload);
      const submissionId = regRes?.data?.submissionId || regRes?.submissionId;
      if (!submissionId) {
        throw new Error(regRes?.message || 'Failed to save test registration');
      }
      window.location.href = `/competitions/young-voices-of-the-gcc/payment-success?session_id=TEST_PAYMENT_SKIP&submission_id=${submissionId}`;
    } catch (err: any) {
      toast.error(err?.message || 'Bypass failed');
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.schoolName || !bulkForm.contactPerson || !bulkForm.email || !bulkForm.phone) {
      toast.error('Please fill in all required fields.');
      return;
    }
    try {
      await gccCompetitionAPI.sendSchoolInquiry({
        schoolName: bulkForm.schoolName,
        contactPerson: bulkForm.contactPerson,
        email: bulkForm.email,
        phone: bulkForm.phone,
        country: bulkForm.country,
        estimatedStudents: bulkForm.estimatedStudents,
        notes: bulkForm.notes,
      });
      toast.success('School Bulk Inquiry received! Our education team will connect shortly.');
      setShowBulkModal(false);
      setBulkForm({
        schoolName: '',
        contactPerson: '',
        email: '',
        phone: '',
        country: 'United Arab Emirates',
        estimatedStudents: 30,
        notes: '',
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send inquiry');
    }
  };


  return (
    <div className="min-h-screen bg-[#F4F9F9] text-slate-800 font-sans selection:bg-teal-600 selection:text-white">
      <SEO
        title="Young Voices of the GCC — Our Heritage, Our Story | Kidrove Creative Challenge 2027"
        description="Kidrove GCC Creative Challenge: Young Voices of the GCC celebrates the rich heritage, cultures, and imagination of children across Bahrain, Kuwait, Oman, Qatar, Saudi Arabia, and the UAE."
      />

      {/* ─── Hero Section: Same layout as UAE National Day (Background Banner + Left Content) ─── */}
      <section className="relative overflow-hidden">
        {/* Banner background image container matching National Day */}
        <div className="relative min-h-[560px] sm:min-h-[620px] lg:min-h-[660px] flex flex-col justify-between">
          {/* Background image covering the banner area */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-[#e4fdfc]">
            <img
              src="/assets/gulf.png"
              alt="Young Voices of the GCC — Our Heritage, Our Story Banner"
              className="w-full h-full object-cover object-[center_right] lg:object-[80%_center]"
            />
            {/* Subtle gentle whitish-teal fog overlay: reduced on the left so banner illustration shows naturally on the right */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/40 to-transparent max-w-3xl pointer-events-none" />
            {/* Soft subtle radial ambient glow right behind headline */}
            <div className="absolute top-1/4 left-4 w-[420px] h-[320px] bg-teal-100/35 blur-[70px] rounded-full pointer-events-none" />
          </div>

          {/* Hero Content positioned directly over the banner */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-14 pb-8 sm:pb-12 relative z-10 w-full">
            <div className="max-w-2xl text-left">
              {/* Pill Header Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50/90 border border-teal-200/90 backdrop-blur-md mb-5 shadow-sm"
              >
                <span className="text-teal-600 font-bold text-xs">✦</span>
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-900">
                  Kidrove GCC Creative Challenge | January 2027
                </span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.0] text-slate-900 mb-4 drop-shadow-sm font-sans"
              >
                Young Voices<br />
                <span className="text-teal-700">of the GCC</span>
              </motion.h1>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed mb-6 max-w-xl"
              >
                Six Countries. Many Cultures. One Shared Story — A short-story writing challenge celebrating the heritage, traditions, and imagination of young writers across the Gulf.
              </motion.p>

              {/* Feature Highlights: Sleek Frosted Glass Pills (Like National Day) */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap items-center gap-3 mb-8"
              >
                <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-300/80 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md hover:border-teal-500 transition-all group">
                  <div className="w-8 h-8 rounded-full bg-teal-100/90 text-teal-800 flex items-center justify-center text-sm font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    🎓
                  </div>
                  <div className="text-left pr-1">
                    <p className="text-xs font-black text-slate-900 leading-tight">Grades K–12</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight">4 Age Categories</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-300/80 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md hover:border-teal-500 transition-all group">
                  <div className="w-8 h-8 rounded-full bg-teal-100/90 text-teal-800 flex items-center justify-center text-sm font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    🌍
                  </div>
                  <div className="text-left pr-1">
                    <p className="text-xs font-black text-slate-900 leading-tight">6 GCC Nations</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight">BHR, KWT, OMN, QAT, KSA, UAE</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-300/80 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md hover:border-teal-500 transition-all group">
                  <div className="w-8 h-8 rounded-full bg-teal-100/90 text-teal-800 flex items-center justify-center text-sm font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    🖋️
                  </div>
                  <div className="text-left pr-1">
                    <p className="text-xs font-black text-slate-900 leading-tight">Short Stories</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-tight">100 to 1,000 words</p>
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
                  className="px-8 py-3.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-black text-sm shadow-lg shadow-teal-900/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>Register Your Entry</span>
                  <FiChevronRight className="stroke-[3]" />
                </button>
                <Link
                  to="/competitions/young-voices-of-the-gcc/submit"
                  className="px-6 py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-all shadow-md shadow-amber-500/25 flex items-center gap-2"
                >
                  <span>Already Registered? Submit the work</span>
                  <FiArrowRight />
                </Link>
                {/* <button
                  onClick={() => {
                    const section = document.getElementById('school-bulk-section');
                    if (section) section.scrollIntoView({ behavior: 'smooth' });
                    else setShowBulkModal(true);
                  }}
                  className="px-6 py-3.5 rounded-full bg-white/90 hover:bg-white border border-teal-200 text-teal-900 font-bold text-sm transition-all shadow-xs flex items-center gap-2"
                >
                  <FiPlay className="text-teal-700 text-xs fill-teal-700" />
                  <span>School Bulk Program</span>
                </button> */}
              </motion.div>
            </div>
          </div>

          {/* ── 4-Metric Highlights: Positioned inside hero banner container matching National Day ── */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 mt-8 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white/80 backdrop-blur-md border border-teal-200/90 rounded-3xl p-6 text-center shadow-sm hover:-translate-y-1 transition-all">
                <span className="text-4xl block mb-3">📅</span>
                <h3 className="text-base font-black text-slate-900 mb-1">Competition Month</h3>
                <p className="text-teal-700 text-sm font-extrabold mb-1">January 2027</p>
                <p className="text-slate-500 text-xs">Official Launch & Submission</p>
              </div>

              <div className="bg-white/80 backdrop-blur-md border border-cyan-200/90 rounded-3xl p-6 text-center shadow-sm hover:-translate-y-1 transition-all">
                <span className="text-4xl block mb-3">🌍</span>
                <h3 className="text-base font-black text-slate-900 mb-1">Eligible Nations</h3>
                <p className="text-cyan-700 text-sm font-extrabold mb-1">6 GCC Countries</p>
                <p className="text-slate-500 text-xs">BHR, KWT, OMN, QAT, KSA, UAE</p>
              </div>

              <div className="bg-white/80 backdrop-blur-md border border-sky-200/90 rounded-3xl p-6 text-center shadow-sm hover:-translate-y-1 transition-all">
                <span className="text-4xl block mb-3">🎓</span>
                <h3 className="text-base font-black text-slate-900 mb-1">Eligible Students</h3>
                <p className="text-sky-700 text-sm font-extrabold mb-1">Kindergarten to Grade 12</p>
                <p className="text-slate-500 text-xs">4 Distinct Age Categories</p>
              </div>

              <div className="bg-white/80 backdrop-blur-md border border-indigo-200/90 rounded-3xl p-6 text-center shadow-sm hover:-translate-y-1 transition-all">
                <span className="text-4xl block mb-3">🖋️</span>
                <h3 className="text-base font-black text-slate-900 mb-1">Creative Format</h3>
                <p className="text-indigo-700 text-sm font-extrabold mb-1">Original Short Stories</p>
                <p className="text-slate-500 text-xs">100 to 1,000 words</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── The Moments That Matter (Competition Schedule) ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-4">
        <div className="bg-gradient-to-br from-[#9DF4F3]/15 via-teal-900/10 to-[#0d3b38]/40 border border-[#9DF4F3]/30 rounded-3xl p-8 md:p-10 relative overflow-hidden bg-[#0A2624] text-white shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#9DF4F3]/10 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 blur-[60px] pointer-events-none" />

          <div className="mb-12 relative z-10 flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="text-[10px] text-[#9DF4F3]/80 uppercase tracking-widest font-bold mb-2">Put these on the calendar</p>
              <h3 className="text-3xl md:text-4xl font-black text-[#9DF4F3]">
                The moments <span className="text-white italic font-serif font-normal">that matter.</span>
              </h3>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-[#9DF4F3]/30 bg-[#9DF4F3]/10 px-4 py-2.5 backdrop-blur-sm">
              <span className="text-[#9DF4F3]">📅</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9DF4F3]">Competition year / 2027</span>
            </div>
          </div>

          <div className="relative mt-8 relative z-10">
            {/* Horizontal Line on desktop */}
            <div className="absolute left-[7px] top-3 hidden h-[2px] w-[calc(100%-14px)] bg-gradient-to-r from-[#9DF4F3]/60 via-teal-400/50 to-cyan-400/40 md:block" />

            <div className="grid gap-10 md:grid-cols-4 md:gap-6">
              {[
                { date: '1 Jan', year: '2027', title: 'Competition opens', copy: 'Official kickoff across all 6 GCC member nations. Registration starts.' },
                { date: '20 Jan', year: '2027', title: 'Registration deadline', copy: 'Complete student or school bulk registrations before the portal closes.' },
                { date: '31 Jan', year: '2027', title: 'Story submission deadline', copy: 'Submit your original short story document via the official portal.' },
                { date: 'Feb', year: '2027', title: 'Results announced', copy: 'We reveal the top young writers and outstanding literary voices across the Gulf.' },
              ].map((item) => (
                <div key={item.date} className="relative grid grid-cols-[32px_1fr] gap-4 md:block">
                  <div className="relative z-10 mt-0.5 h-4 w-4 rounded-full border-4 border-[#9DF4F3] bg-[#0A2624] md:mb-8 shadow-[0_0_12px_rgba(157,244,243,0.6)]" />
                  <div>
                    <p className="text-3xl font-black text-white tracking-tight">
                      {item.date}<sup className="ml-1 text-xs font-normal text-[#9DF4F3]">{item.year}</sup>
                    </p>
                    <h4 className="mt-3 text-base font-bold text-slate-100">{item.title}</h4>
                    <p className="mt-2 max-w-[240px] text-xs sm:text-sm leading-relaxed text-slate-300">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex items-center gap-3 border-t border-[#9DF4F3]/20 pt-5 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9DF4F3]">Note</span>
            <p className="text-xs text-slate-300">Registration and manuscript submissions are conducted online via Kidrove for all eligible GCC students (Kindergarten through Grade 12).</p>
          </div>
        </div>
      </section>

      {/* ─── Main Content Stacks ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">

        {/* 1. Theme Inspiration & Story Challenge */}
        <section>
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Col */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-teal-200/90 p-8 sm:p-10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 mb-4">
                  Theme & Vision
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-[1.2] mb-4">
                  Our Heritage, <br />
                  <span className="text-teal-700">Our Story</span>
                </h2>
                <p className="text-slate-600 leading-relaxed text-sm mb-6">
                  Through their own words and imagination, students can share a story inspired by their country, community or the world around them.
                </p>
                <p className="text-slate-600 leading-relaxed text-sm mb-6">
                  Whether it is a story about a family tradition, a memorable place, a special friendship or an imaginative adventure, we want to hear the stories of young voices across the GCC.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 text-xs font-medium">
                💡 <strong>Originality is Key:</strong> The competition is a written short-story competition; speeches, videos, and artwork are not accepted.
              </div>
            </div>

            {/* Right Col: Story Prompts to Inspire */}
            <div className="lg:col-span-7 bg-gradient-to-br from-teal-50 via-cyan-50/60 to-white border border-teal-200 rounded-3xl p-8 sm:p-10 shadow-sm">
              <div className="mb-6">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-100 px-3 py-1 rounded-full border border-cyan-200 mb-2">
                  Creative Inspiration
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  The Story Challenge
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Write an original story inspired by the theme. You are welcome to explore any of these ideas:
                </p>
              </div>

              <div className="space-y-3.5">
                {STORY_PROMPTS.map((prompt, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-teal-100 shadow-2xs hover:border-teal-300 transition-all"
                  >
                    <span className="text-2xl p-2 rounded-xl bg-teal-50 border border-teal-100 shrink-0">
                      {prompt.icon}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-0.5">{prompt.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{prompt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Age Categories & Word Length Table */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-100 px-3.5 py-1.5 rounded-full border border-teal-200">
              Who Can Participate?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 mb-3">
              Four Age Categories for Fair Evaluation
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              The competition is open to students from Kindergarten to Grade 12 with specific word counts calibrated for each grade level.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className={`rounded-3xl border p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all hover:-translate-y-1 ${cat.cardBg}`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white border border-teal-200/80 flex items-center justify-center text-2xl mb-4 shadow-xs">
                    {cat.icon}
                  </div>
                  <span className={`inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border mb-3 ${cat.badge}`}>
                    {cat.grades}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mb-1">{cat.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800 mb-3">
                    <FiEdit3 className="text-teal-600" />
                    <span>Story Length: {cat.wordLimit}</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. How to Participate & Guidelines */}
        <section className="bg-white rounded-3xl border border-teal-200/90 p-8 sm:p-12 shadow-sm">
          <div className="grid lg:grid-cols-12 gap-10">
            {/* Steps */}
            <div className="lg:col-span-7">
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                Participation Process
              </span>
              <h2 className="text-3xl font-black text-slate-900 mt-3 mb-6">
                How to Participate
              </h2>

              <div className="space-y-4">
                {[
                  {
                    num: '1',
                    title: 'Register Online',
                    desc: 'Sign up through the Kidrove competition page as an individual student or via school bulk registration.',
                  },
                  {
                    num: '2',
                    title: 'Write an Original Short Story',
                    desc: 'Craft an original story based on “Our Heritage, Our Story” in your own creative voice.',
                  },
                  {
                    num: '3',
                    title: 'Respect Word Limits',
                    desc: 'Verify that your manuscript complies with the exact word limit defined for your age category.',
                  },
                  {
                    num: '4',
                    title: 'Submit Before the Deadline',
                    desc: 'Upload your completed story through the official submission portal before the closing date.',
                  },
                  {
                    num: '5',
                    title: 'Ensure Authenticity',
                    desc: 'Keep your story completely original. (For KG to Grade 2, an adult may help transcribe the student’s own spoken words).',
                  },
                ].map((step) => (
                  <div key={step.num} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {step.num}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Guidelines Card */}
            <div className="lg:col-span-5 bg-[#F4F9F9] rounded-2xl border border-teal-200 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <FiAlertCircle className="text-teal-700" />
                  <span>Important Guidelines</span>
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>Each entry must be an original story created by the student.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>Stories must follow the word limit designated for each category.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>The narrative must be relevant to the theme “Our Heritage, Our Story”.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>Plagiarised, copied, or AI-generated stories will be disqualified.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>Parents and teachers may guide, but must not write or rewrite the story.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>Only one story entry per participant is permitted.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>Written short stories only; speeches, videos, and artwork are not accepted.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-teal-200/70">
                <span className="text-[11px] font-extrabold text-teal-800 uppercase tracking-wider block">
                  Official Portal
                </span>
                <p className="text-xs text-slate-600">
                  Visit <a href="https://kidrove.com" target="_blank" rel="noreferrer" className="text-teal-700 font-bold underline">https://kidrove.com</a> for updates and notices.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Judging Criteria */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-100 px-3.5 py-1.5 rounded-full border border-teal-200">
              Evaluation Metrics
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 mb-3">
              Judging Criteria
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Every story will be evaluated by its creativity, storytelling craft, and deep connection to the GCC heritage theme within respective age categories.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CRITERIA.map((crit, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-teal-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{crit.icon}</span>
                    <span className={`text-base font-black px-3 py-1 rounded-full border ${crit.accent}`}>
                      {crit.percentage}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-2">{crit.title}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">{crit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Awards & Recognition */}
        <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-cyan-900 rounded-3xl p-8 sm:p-14 text-white shadow-xl">
          <div className="max-w-2xl mb-12">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-200 bg-teal-700/50 px-3.5 py-1.5 rounded-full border border-teal-500/50">
              Excellence & Honours
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-3">
              Awards and Recognition
            </h2>
            <p className="text-teal-100 text-sm sm:text-base leading-relaxed">
              Outstanding young writers from across the six GCC nations will receive prestigious recognition for their imagination and storytelling prowess.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {AWARDS.map((aw, idx) => (
              <div
                key={idx}
                className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6 hover:bg-white/15 transition-all"
              >
                <div className="text-3xl mb-3">{aw.icon}</div>
                <h3 className="text-base font-black text-white mb-1">{aw.title}</h3>
                <span className="text-[11px] font-bold text-teal-300 block mb-2">{aw.subtitle}</span>
                <p className="text-xs text-teal-100/90 leading-relaxed">{aw.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SCHOOL BULK REGISTRATION (AED 40 / student) ─── */}
        <section id="school-bulk-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/70 border-2 border-teal-300/80 rounded-3xl p-8 sm:p-12 md:p-14 shadow-lg shadow-teal-900/5 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/15 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/15 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-teal-950 bg-teal-100/90 px-4 py-1.5 rounded-full border border-teal-300/80 shadow-xs">
                  <span>🏫</span> Educators & Literature Coordinators
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-100/80 px-3.5 py-1.5 rounded-full border border-teal-300">
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" /> School Bulk Program 2027
                </span>
              </div>

              <div className="max-w-4xl mb-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
                  School Bulk Registration <span className="whitespace-nowrap text-teal-700">(AED 40 / student)</span>
                </h2>
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  Inspire your entire school community to celebrate GCC heritage through creative storytelling! For schools registering 25 or more students across the Gulf, we provide a discounted bulk rate of <strong className="text-slate-900">AED 40 per child</strong> (saving AED 10 per entry vs AED 50 individual rate), teacher writing prompts & rubrics for Kindergarten to Grade 12, dedicated coordinator support, and entry into the prestigious <strong className="text-teal-800">Top GCC Literary School Trophy</strong>.
                </p>
              </div>

              {/* 3 Pillar Cards */}
              <div className="grid sm:grid-cols-3 gap-5 mb-10">
                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-teal-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-xl mb-3">
                    💰
                  </div>
                  <span className="text-teal-800 font-black text-3xl block mb-1">AED 40</span>
                  <p className="text-sm text-slate-900 font-bold mb-1">Discounted Bulk Rate</p>
                  <p className="text-xs text-slate-500 leading-relaxed">For 25+ students (saving AED 10/child vs AED 50 regular rate)</p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center text-xl mb-3">
                    📄
                  </div>
                  <span className="text-slate-900 font-black text-3xl block mb-1">1 Single</span>
                  <p className="text-sm text-slate-900 font-bold mb-1">Consolidated Invoice</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Official school invoice payable via bank transfer or credit card across GCC</p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl mb-3">
                    🏆
                  </div>
                  <span className="text-emerald-700 font-black text-3xl block mb-1">Official Trophy</span>
                  <p className="text-sm text-slate-900 font-bold mb-1">Top School Award</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Recognising schools with highest student engagement & winning stories</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white font-black text-sm transition-all shadow-lg shadow-teal-700/25 hover:scale-105 active:scale-95 flex items-center gap-2.5"
                >
                  <span>Inquire for School Bulk Registration & Coordinator Pack</span>
                  <FiChevronRight className="stroke-[3]" />
                </button>
                <a
                  href="https://docs.google.com/spreadsheets/d/1BfoPxf6WE1AElZ4Cz_Tl4KDrGzB_yV1cirNRzLqfPMY/edit?usp=sharing"
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

        {/* ─── FAQs - Styled like "Wondering how it works?" on White Background ─── */}
        <section className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-y border-teal-200/80 rounded-3xl max-w-7xl mx-auto shadow-xs">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
            {/* Left Column: Sticky Title */}
            <div className="lg:w-1/3 lg:sticky lg:top-28">
              <span className="inline-block text-teal-800 bg-teal-50 px-3.5 py-1 rounded-full border border-teal-200 text-[10px] font-extrabold uppercase tracking-[0.16em] mb-4">
                Questions, meet answers
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.05] tracking-tight mb-4">
                Wondering <br />
                <span className="font-serif italic font-normal text-teal-700">how it works?</span>
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Everything you need to know about submissions, GCC eligibility, age categories, story word counts, school bulk entries, and certificates.
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
                    <summary className="flex items-center justify-between cursor-pointer py-6 outline-none list-none [&::-webkit-details-marker]:hidden hover:text-teal-800 transition-colors">
                      <span className="flex items-center gap-4 sm:gap-6 font-bold text-slate-900 text-base sm:text-lg text-left pr-4">
                        <span className="text-teal-600 text-xs font-black tracking-widest shrink-0">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {faq.q}
                      </span>
                      <FiChevronDown className="h-5 w-5 text-slate-400 shrink-0 transition-transform duration-300 group-open:-rotate-180 group-open:text-teal-700" />
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

      </div>

      {/* ─── 7. REGISTRATION WIZARD ────────────────────────────────────── */}
      <section
        id="register-section"
        ref={registrationSectionRef}
        className="pt-16 pb-24 bg-white border-t border-teal-100 relative overflow-hidden"
      >
        {/* Greenish-blueish spotlights matching the GCC theme (#9DF4F3, teal, cyan) */}
        <div className="absolute top-[-5%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-400/20 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-[#9DF4F3]/25 blur-[160px] pointer-events-none" />
        <div className="absolute top-[40%] right-[-5%] w-[40%] h-[40%] rounded-full bg-cyan-500/15 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[20%] w-[45%] h-[45%] rounded-full bg-teal-500/15 blur-[160px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="text-4xl block mb-2">🖋️</span>
            <span className="inline-block text-xs font-black uppercase tracking-widest text-teal-800 bg-teal-50 px-4 py-1.5 rounded-full border border-teal-200 mb-3">
              Phase 1: Student Story Registration
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Registration & Entry Fee
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-xl mx-auto">
              Complete student details and secure entry (AED 50). You will immediately receive your official GCC Reference No. and guidelines. Stories can be submitted anytime before 31 January 2027!
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
                        ? 'bg-gradient-to-br from-teal-600 to-cyan-700 text-white shadow-md shadow-teal-600/30 ring-2 ring-teal-300'
                        : isActive
                          ? 'bg-gradient-to-br from-teal-500 to-[#9DF4F3] text-teal-950 font-black shadow-lg shadow-teal-500/30 ring-4 ring-teal-200'
                          : 'bg-white border-2 border-slate-300 text-slate-600 shadow-xs'
                        }`}
                    >
                      {isDone ? <FiCheck size={20} className="stroke-[3]" /> : <Icon size={18} className="stroke-[2.5]" />}
                    </div>
                    <span
                      className={`text-xs font-black tracking-wider uppercase text-center ${isActive
                        ? 'text-teal-950 font-black'
                        : isDone
                          ? 'text-teal-800 font-black'
                          : 'text-slate-400 font-extrabold'
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
          <div className="bg-white border-2 border-teal-200/90 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl shadow-teal-900/5 relative">
            {isRegisteredSuccess ? (
              <div className="text-center py-10 space-y-5">
                <div className="w-20 h-20 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto text-4xl shadow-inner">
                  ✓
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-3.5 py-1.5 rounded-full border border-teal-200">
                    Entry Confirmed
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 mt-3">Pre-Registration Complete!</h3>
                  <p className="text-slate-600 text-sm max-w-md mx-auto mt-2">
                    Thank you for registering <strong>{form.studentFullName}</strong> for Young Voices of the GCC. A confirmation notice has been sent to <strong>{form.parentEmail}</strong>.
                  </p>
                </div>

                {registeredData?.submissionRef && (
                  <div className="inline-block bg-[#FAFDFD] border-2 border-teal-300 rounded-2xl px-6 py-4 shadow-xs">
                    <span className="text-xs uppercase font-extrabold text-slate-500 block">Your Official Reference Number</span>
                    <span className="text-2xl font-black text-teal-800 tracking-wider font-mono">
                      {registeredData.submissionRef}
                    </span>
                  </div>
                )}

                <div className="pt-4 flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => {
                      setIsRegisteredSuccess(false);
                      setCurrentStep(1);
                      setForm((prev) => ({
                        ...prev,
                        studentFullName: '',
                        studentAge: '10',
                        storyTitle: '',
                        storySummary: '',
                      }));
                    }}
                    className="px-8 py-3.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md transition-all"
                  >
                    Register Another Student
                  </button>
                  <a
                    href="/"
                    className="px-6 py-3.5 rounded-full border border-teal-300 text-teal-800 hover:bg-teal-50 font-bold text-sm transition-all"
                  >
                    Return to Kidrove Home
                  </a>
                </div>
              </div>
            ) : (
              <>
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
                        <div className="mb-6 pb-4 border-b border-teal-100">
                          <span className="text-teal-700 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                            Step 1 of 3
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                            <span>👤</span> Student & Parent Details
                          </h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Enter participant details. You will receive your official GCC Competition Reference No. upon registration.
                          </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Parent / Guardian Full Name <span className="text-teal-600">*</span>
                            </label>
                            <input
                              type="text"
                              name="parentName"
                              value={form.parentName}
                              onChange={handleInputChange}
                              placeholder="e.g. Maryam Al-Sabah"
                              className="w-full bg-[#FAFDFD] border border-slate-300 hover:border-teal-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Parent Email Address <span className="text-teal-600">*</span>
                            </label>
                            <input
                              type="email"
                              name="parentEmail"
                              value={form.parentEmail}
                              onChange={handleInputChange}
                              placeholder="parent@example.com"
                              className="w-full bg-[#FAFDFD] border border-slate-300 hover:border-teal-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Parent Mobile / WhatsApp <span className="text-teal-600">*</span>
                            </label>
                            <input
                              type="tel"
                              name="parentPhone"
                              value={form.parentPhone}
                              onChange={handleInputChange}
                              placeholder="+971 50 123 4567"
                              className="w-full bg-[#FAFDFD] border border-slate-300 hover:border-teal-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Student Full Name <span className="text-teal-600">*</span>
                            </label>
                            <input
                              type="text"
                              name="studentFullName"
                              value={form.studentFullName}
                              onChange={handleInputChange}
                              placeholder="e.g. Tariq Al-Nuaimi"
                              className="w-full bg-[#FAFDFD] border border-slate-300 hover:border-teal-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Student Age <span className="text-teal-600">*</span>
                            </label>
                            <input
                              type="number"
                              name="studentAge"
                              min="3"
                              max="19"
                              value={form.studentAge}
                              onChange={handleInputChange}
                              placeholder="Enter student age"
                              className="w-full bg-[#FAFDFD] border border-slate-300 hover:border-teal-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Grade / Year <span className="text-teal-600">*</span>
                            </label>
                            <select
                              name="grade"
                              value={form.grade}
                              onChange={handleInputChange}
                              className="w-full bg-[#FAFDFD] border border-slate-300 hover:border-teal-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                            >
                              <option value="">Select Grade Level</option>
                              {GRADES.map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Assigned Category
                            </label>
                            <div className="w-full bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-teal-900 font-black truncate shadow-xs">
                              {form.grade ? getCategoryFromGrade(form.grade) : 'Select grade above'}
                            </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              GCC Country <span className="text-teal-600">*</span>
                            </label>
                            <select
                              name="country"
                              value={form.country}
                              onChange={handleInputChange}
                              className="w-full bg-[#FAFDFD] border border-slate-300 hover:border-teal-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                            >
                              <option value="">Select GCC Country</option>
                              {GCC_COUNTRIES.map((c) => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              School Name <span className="text-teal-600">*</span>
                            </label>
                            <input
                              type="text"
                              name="schoolName"
                              value={form.schoolName}
                              onChange={handleInputChange}
                              placeholder="e.g. British International School"
                              className="w-full bg-[#FAFDFD] border border-slate-300 hover:border-teal-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Declarations & Consent */}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <div className="mb-6 pb-4 border-b border-teal-100">
                          <span className="text-teal-700 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                            Step 2 of 3
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                            <span>✅</span> Consent & Declarations
                          </h3>
                          <p className="text-slate-600 text-xs sm:text-sm mt-1">
                            Please review and confirm the official declarations and parent/guardian permissions.
                          </p>
                        </div>

                        {/* Declarations Card */}
                        <div className="bg-[#FAFDFD] border border-teal-200/90 rounded-3xl p-6 sm:p-7 shadow-xs">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-teal-100">
                            <div>
                              <h4 className="text-slate-900 font-black text-base">Official Declarations & Ethics</h4>
                              <p className="text-slate-600 text-xs mt-0.5">Written short story eligibility, 100% original student imagination, and competition rules.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowDeclarationsModal(true)}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shadow-xs"
                            >
                              Read Full Declarations
                            </button>
                          </div>

                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={form.agreeTerms && form.originalityDeclaration && form.parentGuardianConsent}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setForm((prev) => ({
                                  ...prev,
                                  agreeTerms: v,
                                  originalityDeclaration: v,
                                  parentGuardianConsent: v,
                                }));
                                setErrors([]);
                              }}
                              className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                              <span className="font-bold text-slate-900 block group-hover:text-teal-800 transition-colors">
                                I confirm and agree to all the Official Declarations and Parent/Guardian Consent.
                              </span>
                              <span>(Original story without AI/plagiarism, parental consent, adherence to word counts, and official terms).</span>
                            </div>
                          </label>
                        </div>

                        {/* Showcase Permission */}
                        <div className="bg-white border border-teal-200 rounded-3xl p-6 shadow-xs">
                          <h4 className="text-slate-900 font-bold text-base mb-1">Permission to Showcase Story</h4>
                          <p className="text-slate-600 text-xs sm:text-sm mb-4">Let Kidrove celebrate your child’s creative storytelling in the GCC digital showcase and publications.</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, storyDisplayPermission: 'yes' }))}
                              className={`p-5 rounded-2xl border text-left transition-all flex gap-3.5 ${form.storyDisplayPermission === 'yes'
                                ? 'bg-teal-50/70 border-teal-500 shadow-sm ring-1 ring-teal-500'
                                : 'bg-[#FAFDFD] border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.storyDisplayPermission === 'yes' ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-400'
                                }`}>
                                {form.storyDisplayPermission === 'yes' && <FiCheck size={12} className="stroke-[3]" />}
                              </div>
                              <div>
                                <h5 className={`font-bold text-sm mb-0.5 ${form.storyDisplayPermission === 'yes' ? 'text-teal-950 font-black' : 'text-slate-800'}`}>
                                  Yes, Display Publicly
                                </h5>
                                <p className="text-xs text-slate-600 leading-normal">
                                  Showcase in Kidrove GCC digital publication & regional tributes.
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, storyDisplayPermission: 'no' }))}
                              className={`p-5 rounded-2xl border text-left transition-all flex gap-3.5 ${form.storyDisplayPermission === 'no'
                                ? 'bg-rose-50 border-rose-500 shadow-sm ring-1 ring-rose-500'
                                : 'bg-[#FAFDFD] border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${form.storyDisplayPermission === 'no' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-400'
                                }`}>
                                {form.storyDisplayPermission === 'no' && <FiCheck size={12} className="stroke-[3]" />}
                              </div>
                              <div>
                                <h5 className={`font-bold text-sm mb-0.5 ${form.storyDisplayPermission === 'no' ? 'text-rose-950 font-black' : 'text-slate-800'}`}>
                                  No, Keep Private
                                </h5>
                                <p className="text-xs text-slate-600 leading-normal">
                                  Only show the manuscript to the official judging panel for awards.
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Communication Preferences */}
                        <div className="bg-[#FAFDFD] border border-teal-200 rounded-3xl p-6">
                          <h4 className="text-slate-900 font-bold text-base mb-2">Communication Preferences</h4>
                          <div className="flex flex-col gap-3">
                            <label className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-slate-700">
                              <input
                                type="checkbox"
                                name="competitionUpdatesConsent"
                                checked={form.competitionUpdatesConsent}
                                onChange={handleInputChange}
                                className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span>I agree to receive communications regarding competition verification, story guidelines, certificates, and results.</span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-slate-700">
                              <input
                                type="checkbox"
                                name="marketingConsent"
                                checked={form.marketingConsent}
                                onChange={handleInputChange}
                                className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span>Optional: Keep me updated on future GCC youth writing challenges and literary exhibitions.</span>
                            </label>
                          </div>
                        </div>

                        {/* Disqualification Clause */}
                        <div className="flex gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 text-red-900">
                          <FiAlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h5 className="font-bold text-xs sm:text-sm text-red-900 mb-0.5">Rules & Disqualification Clause</h5>
                            <p className="text-xs text-red-800 leading-relaxed">
                              Kidrove reserves the right to disqualify entries violating rules, utilizing AI-generated text, copying published authors, or exceeding word counts. The judging panel decision is final.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Payment */}
                    {currentStep === 3 && (
                      <div className="bg-[#FAFDFD] border border-teal-200/90 rounded-3xl p-6 sm:p-10 max-w-lg mx-auto text-center" id="submit-entry">
                        <div className="w-16 h-16 bg-teal-100 text-teal-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
                          <FiCreditCard className="w-8 h-8" />
                        </div>
                        <span className="text-teal-700 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                          Step 3 of 3
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Confirm & Complete Registration</h3>
                        <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
                          Please confirm your entry fee payment of <strong className="text-slate-900 font-extrabold">AED 50.00</strong>. You will immediately receive your official Reference Number and story submission instructions.
                        </p>

                        {/* Order Summary */}
                        <div className="bg-white rounded-2xl p-5 border border-teal-200 mb-6 text-left space-y-2.5 text-xs sm:text-sm shadow-xs">
                          <div className="flex justify-between pb-2 border-b border-teal-100">
                            <span className="text-slate-500">Student:</span>
                            <span className="font-bold text-slate-900">{form.studentFullName}</span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-teal-100">
                            <span className="text-slate-500">Grade / Category:</span>
                            <span className="font-bold text-teal-800">{form.grade} · {getCategoryFromGrade(form.grade)}</span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-teal-100">
                            <span className="text-slate-500">Country:</span>
                            <span className="font-bold text-slate-900">{form.country}</span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-teal-100">
                            <span className="text-slate-500">Story Deadline:</span>
                            <span className="font-bold text-slate-900">31 January 2027</span>
                          </div>
                          <div className="flex justify-between pt-1 text-base font-black">
                            <span className="text-slate-900">Total Entry Fee:</span>
                            <span className="text-teal-700">AED 50.00</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={handleProceedToPayment}
                            disabled={isSubmitting}
                            className="w-full py-4 rounded-full bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white font-black text-sm sm:text-base shadow-xl shadow-teal-700/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99]"
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

                          {(import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) && (
                            <button
                              type="button"
                              onClick={handleDevBypass}
                              disabled={isSubmitting}
                              className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 font-bold rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-xs sm:text-sm"
                            >
                              {isSubmitting ? (
                                <><span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Processing Test Payment...</>
                              ) : (
                                '⚡ Test Payment (Localhost Bypass)'
                              )}
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
                      className="px-6 py-3 rounded-full border border-teal-300 text-teal-800 hover:bg-teal-50 font-black text-xs flex items-center gap-2 transition-all"
                    >
                      <FiChevronLeft className="stroke-[3]" /> Back
                    </button>
                  ) : <div />}

                  {currentStep < 3 && (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-8 py-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                      Next Step <FiChevronRight className="stroke-[3]" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Declarations Modal ── */}
      <AnimatePresence>
        {showDeclarationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-teal-200 p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[85vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setShowDeclarationsModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
              >
                <FiX size={20} />
              </button>
              <div className="mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100 px-3 py-1 rounded-full border border-teal-200">
                  Official Competition Rules
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Young Voices of the GCC Declarations
                </h3>
              </div>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p><strong>1. Original Student Work:</strong> Every short story entered into the competition must be an original work crafted solely by the student. Plagiarism, ghostwriting, or copying existing literature will result in immediate disqualification.</p>
                <p><strong>2. Artificial Intelligence Policy:</strong> The use of generative AI tools (such as ChatGPT or automated writers) to generate, compose, or edit entries is strictly prohibited.</p>
                <p><strong>3. Age Category & Word Limits:</strong> Entries must strictly adhere to the designated word limits for their category: Little Storytellers (100–200 words), Young Authors (200–400 words), Creative Voices (400–700 words), Emerging Writers (700–1,000 words).</p>
                <p><strong>4. Parent / Teacher Role:</strong> For Kindergarten to Grade 2, an adult may help transcribe the child's own spoken words. In all categories, adults may offer moral guidance, but must not rewrite the story.</p>
                <p><strong>5. Showcase Permission:</strong> Selected stories may be featured in the Kidrove digital compilation, exhibitions, or social channels based on parent authorization.</p>
              </div>
              <div className="mt-6 pt-4 border-t border-teal-100 text-right">
                <button
                  type="button"
                  onClick={() => setShowDeclarationsModal(false)}
                  className="px-6 py-2.5 rounded-full bg-teal-700 text-white font-bold text-xs"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── WhatsApp Contact Card ────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 relative z-10 mt-10 mb-6">
        <div className="bg-gradient-to-br from-teal-500/10 via-white to-cyan-500/10 border border-teal-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-teal-900/5 hover:border-teal-500/50 transition-colors group">
          <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-5">
            <div className="w-14 h-14 bg-teal-500/15 rounded-full flex items-center justify-center border border-teal-500/30 shrink-0 group-hover:scale-105 transition-transform shadow-sm">
              <svg className="w-7 h-7 text-teal-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
            className="shrink-0 px-7 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-full transition-all shadow-md shadow-teal-600/25 flex items-center gap-2 active:scale-95"
          >
            Message Us <FiChevronRight className="stroke-[3] text-lg" />
          </a>
        </div>
      </div>


      {/* ─── School Bulk Registration Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-teal-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
              >
                <FiX size={20} />
              </button>

              <div className="mb-6">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100 px-3 py-1 rounded-full border border-teal-200">
                  Institutional Bulk Entries
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  School Bulk Registration Inquiry
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Connect with our team to enroll multiple classrooms, receive coordinator packages, and access school billing.
                </p>
              </div>

              <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">School Name *</label>
                  <input
                    type="text"
                    value={bulkForm.schoolName}
                    onChange={(e) => setBulkForm({ ...bulkForm, schoolName: e.target.value })}
                    className="w-full bg-[#FAFDFD] border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-600 outline-none"
                    placeholder="e.g. Dubai College"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Person *</label>
                    <input
                      type="text"
                      value={bulkForm.contactPerson}
                      onChange={(e) => setBulkForm({ ...bulkForm, contactPerson: e.target.value })}
                      className="w-full bg-[#FAFDFD] border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-600 outline-none"
                      placeholder="Principal / English Dept Head"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">GCC Country *</label>
                    <select
                      value={bulkForm.country}
                      onChange={(e) => setBulkForm({ ...bulkForm, country: e.target.value })}
                      className="w-full bg-[#FAFDFD] border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-600 outline-none"
                    >
                      {GCC_COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Email *</label>
                    <input
                      type="email"
                      value={bulkForm.email}
                      onChange={(e) => setBulkForm({ ...bulkForm, email: e.target.value })}
                      className="w-full bg-[#FAFDFD] border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-600 outline-none"
                      placeholder="coordinator@school.edu"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={bulkForm.phone}
                      onChange={(e) => setBulkForm({ ...bulkForm, phone: e.target.value })}
                      className="w-full bg-[#FAFDFD] border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-600 outline-none"
                      placeholder="+971 4 000 0000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Students</label>
                  <input
                    type="number"
                    min="10"
                    value={bulkForm.estimatedStudents}
                    onChange={(e) => setBulkForm({ ...bulkForm, estimatedStudents: parseInt(e.target.value) || 20 })}
                    className="w-full bg-[#FAFDFD] border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Additional Notes</label>
                  <textarea
                    rows={2}
                    value={bulkForm.notes}
                    onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                    placeholder="Specific grades or special coordination requirements..."
                    className="w-full bg-[#FAFDFD] border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-teal-600 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md transition-all mt-2"
                >
                  Submit Institutional Inquiry
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YoungVoicesGCCPage;
