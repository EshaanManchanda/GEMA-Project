import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiUpload,
  FiCheck, FiChevronRight, FiChevronLeft, FiAlertCircle,
  FiAward, FiStar, FiImage, FiTrash2, FiChevronDown, FiX, FiMail, FiEdit2, FiPlay, FiCreditCard, FiDownload
} from 'react-icons/fi';
import { SiCanva, SiGoogle, SiOpenai, SiFigma, SiAdobe, SiGooglegemini, SiClaude } from 'react-icons/si';
import { HiOutlineSparkles } from 'react-icons/hi2';
import SEO from '@/components/common/SEO';
import competitionAPI, { CompetitionSubmitPayload } from '@/services/api/competitionAPI';
import toast from 'react-hot-toast';
import StripeElementsWrapper from '@/components/payment/StripeElementsWrapper';
import StripePaymentElement from '@/components/payment/StripePaymentElement';
import { ApiService } from '@/services/api';
import { getRegionalPaymentMethods, getPreferredPaymentMethod } from '@/utils/paymentConfig';
import { getEnvironmentInfo, getPaymentMethodAvailability } from '@/utils/environmentUtils';
import { isRealStripeClientSecret } from '@/utils/stripeConfig';
import { CreditCard, CheckCircle, Shield, ChevronLeft } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const AT_A_GLANCE: any[] = [
  { icon: '🧑‍🎓', label: 'Who can participate', value: 'Grades 1–12' },
  {
    icon: '💰',
    label: 'Participation Fee',
    value: (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
        <span>Individual: AED 50/student</span>
        <span className="text-emerald-400 mt-1 sm:mt-0">School Bulk: AED 35/student</span>
      </div>
    ),
    colSpan: 2
  },
  { icon: '🖼️', label: 'Submission', value: '1 AI-generated artwork' },
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
  "Submit misleading or deceptive content presented as a real photograph when the competition entry is intended to be an AI artwork.",
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
  'Midjourney',
  'Claude',
  'DALL-E',
  'Figma',
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
  { id: 6, label: 'Payment', icon: FiCreditCard },
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
    case 'Canva AI / Canva Magic Media': return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/canva/canva-original.svg" alt="Canva" className="w-7 h-7 object-contain" />;
    case 'Google Gemini': return <SiGooglegemini color="#4285F4" size={28} />;
    case 'ChatGPT': return <SiOpenai color="#fff" size={28} />;
    case 'Adobe Firefly': return <SiAdobe color="#FF0000" size={28} />;
    case 'Microsoft Designer / Copilot': return <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows8/windows8-original.svg" alt="Microsoft" className="w-7 h-7 object-contain" />;
    case 'Midjourney': return <HiOutlineSparkles color="#fff" size={28} />;
    case 'Claude': return <SiClaude color="#d97757" size={28} />;
    case 'DALL-E': return <SiOpenai color="#fff" size={28} />;
    case 'Figma': return <SiFigma color="#F24E1E" size={28} />;
    case 'Other AI creative tool': return <span className="text-2xl">💡</span>;
    default: return <span className="text-2xl">🤖</span>;
  }
}

// ─── Competition Payment Step ─────────────────────────────────────────────────

interface CompetitionPaymentStepProps {
  clientSecret: string;
  paymentIntentId: string;
  isSubmitting: boolean;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

function CompetitionPaymentStep({ clientSecret, paymentIntentId, isSubmitting, onPaymentSuccess, onError, onBack }: CompetitionPaymentStepProps) {
  const regionalMethods = getRegionalPaymentMethods();
  const environmentInfo = getEnvironmentInfo();
  const paymentAvailability = getPaymentMethodAvailability();

  const paymentMethods = [
    {
      id: 'test',
      name: 'Test Payment',
      description: environmentInfo.isDevelopment
        ? 'Recommended for development - automatically succeeds and processes your entry normally'
        : 'Safe test payment option - processes your entry normally without charging your card',
      icon: CheckCircle,
      recommended: regionalMethods.test.recommended || !paymentAvailability.stripeElements,
      reliable: true,
      enabled: regionalMethods.test.enabled,
    },
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      description: paymentAvailability.stripeElements
        ? 'Visa, Mastercard, American Express - Secure payment processing'
        : 'Credit/Debit Card payments may have limitations in current environment',
      icon: CreditCard,
      recommended: regionalMethods.stripe.recommended && paymentAvailability.stripeElements,
      reliable: paymentAvailability.stripeElements,
      enabled: regionalMethods.stripe.enabled,
    },
  ].filter(m => m.enabled);

  const [selectedMethod, setSelectedMethod] = React.useState(getPreferredPaymentMethod());
  const [testProcessing, setTestProcessing] = React.useState(false);

  const handleTestPayment = async () => {
    setTestProcessing(true);
    try {
      // Just call onPaymentSuccess with the already-created paymentIntentId
      // On the backend, submitCompetition will verify if it's paid or accept test payments
      await new Promise(r => setTimeout(r, 800)); // Brief delay for UX
      onPaymentSuccess(paymentIntentId);
    } catch (e: any) {
      onError(e.message || 'Test payment failed');
    } finally {
      setTestProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Payment</h2>
        <p className="text-slate-400 text-sm">
          Secure payment processing with 256-bit SSL encryption
        </p>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-900">Select Payment Method</span>
        </div>
        <div className="p-4 space-y-3">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`relative border rounded-xl p-4 cursor-pointer transition-all duration-200 ${selectedMethod === method.id
                ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="competitionPaymentMethod"
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={() => setSelectedMethod(method.id)}
                  className="text-teal-500 focus:ring-teal-500"
                />
                <method.icon className="w-6 h-6 text-gray-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{method.name}</span>
                    {method.recommended && (
                      <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded-full">Recommended</span>
                    )}
                    {method.reliable && method.id === 'test' && (
                      <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">Reliable</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{method.description}</p>
                </div>
                <Shield className="w-5 h-5 text-green-500 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stripe Card Form */}
      {selectedMethod === 'stripe' && (
        <>
          {clientSecret && isRealStripeClientSecret(clientSecret) ? (
            <StripeElementsWrapper clientSecret={clientSecret}>
              {(isReady) => isReady ? (
                <StripePaymentElement
                  onSuccess={() => onPaymentSuccess(paymentIntentId)}
                  onError={onError}
                  isProcessing={isSubmitting}
                  amount={50}
                  currency="AED"
                />
              ) : (
                <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                  <span className="ml-3 text-gray-500">Loading card form...</span>
                </div>
              )}
            </StripeElementsWrapper>
          ) : (
            <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              <span className="ml-3 text-gray-500">Loading payment form...</span>
            </div>
          )}
        </>
      )}

      {/* Payment Summary */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">Payment Summary</span>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Competition Entry Fee</span>
            <span className="font-medium">AED 50.00</span>
          </div>
          <div className="border-t pt-3 flex justify-between text-base font-bold">
            <span>Total Amount</span>
            <span>AED 50.00</span>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-green-800">Secure Payment</p>
          <p className="text-green-700 mt-0.5">
            Your payment information is encrypted and secure. We never store your credit card details.
            All transactions are processed through our certified payment partners.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {selectedMethod === 'test' && (
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-500 text-white text-sm font-medium hover:bg-slate-700 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Consent
          </button>
          <button
            type="button"
            onClick={handleTestPayment}
            disabled={testProcessing || isSubmitting}
            className="px-7 py-3 rounded-xl bg-white hover:bg-white text-slate-900 text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {testProcessing || isSubmitting ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing…</>
            ) : (
              <>Pay AED 50.00</>
            )}
          </button>
        </div>
      )}

      {selectedMethod === 'stripe' && (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-500 text-white text-sm font-medium hover:bg-slate-700 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Consent
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────


export default function AiArtCompetitionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (file.size > 1 * 1024 * 1024) {
      setErrors(['File must be 1 MB or less']);
      return;
    }
    const preview = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, artwork: file, artworkPreview: preview }));
    setErrors([]);
  };

  const handleNext = async () => {
    const errs = validateStep(currentStep, form);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);

    if (currentStep === 5) {
      setCurrentStep(6);
      setTimeout(() => {
        const submitSection = document.getElementById('submit-entry');
        if (submitSection) submitSection.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    setCurrentStep((s) => Math.min(6, s + 1));
    const submitSection = document.getElementById('submit-entry');
    if (submitSection) submitSection.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors([]);
    setCurrentStep((s) => Math.max(1, s - 1));
    const submitSection = document.getElementById('submit-entry');
    if (submitSection) submitSection.scrollIntoView({ behavior: 'smooth' });
  };


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
            We are not looking for the student who simply knows the most complicated AI tool. We want to see: YOUR IDEA + YOUR IMAGINATION + YOUR USE OF AI.
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
              <div key={idx} className={`bg-[#0B1220] p-4 rounded-2xl border border-slate-700/30 group-hover:border-amber-500/20 transition-colors ${item.colSpan === 2 ? 'col-span-2' : ''}`}>
                <span className="block text-2xl mb-2">{item.icon}</span>
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{item.label}</span>
                <span className="block text-sm text-slate-200 font-semibold w-full">{item.value}</span>
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
              { label: 'File Size', value: 'Recommended max: 1 MB' },
              { label: 'Quantity', value: 'ONE artwork only' },
              { label: 'Content', value: 'Must be AI-generated' },
            ].map((r, i) => (
              <div key={i} className="flex justify-between items-center border-b border-slate-700/30 pb-3 last:border-0 last:pb-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{r.label}</span>
                <span className="text-slate-200 font-semibold text-sm">{r.value}</span>
              </div>
            ))}
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Important</span>
              <span className="text-slate-300 text-xs">Once submitted, an entry cannot normally be replaced unless Kidrove specifically requests a corrected submission.</span>
            </div>
          </div>
        </div>

        {/* Why Participate (Span 2) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[50px] pointer-events-none" />
          <h3 className="text-xl font-black text-amber-400 mb-6 flex items-center gap-2 relative z-10">
            <span>🌟</span> Why Participate?
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
            {[
              { icon: '✨', text: 'Explore Generative AI' },
              { icon: '🎨', text: 'Turn ideas to art' },
              { icon: '💡', text: 'Vision of the UAE' },
              { icon: '🏆', text: 'Compete nationwide' },
              { icon: '📜', text: 'Official Certificate' },
              { icon: '⭐', text: 'Win a Medal' },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-3 md:gap-4 items-center bg-[#0B1220]/50 border border-amber-500/10 p-4 rounded-2xl">
                <span className="text-xl md:text-2xl">{item.icon}</span>
                <span className="text-sm font-semibold text-amber-100/80 leading-tight">{item.text}</span>
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
            Individual student participation is allowed, but the participant must be a student of a UAE-based school. Every student participates individually and submits their own artwork.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          {[
            { grades: 'Grades 1–3', name: 'AI Dreamers Cohorts', detail: 'Start with a wild idea. The sky is the first draft.', icon: '🌟', color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30' },
            { grades: 'Grades 4–6', name: 'AI Creators Cohorts', detail: 'Turn what you picture into a world others can visit.', icon: '🎨', color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30' },
            { grades: 'Grades 7–9', name: 'AI Explorers Cohorts', detail: 'Push the prompt further. Find a UAE nobody expected.', icon: '🚀', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30' },
            { grades: 'Grades 10–12', name: 'AI Visionaries Cohorts', detail: 'Make a point of view. Show us the future you see.', icon: '💡', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30' },
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
      <div className="relative pt-24 pb-16 overflow-hidden font-sans border-b border-[#111C45]/60" style={{ background: 'radial-gradient(ellipse 80% 90% at 0% 0%, #0D1B3E 0%, #111C45 15%, #07111F 38%, #020509 60%, #000000 100%)' }}>
        {/* Mobile/Tablet Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B3E] via-[#07111F] to-black lg:hidden pointer-events-none" />

        {/* Desktop Complex Glows */}
        <div className="hidden lg:block">
          {/* Blue sweep that extends across the top toward the image */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_0%,rgba(15,35,90,0.5),transparent_70%)] pointer-events-none" />
          {/* Blue aura right behind / under the image */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_60%_at_75%_30%,rgba(13,27,62,0.65),transparent_65%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_30%_40%_at_68%_15%,rgba(20,40,100,0.4),transparent_60%)] pointer-events-none" />
          {/* Right & bottom fade to pure black */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_100%_100%,rgba(0,0,0,0.95),transparent_55%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_25%,rgba(0,0,0,0.9)_100%)] pointer-events-none" />
          {/* Amber warmth hint (top badge area) */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_20%_15%_at_10%_8%,rgba(245,158,11,0.07),transparent)] pointer-events-none" />
        </div>
        {/* Right Background Image for Desktop — seamless cinematic blend */}
        <div className="hidden lg:block absolute top-0 right-0 w-[65%] h-full z-0 pointer-events-none">
          <div
            className="w-full h-[800px] relative overflow-hidden"
            style={{
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 18%, black 100%), ' +
                'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
              WebkitMaskComposite: 'destination-in',
              maskImage:
                'linear-gradient(to right, transparent 0%, black 18%, black 100%), ' +
                'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
              maskComposite: 'intersect',
              maskSize: '100% 100%',
            }}
          >
            <img
              src="/assets/dubb.png"
              alt="Futuristic UAE AI Artwork"
              className="w-full h-full object-cover object-left-top scale-[1.15]"
            />
            {/* Left edge — bleeds into navy hero text area */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(13,27,62,0.95) 0%, rgba(7,17,31,0.5) 15%, transparent 35%)' }} />
            {/* Bottom fade to black */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 15%, transparent 40%)' }} />
            {/* Top fade to navy */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(13,27,62,0.6) 0%, rgba(7,17,31,0.2) 12%, transparent 28%)' }} />
            {/* Navy color-grade: ties image palette to page */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 55% at 25% 15%, rgba(13,27,62,0.28), transparent 60%)', mixBlendMode: 'multiply' }} />
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">

          {/* Top Section: Text */}
          <div className="flex flex-col lg:flex-row items-start justify-between gap-10 lg:gap-16 mb-20 lg:mb-40 min-h-[500px]">

            {/* Left: Text Content */}
            <div className="w-full lg:w-[45%] text-center lg:text-left xl:pl-8 flex flex-col items-center lg:items-start">
              <div className="inline-flex items-center gap-2 border border-amber-500/50 text-amber-400 font-bold px-4 py-1.5 rounded-full text-xs tracking-wider mb-8 bg-[#1A1814]">
                <HiOutlineSparkles className="text-amber-400 text-sm" />
                <span>KIDROVE AI ART COMPETITION 2026</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-semibold text-white mb-6 leading-[1.1] tracking-tight">
                If AI Could Draw <br />
                <span className="text-amber-400 font-bold">
                  My UAE...
                </span>
              </h1>

              <div className="w-16 h-0.5 bg-gradient-to-r from-amber-400 to-transparent mb-8 relative mx-auto lg:mx-0">
                <HiOutlineSparkles className="text-amber-400 text-sm absolute -right-4 -top-2" />
              </div>

              <p className="text-slate-300 text-lg md:text-xl max-w-[420px] mb-10 leading-relaxed font-light mx-auto lg:mx-0">
                Imagine the UAE through your eyes.<br />
                Create it with AI. Let the world see<br />
                your imagination.
              </p>

              {/* Pills */}
              <div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 text-sm text-slate-300 font-medium mb-12">
                <div className="flex items-center gap-2"><span className="text-lg">🎓</span> Grades 1–12</div>

                <div className="flex items-center gap-2"><HiOutlineSparkles className="text-lg text-amber-400" /> AI-generated Artwork</div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 items-center mb-12 w-full sm:w-auto">
                <a href="#submit-entry" className="px-8 py-3.5 bg-amber-400 text-slate-950 font-bold rounded-full shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:bg-amber-300 hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm w-full sm:w-auto">
                  <FiEdit2 className="text-lg" /> Submit Your Entry <FiChevronRight className="stroke-[3] text-lg ml-2" />
                </a>
                <a href="#competition-info" className="px-8 py-3.5 bg-transparent border border-slate-600 text-white font-semibold rounded-full hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm w-full sm:w-auto">
                  Learn More
                </a>
              </div>

              {/* Footer Trust Marker */}
              <div className="flex justify-center lg:justify-start items-center gap-3 text-slate-400 text-sm font-medium w-full">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0"><FiCheck className="text-[10px] text-slate-300 stroke-[3]" /></div>
                Safe. Original. Creative. That's Kidrove.
              </div>
            </div>
            {/* Mobile Illustration Image (Hidden on Desktop) */}
            <div className="w-full lg:hidden relative mt-10">
              <img
                src="/assets/dubb.png"
                alt="Futuristic UAE AI Artwork"
                className="w-full aspect-square sm:aspect-video object-cover rounded-[2rem] shadow-2xl border border-slate-700/30"
              />
            </div>

          </div>

          {/* Middle Section: Imagine It... */}
          <div className="bg-[#0B101D] border border-slate-800 rounded-3xl p-8 mb-10 shadow-2xl relative overflow-hidden">
            {/* Glows */}
            <div className="absolute top-0 right-1/4 w-32 h-32 bg-blue-500/10 blur-[50px]" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-amber-500/10 blur-[50px]" />

            <div className="flex items-center gap-2 text-amber-400 font-bold text-lg mb-8 relative z-10">
              <HiOutlineSparkles /> Imagine it...
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center text-xs md:text-sm text-slate-300 relative z-10">
              <div className="flex flex-col items-center gap-3 border-r border-slate-700/50 pr-4 last:border-0 last:pr-0">
                <span className="text-4xl text-blue-400">🏙️</span>
                <p className="leading-snug">A futuristic city<br />with flying cars?</p>
              </div>
              <div className="flex flex-col items-center gap-3 border-r border-slate-700/50 pr-4 last:border-0 last:pr-0">
                <span className="text-4xl text-amber-400">🌴</span>
                <p className="leading-snug">A beautiful desert<br />under a sky full of stars?</p>
              </div>
              <div className="flex flex-col items-center gap-3 border-r border-slate-700/50 pr-4 last:border-0 last:pr-0">
                <span className="text-4xl">🌍</span>
                <p className="leading-snug">A place where every<br />culture comes together?</p>
              </div>
              <div className="flex flex-col items-center gap-3 border-r border-slate-700/50 pr-4 last:border-0 last:pr-0">
                <span className="text-4xl text-emerald-400">🍃</span>
                <p className="leading-snug">A greener, smarter<br />UAE of the future?</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="text-4xl text-rose-500">❤️</span>
                <p className="leading-snug">Or simply the UAE<br />that feels like home?</p>
              </div>
            </div>

            <div className="mt-10 text-center relative z-10">
              <p className="text-slate-200 font-medium text-lg">Now it is your turn to <span className="text-amber-400 font-bold">imagine it.</span></p>
            </div>
          </div>

          {/* Bottom Section: Highlights/Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
            {/* Win Medals */}
            <div className="bg-[#0B101D] border border-amber-500/50 rounded-3xl p-6 md:p-8 text-center shadow-[0_0_20px_rgba(245,158,11,0.15)] group hover:-translate-y-1 transition-transform relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
              <span className="text-6xl block mb-5 relative z-10 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">🏆</span>
              <h3 className="text-lg font-bold text-white mb-2 relative z-10">Win Medals</h3>
              <p className="text-amber-400 text-sm font-semibold mb-2 relative z-10">Gold, Silver or Bronze</p>
              <p className="text-slate-400 text-xs relative z-10">Medals for Top Performers</p>
            </div>

            {/* Get Certified */}
            <div className="bg-[#0B101D] border border-indigo-500/50 rounded-3xl p-6 md:p-8 text-center shadow-[0_0_20px_rgba(99,102,241,0.15)] group hover:-translate-y-1 transition-transform relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              <span className="text-6xl block mb-5 relative z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">📜</span>
              <h3 className="text-lg font-bold text-white mb-2 relative z-10">Get Certified</h3>
              <p className="text-yellow-400 text-sm font-semibold mb-2 relative z-10">Certificate of Participation</p>
              <p className="text-slate-400 text-xs relative z-10">For every student</p>
            </div>

            {/* Be Featured */}
            <div className="bg-[#0B101D] border border-pink-500/50 rounded-3xl p-6 md:p-8 text-center shadow-[0_0_20px_rgba(236,72,153,0.15)] group hover:-translate-y-1 transition-transform relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 to-transparent pointer-events-none" />
              <span className="text-6xl block mb-5 relative z-10 drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">🎨</span>
              <h3 className="text-lg font-bold text-white mb-2 relative z-10">Be Featured</h3>
              <p className="text-yellow-400 text-sm font-semibold mb-2 relative z-10">Public Gallery Exhibition</p>
              <p className="text-slate-400 text-xs relative z-10">Showcasing top talent</p>
            </div>

            {/* Open to All UAE Students */}
            <div className="bg-[#0B101D] border border-cyan-500/50 rounded-3xl p-6 md:p-8 text-center shadow-[0_0_20px_rgba(6,182,212,0.15)] group hover:-translate-y-1 transition-transform relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
              <span className="text-6xl block mb-5 relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">👩‍🎓</span>
              <h3 className="text-lg font-bold text-white mb-2 relative z-10">All UAE Students</h3>
              <p className="text-yellow-400 text-sm font-semibold mb-2 relative z-10">Grades 1–12</p>
              <p className="text-slate-400 text-xs relative z-10">Any UAE school</p>
            </div>
          </div>



        </div>
      </div>

      {/* ── Competition Guide — Vertical Layout ─────────────────────────────────────── */}
      <div id="competition-info" className="py-16 bg-[#0E1525] border-b border-slate-700/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center border border-blue-500/50 text-blue-400 font-extrabold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] mb-4 bg-blue-500/10">
              All the details
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Competition <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Guide</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm mb-8">Everything you need to know about the competition.</p>

            {/* Download Brochure Button */}
            <a
              href="/assets/Kidrove AI Art Competition.pdf"
              download="Kidrove_AI_Art_Competition_Brochure.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-full shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-500 hover:scale-105 transition-all text-sm"
            >
              <FiDownload className="text-lg" /> Download Full Brochure
            </a>
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
                <div className="inline-flex items-center justify-center border border-emerald-500/50 text-emerald-400 font-extrabold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.16em] mb-4 bg-emerald-500/10">
                  Educators & Guardians
                </div>
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
                    <span className={`text-xs font-extrabold tracking-wider uppercase text-center ${isActive ? 'text-amber-400' : isDone ? 'text-emerald-400' : 'text-slate-100'}`}>
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
                        className={`w-full bg-[#0B1220] border hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 placeholder-slate-400 transition-all outline-none text-sm resize-none ${wordCount(form.artworkDescription) > 100 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700/50'}`}
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
                            <input type="radio" name="usedMorePrompts" value={opt} checked={form.usedMorePrompts === opt} onChange={() => update('usedMorePrompts', opt)} className="w-4 h-4 rounded-full border-slate-400 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-900" />
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
                            <input type="radio" name="changesAfterGeneration" value={opt.value} checked={form.changesAfterGeneration === opt.value} onChange={() => update('changesAfterGeneration', opt.value)} className="w-4 h-4 rounded-full border-slate-400 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-900" />
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
                      Upload your finalized high-resolution artwork. Valid formats: <span className="text-white font-bold">JPG, JPEG, PNG</span>. Recommended maximum file size: <span className="text-white font-bold">1 MB</span>.
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
                          <p className="text-white text-sm font-semibold">Drag and drop your file here, or click to browse</p>
                          <p className="text-slate-300 text-xs mt-4">JPG, JPEG, PNG (Recommended Max 1MB)</p>
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

                {/* ── Step 6: Payment ──────────────────────────────────── */}
                {currentStep === 6 && (
                  <div className="bg-[#0B1220] border border-slate-700/40 rounded-3xl p-8 max-w-lg mx-auto mt-6" id="submit-entry">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                        <CreditCard className="w-8 h-8 text-amber-500" />
                      </div>
                      <h2 className="text-white text-xl font-bold mb-2">Entry Fee Payment</h2>
                      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        Please complete your AED 50.00 payment. You will be redirected to our secure Stripe payment page and brought back automatically once payment is confirmed.
                      </p>

                      <div className="w-full space-y-4">
                        <button
                          onClick={async () => {
                            const errs = validateStep(5, form);
                            if (errs.length) { setErrors(errs); setCurrentStep(5); return; }
                            if (!form.artwork) { setErrors(['Artwork file is missing — please go back and upload your artwork']); return; }
                            setErrors([]);
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

                              // Step 1: Save draft (uploads artwork, stores form data)
                              const draftResult = await competitionAPI.saveDraft(payload);
                              if (!draftResult.success) throw new Error('Failed to save entry. Please try again.');

                              const submissionId = draftResult.data.submissionId;

                              // Step 2: Create Stripe Checkout Session
                              const sessionResult = await competitionAPI.createCheckoutSession(submissionId);
                              if (!sessionResult.success || !sessionResult.data.sessionUrl) throw new Error('Failed to create payment session. Please try again.');

                              // Step 3: Redirect to Stripe (full page redirect so Stripe can redirect back)
                              window.location.href = sessionResult.data.sessionUrl;
                            } catch (err: any) {
                              const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
                              toast.error(msg);
                              setErrors([msg]);
                              setIsSubmitting(false);
                            }
                          }}
                          disabled={isSubmitting}
                          className="w-full py-4 bg-white hover:bg-gray-100 text-slate-900 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                        >
                          {isSubmitting ? (
                            <><span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> Preparing payment…</>
                          ) : (
                            'Pay AED 50.00 & Submit'
                          )}
                        </button>

                        {import.meta.env.DEV && (
                          <button
                            onClick={async () => {
                              const errs = validateStep(5, form);
                              if (errs.length) { setErrors(errs); setCurrentStep(5); return; }
                              if (!form.artwork) { setErrors(['Artwork file is missing — please go back and upload your artwork']); return; }
                              setErrors([]);
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

                                // Step 1: Save draft (uploads artwork, stores form data)
                                const draftResult = await competitionAPI.saveDraft(payload);
                                if (!draftResult.success) throw new Error('Failed to save entry. Please try again.');

                                const submissionId = draftResult.data.submissionId;

                                // Step 2: Bypass Stripe and redirect to success
                                window.location.href = `/ai-art-competition/payment-success?session_id=TEST_PAYMENT_SKIP&submission_id=${submissionId}`;
                              } catch (err: any) {
                                const msg = err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
                                toast.error(msg);
                                setErrors([msg]);
                                setIsSubmitting(false);
                              }
                            }}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                          >
                            {isSubmitting ? (
                              <><span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Processing...</>
                            ) : (
                              'Test Payment (Bypass Stripe)'
                            )}
                          </button>
                        )}

                        <button
                          onClick={handleBack}
                          disabled={isSubmitting}
                          className="w-full py-3 border border-slate-500 text-slate-300 hover:text-white hover:bg-slate-800 font-bold rounded-xl transition-all"
                        >
                          Back to Consent
                        </button>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-5">
                        You will be redirected to Stripe's secure payment page. Do not close your browser — you will be automatically returned here after payment.
                      </p>
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
            ) : currentStep === 5 ? (
              <button type="button" onClick={handleNext} disabled={isSubmitting} className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-955 text-sm font-black flex items-center gap-2 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  <>Proceed to Payment <FiCreditCard className="text-lg" /></>
                )}
              </button>
            ) : null}
          </div>
          <p className="text-center text-slate-500 text-xs mt-6 select-none">Step {currentStep} of {STEPS.length}</p>
        </div>
      </div>

      {/* ── WhatsApp Contact Card ────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 relative z-10 mt-2 mb-20 md:mb-28">
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:border-emerald-500/30 transition-colors group">
          <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-5">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <svg className="w-7 h-7 text-emerald-400" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1.5">Need help or have questions?</h3>
              <p className="text-slate-400 text-sm">Our support team is available on WhatsApp to assist you.</p>
            </div>
          </div>
          <a
            href="https://wa.me/971529881170"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-full transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 active:scale-95"
          >
            Message Us <FiChevronRight className="stroke-[3] text-lg" />
          </a>
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
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline font-bold">
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
        className="w-full bg-[#0B1220] border border-slate-700/50 hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 placeholder-slate-400 transition-all outline-none text-sm"
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
        className="w-full bg-[#0B1220] border border-slate-700/50 hover:border-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-4 py-3 cursor-pointer transition-all outline-none text-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%2522%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%2523f8fafc%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
      >
        <option value="" className="bg-slate-950 text-slate-300">{placeholder || `Select ${label}`}</option>
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
        : 'bg-slate-900/40 border-slate-400 text-slate-300 hover:border-slate-300 hover:text-white'
        }`}
    >
      <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${checked ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-[0_0_6px_rgba(245,158,11,0.2)]' : 'bg-slate-900 border-slate-400'}`}>
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
        : 'bg-[#0B1220] border-slate-500 text-slate-300 hover:border-slate-400 hover:text-white'
        }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${selected ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'border-slate-400 bg-transparent'}`} />
      <div>
        <div className={`font-bold text-sm mb-1 ${selected ? 'text-white' : 'text-slate-300'}`}>{label}</div>
        <div className="text-slate-500 text-xs leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
