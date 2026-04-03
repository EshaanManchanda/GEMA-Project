import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaLinkedin,
  FaInstagram,
  FaYoutube,
  FaFacebook,
  FaSave,
  FaCamera,
  FaGraduationCap,
  FaClock,
  FaLanguage,
  FaBriefcase,
  FaTimes,
  FaCreditCard,
  FaUniversity,
  FaStar,
  FaChalkboardTeacher,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
} from 'react-icons/fa';
import { TeacherNavigation } from '@/components/teacher';
import { useTeacherProfile } from '@/hooks/queries/useTeacherQuery';
import {
  useUpdateTeacherProfile,
  useUploadTeacherMedia,
  useUpdateAvailabilityHours,
  useUpdateBankDetails,
} from '@/hooks/mutations/useTeacherMutations';
import teacherAPI from '@/services/api/teacherAPI';
import type { TeacherProfileUpdateInput, IAvailabilityHours } from '@/types/teacher';

const AVAILABLE_LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'urdu', label: 'Urdu' },
  { value: 'malayalam', label: 'Malayalam' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'tagalog', label: 'Tagalog' },
  { value: 'bengali', label: 'Bengali' },
  { value: 'persian', label: 'Persian' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'russian', label: 'Russian' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'italian', label: 'Italian' },
  { value: 'dutch', label: 'Dutch' },
  { value: 'turkish', label: 'Turkish' },
  { value: 'other', label: 'Other' },
];

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`bg-gray-50 border border-gray-200 rounded-2xl p-6 ${className}`}>
    {children}
  </div>
);

const FieldGroup: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
  </div>
);

const inputCls =
  'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow placeholder-gray-400';

const disabledInputCls =
  'w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed';

const TeacherProfilePage: React.FC = () => {
  const location = useLocation();
  const didApplyTab = useRef(false);
  const [activeTab, setActiveTab] = useState<
    'personal' | 'professional' | 'social' | 'availability' | 'payments'
  >('personal');

  useEffect(() => {
    if (!didApplyTab.current && location.state?.tab) {
      setActiveTab(location.state.tab);
      didApplyTab.current = true;
    }
  }, [location.state]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showStripeKey, setShowStripeKey] = useState(false);

  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    iban: '',
    swiftCode: '',
  });
  const [isSavingBank, setIsSavingBank] = useState(false);

  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeTestMode, setStripeTestMode] = useState(true);
  const [isSavingStripe, setIsSavingStripe] = useState(false);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [availability, setAvailability] = useState<IAvailabilityHours>({});

  const { data, isLoading, refetch } = useTeacherProfile();
  const updateProfileMutation = useUpdateTeacherProfile();
  const uploadMediaMutation = useUploadTeacherMedia();
  const updateAvailabilityMutation = useUpdateAvailabilityHours();
  const updateBankDetailsMutation = useUpdateBankDetails();

  const teacher = data?.teacher;
  const user = data?.user;

  const { register, handleSubmit, reset } = useForm<TeacherProfileUpdateInput>();

  useEffect(() => {
    if (teacher && user) {
      reset({
        bio: teacher.bio || '',
        specialization: teacher.specialization || '',
        yearsOfExperience: teacher.yearsOfExperience || 0,
        socialLinks: teacher.socialLinks || {},
      });
      setSubjects(teacher.subjects || []);
      setLanguages(teacher.languagesSpoken || []);
      setAvailability(teacher.availabilityHours || {});
    }
  }, [teacher, user, reset]);

  const onSubmit = async (formData: TeacherProfileUpdateInput) => {
    setIsSaving(true);
    try {
      const profileData: TeacherProfileUpdateInput = {
        ...formData,
        subjects,
        languagesSpoken: languages,
      };
      await updateProfileMutation.mutateAsync(profileData);
      if (Object.keys(availability).length > 0) {
        await updateAvailabilityMutation.mutateAsync(availability);
      }
      toast.success('Profile updated successfully!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadMediaMutation.mutateAsync({ file, mediaType: 'profile' });
      toast.success('Profile image updated!');
      refetch();
    } catch {
      toast.error('Failed to upload image');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadMediaMutation.mutateAsync({ file, mediaType: 'cover' as any });
      toast.success('Cover image updated!');
      refetch();
    } catch {
      toast.error('Failed to upload cover image');
    }
  };

  const handleSaveStripeKey = async () => {
    if (!stripeSecretKey.trim()) {
      toast.error('Please enter your Stripe secret key');
      return;
    }
    if (!stripeSecretKey.startsWith('sk_')) {
      toast.error('Invalid Stripe key — must start with sk_');
      return;
    }
    setIsSavingStripe(true);
    try {
      await teacherAPI.saveStripeApiKeys(stripeSecretKey, stripeTestMode);
      toast.success('Stripe key saved!');
      setStripeSecretKey('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save Stripe key');
    } finally {
      setIsSavingStripe(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!bankDetails.accountHolderName.trim() || !bankDetails.bankName.trim()) {
      toast.error('Account holder name and bank name are required');
      return;
    }
    setIsSavingBank(true);
    try {
      await updateBankDetailsMutation.mutateAsync({
        accountHolderName: bankDetails.accountHolderName,
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber || undefined,
        iban: bankDetails.iban || undefined,
        swiftCode: bankDetails.swiftCode || undefined,
      });
      toast.success('Bank details saved!');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save bank details');
    } finally {
      setIsSavingBank(false);
    }
  };

  const addSubject = () => {
    const subject = subjectInput.trim();
    if (subject && !subjects.includes(subject)) {
      setSubjects([...subjects, subject]);
      setSubjectInput('');
    }
  };

  const removeSubject = (subject: string) =>
    setSubjects(subjects.filter((s) => s !== subject));

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const updateDayAvailability = (
    day: string,
    field: 'isAvailable' | 'startTime' | 'endTime',
    value: boolean | string
  ) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || { isAvailable: false, startTime: '09:00', endTime: '17:00' }),
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherNavigation />
        <div className="flex items-center justify-center py-40">
          <div className="text-center space-y-3">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-500">Loading your profile…</p>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: 'personal', label: 'Personal', icon: <FaUser className="w-3.5 h-3.5" /> },
    { key: 'professional', label: 'Professional', icon: <FaBriefcase className="w-3.5 h-3.5" /> },
    { key: 'social', label: 'Social Links', icon: <FaGlobe className="w-3.5 h-3.5" /> },
    { key: 'availability', label: 'Availability', icon: <FaClock className="w-3.5 h-3.5" /> },
    { key: 'payments', label: 'Payments', icon: <FaCreditCard className="w-3.5 h-3.5" /> },
  ] as const;

  const verificationStatus = teacher?.verificationStatus;

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherNavigation />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Hero Card ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Cover */}
          <div className="relative h-36 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600">
            {teacher?.coverImage && (
              <img
                src={teacher.coverImage}
                alt="Cover"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/10" />
            <label className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/30 backdrop-blur-sm text-white rounded-lg cursor-pointer hover:bg-black/50 transition-colors text-xs font-medium">
              <FaCamera className="w-3 h-3" />
              Change cover
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          </div>

          {/* Avatar + Info — sits entirely below the cover, no overlap */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-md overflow-hidden border-4 border-white ring-2 ring-purple-100">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
                      {user?.firstName?.[0]?.toUpperCase() || 'T'}
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200">
                  <FaCamera className="w-3 h-3 text-gray-600" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              {/* Name & meta */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      verificationStatus === 'verified'
                        ? 'bg-green-100 text-green-700'
                        : verificationStatus === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <FaShieldAlt className="w-2.5 h-2.5" />
                    {verificationStatus === 'verified'
                      ? 'Verified'
                      : verificationStatus === 'pending'
                      ? 'Pending review'
                      : 'Unverified'}
                  </span>
                </div>
                <p className="text-sm text-purple-600 font-medium mt-0.5">
                  {teacher?.specialization || 'Teacher'}
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FaEnvelope className="w-3 h-3" />
                    {user?.email}
                  </span>
                  {user?.phone && (
                    <span className="flex items-center gap-1">
                      <FaPhone className="w-3 h-3" />
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
              {[
                {
                  icon: <FaChalkboardTeacher className="w-4 h-4 text-purple-500" />,
                  label: 'Classes',
                  value: teacher?.stats?.totalClasses ?? 0,
                },
                {
                  icon: <FaStar className="w-4 h-4 text-amber-400" />,
                  label: 'Rating',
                  value: teacher?.stats?.averageRating
                    ? teacher.stats.averageRating.toFixed(1)
                    : '—',
                },
                {
                  icon: <FaBriefcase className="w-4 h-4 text-indigo-500" />,
                  label: 'Experience',
                  value: teacher?.yearsOfExperience
                    ? `${teacher.yearsOfExperience}y`
                    : '—',
                },
                {
                  icon: <FaUser className="w-4 h-4 text-green-500" />,
                  label: 'Students',
                  value: teacher?.stats?.totalStudents ?? 0,
                  hideOnMobile: true,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`flex flex-col items-center gap-1 ${
                    (stat as any).hideOnMobile ? 'hidden sm:flex' : ''
                  }`}
                >
                  {stat.icon}
                  <span className="text-lg font-bold text-gray-900">{stat.value}</span>
                  <span className="text-xs text-gray-400">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab Panel ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab bar */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex min-w-max">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6">

            {/* ── Personal Tab ── */}
            {activeTab === 'personal' && (
              <motion.div
                key="personal"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <SectionCard>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <FaUser className="w-3.5 h-3.5 text-purple-500" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup label="First Name" hint="Contact support to change your name">
                      <input
                        type="text"
                        defaultValue={user?.firstName}
                        disabled
                        className={disabledInputCls}
                      />
                    </FieldGroup>
                    <FieldGroup label="Last Name">
                      <input
                        type="text"
                        defaultValue={user?.lastName}
                        disabled
                        className={disabledInputCls}
                      />
                    </FieldGroup>
                  </div>
                </SectionCard>

                <SectionCard>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <FaGraduationCap className="w-3.5 h-3.5 text-purple-500" />
                    About You
                  </h3>
                  <div className="space-y-4">
                    <FieldGroup label="Bio" hint="Shown publicly on your teacher profile">
                      <textarea
                        {...register('bio')}
                        rows={4}
                        placeholder="Tell students about yourself, your teaching style, and your experience…"
                        className={inputCls}
                      />
                    </FieldGroup>
                    <FieldGroup label="Years of Experience">
                      <input
                        type="number"
                        {...register('yearsOfExperience', { valueAsNumber: true })}
                        min="0"
                        className={`${inputCls} max-w-xs`}
                      />
                    </FieldGroup>
                  </div>
                </SectionCard>

                <SectionCard>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <FaLanguage className="w-3.5 h-3.5 text-purple-500" />
                    Languages Spoken
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => toggleLanguage(lang.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          languages.includes(lang.value)
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                  {languages.length > 0 && (
                    <p className="text-xs text-gray-400 mt-3">
                      {languages.length} selected: {languages.join(', ')}
                    </p>
                  )}
                </SectionCard>
              </motion.div>
            )}

            {/* ── Professional Tab ── */}
            {activeTab === 'professional' && (
              <motion.div
                key="professional"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <SectionCard>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <FaBriefcase className="w-3.5 h-3.5 text-purple-500" />
                    Expertise
                  </h3>
                  <FieldGroup
                    label="Specialization"
                    hint="Your primary area of teaching expertise"
                  >
                    <input
                      type="text"
                      {...register('specialization')}
                      placeholder="e.g., Mathematics, Music, Programming"
                      className={inputCls}
                    />
                  </FieldGroup>
                </SectionCard>

                <SectionCard>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <FaChalkboardTeacher className="w-3.5 h-3.5 text-purple-500" />
                    Subjects You Teach
                  </h3>
                  {subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {subjects.map((subject) => (
                        <span
                          key={subject}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-sm font-medium"
                        >
                          {subject}
                          <button
                            type="button"
                            onClick={() => removeSubject(subject)}
                            className="text-purple-400 hover:text-purple-700 transition-colors"
                          >
                            <FaTimes className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSubject();
                        }
                      }}
                      placeholder="Type a subject and press Enter or Add"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={addSubject}
                      className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium text-sm whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">e.g., Algebra, Calculus, Piano, Painting</p>
                </SectionCard>

                <SectionCard>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <FaGraduationCap className="w-3.5 h-3.5 text-purple-500" />
                    Education & Qualifications
                  </h3>
                  {teacher?.education && teacher.education.length > 0 ? (
                    <div className="space-y-3">
                      {teacher.education.map((edu, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl"
                        >
                          <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                            <FaGraduationCap className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{edu.degree}</p>
                            <p className="text-xs text-gray-500">
                              {edu.institution} · {edu.year}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-gray-400">
                      No qualifications added yet.{' '}
                      <span className="text-purple-600">Contact support</span> to add them.
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}

            {/* ── Social Tab ── */}
            {activeTab === 'social' && (
              <motion.div
                key="social"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <SectionCard>
                  <h3 className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
                    <FaGlobe className="w-3.5 h-3.5 text-purple-500" />
                    Social & Web Presence
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        key: 'website',
                        label: 'Website',
                        icon: <FaGlobe className="w-4 h-4 text-gray-400" />,
                        placeholder: 'https://yourwebsite.com',
                      },
                      {
                        key: 'linkedin',
                        label: 'LinkedIn',
                        icon: <FaLinkedin className="w-4 h-4 text-blue-600" />,
                        placeholder: 'https://linkedin.com/in/you',
                      },
                      {
                        key: 'instagram',
                        label: 'Instagram',
                        icon: <FaInstagram className="w-4 h-4 text-pink-500" />,
                        placeholder: 'https://instagram.com/you',
                      },
                      {
                        key: 'youtube',
                        label: 'YouTube',
                        icon: <FaYoutube className="w-4 h-4 text-red-600" />,
                        placeholder: 'https://youtube.com/@you',
                      },
                      {
                        key: 'facebook',
                        label: 'Facebook',
                        icon: <FaFacebook className="w-4 h-4 text-blue-700" />,
                        placeholder: 'https://facebook.com/yourpage',
                      },
                      {
                        key: 'portfolio',
                        label: 'Portfolio',
                        icon: <FaGlobe className="w-4 h-4 text-gray-400" />,
                        placeholder: 'https://yourportfolio.com',
                      },
                    ].map((s) => (
                      <div key={s.key}>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                          {s.icon}
                          {s.label}
                        </label>
                        <input
                          type="url"
                          {...register(`socialLinks.${s.key}` as any)}
                          placeholder={s.placeholder}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ── Availability Tab ── */}
            {activeTab === 'availability' && (
              <motion.div
                key="availability"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <SectionCard>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                    <FaClock className="w-3.5 h-3.5 text-purple-500" />
                    Weekly Availability
                  </h3>
                  <p className="text-xs text-gray-400 mb-5">
                    Let students know when you're available for classes.
                  </p>
                  <div className="space-y-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayData = availability[day] || {
                        isAvailable: false,
                        startTime: '09:00',
                        endTime: '17:00',
                      };
                      return (
                        <div
                          key={day}
                          className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                            dayData.isAvailable
                              ? 'bg-purple-50 border-purple-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="w-24 shrink-0">
                            <span className="text-sm font-medium capitalize text-gray-700">{day}</span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={dayData.isAvailable}
                              onChange={(e) =>
                                updateDayAvailability(day, 'isAvailable', e.target.checked)
                              }
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-xs text-gray-500">Open</span>
                          </label>
                          <div className="flex items-center gap-2 ml-auto">
                            <input
                              type="time"
                              value={dayData.startTime || '09:00'}
                              onChange={(e) =>
                                updateDayAvailability(day, 'startTime', e.target.value)
                              }
                              disabled={!dayData.isAvailable}
                              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            />
                            <span className="text-xs text-gray-400">–</span>
                            <input
                              type="time"
                              value={dayData.endTime || '17:00'}
                              onChange={(e) =>
                                updateDayAvailability(day, 'endTime', e.target.value)
                              }
                              disabled={!dayData.isAvailable}
                              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ── Payments Tab ── */}
            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Bank Details */}
                <SectionCard>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                    <FaUniversity className="w-3.5 h-3.5 text-purple-500" />
                    Bank Details
                  </h3>
                  <p className="text-xs text-gray-400 mb-5">
                    Your bank account details for receiving payouts.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup label="Account Holder Name *">
                      <input
                        type="text"
                        value={bankDetails.accountHolderName}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, accountHolderName: e.target.value })
                        }
                        placeholder="Full name as on bank account"
                        className={inputCls}
                      />
                    </FieldGroup>
                    <FieldGroup label="Bank Name *">
                      <input
                        type="text"
                        value={bankDetails.bankName}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, bankName: e.target.value })
                        }
                        placeholder="e.g., Emirates NBD"
                        className={inputCls}
                      />
                    </FieldGroup>
                    <FieldGroup label="Account Number">
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, accountNumber: e.target.value })
                        }
                        placeholder="Bank account number"
                        className={inputCls}
                      />
                    </FieldGroup>
                    <FieldGroup label="IBAN">
                      <input
                        type="text"
                        value={bankDetails.iban}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, iban: e.target.value })
                        }
                        placeholder="AE070331234567890123456"
                        className={inputCls}
                      />
                    </FieldGroup>
                    <FieldGroup label="SWIFT / BIC Code">
                      <input
                        type="text"
                        value={bankDetails.swiftCode}
                        onChange={(e) =>
                          setBankDetails({ ...bankDetails, swiftCode: e.target.value })
                        }
                        placeholder="e.g., EBILAEAD"
                        className={inputCls}
                      />
                    </FieldGroup>
                  </div>
                  <div className="flex justify-end mt-5">
                    <button
                      type="button"
                      onClick={handleSaveBankDetails}
                      disabled={isSavingBank}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      <FaSave className="w-3.5 h-3.5" />
                      {isSavingBank ? 'Saving…' : 'Save Bank Details'}
                    </button>
                  </div>
                </SectionCard>

                {/* Stripe Integration */}
                <SectionCard>
                  <div className="flex items-start gap-3 mb-5">
                    <div className="p-2 bg-indigo-100 rounded-xl shrink-0 mt-0.5">
                      <FaCreditCard className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700">Stripe Integration</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Enter your Stripe secret key to process card payments for your events.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FieldGroup label="Stripe Secret Key">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <FaLock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type={showStripeKey ? 'text' : 'password'}
                          value={stripeSecretKey}
                          onChange={(e) => setStripeSecretKey(e.target.value)}
                          placeholder="sk_test_… or sk_live_…"
                          className="w-full pl-9 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStripeKey((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showStripeKey ? (
                            <FaEyeSlash className="w-4 h-4" />
                          ) : (
                            <FaEye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </FieldGroup>

                    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Test mode</p>
                        <p className="text-xs text-gray-400">
                          Use <code className="bg-gray-100 px-1 rounded">sk_test_…</code> keys only
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStripeTestMode((v) => !v)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          stripeTestMode ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            stripeTestMode ? 'translate-x-[18px]' : 'translate-x-[2px]'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-700">
                        <strong>Security:</strong> Your key is stored encrypted and never exposed to
                        students. Only use secret keys, not publishable keys.
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveStripeKey}
                        disabled={isSavingStripe}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        <FaSave className="w-3.5 h-3.5" />
                        {isSavingStripe ? 'Saving…' : 'Save Stripe Key'}
                      </button>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* Global save (non-payments tabs) */}
            {activeTab !== 'payments' && (
              <div className="flex items-center justify-end gap-4 mt-6 pt-5 border-t border-gray-100">
                {saveSuccess && (
                  <span className="text-sm text-green-600 font-medium">Saved successfully!</span>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  <FaSave className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfilePage;
