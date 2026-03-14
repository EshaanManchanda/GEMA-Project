import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  FaUser,
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
  FaTrash,
  FaCreditCard,
  FaUniversity,
  FaFileAlt,
} from 'react-icons/fa';
import { TeacherNavigation } from '@/components/teacher';
import BankDetailsForm from '@/components/vendor/BankDetailsForm';
import DocumentUpload from '@/components/vendor/DocumentUpload';
import StripeConnectSetup from '@/components/vendor/StripeConnectSetup';
import { useTeacherProfile } from '@/hooks/queries/useTeacherQuery';
import {
  useUpdateTeacherProfile,
  useUpdateAvailabilityHours,
} from '@/hooks/mutations/useTeacherMutations';
import type { TeacherProfileUpdateInput, IAvailabilityHours } from '@/types/teacher';
import authAPI from '@/services/api/authAPI';
import teacherAPI from '@/services/api/teacherAPI';

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
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'social' | 'availability' | 'payments' | 'bank' | 'documents'>(
    'personal'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local state for array fields
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [availability, setAvailability] = useState<IAvailabilityHours>({});
  
  // Image state
  const [profileImage, setProfileImage] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string>('');

  const { data, isLoading, refetch } = useTeacherProfile();
  const updateProfileMutation = useUpdateTeacherProfile();
  const updateAvailabilityMutation = useUpdateAvailabilityHours();

  const teacher = data?.teacher;
  const user = data?.user;

  const stripeSettings = teacher?.paymentSettings?.stripeSettings;
  const hasStripeKeys = !!stripeSettings?.stripePublishableKey || !!stripeSettings?.keysValid || !!stripeSettings?.lastValidated;
  const stripeStatus = stripeSettings
    ? {
        isConnected: hasStripeKeys,
        accountId: stripeSettings.stripeConnectAccountId,
        onboardingComplete: !!stripeSettings.stripeConnectOnboardingComplete,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: !!stripeSettings.stripeConnectOnboardingComplete,
        stripePublishableKey: stripeSettings.stripePublishableKey,
        stripeTestMode: stripeSettings.stripeTestMode,
        keysValid: stripeSettings.keysValid,
        lastValidated: stripeSettings.lastValidated,
        stripeSecretKey: hasStripeKeys ? '••••••••••••••••••••••••••••••••' : undefined,
      }
    : undefined;

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<TeacherProfileUpdateInput>();

  // Initialize form and local state when data loads
  useEffect(() => {
    if (teacher && user) {
      console.log('Initializing form with data:', { teacher, user });
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: teacher.bio || '',
        specialization: teacher.specialization || '',
        yearsOfExperience: teacher.yearsOfExperience || 0,
        socialLinks: teacher.socialLinks || {},
      });

      // Initialize local state
      setSubjects(teacher.subjects || []);
      setLanguages(teacher.languagesSpoken || []);
      setAvailability(teacher.availabilityHours || {});
      
      // Initialize images - user.avatar is the source of truth for profile image
      // Only update if the image URLs from server are different from current state
      const teacherProfileImage = user.avatar || teacher.profileImageUrl || teacher.profileImage || '';
      const teacherCoverImage = teacher.coverImageUrl || teacher.coverImage || '';
      
      console.log('Image initialization:', {
        profileFromServer: teacherProfileImage,
        coverFromServer: teacherCoverImage,
        userAvatar: user.avatar,
        teacherProfileImageUrl: teacher.profileImageUrl,
        teacherCoverImageUrl: teacher.coverImageUrl
      });
      
      setProfileImage(prev => {
        // Only update if server has a different URL or if we don't have one yet
        if (teacherProfileImage && teacherProfileImage !== prev) {
          console.log('Updating profile image:', prev, '->', teacherProfileImage);
          return teacherProfileImage;
        }
        return prev || teacherProfileImage;
      });
      
      setCoverImage(prev => {
        // Only update if server has a different URL or if we don't have one yet
        if (teacherCoverImage && teacherCoverImage !== prev) {
          console.log('Updating cover image:', prev, '->', teacherCoverImage);
          return teacherCoverImage;
        }
        return prev || teacherCoverImage;
      });
    }
  }, [teacher, user, reset]);

  const onSubmit = async (formData: TeacherProfileUpdateInput) => {
    setIsSaving(true);
    try {
      // Validate and sanitize data before sending
      const profileData: TeacherProfileUpdateInput = {
        firstName: formData.firstName?.trim() || undefined,
        lastName: formData.lastName?.trim() || undefined,
        ...formData,
        subjects: subjects && subjects.length > 0 ? subjects : undefined,
        languagesSpoken: languages && languages.length > 0 ? languages : undefined,
        yearsOfExperience: formData.yearsOfExperience ? Number(formData.yearsOfExperience) : undefined,
      };

      // Remove empty/undefined fields to avoid validation errors
      Object.keys(profileData).forEach(key => {
        if (profileData[key as keyof TeacherProfileUpdateInput] === undefined || 
            profileData[key as keyof TeacherProfileUpdateInput] === '' ||
            (Array.isArray(profileData[key as keyof TeacherProfileUpdateInput]) && (profileData[key as keyof TeacherProfileUpdateInput] as any[]).length === 0)) {
          delete profileData[key as keyof TeacherProfileUpdateInput];
        }
      });

      console.log('Submitting profile data:', profileData);

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
      console.error('Profile update error:', error);
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    try {
      const loadingToast = toast.loading('Uploading profile image...');
      const { avatarUrl } = await authAPI.uploadAvatar({ file });
      toast.dismiss(loadingToast);
      
      if (avatarUrl) {
        setProfileImage(avatarUrl);
        toast.success('Profile image uploaded successfully');
      }
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      toast.error('Failed to upload image');
    }
  };

  const handleProfileImageDelete = async () => {
    try {
      const loadingToast = toast.loading('Removing profile image...');
      await authAPI.removeAvatar();
      toast.dismiss(loadingToast);
      
      setProfileImage('');
      toast.success('Profile image removed successfully');
    } catch (error: any) {
      console.error('Error removing profile image:', error);
      toast.error('Failed to remove image');
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    try {
      const loadingToast = toast.loading('Uploading cover image...');
      const response = await teacherAPI.uploadCoverImage(file);
      toast.dismiss(loadingToast);
      
      console.log('Cover image upload response:', response);
      
      // Response is already extracted by extractApiData in uploadCoverImage
      const coverUrl = response?.coverImageUrl;
      
      if (coverUrl) {
        setCoverImage(coverUrl);
        refetch(); // Refetch to update all profile data
        toast.success('Cover image uploaded successfully');
      } else {
        console.warn('No coverImageUrl in response');
        toast.error('Failed to get cover image URL');
      }
    } catch (error: any) {
      console.error('Error uploading cover image:', error);
      toast.error(error?.response?.data?.message || 'Failed to upload cover image');
    }
  };

  const handleCoverImageDelete = async () => {
    try {
      const loadingToast = toast.loading('Removing cover image...');
      await teacherAPI.deleteCoverImage();
      toast.dismiss(loadingToast);
      
      setCoverImage('');
      refetch(); // Refetch to update all profile data
      toast.success('Cover image removed successfully');
    } catch (error: any) {
      console.error('Error removing cover image:', error);
      toast.error('Failed to remove cover image');
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

        {/* Profile Card with Cover Image */}
        <div className="relative rounded-3xl overflow-hidden mb-8 group">
          {/* Cover Image Background */}
          <div className="relative h-64 sm:h-80 md:h-96 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 overflow-hidden">
            {coverImage ? (
              <img 
                key={coverImage}
                src={coverImage} 
                alt="Cover" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Failed to load cover image:', coverImage);
                  // Optionally hide the broken image
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white transform translate-x-32 -translate-y-32"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white transform -translate-x-16 translate-y-16"></div>
                </div>
              </div>
            )}
            
            {/* Cover Image Controls */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
              <label className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors cursor-pointer">
                <FaCamera size={20} className="text-white" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleCoverImageUpload(e.target.files[0])}
                />
              </label>
              {coverImage && (
                <button
                  onClick={handleCoverImageDelete}
                  className="p-3 bg-red-500/60 rounded-full hover:bg-red-500/80 transition-colors"
                >
                  <FaTrash size={20} className="text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Profile Card with Avatar - overlapped on cover image */}
          <div className="relative px-8 pb-8 pt-0 bg-white rounded-b-3xl shadow-lg">
            <div className="flex flex-col md:flex-row items-start gap-8">
              {/* Avatar - positioned to overlap cover image */}
              <div className="relative group/avatar -mt-20">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-white border-4 border-white shadow-lg">
                  {profileImage ? (
                    <img 
                      key={profileImage}
                      src={profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Failed to load profile image:', profileImage);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                      <FaUser size={48} />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex gap-2">
                    <label className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors cursor-pointer">
                      <FaCamera size={16} className="text-white" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleProfileImageUpload(e.target.files[0])}
                      />
                    </label>
                    {profileImage && (
                      <button
                        onClick={handleProfileImageDelete}
                        className="p-2 bg-red-500/60 rounded-full hover:bg-red-500/80 transition-colors"
                      >
                        <FaTrash size={16} className="text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-left pt-4">
                <h1 className="text-3xl font-bold mb-2 text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h1>
                <p className="text-gray-600 mb-4">{user?.email}</p>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      teacher?.verificationStatus === 'verified'
                        ? 'bg-green-100 text-green-800'
                        : teacher?.verificationStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {teacher?.verificationStatus === 'verified' && 'Verified'}
                      {teacher?.verificationStatus === 'pending' && 'Pending'}
                      {teacher?.verificationStatus === 'unverified' && 'Unverified'}
                      {teacher?.verificationStatus === 'rejected' && 'Rejected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1">
                    Member since {teacher?.createdAt ? new Date(teacher.createdAt).getFullYear() : new Date().getFullYear()}
                  </div>
                </div>
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
                { key: 'payments', label: 'Payment Settings', icon: <FaCreditCard /> },
                { key: 'bank', label: 'Bank Details', icon: <FaUniversity /> },
                { key: 'documents', label: 'Documents', icon: <FaFileAlt /> },
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(onSubmit)(e);
            }}
            className="p-6"
          >
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
                      {...register('firstName', { required: false })}
                      defaultValue={user?.firstName || ''}
                      placeholder="First name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      {...register('lastName', { required: false })}
                      defaultValue={user?.lastName || ''}
                      placeholder="Last name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
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

            {/* Payment Settings Tab */}
            {activeTab === 'payments' && teacher && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
              >
                <StripeConnectSetup
                  currentStatus={stripeStatus}
                  onSaveApiKeys={async (pk, sk, tm) => {
                    try {
                      await teacherAPI.saveStripeApiKeys(pk, sk, tm);
                      toast.success('Stripe API keys saved successfully');
                      // Force immediate refetch with cache bypass
                      setTimeout(() => refetch(), 300);
                    } catch (error: any) {
                      console.error('Error saving stripe keys:', error);
                      const errorMsg = error.response?.data?.message || error.message || 'Failed to save Stripe API keys';
                      toast.error(errorMsg);
                    }
                  }}
                  onValidateKeys={async (pk, sk) => {
                    try {
                      const result = await teacherAPI.validateStripeApiKeys(pk, sk);
                      return result;
                    } catch (error: any) {
                      toast.error(error.response?.data?.message || 'Failed to validate Stripe API keys');
                      throw error;
                    }
                  }}
                  isLoading={isSaving}
                />
                {teacher.paymentSettings?.commissionRate !== undefined && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2">Commission Rate</h4>
                    <p className="text-3xl font-bold text-blue-600">{teacher.paymentSettings.commissionRate}%</p>
                    <p className="text-sm text-gray-600 mt-1">Platform commission on each transaction</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Bank Details Tab */}
            {activeTab === 'bank' && teacher && (
              <motion.div
                key="bank"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
              >
                <BankDetailsForm
                  currentDetails={{
                    accountHolderName: teacher.paymentSettings?.bankDetails?.accountHolderName || '',
                    bankName: teacher.paymentSettings?.bankDetails?.bankName || '',
                    accountNumber: teacher.paymentSettings?.bankDetails?.accountNumber || '',
                    iban: teacher.paymentSettings?.bankDetails?.iban,
                    swiftCode: teacher.paymentSettings?.bankDetails?.swiftCode,
                    country: teacher.paymentSettings?.bankDetails?.country || 'United States',
                  }}
                  onSave={async (details: any) => {
                    try {
                      await teacherAPI.updateBankDetails(details);
                      toast.success('Bank details saved successfully');
                      refetch();
                    } catch (error: any) {
                      toast.error('Failed to save bank details');
                      throw error;
                    }
                  }}
                />
              </motion.div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && teacher && (
              <motion.div
                key="documents"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
              >
                <DocumentUpload
                  documents={(() => {
                    const docsArray: any[] = [];
                    if (teacher.verificationDocuments && typeof teacher.verificationDocuments === 'object') {
                      ['businessLicense', 'taxCertificate', 'identityDocument'].forEach((type: string) => {
                        const doc = (teacher.verificationDocuments as any)[type];
                        if (doc) {
                          docsArray.push({
                            type: type as any,
                            url: doc.url,
                            status: doc.status || 'not_uploaded',
                            uploadedAt: doc.uploadedAt,
                            rejectionReason: doc.rejectionReason,
                          });
                        } else {
                          docsArray.push({
                            type: type as any,
                            status: 'not_uploaded',
                          });
                        }
                      });
                    } else {
                      docsArray.push(
                        { type: 'businessLicense' as const, status: 'not_uploaded' },
                        { type: 'taxCertificate' as const, status: 'not_uploaded' },
                        { type: 'identityDocument' as const, status: 'not_uploaded' }
                      );
                    }
                    return docsArray;
                  })()}
                  onUpload={async (type: string, file: File) => {
                    try {
                      await teacherAPI.uploadDocument(type, file);
                      toast.success('Document uploaded successfully');
                      refetch();
                    } catch (error: any) {
                      toast.error('Failed to upload document');
                      throw error;
                    }
                  }}
                  onDelete={async (type: string) => {
                    try {
                      await teacherAPI.deleteDocument(type);
                      toast.success('Document deleted successfully');
                      refetch();
                    } catch (error: any) {
                      toast.error('Failed to delete document');
                      throw error;
                    }
                  }}
                />
              </motion.div>
            )}

            {/* Save Button */}
            {['personal', 'professional', 'social', 'availability'].includes(activeTab) && (
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
