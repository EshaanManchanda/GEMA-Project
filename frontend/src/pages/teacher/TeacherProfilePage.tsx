import React, { useState, useEffect } from 'react';
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
} from 'react-icons/fa';
import { TeacherNavigation } from '@/components/teacher';
import { useTeacherProfile } from '@/hooks/queries/useTeacherQuery';
import {
  useUpdateTeacherProfile,
  useUploadTeacherMedia,
  useUpdateAvailabilityHours,
  useUpdateBankDetails,
} from '@/hooks/mutations/useTeacherMutations';
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

const TeacherProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'social' | 'availability' | 'payments'>(
    'personal'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Bank details state
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    iban: '',
    swiftCode: '',
  });
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Local state for array fields
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

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<TeacherProfileUpdateInput>();

  // Initialize form and local state when data loads
  useEffect(() => {
    if (teacher && user) {
      reset({
        bio: teacher.bio || '',
        specialization: teacher.specialization || '',
        yearsOfExperience: teacher.yearsOfExperience || 0,
        socialLinks: teacher.socialLinks || {},
      });

      // Initialize local state
      setSubjects(teacher.subjects || []);
      setLanguages(teacher.languagesSpoken || []);
      setAvailability(teacher.availabilityHours || {});
    }
  }, [teacher, user, reset]);

  const onSubmit = async (formData: TeacherProfileUpdateInput) => {
    setIsSaving(true);
    try {
      // Include array fields in submission
      const profileData: TeacherProfileUpdateInput = {
        ...formData,
        subjects,
        languagesSpoken: languages,
      };

      await updateProfileMutation.mutateAsync(profileData);

      // Update availability separately if changed
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
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to upload cover image');
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

  // Subject handlers
  const addSubject = () => {
    const subject = subjectInput.trim();
    if (subject && !subjects.includes(subject)) {
      setSubjects([...subjects, subject]);
      setSubjectInput('');
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter((s) => s !== subject));
  };

  // Language handlers
  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  // Availability handlers
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
        <TeacherNavigation />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <TeacherNavigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your teacher profile and settings</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 h-32 overflow-hidden">
            {teacher?.coverImage && (
              <img src={teacher.coverImage} alt="Cover" className="w-full h-full object-cover" />
            )}
            <label className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-lg cursor-pointer hover:bg-white/30 transition-colors text-sm font-medium">
              <FaCamera className="w-3 h-3" />
              Change Cover
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          </div>
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl bg-white shadow-lg overflow-hidden border-4 border-white">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-4xl font-bold">
                      {user?.firstName?.[0] || 'T'}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <FaCamera className="w-4 h-4 text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-gray-600">{teacher?.specialization || 'Teacher'}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <FaEnvelope className="w-4 h-4" />
                    {user?.email}
                  </span>
                  {user?.phone && (
                    <span className="flex items-center gap-1">
                      <FaPhone className="w-4 h-4" />
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Verification Badge */}
              <div className="md:ml-auto">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    teacher?.verificationStatus === 'verified'
                      ? 'bg-green-100 text-green-700'
                      : teacher?.verificationStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {teacher?.verificationStatus === 'verified'
                    ? 'Verified Teacher'
                    : teacher?.verificationStatus === 'pending'
                    ? 'Verification Pending'
                    : 'Not Verified'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {[
                { key: 'personal', label: 'Personal Info', icon: <FaUser /> },
                { key: 'professional', label: 'Professional', icon: <FaBriefcase /> },
                { key: 'social', label: 'Social Links', icon: <FaGlobe /> },
                { key: 'availability', label: 'Availability', icon: <FaClock /> },
                { key: 'payments', label: 'Payments', icon: <FaCreditCard /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.firstName}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Contact support to change your name</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.lastName}
                      disabled
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    {...register('bio')}
                    rows={4}
                    placeholder="Tell students about yourself..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Languages Spoken - Fixed with checkboxes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaLanguage className="inline w-4 h-4 mr-1" />
                      Languages Spoken
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_LANGUAGES.map((lang) => (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => toggleLanguage(lang.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            languages.includes(lang.value)
                              ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                    {languages.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Selected: {languages.join(', ')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      {...register('yearsOfExperience', { valueAsNumber: true })}
                      min="0"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Professional Tab */}
            {activeTab === 'professional' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FaGraduationCap className="inline w-4 h-4 mr-1" />
                    Specialization
                  </label>
                  <input
                    type="text"
                    {...register('specialization')}
                    placeholder="e.g., Mathematics, Music, Programming"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Subjects - Fixed with tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subjects You Teach
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {subjects.map((subject) => (
                      <span
                        key={subject}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {subject}
                        <button
                          type="button"
                          onClick={() => removeSubject(subject)}
                          className="hover:text-purple-900 ml-1"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
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
                      placeholder="Type a subject and press Enter"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={addSubject}
                      className="px-4 py-3 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    e.g., Algebra, Calculus, Piano, Painting
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Education & Qualifications
                  </label>
                  <div className="space-y-4">
                    {teacher?.education?.map((edu, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="font-medium">{edu.degree}</p>
                        <p className="text-sm text-gray-600">
                          {edu.institution} - {edu.year}
                        </p>
                      </div>
                    ))}
                    {(!teacher?.education || teacher.education.length === 0) && (
                      <p className="text-gray-500 text-sm">
                        No qualifications added yet. Contact support to add qualifications.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Social Links Tab */}
            {activeTab === 'social' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaGlobe className="inline w-4 h-4 mr-1" />
                      Website
                    </label>
                    <input
                      type="url"
                      {...register('socialLinks.website')}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaLinkedin className="inline w-4 h-4 mr-1 text-blue-600" />
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      {...register('socialLinks.linkedin')}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaInstagram className="inline w-4 h-4 mr-1 text-pink-600" />
                      Instagram
                    </label>
                    <input
                      type="url"
                      {...register('socialLinks.instagram')}
                      placeholder="https://instagram.com/yourprofile"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaYoutube className="inline w-4 h-4 mr-1 text-red-600" />
                      YouTube
                    </label>
                    <input
                      type="url"
                      {...register('socialLinks.youtube')}
                      placeholder="https://youtube.com/@yourchannel"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaFacebook className="inline w-4 h-4 mr-1 text-blue-700" />
                      Facebook
                    </label>
                    <input
                      type="url"
                      {...register('socialLinks.facebook')}
                      placeholder="https://facebook.com/yourpage"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Portfolio
                    </label>
                    <input
                      type="url"
                      {...register('socialLinks.portfolio')}
                      placeholder="https://yourportfolio.com"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Availability Tab - Fixed with controlled inputs */}
            {activeTab === 'availability' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <p className="text-gray-600">
                  Set your weekly availability to let students know when you're available for classes.
                </p>

                <div className="space-y-4">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayAvailability = availability[day] || {
                      isAvailable: false,
                      startTime: '09:00',
                      endTime: '17:00',
                    };

                    return (
                      <div key={day} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-28">
                          <span className="font-medium capitalize">{day}</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dayAvailability.isAvailable}
                            onChange={(e) =>
                              updateDayAvailability(day, 'isAvailable', e.target.checked)
                            }
                            className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-600">Available</span>
                        </label>
                        <div className="flex items-center gap-2 ml-auto">
                          <input
                            type="time"
                            value={dayAvailability.startTime || '09:00'}
                            onChange={(e) =>
                              updateDayAvailability(day, 'startTime', e.target.value)
                            }
                            disabled={!dayAvailability.isAvailable}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={dayAvailability.endTime || '17:00'}
                            onChange={(e) => updateDayAvailability(day, 'endTime', e.target.value)}
                            disabled={!dayAvailability.isAvailable}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FaUniversity className="text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
                </div>
                <p className="text-gray-500 text-sm">
                  Add your bank account details to receive payouts for your classes.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountHolderName}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                      placeholder="Full name as on bank account"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                      placeholder="e.g., Emirates NBD"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                      placeholder="Bank account number"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={bankDetails.iban}
                      onChange={(e) => setBankDetails({ ...bankDetails, iban: e.target.value })}
                      placeholder="AE070331234567890123456"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SWIFT / BIC Code
                    </label>
                    <input
                      type="text"
                      value={bankDetails.swiftCode}
                      onChange={(e) => setBankDetails({ ...bankDetails, swiftCode: e.target.value })}
                      placeholder="e.g., EBILAEAD"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleSaveBankDetails}
                    disabled={isSavingBank}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    <FaSave className="w-4 h-4" />
                    {isSavingBank ? 'Saving...' : 'Save Bank Details'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Save Button (hidden on Payments tab which has its own save) */}
            {activeTab !== 'payments' && (
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                {saveSuccess && (
                  <span className="text-green-600 font-medium">Profile saved successfully!</span>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <FaSave className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
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
