import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  FaCamera,
  FaSave,
  FaMapMarkerAlt,
  FaCog,
  FaFileAlt,
  FaCreditCard,
  FaUniversity,
  FaSpinner,
  FaBuilding,
  FaShieldAlt,
  FaTrash,
  FaVideo,
  FaLanguage,
  FaPlay,
  FaGlobe,
  FaLinkedin,
  FaInstagram,
  FaYoutube,
  FaFacebook,
} from 'react-icons/fa';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import vendorAPI from '../../services/api/vendorAPI';
import { useDispatch } from 'react-redux';
import { updateUser } from '@/store/slices/authSlice';

import StripeConnectSetup from '../../components/vendor/StripeConnectSetup';
import BankDetailsForm from '../../components/vendor/BankDetailsForm';
import DocumentUpload from '../../components/vendor/DocumentUpload';
import BusinessHoursEditor from '../../components/vendor/BusinessHoursEditor';
import PhoneVerificationSection from '../../components/profile/PhoneVerificationSection';
import logger from '../../utils/logger';
import ErrorHandler from '../../utils/errorHandler';

/**
 * Extracts the real backend error reason (validation field message, or
 * server `message`) instead of showing a generic "Failed to X" toast that
 * hides why the save actually failed.
 */
const getErrorMessage = (error: unknown, fallback: string): string => {
  const { message } = ErrorHandler.handleApiError(error, { component: 'VendorProfilePage' });
  return message && message !== 'An unexpected error occurred' ? message : fallback;
};

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
  'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow placeholder-gray-400';

// Types
interface VendorProfile {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  isPhoneVerified?: boolean;
  description: string;
  logo: string;
  coverImage: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  website: string;
  profileVideoUrl?: string;
  videoDescription?: string;
  languagesSpoken?: string[];
  socialMedia: {
    facebook: string;
    instagram: string;
    twitter: string;
    youtube: string;
  };
  businessHours: Record<string, any>;
  contactPerson: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  verificationStatus: 'verified' | 'pending' | 'unverified' | 'rejected';
  memberSince: string;
  taxInformation: {
    taxId: string;
    businessType: string;
  };
  paymentMode?: string;
  stripeSettings?: any;
  commissionRate?: number;
  subscriptionStatus?: string;
  bankAccountDetails?: any;
  verificationDocuments?: any;
}

const VendorProfilePage: React.FC = () => {
  const dispatch = useDispatch();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('business');
  const [isSaving, setSaving] = useState(false);

  // Fetch vendor profile
  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const fetchVendorProfile = async () => {
    setIsLoading(true);
    try {
      const profileData = await vendorAPI.getVendorProfile();
      logger.debug('[VendorProfilePage] Raw profile data:', profileData);

      // Handle nested structure - API returns {vendor: {...}, user: {...}}
      const vendor = profileData.vendor || profileData;
      const user = profileData.user || profileData;

      const transformedProfile: VendorProfile = {
        id: vendor._id || vendor.id || '',
        businessName: vendor.businessName || vendor.name || '',
        email: vendor.email || user.email || '',
        phone: vendor.phone || user.phone || '',
        isPhoneVerified: user.isPhoneVerified || false,
        description: vendor.description || '',
        logo: vendor.logo || user.avatar || '',
        coverImage: vendor.coverImage || '',
        address: {
          street: vendor.address?.street || '',
          city: vendor.address?.city || '',
          state: vendor.address?.state || '',
          zipCode: vendor.address?.zipCode || '',
          country: vendor.address?.country || 'United States',
        },
        website: vendor.website || '',
        profileVideoUrl: vendor.profileVideoUrl || '',
        videoDescription: vendor.videoDescription || '',
        languagesSpoken: vendor.languagesSpoken || [],
        socialMedia: {
          facebook: vendor.socialMedia?.facebook || '',
          instagram: vendor.socialMedia?.instagram || '',
          twitter: vendor.socialMedia?.twitter || '',
          youtube: vendor.socialMedia?.youtube || '',
        },
        businessHours: vendor.businessHours || {},
        contactPerson: {
          name: vendor.contactPerson?.name || '',
          position: vendor.contactPerson?.position || '',
          email: vendor.contactPerson?.email || '',
          phone: vendor.contactPerson?.phone || '',
        },
        verificationStatus: vendor.verificationStatus || 'unverified',
        memberSince: vendor.memberSince || vendor.createdAt || new Date().toISOString(),
        taxInformation: {
          taxId: vendor.taxInformation?.taxId || '',
          businessType: vendor.taxInformation?.businessType || '',
        },
        paymentMode: vendor.paymentSettings?.paymentMode,
        stripeSettings: vendor.paymentSettings?.stripeSettings,
        commissionRate: vendor.paymentSettings?.commissionRate,
        subscriptionStatus: vendor.paymentSettings?.subscriptionStatus,
        bankAccountDetails: vendor.paymentSettings?.bankAccountDetails,
        verificationDocuments: vendor.verificationDocuments,
      };

      logger.debug('[VendorProfilePage] Transformed profile:', transformedProfile);
      setProfile(transformedProfile);
    } catch (error) {
      logger.error('Error fetching vendor profile:', error);
      toast.error(getErrorMessage(error, 'Failed to load profile'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
    try {
      const imageType = type === 'logo' ? 'logo' : 'coverImage';
      const response = await vendorAPI.uploadVendorImage(file, imageType);
      if (response?.logo || response?.coverImage) {
        setProfile(prev => prev ? {
          ...prev,
          logo: response.logo || prev.logo,
          coverImage: response.coverImage || prev.coverImage
        } : null);
        if (type === 'logo' && response.logo) {
          dispatch(updateUser({ avatar: response.logo }));
        }
        toast.success(`${type === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully`);
      }
    } catch (error: any) {
      logger.error(`Error uploading ${type}:`, error);
      toast.error(getErrorMessage(error, `Failed to upload ${type}`));
    }
  };

  const handleImageDelete = async (type: 'logo' | 'cover') => {
    try {
      const imageType = type === 'logo' ? 'logo' : 'coverImage';
      await vendorAPI.deleteVendorImage(imageType);
      
      setProfile(prev => prev ? {
        ...prev,
        [type === 'logo' ? 'logo' : 'coverImage']: ''
      } : null);
      
      if (type === 'logo') {
        dispatch(updateUser({ avatar: '' }));
      }
      
      toast.success(`${type === 'logo' ? 'Logo' : 'Cover image'} deleted successfully`);
    } catch (error: any) {
      logger.error(`Error deleting ${type}:`, error);
      toast.error(getErrorMessage(error, `Failed to delete ${type}`));
    }
  };

  const handleBasicInfoUpdate = async (data: Partial<VendorProfile>) => {
    setSaving(true);
    try {
      await vendorAPI.updateVendorProfile(data);
      setProfile(prev => prev ? { ...prev, ...data } : null);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      logger.error('Error updating profile:', error);
      toast.error(getErrorMessage(error, 'Failed to update profile'));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'business', label: 'Business Info', icon: <FaBuilding /> },
    { id: 'contact', label: 'Contact & Address', icon: <FaMapMarkerAlt /> },
    { id: 'details', label: 'Business Details', icon: <FaCog /> },
    { id: 'payments', label: 'Payment Settings', icon: <FaCreditCard /> },
    { id: 'bank', label: 'Bank Details', icon: <FaUniversity /> },
    { id: 'documents', label: 'Documents', icon: <FaFileAlt /> },
  ];

  if (isLoading) {
    return (
      <>

        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading vendor profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>

        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">Failed to load profile</p>
            <button
              onClick={fetchVendorProfile}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PrivatePageSEO title="Vendor - Profile | Kidrove" description="Manage your vendor profile" />
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* ── Hero Card ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Cover */}
            <div className="relative h-36 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 group">
              {profile.coverImage ? (
                <img
                  src={profile.coverImage}
                  alt="Cover"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
              <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {profile.coverImage && (
                  <button
                    type="button"
                    onClick={() => handleImageDelete('cover')}
                    className="p-1.5 bg-red-500 text-white rounded-lg cursor-pointer hover:bg-red-600 transition-colors shadow-sm"
                    title="Delete cover image"
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                )}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white rounded-lg cursor-pointer hover:bg-black/70 transition-colors text-xs font-medium shadow-sm">
                  <FaCamera className="w-3 h-3" />
                  Change cover
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')} />
                </label>
              </div>
            </div>

            {/* Avatar + Info */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="relative shrink-0 group">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-md overflow-hidden border-4 border-white ring-2 ring-blue-100">
                    {profile.logo ? (
                      <img
                        src={profile.logo}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
                        <FaBuilding size={32} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="p-1.5 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200">
                      <FaCamera className="w-3 h-3 text-gray-600" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')} />
                    </label>
                    {profile.logo && (
                      <button
                        type="button"
                        onClick={() => handleImageDelete('logo')}
                        className="p-1.5 bg-red-50 text-red-600 rounded-full shadow-md cursor-pointer hover:bg-red-100 transition-colors border border-red-100"
                        title="Delete logo"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Name & meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">
                      {profile.businessName || 'Your Business'}
                    </h1>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        profile.verificationStatus === 'verified'
                          ? 'bg-green-100 text-green-700'
                          : profile.verificationStatus === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <FaShieldAlt className="w-2.5 h-2.5" />
                      {profile.verificationStatus === 'verified'
                        ? 'Verified'
                        : profile.verificationStatus === 'pending'
                        ? 'Pending review'
                        : 'Unverified'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>Member since {new Date(profile.memberSince).getFullYear()}</span>
                    <span className="flex items-center gap-1">
                      {profile.email}
                    </span>
                    {profile.phone && (
                      <span className="flex items-center gap-1">
                        {profile.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tab Panel ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Tab bar */}
            <div className="border-b border-gray-200">
              {/* Mobile View */}
              <div className="sm:hidden p-4">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                >
                  {tabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Desktop View */}
              <div className="hidden sm:flex flex-wrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-3.5 h-3.5">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'business' && (
                  <BusinessInfoTab
                    profile={profile}
                    onUpdate={handleBasicInfoUpdate}
                    onImageUpload={handleImageUpload}
                    isLoading={isSaving}
                  />
                )}
                {activeTab === 'contact' && (
                  <ContactAddressTab
                    profile={profile}
                    onUpdate={handleBasicInfoUpdate}
                    isLoading={isSaving}
                    onRefresh={fetchVendorProfile}
                  />
                )}
                {activeTab === 'details' && (
                  <BusinessDetailsTab
                    profile={profile}
                    onUpdate={handleBasicInfoUpdate}
                    isLoading={isSaving}
                  />
                )}
                {activeTab === 'payments' && (
                  <PaymentSettingsTab profile={profile} isLoading={isSaving} onRefresh={fetchVendorProfile} />
                )}
                {activeTab === 'bank' && (
                  <BankDetailsTab profile={profile} />
                )}
                {activeTab === 'documents' && (
                  <DocumentsTab profile={profile} onRefresh={fetchVendorProfile} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Business Info Tab
const BusinessInfoTab: React.FC<{
  profile: VendorProfile;
  onUpdate: (data: Partial<VendorProfile>) => Promise<void>;
  onImageUpload: (file: File, type: 'logo' | 'cover') => Promise<void>;
  isLoading: boolean;
}> = ({ profile, onUpdate, onImageUpload: _onImageUpload, isLoading }) => {
  const [formData, setFormData] = useState({
    businessName: profile.businessName,
    description: profile.description,
    website: profile.website,
    profileVideoUrl: profile.profileVideoUrl || '',
    videoDescription: profile.videoDescription || '',
    languagesSpoken: profile.languagesSpoken || [],
  });
  const [videoLinkInput, setVideoLinkInput] = useState(profile.profileVideoUrl || '');

  // Tracks whether the user has made unsaved edits in this tab. Guards the
  // resync effect below so a background profile refresh (e.g. another tab's
  // save, or onRefresh from phone verification) never clobbers in-progress
  // edits here.
  const [isDirty, setIsDirty] = useState(false);
  const updateFormData = (updater: (prev: typeof formData) => typeof formData) => {
    setIsDirty(true);
    setFormData(updater);
  };

  // Resync local form state from the vendor profile on identity change
  // (e.g. switching accounts) — never on every profile object mutation,
  // and never while the user has unsaved edits.
  useEffect(() => {
    if (isDirty) return;
    setFormData({
      businessName: profile.businessName,
      description: profile.description,
      website: profile.website,
      profileVideoUrl: profile.profileVideoUrl || '',
      videoDescription: profile.videoDescription || '',
      languagesSpoken: profile.languagesSpoken || [],
    });
    setVideoLinkInput(profile.profileVideoUrl || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const AVAILABLE_LANGUAGES = [
    { value: 'English', label: 'English' },
    { value: 'Arabic', label: 'Arabic' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Urdu', label: 'Urdu' },
    { value: 'Malayalam', label: 'Malayalam' },
    { value: 'Tamil', label: 'Tamil' },
    { value: 'Tagalog', label: 'Tagalog' },
    { value: 'Bengali', label: 'Bengali' },
    { value: 'Persian', label: 'Persian' },
    { value: 'French', label: 'French' },
    { value: 'German', label: 'German' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'Chinese', label: 'Chinese' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Korean', label: 'Korean' },
    { value: 'Russian', label: 'Russian' },
    { value: 'Portuguese', label: 'Portuguese' },
    { value: 'Italian', label: 'Italian' },
    { value: 'Dutch', label: 'Dutch' },
    { value: 'Turkish', label: 'Turkish' },
    { value: 'Other', label: 'Other' },
  ];

  const handleVideoLink = () => {
    if (videoLinkInput) {
      updateFormData(prev => ({ ...prev, profileVideoUrl: videoLinkInput }));
    }
  };

  const clearVideo = () => {
    updateFormData(prev => ({ ...prev, profileVideoUrl: '' }));
    setVideoLinkInput('');
  };

  const toggleLanguage = (lang: string) => {
    updateFormData(prev => {
      const current = prev.languagesSpoken || [];
      if (current.includes(lang)) {
        return { ...prev, languagesSpoken: current.filter(l => l !== lang) };
      } else {
        return { ...prev, languagesSpoken: [...current, lang] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate(formData);
      setIsDirty(false);
    } catch {
      // Error toast already shown by the parent handler; keep local edits
      // so the user doesn't lose in-progress changes.
    }
  };

  return (
    <motion.div
      key="business"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FaBuilding className="w-3.5 h-3.5 text-blue-500" />
            Business Information
          </h3>
          <div className="space-y-4">
            <FieldGroup label="Business Name *">
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => updateFormData(prev => ({ ...prev, businessName: e.target.value }))}
                className={inputCls}
                required
              />
            </FieldGroup>

            <FieldGroup label="Description" hint="Tell us about your business...">
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className={`${inputCls} resize-none`}
              />
            </FieldGroup>

            <FieldGroup label="Website">
              <input
                type="url"
                value={formData.website}
                onChange={(e) => updateFormData(prev => ({ ...prev, website: e.target.value }))}
                className={inputCls}
                placeholder="https://example.com"
              />
            </FieldGroup>
          </div>
        </SectionCard>

        {/* ── Introduction Video ── */}
        <SectionCard>
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <FaVideo className="w-3.5 h-3.5 text-blue-500" />
            Introduction Video
          </h3>
          <p className="text-xs text-gray-400 mb-4">Add a short video to introduce your business. Paste a YouTube / Vimeo link.</p>

          {/* Link input — file upload isn't supported yet, so only link mode is offered */}
          <div className="flex gap-2 mb-4">
            <input
              type="url"
              value={videoLinkInput}
              onChange={(e) => setVideoLinkInput(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              className={inputCls}
            />
            <button
              type="button"
              onClick={handleVideoLink}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
            >
              Set Link
            </button>
          </div>

          {/* Current video preview */}
          {formData.profileVideoUrl && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Current Video</p>
                <button
                  type="button"
                  onClick={clearVideo}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  <FaTrash className="w-3 h-3" /> Remove
                </button>
              </div>
              {formData.profileVideoUrl.startsWith('blob:') || formData.profileVideoUrl.match(/\.(mp4|webm|ogg)/i) ? (
                <video
                  src={formData.profileVideoUrl}
                  controls
                  className="w-full max-h-48 rounded-xl bg-black"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FaPlay className="w-3 h-3 text-blue-600" />
                  </div>
                  <a
                    href={formData.profileVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline truncate"
                  >
                    {formData.profileVideoUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Get to know me better description */}
          <FieldGroup
            label='"About Our Business" description'
            hint="A short paragraph shown alongside your intro video on your public profile"
          >
            <textarea
              value={formData.videoDescription}
              onChange={(e) => updateFormData(prev => ({ ...prev, videoDescription: e.target.value }))}
              rows={3}
              placeholder="e.g. Learn more about what we do..."
              className={`${inputCls} resize-none`}
            />
          </FieldGroup>
        </SectionCard>

        {/* ── Languages Spoken ── */}
        <SectionCard>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FaLanguage className="w-3.5 h-3.5 text-blue-500" />
            Languages Spoken
          </h3>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => toggleLanguage(lang.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${(formData.languagesSpoken || []).includes(lang.value)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          {(formData.languagesSpoken || []).length > 0 && (
            <p className="text-xs text-gray-400 mt-3">
              {(formData.languagesSpoken || []).length} selected: {(formData.languagesSpoken || []).join(', ')}
            </p>
          )}
        </SectionCard>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? <><FaSpinner className="animate-spin" /> Saving...</> : <><FaSave /> Save Changes</>}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// Contact & Address Tab
const ContactAddressTab: React.FC<{
  profile: VendorProfile;
  onUpdate: (data: Partial<VendorProfile>) => Promise<void>;
  isLoading: boolean;
  onRefresh: () => void;
}> = ({ profile, onUpdate, isLoading, onRefresh }) => {
  const [formData, setFormData] = useState({
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    contactPerson: profile.contactPerson,
    socialMedia: profile.socialMedia,
  });

  // Same dirty-tracked resync as BusinessInfoTab — this tab stays mounted
  // through the phone-verification `onRefresh()` call below, so without the
  // dirty guard a background profile refresh would clobber unsaved edits.
  const [isDirty, setIsDirty] = useState(false);
  const updateFormData = (updater: (prev: typeof formData) => typeof formData) => {
    setIsDirty(true);
    setFormData(updater);
  };

  useEffect(() => {
    if (isDirty) return;
    setFormData({
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      contactPerson: profile.contactPerson,
      socialMedia: profile.socialMedia,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate(formData);
      setIsDirty(false);
    } catch {
      // Error toast already shown by the parent handler; keep local edits.
    }
  };

  const handleSendPhoneVerification = async (phone: string) => {
    try {
      await vendorAPI.sendPhoneVerificationOTP(phone);
      toast.success('Verification code sent to your phone');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send verification code');
      throw error;
    }
  };

  const handleVerifyPhone = async (otp: string) => {
    try {
      await vendorAPI.verifyPhoneOTP(otp);
      toast.success('Phone verified successfully');
      // Refresh profile to update phone verification status
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify phone');
      throw error;
    }
  };

  return (
    <motion.div
      key="contact"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FaShieldAlt className="w-3.5 h-3.5 text-blue-500" />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldGroup label="Email *">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData(prev => ({ ...prev, email: e.target.value }))}
                className={inputCls}
                required
              />
            </FieldGroup>

            <FieldGroup label="Phone *">
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData(prev => ({ ...prev, phone: e.target.value }))}
                className={inputCls}
                required
              />
            </FieldGroup>
          </div>

          <div className="mt-6">
            <PhoneVerificationSection
              phone={profile.phone}
              isPhoneVerified={profile.isPhoneVerified || false}
              onSendVerification={handleSendPhoneVerification}
              onVerifyPhone={handleVerifyPhone}
              onResendVerification={() => handleSendPhoneVerification(profile.phone)}
            />
          </div>
        </SectionCard>

        <SectionCard>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FaBuilding className="w-3.5 h-3.5 text-blue-500" />
            Business Address
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FieldGroup label="Street Address">
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => updateFormData(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
                  className={inputCls}
                />
              </FieldGroup>
            </div>
            <FieldGroup label="City">
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => updateFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                className={inputCls}
              />
            </FieldGroup>
            <FieldGroup label="State">
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) => updateFormData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                className={inputCls}
              />
            </FieldGroup>
            <FieldGroup label="Zip Code">
              <input
                type="text"
                value={formData.address.zipCode}
                onChange={(e) => updateFormData(prev => ({ ...prev, address: { ...prev.address, zipCode: e.target.value } }))}
                className={inputCls}
              />
            </FieldGroup>
            <FieldGroup label="Country">
              <input
                type="text"
                value={formData.address.country}
                onChange={(e) => updateFormData(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                className={inputCls}
              />
            </FieldGroup>
          </div>
        </SectionCard>

        <SectionCard>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FaGlobe className="w-3.5 h-3.5 text-blue-500" />
            Social Media
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'website', label: 'Website', icon: <FaGlobe className="w-4 h-4 text-gray-400" />, placeholder: 'https://yourwebsite.com' },
              { key: 'linkedin', label: 'LinkedIn', icon: <FaLinkedin className="w-4 h-4 text-blue-600" />, placeholder: 'https://linkedin.com/in/you' },
              { key: 'instagram', label: 'Instagram', icon: <FaInstagram className="w-4 h-4 text-pink-500" />, placeholder: 'https://instagram.com/you' },
              { key: 'youtube', label: 'YouTube', icon: <FaYoutube className="w-4 h-4 text-red-600" />, placeholder: 'https://youtube.com/@you' },
              { key: 'facebook', label: 'Facebook', icon: <FaFacebook className="w-4 h-4 text-blue-700" />, placeholder: 'https://facebook.com/yourpage' },
              { key: 'twitter', label: 'Twitter', icon: <FaGlobe className="w-4 h-4 text-blue-400" />, placeholder: 'https://twitter.com/you' },
            ].map((s) => (
              <div key={s.key}>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                  {s.icon}
                  {s.label}
                </label>
                <input
                  type="url"
                  value={formData.socialMedia[s.key as keyof typeof formData.socialMedia] as string || ''}
                  onChange={(e) => updateFormData(prev => ({
                    ...prev,
                    socialMedia: { ...prev.socialMedia, [s.key]: e.target.value }
                  }))}
                  className={inputCls}
                  placeholder={s.placeholder}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? <><FaSpinner className="animate-spin" /> Saving...</> : <><FaSave /> Save Changes</>}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// Business Details Tab
const BusinessDetailsTab: React.FC<{
  profile: VendorProfile;
  onUpdate: (data: Partial<VendorProfile>) => Promise<void>;
  isLoading: boolean;
}> = ({ profile, onUpdate, isLoading }) => {
  const [taxInfo, setTaxInfo] = useState(profile.taxInformation);

  const handleBusinessHoursSave = async (hours: any) => {
    await vendorAPI.updateBusinessHours(hours);
    toast.success('Business hours updated successfully');
  };

  const handleTaxInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({ taxInformation: taxInfo });
    } catch {
      // Error toast already shown by the parent handler.
    }
  };

  return (
    <motion.div
      key="details"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <SectionCard>
        <BusinessHoursEditor
          currentHours={profile.businessHours}
          onSave={handleBusinessHoursSave}
          isLoading={isLoading}
        />
      </SectionCard>

      <SectionCard>
        <form onSubmit={handleTaxInfoSave}>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FaBuilding className="w-3.5 h-3.5 text-blue-500" />
            Tax Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldGroup label="Tax ID / Business Registration">
              <input
                type="text"
                value={taxInfo.taxId}
                onChange={(e) => setTaxInfo(prev => ({ ...prev, taxId: e.target.value }))}
                className={inputCls}
              />
            </FieldGroup>
            <FieldGroup label="Business Type">
              <select
                value={taxInfo.businessType}
                onChange={(e) => setTaxInfo(prev => ({ ...prev, businessType: e.target.value }))}
                className={inputCls}
              >
                <option value="">Select Type</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="LLC">LLC</option>
                <option value="Corporation">Corporation</option>
                <option value="Partnership">Partnership</option>
              </select>
            </FieldGroup>
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? <><FaSpinner className="animate-spin" /> Saving...</> : <><FaSave /> Save Changes</>}
            </button>
          </div>
        </form>
      </SectionCard>
    </motion.div>
  );
};

// Payment Settings Tab
const PaymentSettingsTab: React.FC<{ profile: VendorProfile; isLoading?: boolean; onRefresh?: () => void }> = ({ profile }) => {
  const [stripeStatus, setStripeStatus] = useState<any>(undefined);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await vendorAPI.getStripeConnectStatus();
        if (!cancelled) setStripeStatus(data);
      } catch (error) {
        logger.error('Error fetching Stripe Connect status:', error);
      } finally {
        if (!cancelled) setIsLoadingStatus(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleStartOnboarding = async () => {
    return vendorAPI.initializeStripeOnboarding();
  };

  return (
    <motion.div
      key="payments"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <SectionCard>
        <StripeConnectSetup
          status={stripeStatus}
          isLoadingStatus={isLoadingStatus}
          onStartOnboarding={handleStartOnboarding}
        />
      </SectionCard>

      {profile.commissionRate !== undefined && (
        <SectionCard className="bg-blue-50/50">
          <h4 className="font-semibold text-gray-900 mb-2">Commission Rate</h4>
          <p className="text-3xl font-bold text-blue-600">{profile.commissionRate}%</p>
          <p className="text-sm text-gray-600 mt-1">Platform commission on each transaction</p>
        </SectionCard>
      )}
    </motion.div>
  );
};

// Bank Details Tab
const BankDetailsTab: React.FC<{ profile: VendorProfile }> = ({ profile }) => {
  const handleSaveBankDetails = async (details: any) => {
    try {
      await vendorAPI.updateBankDetails(details);
      toast.success('Bank details saved successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to save bank details'));
      throw error;
    }
  };

  return (
    <motion.div
      key="bank"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <SectionCard>
        <BankDetailsForm
          currentDetails={profile.bankAccountDetails}
          onSave={handleSaveBankDetails}
        />
      </SectionCard>
    </motion.div>
  );
};

// Documents Tab
const DocumentsTab: React.FC<{ profile: VendorProfile; onRefresh: () => void }> = ({ profile, onRefresh }) => {
  const handleUploadDocument = async (type: string, file: File) => {
    try {
      await vendorAPI.uploadDocument(type, file);
      toast.success('Document uploaded successfully');
      onRefresh(); // Refresh to get updated documents
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to upload document'));
      throw error;
    }
  };

  const handleDeleteDocument = async (type: string) => {
    try {
      await vendorAPI.deleteDocument(type);
      toast.success('Document deleted successfully');
      onRefresh(); // Refresh to get updated documents
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to delete document'));
      throw error;
    }
  };

  // verificationDocuments is stored as an object {businessLicense: {...}, ...}
  // DocumentUpload expects Document[] array
  const rawDocs = profile.verificationDocuments || {};
  const docTypes = ['businessLicense', 'taxCertificate', 'identityDocument'] as const;
  const documents = docTypes
    .filter(type => rawDocs[type as keyof typeof rawDocs]?.url)
    .map(type => ({ type, ...rawDocs[type as keyof typeof rawDocs] }));

  return (
    <motion.div
      key="documents"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <SectionCard>
        <DocumentUpload
          documents={documents as any}
          onUpload={handleUploadDocument}
          onDelete={handleDeleteDocument}
        />
      </SectionCard>
    </motion.div>
  );
};

export default VendorProfilePage;
