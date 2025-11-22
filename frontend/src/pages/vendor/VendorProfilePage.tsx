import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  FaUser,
  FaCamera,
  FaSave,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCog,
  FaFileAlt,
  FaCreditCard,
  FaUniversity,
  FaSpinner,
  FaTrash,
  FaCheck,
  FaBuilding,
  FaClock,
} from 'react-icons/fa';
import vendorAPI from '../../services/api/vendorAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';
import StripeConnectSetup from '../../components/vendor/StripeConnectSetup';
import BankDetailsForm from '../../components/vendor/BankDetailsForm';
import DocumentUpload from '../../components/vendor/DocumentUpload';
import BusinessHoursEditor from '../../components/vendor/BusinessHoursEditor';
import PhoneVerificationSection from '../../components/profile/PhoneVerificationSection';

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
      console.log('[VendorProfilePage] Raw profile data:', profileData);

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
        logo: vendor.logo || '',
        coverImage: vendor.coverImage || '',
        address: {
          street: vendor.address?.street || '',
          city: vendor.address?.city || '',
          state: vendor.address?.state || '',
          zipCode: vendor.address?.zipCode || '',
          country: vendor.address?.country || 'United States',
        },
        website: vendor.website || '',
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

      console.log('[VendorProfilePage] Transformed profile:', transformedProfile);
      setProfile(transformedProfile);
    } catch (error) {
      console.error('Error fetching vendor profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
    try {
      const imageType = type === 'logo' ? 'logo' : 'coverImage';
      const response = await vendorAPI.uploadVendorImage(file, imageType);
      if (response?.data?.logo || response?.data?.coverImage) {
        setProfile(prev => prev ? {
          ...prev,
          logo: response.data.logo || prev.logo,
          coverImage: response.data.coverImage || prev.coverImage
        } : null);
        toast.success(`${type === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully`);
      }
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}`);
    }
  };

  const handleBasicInfoUpdate = async (data: Partial<VendorProfile>) => {
    setSaving(true);
    try {
      await vendorAPI.updateVendorProfile(data);
      setProfile(prev => prev ? { ...prev, ...data } : null);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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

  const TabButton: React.FC<{ id: string; label: string; icon: React.ReactNode }> = ({ id, label, icon }) => (
    <motion.button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all ${
        activeTab === id
          ? 'bg-blue-50 text-blue-600 border-2 border-blue-200'
          : 'text-gray-600 hover:bg-gray-50 border-2 border-transparent'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );

  if (isLoading) {
    return (
      <>
        <VendorNavigation />
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
        <VendorNavigation />
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
      <VendorNavigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Card */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 text-white overflow-hidden mb-8">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white transform translate-x-32 -translate-y-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white transform -translate-x-16 translate-y-16"></div>
          </div>

          <div className="relative z-10">
            {/* Cover Image */}
            {profile.coverImage && (
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover opacity-20" />
              </div>
            )}

            <div className="relative flex flex-col md:flex-row items-center gap-8">
              {/* Logo */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm border-4 border-white/30">
                  {profile.logo ? (
                    <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60">
                      <FaBuilding size={48} />
                    </div>
                  )}
                </div>
                <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer">
                  <FaCamera size={20} />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                  />
                </label>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{profile.businessName || 'Your Business'}</h1>
                <p className="text-white/80 mb-4">{profile.email}</p>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
                  <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      profile.verificationStatus === 'verified'
                        ? 'bg-green-100 text-green-800'
                        : profile.verificationStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {profile.verificationStatus === 'verified' && <><FaCheck className="mr-1" /> Verified</>}
                      {profile.verificationStatus === 'pending' && 'Pending'}
                      {profile.verificationStatus === 'unverified' && 'Unverified'}
                      {profile.verificationStatus === 'rejected' && 'Rejected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                    Member since {new Date(profile.memberSince).getFullYear()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-wrap gap-4 overflow-x-auto">
            {tabs.map((tab) => (
              <TabButton key={tab.id} id={tab.id} label={tab.label} icon={tab.icon} />
            ))}
          </div>
        </div>

        {/* Tab Content */}
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
    </>
  );
};

// Business Info Tab
const BusinessInfoTab: React.FC<{
  profile: VendorProfile;
  onUpdate: (data: Partial<VendorProfile>) => Promise<void>;
  onImageUpload: (file: File, type: 'logo' | 'cover') => Promise<void>;
  isLoading: boolean;
}> = ({ profile, onUpdate, onImageUpload, isLoading }) => {
  const [formData, setFormData] = useState({
    businessName: profile.businessName,
    description: profile.description,
    website: profile.website,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
  };

  return (
    <motion.div
      key="business"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
    >
      <h2 className="text-2xl font-bold mb-6">Business Information</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={5}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Tell us about your business..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com"
          />
        </div>

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <PhoneVerificationSection
            phone={profile.phone}
            isPhoneVerified={profile.isPhoneVerified || false}
            onSendVerification={handleSendPhoneVerification}
            onVerifyPhone={handleVerifyPhone}
            onResendVerification={handleSendPhoneVerification}
          />

          <h3 className="text-lg font-semibold mt-8 mb-4">Business Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
              <input
                type="text"
                value={formData.address.zipCode}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, zipCode: e.target.value } }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <input
                type="text"
                value={formData.address.country}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-8 mb-4">Social Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(formData.socialMedia).map(([platform, value]) => (
              <div key={platform}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{platform}</label>
                <input
                  type="url"
                  value={value}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socialMedia: { ...prev.socialMedia, [platform]: e.target.value }
                  }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`https://${platform}.com/yourpage`}
                />
              </div>
            ))}
          </div>

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
      </div>
    </motion.div>
  );
};

// Business Details Tab
const BusinessDetailsTab: React.FC<{
  profile: VendorProfile;
  onUpdate: (data: Partial<VendorProfile>) => Promise<void>;
  isLoading: boolean;
}> = ({ profile, onUpdate, isLoading }) => {
  const handleBusinessHoursSave = async (hours: any) => {
    try {
      await vendorAPI.updateBusinessHours(hours);
      toast.success('Business hours updated successfully');
    } catch (error) {
      throw error;
    }
  };

  return (
    <motion.div
      key="details"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <BusinessHoursEditor
          currentHours={profile.businessHours}
          onSave={handleBusinessHoursSave}
          isLoading={isLoading}
        />
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold mb-6">Tax Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID / Business Registration</label>
            <input
              type="text"
              value={profile.taxInformation.taxId}
              onChange={(e) => onUpdate({ taxInformation: { ...profile.taxInformation, taxId: e.target.value } })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
            <select
              value={profile.taxInformation.businessType}
              onChange={(e) => onUpdate({ taxInformation: { ...profile.taxInformation, businessType: e.target.value } })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Type</option>
              <option value="Sole Proprietorship">Sole Proprietorship</option>
              <option value="LLC">LLC</option>
              <option value="Corporation">Corporation</option>
              <option value="Partnership">Partnership</option>
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Payment Settings Tab
const PaymentSettingsTab: React.FC<{ profile: VendorProfile; isLoading?: boolean; onRefresh?: () => void }> = ({ profile, isLoading, onRefresh }) => {
  const handleSaveApiKeys = async (publishableKey: string, secretKey: string, testMode: boolean) => {
    try {
      await vendorAPI.saveStripeApiKeys(publishableKey, secretKey, testMode);
      if (onRefresh) {
        onRefresh(); // Refresh profile to get updated settings
      }
      toast.success('Stripe API keys saved successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save Stripe API keys');
      throw error;
    }
  };

  const handleValidateKeys = async (publishableKey: string, secretKey: string) => {
    try {
      const result = await vendorAPI.validateStripeApiKeys(publishableKey, secretKey);
      return result;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to validate Stripe API keys');
      throw error;
    }
  };

  return (
    <motion.div
      key="payments"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
    >
      <StripeConnectSetup
        currentStatus={profile.stripeSettings}
        onSaveApiKeys={handleSaveApiKeys}
        onValidateKeys={handleValidateKeys}
        isLoading={isLoading}
      />

      {profile.commissionRate !== undefined && (
        <div className="mt-8 p-6 bg-blue-50 rounded-xl">
          <h4 className="font-semibold text-gray-900 mb-2">Commission Rate</h4>
          <p className="text-3xl font-bold text-blue-600">{profile.commissionRate}%</p>
          <p className="text-sm text-gray-600 mt-1">Platform commission on each transaction</p>
        </div>
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
      toast.error('Failed to save bank details');
      throw error;
    }
  };

  return (
    <motion.div
      key="bank"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
    >
      <BankDetailsForm
        currentDetails={profile.bankAccountDetails}
        onSave={handleSaveBankDetails}
      />
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
      toast.error('Failed to upload document');
      throw error;
    }
  };

  const handleDeleteDocument = async (type: string) => {
    try {
      await vendorAPI.deleteDocument(type);
      toast.success('Document deleted successfully');
      onRefresh(); // Refresh to get updated documents
    } catch (error: any) {
      toast.error('Failed to delete document');
      throw error;
    }
  };

  const documents = profile.verificationDocuments || [];

  return (
    <motion.div
      key="documents"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
    >
      <DocumentUpload
        documents={documents}
        onUpload={handleUploadDocument}
        onDelete={handleDeleteDocument}
      />
    </motion.div>
  );
};

export default VendorProfilePage;
