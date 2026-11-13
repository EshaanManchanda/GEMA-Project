import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiCheck, FiChevronRight, FiChevronLeft,
  FiAward, FiX, FiArrowRight,
  FiChevronDown, FiAlertCircle, FiCreditCard,
  FiVideo, FiPlay, FiSmartphone
} from 'react-icons/fi';
import SEO from '@/components/common/SEO';
import toast from 'react-hot-toast';
import reelCompetitionAPI from '@/services/api/reelCompetitionAPI';

// ─── GCC Participating Countries ──────────────────────────────────────────────
const GCC_COUNTRIES = [
  { name: 'United Arab Emirates', code: 'UAE' },
  { name: 'Saudi Arabia', code: 'KSA' },
  { name: 'Qatar', code: 'QAT' },
  { name: 'Kuwait', code: 'KWT' },
  { name: 'Bahrain', code: 'BHR' },
  { name: 'Oman', code: 'OMN' },
];

// ─── Age Categories ───────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 1,
    name: 'Little Reel Creators',
    grades: 'Kindergarten – Grade 2',
    duration: 'Up to 30 seconds',
    icon: '✨',
    cardBg: 'bg-gradient-to-br from-violet-50/90 via-white to-purple-50/60 border-violet-200/80',
    badge: 'bg-violet-100 text-violet-900 border-violet-200',
    desc: 'Sweet, joyful moments of getting dressed for Eid, decorating lanterns, or sweet family smiles. (Parents may assist in holding the phone or uploading).',
  },
  {
    id: 2,
    name: 'Young Reel Makers',
    grades: 'Grades 3 – 5',
    duration: '30 – 45 seconds',
    icon: '📱',
    cardBg: 'bg-gradient-to-br from-purple-50/90 via-white to-fuchsia-50/50 border-purple-200/80',
    badge: 'bg-purple-100 text-purple-900 border-purple-200',
    desc: 'Creative clips showing Eid shopping, handmade gifts, sweets preparation, or lighting up the living room with Ramadan crescents.',
  },
  {
    id: 3,
    name: 'Creative Storytellers',
    grades: 'Grades 6 – 8',
    duration: '30 – 60 seconds',
    icon: '🎬',
    cardBg: 'bg-gradient-to-br from-fuchsia-50/90 via-white to-violet-50/60 border-fuchsia-200/80',
    badge: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
    desc: 'Thoughtful visual narratives capturing neighbourhood traditions, Eid morning excitement, soundscapes, or cherished moments of togetherness.',
  },
  {
    id: 4,
    name: 'Emerging Filmmakers',
    grades: 'Grades 9 – 12',
    duration: '30 – 60 seconds',
    icon: '🎥',
    cardBg: 'bg-gradient-to-br from-violet-100/40 via-white to-purple-100/40 border-violet-300',
    badge: 'bg-violet-900 text-violet-100 border-violet-800',
    desc: 'Expressive mobile cinematography capturing the atmosphere, warmth, cultural heritage, and heartfelt emotions of the festive season.',
  },
];

// ─── Judging Criteria ─────────────────────────────────────────────────────────
const CRITERIA = [
  {
    percentage: '30%',
    title: 'Creativity & Originality',
    desc: 'A fresh, authentic perspective capturing genuine moments rather than staged or copied online trends.',
    icon: '💡',
    accent: 'border-violet-500/30 text-violet-700 bg-violet-50/60',
  },
  {
    percentage: '30%',
    title: 'Connection to the Theme',
    desc: 'Heartfelt alignment with “The Moments That Make Eid Special” and authentic reflection of Ramadan or Eid spirit.',
    icon: '🌙',
    accent: 'border-purple-500/30 text-purple-700 bg-purple-50/60',
  },
  {
    percentage: '25%',
    title: 'Visual Storytelling',
    desc: 'How effectively the reel conveys emotion, narrative flow, pacing, and meaningful moments through the mobile lens.',
    icon: '🎬',
    accent: 'border-fuchsia-500/30 text-fuchsia-700 bg-fuchsia-50/60',
  },
  {
    percentage: '15%',
    title: 'Composition & Presentation',
    desc: 'Clean mobile framing, thoughtful lighting, vertical format discipline, and pleasing audiovisual presentation.',
    icon: '📐',
    accent: 'border-violet-600/30 text-violet-800 bg-violet-50/60',
  },
];

// ─── Awards & Recognition ─────────────────────────────────────────────────────
const AWARDS = [
  {
    title: 'Gold, Silver & Bronze Awards',
    subtitle: 'Across Each Age Category',
    desc: 'Prestigious distinctions awarded to the most creative, authentic, and inspiring mobile reels in each grade tier.',
    icon: '🏆',
  },
  {
    title: 'Special Recognition for Video Storytelling',
    subtitle: 'Jury Honours',
    desc: 'Special jury accolades honouring outstanding emotional resonance, cinematic eye, and cultural warmth.',
    icon: '🌟',
  },
  {
    title: 'Official Participation Certificates',
    subtitle: 'For All Eligible Participants',
    desc: 'Every participant receives an official, high-resolution verifiable Kidrove Certificate of Participation.',
    icon: '📜',
  },
  {
    title: 'School Participation Recognition',
    subtitle: 'Institutional Honours',
    desc: 'Distinguished citations acknowledging schools and creative educators who encourage youth media literacy.',
    icon: '🏫',
  },
  {
    title: 'Kidrove Regional Feature Showcase',
    subtitle: 'Social & Website Feature',
    desc: 'Opportunity for selected reels to be showcased across Kidrove regional channels (subject to parent permissions).',
    icon: '✨',
  },
];

// ─── Reel Inspiration Moments ─────────────────────────────────────────────────
const REEL_PROMPTS = [
  {
    title: 'A Special Ramadan Moment',
    desc: 'The peaceful glow of the Ramadan lantern (fanous), laying the table for Iftar, or evening family conversations.',
    icon: '🏮',
  },
  {
    title: 'Decorating Home for Eid',
    desc: 'Hanging festive lights, arranging crescent decorations, and filling your home with celebratory warmth.',
    icon: '✨',
  },
  {
    title: 'Preparing an Eid Gift',
    desc: 'Wrapping gifts with care, writing handwritten cards, or preparing surprises for cousins and loved ones.',
    icon: '🎁',
  },
  {
    title: 'Shopping for Eid with Family',
    desc: 'The bustling souqs, picking out fragrances, delicious treats, and festive goods together.',
    icon: '🛍️',
  },
  {
    title: 'Choosing or Preparing an Eid Outfit',
    desc: 'Ironing traditional attire, trying on new shoes, or picking out festive clothes for the big day.',
    icon: '👗',
  },
  {
    title: 'A Family or Community Tradition',
    desc: 'Baking maamoul or traditional sweets with grandma, gathering neighbours, or distributing treats.',
    icon: '🧁',
  },
  {
    title: 'The Excitement of Getting Ready for Eid',
    desc: 'The morning hustle, joyous laughter, fragrant oud, and the contagious energy of Eid dawn.',
    icon: '🎉',
  },
];

// ─── FAQs ────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'Do I need an expensive smartphone or professional camera?',
    a: 'Not at all! Any standard mobile phone is perfect. The judging evaluates your creativity, storytelling, and warmth of the moment—not the price of your phone or costly equipment.',
  },
  {
    q: 'What is the required video format and orientation?',
    a: 'All entries must be recorded vertically (9:16 mobile format), just like everyday social reels or stories. Horizontal widescreen videos are not accepted.',
  },
  {
    q: 'What are the video duration limits for each grade?',
    a: 'Little Reel Creators (KG–Grade 2): Up to 30 seconds. Young Reel Makers (Grades 3–5): 30–45 seconds. Creative Storytellers (Grades 6–8) & Emerging Filmmakers (Grades 9–12): 30–60 seconds.',
  },
  {
    q: 'Does the student need to show their face on camera?',
    a: 'No, students do not need to appear on camera. The reel can focus purely on hands decorating, sweet preparation, lights, gifts, scenic details, or voice-overs.',
  },
  {
    q: 'Can parents assist younger children?',
    a: 'Yes! For younger participants (especially Kindergarten to Grade 2), parents may help hold the phone or assist with uploading. However, the creative idea and captured moments must be the student’s own.',
  },
  {
    q: 'Are AI-generated videos or footage allowed?',
    a: 'No. AI-generated video clips, deepfakes, or computer-rendered visuals are strictly prohibited. Every video must be real footage captured on a phone by the participant.',
  },
  {
    q: 'Can I add background music, text captions, or simple voice-over?',
    a: 'Yes, simple phone edits such as trimming, adding music you have rights to use, on-screen captions, and personal voice-overs are completely allowed and encouraged!',
  },
  {
    q: 'How does school bulk registration work?',
    a: 'Schools can register multiple students through our institutional inquiry form to receive dedicated teacher packs, coordinator guidelines, and discounted invoice billing.',
  },
];

const GCCReelChallengePage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);
  const [registeredData, setRegisteredData] = useState<{ submissionRef?: string; amount?: number } | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const registrationSectionRef = useRef<HTMLDivElement>(null);

  // Form State
  const [form, setForm] = useState({
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    studentFullName: '',
    studentAge: '',
    grade: '',
    category: '',
    gender: '',
    country: '',
    city: '',
    schoolName: '',
    schoolBulkRef: '',
    reelTitle: '',
    reelSummary: '',
    momentTheme: '',
    durationSeconds: '',
    videoDriveLink: '',
    deviceUsed: '',

    // Declarations & Consents
    agreeTerms: false,
    originalityDeclaration: false,
    parentGuardianConsent: false,
    reelDisplayPermission: 'yes',
    competitionUpdatesConsent: false,
    marketingConsent: false,
  });

  // Bulk inquiry form
  const [bulkForm, setBulkForm] = useState({
    schoolName: '',
    contactPerson: '',
    email: '',
    phone: '',
    country: 'United Arab Emirates',
    estimatedStudents: 30,
    notes: '',
  });

  // Helper: compute age category from grade
  const getCategoryFromGrade = (grade: string): string => {
    if (!grade) return '';
    const norm = grade.toLowerCase();
    if (norm.includes('kindergarten') || norm.includes('kg') || norm.includes('grade 1') || norm.includes('grade 2')) {
      return 'Little Reel Creators (KG – Grade 2)';
    }
    if (norm.includes('grade 3') || norm.includes('grade 4') || norm.includes('grade 5')) {
      return 'Young Reel Makers (Grades 3 – 5)';
    }
    if (norm.includes('grade 6') || norm.includes('grade 7') || norm.includes('grade 8')) {
      return 'Creative Storytellers (Grades 6 – 8)';
    }
    return 'Emerging Filmmakers (Grades 9 – 12)';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => {
        const next = { ...prev, [name]: value };
        if (name === 'grade') {
          next.category = getCategoryFromGrade(value);
        }
        return next;
      });
    }
    setErrors([]);
  };

  // Step Validations
  const validateStep1 = () => {
    const errs: string[] = [];
    if (!form.parentName.trim()) errs.push('Parent/Guardian full name is required');
    if (!form.parentEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) {
      errs.push('A valid parent email address is required');
    }
    if (!form.parentPhone.trim()) errs.push('Parent mobile/WhatsApp number is required');
    if (!form.studentFullName.trim()) errs.push('Student full name is required');
    if (!form.studentAge || Number(form.studentAge) < 3 || Number(form.studentAge) > 20) {
      errs.push('Please enter a valid student age (3 to 20)');
    }
    if (!form.grade) errs.push('Please select the student’s grade level');
    if (!form.country) errs.push('Please select the GCC country');
    if (!form.schoolName.trim()) errs.push('School name is required');

    setErrors(errs);
    return errs.length === 0;
  };

  const validateStep2 = () => {
    const errs: string[] = [];
    if (!form.agreeTerms) errs.push('You must agree to the competition rules and guidelines');
    if (!form.originalityDeclaration) errs.push('You must declare that this is an original mobile video captured by the student');
    if (!form.parentGuardianConsent) errs.push('Parent or guardian consent is mandatory');
    if (!form.competitionUpdatesConsent) errs.push('Consent to receive competition updates and reference details is required');

    setErrors(errs);
    return errs.length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      registrationSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      registrationSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      registrationSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Submit Phase 1 Registration and redirect to Stripe
  const handleFinalSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const payload = {
        registrationType: (form.schoolBulkRef ? 'school_bulk' : 'individual') as 'individual' | 'school_bulk',
        parentName: form.parentName.trim(),
        parentEmail: form.parentEmail.trim().toLowerCase(),
        parentPhone: form.parentPhone.trim(),
        studentFullName: form.studentFullName.trim(),
        studentAge: Number(form.studentAge),
        grade: form.grade,
        category: form.category || getCategoryFromGrade(form.grade),
        gender: form.gender || undefined,
        country: form.country.trim(),
        city: form.city?.trim() || undefined,
        schoolName: form.schoolName.trim(),
        schoolBulkRef: form.schoolBulkRef?.trim() || undefined,
        reelTitle: form.reelTitle?.trim() || undefined,
        reelDescription: form.reelSummary?.trim() || undefined,
        momentTheme: form.momentTheme?.trim() || undefined,
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : undefined,
        videoDriveLink: form.videoDriveLink?.trim() || undefined,
        deviceUsed: form.deviceUsed?.trim() || undefined,

        agreeTerms: form.agreeTerms,
        originalityDeclaration: form.originalityDeclaration,
        parentGuardianConsent: form.parentGuardianConsent,
        reelDisplayPermission: (form.reelDisplayPermission === 'no' ? 'no' : 'yes') as 'yes' | 'no',
        nameDisplayPermission: true,
        competitionUpdatesConsent: form.competitionUpdatesConsent,
        marketingConsent: form.marketingConsent,
      };

      // 1. Save Phase 1 registration
      const regRes: any = await reelCompetitionAPI.register(payload);
      const isSuccess = regRes?.success !== false;
      const submissionId = regRes?.data?.submissionId || regRes?.submissionId;

      if (!isSuccess || !submissionId) {
        throw new Error(regRes?.message || 'Failed to save registration details.');
      }

      // 2. Create Stripe Checkout session (AED 50)
      const sessionRes: any = await reelCompetitionAPI.createCheckoutSession(submissionId);
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
        studentFullName: form.studentFullName || 'Mariam Al Qasimi',
        studentAge: Number(form.studentAge) || 12,
        grade: form.grade || 'Grade 7',
        category: getCategoryFromGrade(form.grade || 'Grade 7'),
        gender: form.gender || 'Female',
        country: form.country || 'United Arab Emirates',
        schoolName: form.schoolName || 'Dubai International Academy',
        schoolBulkRef: form.schoolBulkRef || undefined,

        agreeTerms: true,
        originalityDeclaration: true,
        parentGuardianConsent: true,
        reelDisplayPermission: 'yes',
        nameDisplayPermission: true,
        competitionUpdatesConsent: true,
        marketingConsent: false,
      };

      const regRes: any = await reelCompetitionAPI.register(payload);
      const submissionId = regRes?.data?.submissionId || regRes?.submissionId;
      if (!submissionId) {
        throw new Error(regRes?.message || 'Failed to save test registration');
      }
      window.location.href = `/competitions/gcc-reel-challenge/payment-success?session_id=TEST_PAYMENT_SKIP&submission_id=${submissionId}`;
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
      await reelCompetitionAPI.sendSchoolInquiry({
        schoolName: bulkForm.schoolName,
        contactPerson: bulkForm.contactPerson,
        email: bulkForm.email,
        phone: bulkForm.phone,
        country: bulkForm.country,
        estimatedStudents: bulkForm.estimatedStudents,
        notes: bulkForm.notes,
      });
      toast.success('Bulk registration inquiry submitted! Our school coordinator will reach out within 24 hours.');
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
      toast.error(err?.message || 'Failed to send bulk inquiry. Please try again.');
    }
  };

  const scrollToRegister = () => {
    registrationSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#faf7fd] text-slate-800 antialiased selection:bg-purple-200 selection:text-purple-950 font-sans">
      <SEO
        title="Ramadan & Eid Through My Lens — Mobile Reel Competition 2027 | Kidrove GCC"
        description="A regional mobile video reel challenge for young creators across the GCC. Capture a special moment from Ramadan or Eid with your phone and share your story."
        keywords={["GCC Reel Competition", "Ramadan Mobile Video", "Eid Kids Competition", "Kidrove Reel Challenge", "GCC Short Video", "Youth Mobile Filmmaking"]}
      />

      {/* ─── Hero Section with ramdan.png Background (Exact match to reference mockup) ─── */}
      <section className="relative overflow-hidden text-white">
        {/* Background Image Container */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/ramdan.png"
            alt="Ramadan & Eid Through My Mobile Camera - Kidrove GCC Reel Challenge"
            className="w-full h-full object-cover object-[center_right] sm:object-right"
          />
          {/* Violet Gradient Overlay on the left side to keep text crisp and readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#2e1065]/95 via-[#3b0764]/75 to-transparent max-w-4xl pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2e1065]/90 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="relative min-h-[640px] sm:min-h-[700px] lg:min-h-[740px] flex flex-col justify-between z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-10 w-full">
            <div className="max-w-2xl text-left">
              {/* Header Badge: Rounded pill with crescent icon */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6 shadow-sm"
              >
                <span className="text-amber-300 font-bold text-xs">🌙</span>
                <span className="text-[11px] font-black uppercase tracking-wider text-white">
                  KIDROVE GCC THROUGH MY LENS | REEL CHALLENGE 2027
                </span>
              </motion.div>

              {/* Main Headline with Camera Slate Icon */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-5"
              >
                <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.08] text-white drop-shadow-md">
                  Ramadan &amp; Eid <br />
                  <span className="text-white">Through My </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-200 to-amber-300">
                    Mobile
                  </span>
                  <br />
                  <span className="inline-flex items-center gap-3">
                    <span>Camera</span>
                    {/* Clapperboard / Video Icon with sparkles */}
                    <span className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border-2 border-white/30 backdrop-blur-md text-white shadow-lg text-2xl sm:text-3xl rotate-[-4deg]">
                      🎬
                    </span>
                  </span>
                </h1>
              </motion.div>


              {/* Tagline Paragraph */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed mb-6 max-w-xl drop-shadow-sm"
              >
                Capture the Spirit. Share the Moment. From the glow of a Ramadan lantern to the excitement of getting ready for Eid, use your phone to create one short video celebrating the moments that make this season unforgettable.
              </motion.p>

              {/* Feature Highlights Pills: Frosted glass with icons */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-8"
              >
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-xs font-bold text-white shadow-sm">
                  <FiSmartphone className="text-amber-200 text-sm" />
                  <span>One Mobile Phone</span>
                </div>
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-xs font-bold text-white shadow-sm">
                  <FiPlay className="text-amber-200 text-sm" />
                  <span>One Vertical Reel (Up to 60s)</span>
                </div>
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-xs font-bold text-white shadow-sm">
                  <span>✨</span>
                  <span>One Special Moment</span>
                </div>
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-4 mb-8"
              >
                {/* Yellow Gold Gradient Pill Button */}
                <button
                  onClick={scrollToRegister}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-300 text-purple-950 font-black text-sm shadow-xl shadow-amber-300/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 group"
                >
                  <span>Register for February 2027</span>
                  <FiChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                {/* Translucent Violet Pill Button */}
                <Link
                  to="/competitions/gcc-reel-challenge/submit"
                  className="px-7 py-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2"
                >
                  <span>Already Registered? Submit Reel</span>
                  <FiArrowRight />
                </Link>
                {/* <button
                  onClick={() => {
                    const section = document.getElementById('school-bulk-section');
                    if (section) section.scrollIntoView({ behavior: 'smooth' });
                    else setShowBulkModal(true);
                  }}
                  className="px-7 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold text-sm backdrop-blur-md transition-all shadow-sm flex items-center gap-2"
                >
                  <FiPlay className="text-amber-300 text-xs fill-amber-300" />
                  <span>School Bulk Program</span>
                </button> */}
              </motion.div>

            </div>
          </div>

          {/* Bottom 4 Metric Cards Row: Frosted Glass Cards matching mockup */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Format (Cyan/Blueish Violet tint) */}
              <div className="bg-gradient-to-br from-purple-600/30 to-indigo-600/20 backdrop-blur-xl border border-white/25 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                  <FiVideo size={24} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-200 mb-0.5">FORMAT</p>
                  <p className="text-base font-black text-white">Vertical Reel (9:16)</p>
                  <p className="text-xs text-slate-200">Mobile phone camera only</p>
                </div>
              </div>

              {/* Card 2: Who Can Enter (Warm Violet tint) */}
              <div className="bg-gradient-to-br from-fuchsia-600/30 to-purple-600/20 backdrop-blur-xl border border-white/25 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                  <FiUser size={24} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-200 mb-0.5">WHO CAN ENTER</p>
                  <p className="text-base font-black text-white">Kindergarten to Grade 12</p>
                  <p className="text-xs text-slate-200">4 age-calibrated categories</p>
                </div>
              </div>

              {/* Card 3: Fee Per Student (Cyan/Teal-Violet tint) */}
              <div className="bg-gradient-to-br from-teal-500/25 to-indigo-600/20 backdrop-blur-xl border border-white/25 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-200 shrink-0 text-xl font-black">
                  🪙
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-200 mb-0.5">FEE PER STUDENT</p>
                  <p className="text-base font-black text-white">AED 50</p>
                  <p className="text-xs text-slate-200">AED 40 for school bulk entry</p>
                </div>
              </div>

              {/* Card 4: Recognition (Golden/Violet tint) */}
              <div className="bg-gradient-to-br from-purple-700/30 to-amber-600/20 backdrop-blur-xl border border-white/25 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                  <FiAward size={24} className="stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-200 mb-0.5">RECOGNITION</p>
                  <p className="text-base font-black text-white">Gold, Silver &amp; Bronze</p>
                  <p className="text-xs text-slate-200">Official certificates for all</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Timeline Section: "The moments that matter." (Theme: Violet Blend) ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-4">
        <div className="bg-gradient-to-br from-[#5b21b6] via-[#6d28d9] to-[#7c3aed] border border-purple-300/40 rounded-3xl p-8 md:p-10 relative overflow-hidden text-white shadow-xl shadow-purple-950/10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-fuchsia-400/20 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400/20 blur-[60px] pointer-events-none" />

          <div className="mb-12 relative z-10 flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="text-[10px] text-purple-200 uppercase tracking-widest font-bold mb-2">Put these on the calendar</p>
              <h3 className="text-3xl md:text-4xl font-black text-white">
                The moments <span className="text-purple-200 italic font-serif font-normal">that matter.</span>
              </h3>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/30 bg-white/15 px-4 py-2.5 backdrop-blur-sm">
              <span className="text-purple-100">📅</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white">Competition month / February 2027</span>
            </div>
          </div>

          <div className="relative mt-8 z-10">
            {/* Horizontal Line on desktop */}
            <div className="absolute left-[7px] top-3 hidden h-[2px] w-[calc(100%-14px)] bg-gradient-to-r from-purple-200/80 via-fuchsia-300/60 to-violet-200/40 md:block" />

            <div className="grid gap-10 md:grid-cols-4 md:gap-6">
              {[
                { date: '1 Feb', year: '2027', title: 'Challenge opens', copy: 'Kickoff across the 6 GCC member nations. Registrations open online.' },
                { date: '18 Feb', year: '2027', title: 'Registration deadline', copy: 'Complete individual student or school bulk entries before registration closes.' },
                { date: '28 Feb', year: '2027', title: 'Reel upload deadline', copy: 'Submit your completed vertical mobile video reel via the official portal.' },
                { date: 'Mar', year: '2027', title: 'Results announcement', copy: 'Winners, honourable mentions, and outstanding visual storytellers revealed.' },
              ].map((item) => (
                <div key={item.date} className="relative grid grid-cols-[32px_1fr] gap-4 md:block">
                  <div className="relative z-10 mt-0.5 h-4 w-4 rounded-full border-4 border-white bg-violet-900 md:mb-8 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                  <div>
                    <p className="text-3xl font-black text-white tracking-tight">
                      {item.date}<sup className="ml-1 text-xs font-normal text-purple-200">{item.year}</sup>
                    </p>
                    <h4 className="mt-3 text-base font-bold text-white">{item.title}</h4>
                    <p className="mt-2 max-w-[240px] text-xs sm:text-sm leading-relaxed text-purple-100/90">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex items-center gap-3 border-t border-white/20 pt-5 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-200">Note</span>
            <p className="text-xs text-purple-100">
              Registration and reel submission are conducted online via Kidrove for all eligible GCC students (Kindergarten through Grade 12).
            </p>
          </div>
        </div>
      </section>

      {/* ─── Main Content Stacks ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">

        {/* 1. Theme Inspiration & Reel Challenge Prompts */}
        <section>
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Col */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-violet-200/90 p-8 sm:p-10 shadow-sm flex flex-col justify-between">
              <div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-violet-900 bg-violet-100 px-3 py-1 rounded-full border border-violet-200 mb-4">
                  Theme & Spirit
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-[1.2] mb-4">
                  The Moments That <br />
                  <span className="text-violet-700">Make Eid Special</span>
                </h2>
                <p className="text-slate-600 leading-relaxed text-sm mb-4">
                  Ramadan and Eid are filled with special moments, family traditions, and joyful preparations. From the warm glow of a lantern to the excitement of getting ready for Eid morning, every moment has a story to tell.
                </p>
                <p className="text-slate-600 leading-relaxed text-sm mb-6">
                  Using a mobile phone, students will create <strong>one short video reel</strong> capturing a meaningful, joyful, or creative moment from Ramadan or Eid celebrations.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-violet-950 text-xs font-medium">
                💡 <strong>Mobile Video Only:</strong> This is a mobile video reel competition. Paintings, posters, photographs without video, and written stories are not accepted.
              </div>
            </div>

            {/* Right Col: Moment Prompts to Inspire */}
            <div className="lg:col-span-7 bg-gradient-to-br from-violet-50/80 via-purple-50/50 to-white border border-violet-200 rounded-3xl p-8 sm:p-10 shadow-sm">
              <div className="mb-6">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-violet-900 bg-violet-100 px-3 py-1 rounded-full border border-violet-200 mb-2">
                  Creative Inspiration
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Moments You Could Capture
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  These ideas are here to inspire you. You are completely welcome to capture a different moment meaningful to you:
                </p>
              </div>

              <div className="space-y-3">
                {REEL_PROMPTS.map((prompt, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 items-start bg-white p-3.5 rounded-2xl border border-violet-100 shadow-2xs hover:border-violet-400 transition-all"
                  >
                    <span className="text-2xl p-2 rounded-xl bg-violet-50 border border-violet-200 shrink-0">
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

        {/* 2. Age Categories & Duration Table */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-black uppercase tracking-wider text-violet-900 bg-violet-100 px-3.5 py-1.5 rounded-full border border-violet-200">
              Who Can Participate?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 mb-3">
              Four Age Categories for Fair Evaluation
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              The competition is open to students from Kindergarten to Grade 12. Entries are evaluated separately within each category.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className={`rounded-3xl border p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all hover:-translate-y-1 ${cat.cardBg}`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white border border-violet-200 flex items-center justify-center text-2xl mb-4 shadow-xs">
                    {cat.icon}
                  </div>
                  <span className={`inline-block text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border mb-3 ${cat.badge}`}>
                    {cat.grades}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mb-1">{cat.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-violet-900 mb-3">
                    <FiVideo className="text-violet-600" />
                    <span>Duration: {cat.duration}</span>
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
        <section className="bg-white rounded-3xl border border-violet-200/90 p-8 sm:p-12 shadow-sm">
          <div className="grid lg:grid-cols-12 gap-10">
            {/* Steps */}
            <div className="lg:col-span-7">
              <span className="text-[11px] font-black uppercase tracking-wider text-violet-900 bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
                Participation Steps
              </span>
              <h2 className="text-3xl font-black text-slate-900 mt-3 mb-6">
                How to Participate
              </h2>

              <div className="space-y-4">
                {[
                  {
                    num: '1',
                    title: 'Register Online',
                    desc: 'Sign up through the Kidrove competition page as an individual student or through school bulk registration.',
                  },
                  {
                    num: '2',
                    title: 'Capture With Your Mobile Phone',
                    desc: 'Use a smartphone to record vertical moments (9:16) from Ramadan traditions or Eid preparations.',
                  },
                  {
                    num: '3',
                    title: 'Keep Within Duration Limits',
                    desc: 'Ensure your vertical reel complies with the exact duration limit designated for your grade category.',
                  },
                  {
                    num: '4',
                    title: 'Authentic Student Work',
                    desc: 'Make sure the video is your own original creation. (Parents may help hold the phone or assist with upload for KG–G2).',
                  },
                  {
                    num: '5',
                    title: 'Submit Before the Deadline',
                    desc: 'Upload your finished vertical reel through the official portal before the closing deadline.',
                  },
                ].map((step) => (
                  <div key={step.num} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-900 to-purple-700 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
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
            <div className="lg:col-span-5 bg-gradient-to-br from-violet-950 via-[#4c1d95] to-[#5b21b6] text-white rounded-2xl border border-violet-400/40 p-6 flex flex-col justify-between shadow-md">
              <div>
                <h3 className="text-lg font-black text-purple-200 mb-4 flex items-center gap-2">
                  <FiAlertCircle className="text-purple-300" />
                  <span>Video Guidelines & Rules</span>
                </h3>
                <ul className="space-y-2.5 text-xs text-purple-100">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-300 font-bold">•</span>
                    <span>The video must be captured by the student using a mobile phone.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-300 font-bold">•</span>
                    <span>Videos must be recorded vertically (9:16 format).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-300 font-bold">•</span>
                    <span>Simple trimming, captions, and voice-over are permitted.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-300 font-bold">•</span>
                    <span>AI-generated video or visuals are strictly not permitted.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-300 font-bold">•</span>
                    <span>Students do not need to appear on camera.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-300 font-bold">•</span>
                    <span>Obtain permission before filming identifiable people.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-300 font-bold">•</span>
                    <span>Respect privacy: do not film during prayer or private family moments without permission.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-white/15">
                <span className="text-[11px] font-extrabold text-purple-200 uppercase tracking-wider block">
                  Official Portal
                </span>
                <p className="text-xs text-purple-200/90">
                  Visit <a href="https://kidrove.com" target="_blank" rel="noreferrer" className="text-white font-bold underline">https://kidrove.com</a> for updates and guidelines.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Judging Criteria */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-black uppercase tracking-wider text-violet-900 bg-violet-100 px-3.5 py-1.5 rounded-full border border-violet-200">
              Evaluation Metrics
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-4 mb-3">
              Judging Criteria
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              The judging will focus on the student’s creativity and storytelling—not the cost of their phone or the complexity of their editing.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CRITERIA.map((crit, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-violet-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
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
        <section className="bg-gradient-to-br from-[#4c1d95] via-[#5b21b6] to-[#7c3aed] rounded-3xl p-8 sm:p-14 text-white shadow-xl border border-purple-300/30">
          <div className="max-w-2xl mb-12">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-200 bg-white/15 px-3.5 py-1.5 rounded-full border border-white/20">
              Excellence & Honours
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-3">
              Awards and Recognition
            </h2>
            <p className="text-purple-100 text-sm sm:text-base leading-relaxed">
              Outstanding young creators from across the six GCC nations will receive recognition for their creativity and ability to capture meaningful moments.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {AWARDS.map((aw, idx) => (
              <div
                key={idx}
                className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all shadow-xs"
              >
                <div className="text-3xl mb-3">{aw.icon}</div>
                <h3 className="text-base font-black text-white mb-1">{aw.title}</h3>
                <span className="text-[11px] font-bold text-purple-200 block mb-2">{aw.subtitle}</span>
                <p className="text-xs text-purple-100/90 leading-relaxed">{aw.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── SCHOOL BULK REGISTRATION (AED 40 / student) ─── */}
        <section id="school-bulk-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-violet-50/95 via-white to-purple-50/80 border-2 border-purple-300/80 rounded-3xl p-8 sm:p-12 md:p-14 shadow-lg shadow-purple-900/5 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-400/15 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-400/15 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-950 bg-purple-100/90 px-4 py-1.5 rounded-full border border-purple-300/80 shadow-xs">
                  <span>🏫</span> Educators & Media Coordinators
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-900 bg-purple-100/80 px-3.5 py-1.5 rounded-full border border-purple-300">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" /> School Bulk Program 2027
                </span>
              </div>

              <div className="max-w-4xl mb-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
                  School Bulk Registration <span className="whitespace-nowrap text-purple-700">(AED 40 / student)</span>
                </h2>
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  Inspire your entire school community to celebrate Ramadan and Eid through mobile filmmaking! For schools registering 25 or more students across the GCC, we provide a discounted bulk rate of <strong className="text-slate-900">AED 40 per child</strong> (saving AED 10 per entry vs AED 50 individual rate), video reel guidelines & rubric for Kindergarten to Grade 12, dedicated coordinator support, and entry into the prestigious <strong className="text-purple-900">Top GCC Media School Trophy</strong>.
                </p>
              </div>

              {/* 3 Pillar Cards */}
              <div className="grid sm:grid-cols-3 gap-5 mb-10">
                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center text-xl mb-3">
                    💰
                  </div>
                  <span className="text-purple-900 font-black text-3xl block mb-1">AED 40</span>
                  <p className="text-sm text-slate-900 font-bold mb-1">Discounted Bulk Rate</p>
                  <p className="text-xs text-slate-500 leading-relaxed">For 25+ students (saving AED 10/child vs AED 50 regular rate)</p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-800 flex items-center justify-center text-xl mb-3">
                    📄
                  </div>
                  <span className="text-slate-900 font-black text-3xl block mb-1">1 Single</span>
                  <p className="text-sm text-slate-900 font-bold mb-1">Consolidated Invoice</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Official school invoice payable via bank transfer or credit card across GCC</p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-purple-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xl mb-3">
                    🏆
                  </div>
                  <span className="text-purple-900 font-black text-3xl block mb-1">Official Trophy</span>
                  <p className="text-sm text-slate-900 font-bold mb-1">Top School Award</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Recognising schools with highest student engagement & winning reels</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm transition-all shadow-lg shadow-purple-600/25 hover:scale-105 active:scale-95 flex items-center gap-2.5"
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

        {/* ─── FAQs - Styled like "Wondering how it works?" ─── */}
        <section className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-y border-violet-200/90 rounded-3xl max-w-7xl mx-auto shadow-xs">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
            {/* Left Column: Sticky Title */}
            <div className="lg:w-1/3 lg:sticky lg:top-28">
              <span className="inline-block text-violet-900 bg-violet-50 px-3.5 py-1 rounded-full border border-violet-200 text-[10px] font-extrabold uppercase tracking-[0.16em] mb-4">
                Questions, meet answers
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.05] tracking-tight mb-4">
                Wondering <br />
                <span className="font-serif italic font-normal text-violet-700">how it works?</span>
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Everything you need to know about video submission, mobile guidelines, duration limits, school bulk entries, and certificates.
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
                    <summary className="flex items-center justify-between cursor-pointer py-6 outline-none list-none [&::-webkit-details-marker]:hidden hover:text-violet-900 transition-colors">
                      <span className="flex items-center gap-4 sm:gap-6 font-bold text-slate-900 text-base sm:text-lg text-left pr-4">
                        <span className="text-violet-600 text-xs font-black tracking-widest shrink-0">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {faq.q}
                      </span>
                      <FiChevronDown className="h-5 w-5 text-slate-400 shrink-0 transition-transform duration-300 group-open:-rotate-180 group-open:text-violet-900" />
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
        className="pt-16 pb-24 bg-white border-t border-violet-100 relative overflow-hidden"
      >
        {/* Soft Violet/Purple ambient background spotlights */}
        <div className="absolute top-[-5%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/20 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-violet-400/20 blur-[160px] pointer-events-none" />
        <div className="absolute top-[40%] right-[-5%] w-[40%] h-[40%] rounded-full bg-fuchsia-400/15 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[20%] w-[45%] h-[45%] rounded-full bg-purple-500/15 blur-[160px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="text-4xl block mb-2">🎬</span>
            <span className="inline-block text-xs font-black uppercase tracking-widest text-violet-900 bg-violet-50 px-4 py-1.5 rounded-full border border-violet-200 mb-3">
              Phase 1: Participant Reel Registration
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Registration & Entry Fee
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2 max-w-xl mx-auto">
              Complete participant details and secure entry (AED 50). You will immediately receive your official GCC Reel Reference No. and guidelines. Videos can be finalized and uploaded through February 2027!
            </p>
          </div>

          {/* Stepper Progress Indicator: 3 Steps */}
          <div className="mb-12 max-w-xl mx-auto">
            <div className="flex justify-between items-center gap-2">
              {[
                { id: 1, label: 'Creator Info', icon: FiUser },
                { id: 2, label: 'Consent & Rules', icon: FiAward },
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
                        ? 'bg-gradient-to-br from-violet-800 to-purple-800 text-white shadow-md shadow-violet-900/30 ring-2 ring-violet-300'
                        : isActive
                          ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white font-black shadow-lg shadow-violet-600/30 ring-4 ring-violet-200'
                          : 'bg-white border-2 border-slate-300 text-slate-600 shadow-xs'
                        }`}
                    >
                      {isDone ? <FiCheck size={20} className="stroke-[3]" /> : <Icon size={18} className="stroke-[2.5]" />}
                    </div>
                    <span
                      className={`text-xs font-black tracking-wider uppercase text-center ${isActive
                        ? 'text-violet-950 font-black'
                        : isDone
                          ? 'text-violet-900 font-black'
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
          <div className="bg-white border-2 border-violet-200/90 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl shadow-purple-950/5 relative">
            {isRegisteredSuccess ? (
              <div className="text-center py-10 space-y-5">
                <div className="w-20 h-20 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center mx-auto text-4xl shadow-inner">
                  ✓
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-violet-900 bg-violet-50 px-3.5 py-1.5 rounded-full border border-violet-200">
                    Registration Confirmed
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 mt-3">Pre-Registration Complete!</h3>
                  <p className="text-slate-600 text-sm max-w-md mx-auto mt-2">
                    Thank you for registering <strong>{form.studentFullName}</strong> for GCC Through My Lens - Reel Challenge. A confirmation notice has been sent to <strong>{form.parentEmail}</strong>.
                  </p>
                </div>

                {registeredData?.submissionRef && (
                  <div className="inline-block bg-[#FAF8FE] border-2 border-violet-400 rounded-2xl px-6 py-4 shadow-xs">
                    <span className="text-xs uppercase font-extrabold text-slate-500 block">Your Official Reference Number</span>
                    <span className="text-2xl font-black text-violet-950 tracking-wider font-mono">
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
                        studentAge: '',
                        grade: '',
                        category: '',
                        reelTitle: '',
                        reelSummary: '',
                      }));
                    }}
                    className="px-8 py-3.5 rounded-full bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm shadow-md transition-all"
                  >
                    Register Another Creator
                  </button>
                  <a
                    href="/"
                    className="px-6 py-3.5 rounded-full border border-violet-300 text-violet-950 hover:bg-violet-50 font-bold text-sm transition-all"
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
                        <div className="mb-6 pb-4 border-b border-violet-100">
                          <span className="text-violet-900 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                            Step 1 of 3
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                            <span>👤</span> Student & Parent Details
                          </h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Enter participant details. You will receive your official Reel Reference Number upon registration.
                          </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Parent / Guardian Full Name <span className="text-violet-600">*</span>
                            </label>
                            <input
                              type="text"
                              name="parentName"
                              value={form.parentName}
                              onChange={handleInputChange}
                              placeholder="e.g. Fatima Al-Kuwari"
                              className="w-full bg-[#FAF8FE] border border-slate-300 hover:border-violet-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-violet-700 focus:bg-white focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Parent Email Address <span className="text-violet-600">*</span>
                            </label>
                            <input
                              type="email"
                              name="parentEmail"
                              value={form.parentEmail}
                              onChange={handleInputChange}
                              placeholder="parent@example.com"
                              className="w-full bg-[#FAF8FE] border border-slate-300 hover:border-violet-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-violet-700 focus:bg-white focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Parent Mobile / WhatsApp <span className="text-violet-600">*</span>
                            </label>
                            <input
                              type="tel"
                              name="parentPhone"
                              value={form.parentPhone}
                              onChange={handleInputChange}
                              placeholder="+971 50 123 4567"
                              className="w-full bg-[#FAF8FE] border border-slate-300 hover:border-violet-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-violet-700 focus:bg-white focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Student Full Name <span className="text-violet-600">*</span>
                            </label>
                            <input
                              type="text"
                              name="studentFullName"
                              value={form.studentFullName}
                              onChange={handleInputChange}
                              placeholder="e.g. Rashid Al-Hajri"
                              className="w-full bg-[#FAF8FE] border border-slate-300 hover:border-violet-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-violet-700 focus:bg-white focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Student Age <span className="text-violet-600">*</span>
                            </label>
                            <input
                              type="number"
                              name="studentAge"
                              min="3"
                              max="20"
                              value={form.studentAge}
                              onChange={handleInputChange}
                              placeholder="Age (e.g. 10)"
                              className="w-full bg-[#FAF8FE] border border-slate-300 hover:border-violet-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-violet-700 focus:bg-white focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Grade / Year <span className="text-violet-600">*</span>
                            </label>
                            <select
                              name="grade"
                              value={form.grade}
                              onChange={handleInputChange}
                              className="w-full bg-[#FAF8FE] border border-slate-300 hover:border-violet-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-violet-700 focus:bg-white focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                            >
                              <option value="">Select Grade Level</option>
                              <option value="Kindergarten">Kindergarten</option>
                              <option value="Grade 1">Grade 1</option>
                              <option value="Grade 2">Grade 2</option>
                              <option value="Grade 3">Grade 3</option>
                              <option value="Grade 4">Grade 4</option>
                              <option value="Grade 5">Grade 5</option>
                              <option value="Grade 6">Grade 6</option>
                              <option value="Grade 7">Grade 7</option>
                              <option value="Grade 8">Grade 8</option>
                              <option value="Grade 9">Grade 9</option>
                              <option value="Grade 10">Grade 10</option>
                              <option value="Grade 11">Grade 11</option>
                              <option value="Grade 12">Grade 12</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Assigned Category
                            </label>
                            <div className="w-full bg-violet-50/80 border border-violet-200 rounded-xl px-4 py-3.5 text-xs font-extrabold text-violet-900 flex items-center h-[48px]">
                              {form.category || 'Auto-assigned by grade'}
                            </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              GCC Country <span className="text-violet-600">*</span>
                            </label>
                            <select
                              name="country"
                              value={form.country}
                              onChange={handleInputChange}
                              className="w-full bg-[#FAF8FE] border border-slate-300 hover:border-violet-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-violet-700 focus:bg-white focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
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
                              School Name <span className="text-violet-600">*</span>
                            </label>
                            <input
                              type="text"
                              name="schoolName"
                              value={form.schoolName}
                              onChange={handleInputChange}
                              placeholder="e.g. International Academy"
                              className="w-full bg-[#FAF8FE] border border-slate-300 hover:border-violet-400 rounded-xl px-4 py-3.5 text-sm text-slate-900 focus:border-violet-700 focus:bg-white focus:ring-2 focus:ring-violet-500/20 transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="px-8 py-3.5 rounded-full bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
                          >
                            <span>Next: Declarations & Consent</span>
                            <FiArrowRight />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Consent & Declarations */}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <div className="mb-6 pb-4 border-b border-violet-100">
                          <span className="text-violet-900 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                            Step 2 of 3
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                            <span>📜</span> Declarations & Permissions
                          </h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Please confirm originality, video permissions, and parental consent.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <label className="flex items-start gap-3 p-4 rounded-2xl bg-violet-50/50 border border-violet-200 cursor-pointer hover:bg-violet-50 transition-colors">
                            <input
                              type="checkbox"
                              name="agreeTerms"
                              checked={form.agreeTerms}
                              onChange={handleInputChange}
                              className="mt-1 w-4 h-4 rounded text-violet-700 focus:ring-violet-500"
                            />
                            <span className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                              <strong>I agree to the competition rules and guidelines. *</strong> I understand that each participant may submit one vertical reel (up to 60s) captured by the student using a mobile phone.
                            </span>
                          </label>

                          <label className="flex items-start gap-3 p-4 rounded-2xl bg-violet-50/50 border border-violet-200 cursor-pointer hover:bg-violet-50 transition-colors">
                            <input
                              type="checkbox"
                              name="originalityDeclaration"
                              checked={form.originalityDeclaration}
                              onChange={handleInputChange}
                              className="mt-1 w-4 h-4 rounded text-violet-700 focus:ring-violet-500"
                            />
                            <span className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                              <strong>Original Student Mobile Video Declaration *</strong> I declare that the video footage will be captured by the student. No AI-generated video or visuals, copied online trends, or copyrighted footage will be used.
                            </span>
                          </label>

                          <label className="flex items-start gap-3 p-4 rounded-2xl bg-violet-50/50 border border-violet-200 cursor-pointer hover:bg-violet-50 transition-colors">
                            <input
                              type="checkbox"
                              name="parentGuardianConsent"
                              checked={form.parentGuardianConsent}
                              onChange={handleInputChange}
                              className="mt-1 w-4 h-4 rounded text-violet-700 focus:ring-violet-500"
                            />
                            <span className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                              <strong>Parent / Guardian Consent *</strong> I am the parent or legal guardian of the student and give full consent for their participation in the GCC Reel Challenge.
                            </span>
                          </label>

                          <label className="flex items-start gap-3 p-4 rounded-2xl bg-violet-50/50 border border-violet-200 cursor-pointer hover:bg-violet-50 transition-colors">
                            <input
                              type="checkbox"
                              name="competitionUpdatesConsent"
                              checked={form.competitionUpdatesConsent}
                              onChange={handleInputChange}
                              className="mt-1 w-4 h-4 rounded text-violet-700 focus:ring-violet-500"
                            />
                            <span className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                              <strong>Competition Communications *</strong> I agree to receive official notices, reference codes, submission guidelines, and certificates via email/WhatsApp.
                            </span>
                          </label>

                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <label className="block text-xs font-bold text-slate-800 mb-2">
                              Kidrove Showcase Permission
                            </label>
                            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                              Do you grant Kidrove permission to showcase the student’s video reel on the Kidrove website, digital exhibition, or social channels if selected?
                            </p>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name="reelDisplayPermission"
                                  value="yes"
                                  checked={form.reelDisplayPermission === 'yes'}
                                  onChange={handleInputChange}
                                  className="text-violet-700 focus:ring-violet-500"
                                />
                                <span>Yes, with pleasure</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name="reelDisplayPermission"
                                  value="no"
                                  checked={form.reelDisplayPermission === 'no'}
                                  onChange={handleInputChange}
                                  className="text-violet-700 focus:ring-violet-500"
                                />
                                <span>No, evaluation only</span>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 flex justify-between">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            className="px-6 py-3.5 rounded-full border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                          >
                            <FiChevronLeft />
                            <span>Back</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="px-8 py-3.5 rounded-full bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
                          >
                            <span>Next: Fee & Confirmation</span>
                            <FiArrowRight />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Payment & Summary */}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <div className="mb-6 pb-4 border-b border-violet-100">
                          <span className="text-violet-900 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                            Step 3 of 3
                          </span>
                          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                            <span>💳</span> Entry Confirmation & Payment
                          </h3>
                          <p className="text-slate-500 text-xs sm:text-sm mt-1">
                            Review your registration details and finalize your official entry.
                          </p>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-[#FAF8FE] rounded-2xl border border-violet-200 p-6 space-y-3">
                          <div className="flex justify-between items-center pb-3 border-b border-violet-200">
                            <div>
                              <span className="text-[10px] font-black uppercase text-violet-800 tracking-wider">Student Participant</span>
                              <h4 className="text-lg font-black text-slate-900">{form.studentFullName}</h4>
                              <p className="text-xs text-slate-600">{form.grade} · {form.category}</p>
                            </div>
                            <span className="text-2xl">📱</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs text-slate-700 py-1">
                            <div>
                              <span className="font-bold text-slate-500 block">Parent / Guardian:</span>
                              <span>{form.parentName}</span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-500 block">Parent Email:</span>
                              <span>{form.parentEmail}</span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-500 block">Country:</span>
                              <span>{form.country}</span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-500 block">School:</span>
                              <span>{form.schoolName}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-violet-200 flex justify-between items-center">
                            <span className="font-black text-slate-900 text-sm">Official Entry Fee</span>
                            <span className="text-xl font-black text-violet-950 font-mono">
                              AED {form.schoolBulkRef ? '40.00' : '50.00'}
                            </span>
                          </div>
                        </div>



                        <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-violet-950 text-xs leading-relaxed">
                          <strong>✨ What happens next?</strong> Upon completing registration, your official Reference Number (`REEL2027-XXXXXXXX`) will be issued and emailed immediately to {form.parentEmail}. You can finalize and upload your vertical reel anytime through February 2027!
                        </div>

                        <div className="pt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                          <button
                            type="button"
                            onClick={handlePrevStep}
                            disabled={isSubmitting}
                            className="px-6 py-3.5 rounded-full border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                          >
                            <FiChevronLeft />
                            <span>Back</span>
                          </button>
                          <div className="flex flex-col sm:flex-row items-center gap-2.5">
                            {(import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) && (
                              <button
                                type="button"
                                onClick={handleDevBypass}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto px-5 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 font-bold rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-xs sm:text-sm"
                              >
                                {isSubmitting ? (
                                  <><span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Testing...</>
                                ) : (
                                  '⚡ Test Payment (Localhost Bypass)'
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleFinalSubmit}
                              disabled={isSubmitting}
                              className="w-full sm:w-auto px-9 py-4 rounded-full bg-violet-700 hover:bg-violet-800 text-white font-black text-sm shadow-lg shadow-violet-700/25 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                              {isSubmitting ? (
                                <span>Connecting to Stripe…</span>
                              ) : (
                                <>
                                  <span>Pay AED {form.schoolBulkRef ? '40.00' : '50.00'} & Complete Registration</span>
                                  <FiCheck size={18} />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── WhatsApp Contact Card (Exact UI as in /competitions/national-day-art-competition) ── */}
      <div className="max-w-4xl mx-auto px-4 relative z-10 mt-8 mb-20 md:mb-28">
        <div className="bg-gradient-to-br from-violet-500/10 via-white to-purple-500/10 border border-violet-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-violet-900/5 hover:border-violet-500/50 transition-colors group">
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

      {/* ─── School Bulk Modal ──────────────────────────────────────────────── */}
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
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
              >
                <FiX size={20} />
              </button>

              <div className="mb-6">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-900 bg-violet-100 px-3 py-1 rounded-full border border-violet-200">
                  Institutional Bulk Entries · AED 40/Student
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  School Bulk Registration Inquiry
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Connect with our team to enroll multiple classrooms, receive coordinator packages, and access school billing (AED 40 per student).
                </p>
              </div>

              <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">School Name *</label>
                  <input
                    type="text"
                    value={bulkForm.schoolName}
                    onChange={(e) => setBulkForm({ ...bulkForm, schoolName: e.target.value })}
                    className="w-full bg-[#FAF8FE] border border-violet-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-violet-700 outline-none"
                    placeholder="e.g. Doha British School"
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
                      className="w-full bg-[#FAF8FE] border border-violet-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-violet-700 outline-none"
                      placeholder="Principal / Media Coordinator"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">GCC Country *</label>
                    <select
                      value={bulkForm.country}
                      onChange={(e) => setBulkForm({ ...bulkForm, country: e.target.value })}
                      className="w-full bg-[#FAF8FE] border border-violet-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-violet-700 outline-none"
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
                      className="w-full bg-[#FAF8FE] border border-violet-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-violet-700 outline-none"
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
                      className="w-full bg-[#FAF8FE] border border-violet-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-violet-700 outline-none"
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
                    onChange={(e) => setBulkForm({ ...bulkForm, estimatedStudents: parseInt(e.target.value) || 30 })}
                    className="w-full bg-[#FAF8FE] border border-violet-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-violet-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Additional Notes</label>
                  <textarea
                    rows={2}
                    value={bulkForm.notes}
                    onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                    placeholder="Specific grades or special coordination requirements..."
                    className="w-full bg-[#FAF8FE] border border-violet-200 rounded-xl px-3.5 py-2.5 text-xs focus:border-violet-700 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-violet-700 hover:bg-violet-800 text-white font-bold text-xs shadow-md transition-all mt-2"
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

export default GCCReelChallengePage;
