import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  FaUser,
  FaCamera,
  FaSave,
  FaShieldAlt,
  FaCog,
  FaMapMarkerAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaGlobe,
  FaPhone,
  FaEnvelope,
  FaCalendar,
  FaUserTag,
  FaBell,
  FaHistory,
  FaDownload,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaSpinner
} from 'react-icons/fa';
import {
  FadeIn,
  SlideIn,
  ScaleIn,
  HoverCard,
  AnimatedButton,
  PageTransition,
  StaggerContainer
} from '@/components/animations';
import {
  getFullProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  addAddress,
  updateAddress,
  deleteAddress,
  resendVerificationEmail,
  verifyEmailWithOTP,
  sendPhoneVerificationOTP,
  verifyPhoneOTP,
  resendPhoneVerificationOTP,
  selectUserProfile,
  selectIsProfileLoading,
  selectProfileError,
  selectProfileCompletion,
  selectUser
} from '@/store/slices/authSlice';
import EmailVerificationSection from '@/components/profile/EmailVerificationSection';
import PhoneVerificationSection from '@/components/profile/PhoneVerificationSection';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PhoneInput, { Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '@/styles/phoneInput.css';
import {
  validatePhoneDetails,
  getPhoneCountry,
  getExamplePhone,
  toE164,
  isValidPhone,
} from '@/utils/phoneUtils';
import {
  UserProfile,
  UpdateProfileData,
  Address,
  AvatarUploadData
} from '@/types/auth';

// Components
const ProfileHeader: React.FC<{
  userProfile: UserProfile | null;
  onAvatarUpload: (file: File) => void;
  onAvatarRemove: () => void;
  isLoading: boolean;
}> = ({ userProfile, onAvatarUpload, onAvatarRemove, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAvatarUpload(file);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 text-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white transform translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white transform -translate-x-16 translate-y-16"></div>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        {/* Avatar Section */}
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm border-4 border-white/30">
            {userProfile?.avatar ? (
              <img
                src={userProfile.avatar}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60">
                <FaUser size={48} />
              </div>
            )}
          </div>

          {/* Avatar overlay */}
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? <FaSpinner className="animate-spin" size={16} /> : <FaCamera size={16} />}
              </button>
              {userProfile?.avatar && (
                <button
                  onClick={onAvatarRemove}
                  className="p-2 bg-red-500/60 rounded-full hover:bg-red-500/80 transition-colors"
                  disabled={isLoading}
                >
                  <FaTrash size={16} />
                </button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold mb-2">
            {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Loading...'}
          </h1>
          <p className="text-white/80 mb-4">{userProfile?.email}</p>

          <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm">
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
              <FaUserTag />
              <span className="capitalize">{userProfile?.role}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
              <FaCalendar />
              <span>Member since {userProfile ? new Date(userProfile.memberSince).getFullYear() : '---'}</span>
            </div>
          </div>

          {/* Profile Completion */}
          {userProfile && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Profile Completion</span>
                <span>{userProfile.profileCompletion || 0}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <motion.div
                  className="bg-white rounded-full h-2"
                  initial={{ width: "0%" }}
                  animate={{ width: `${userProfile.profileCompletion || 0}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <motion.button
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all ${
      isActive
        ? 'bg-blue-50 text-blue-600 border-2 border-blue-200'
        : 'text-gray-600 hover:bg-gray-50 border-2 border-transparent'
    }`}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    {icon}
    <span>{label}</span>
  </motion.button>
);

const PersonalInfoTab: React.FC<{
  userProfile: UserProfile | null;
  onUpdate: (data: UpdateProfileData) => void;
  isLoading: boolean;
}> = ({ userProfile, onUpdate, isLoading }) => {
  // Helper to sanitize phone to E.164 format
  const sanitizePhoneForDisplay = (phone: string | undefined): string => {
    if (!phone) return '';

    // If already in E.164 format (starts with +), return as-is
    if (phone.startsWith('+')) return phone;

    // Try to convert to E.164 format
    // For Indian numbers starting with 0, assume +91
    if (phone.startsWith('0') && phone.length === 11) {
      return `+91${phone.substring(1)}`;
    }

    // Try general conversion with default country
    const e164 = toE164(phone, 'IN');
    return e164 || phone;
  };

  const [formData, setFormData] = useState({
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
    phone: sanitizePhoneForDisplay(userProfile?.phone),
    dateOfBirth: userProfile?.dateOfBirth || '',
    gender: userProfile?.gender || '',
    bio: userProfile?.bio || '',
  });

  const [selectedCountry, setSelectedCountry] = useState<Country>('US');
  const [phoneValidation, setPhoneValidation] = useState<{
    isValid: boolean;
    isMobile: boolean;
    error?: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize country from existing phone
  useEffect(() => {
    if (userProfile?.phone) {
      const country = getPhoneCountry(userProfile.phone);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [userProfile?.phone]);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phone: sanitizePhoneForDisplay(userProfile.phone),
        dateOfBirth: userProfile.dateOfBirth || '',
        gender: userProfile.gender || '',
        bio: userProfile.bio || '',
      });
    }
  }, [userProfile]);

  // Real-time phone validation
  useEffect(() => {
    if (formData.phone && formData.phone.length > 3) {
      const validation = validatePhoneDetails(formData.phone);
      setPhoneValidation(validation);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, phone: validation.error || 'Invalid phone number' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
      }
    } else {
      setPhoneValidation(null);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  }, [formData.phone]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    // Enhanced phone validation
    if (formData.phone) {
      const validation = validatePhoneDetails(formData.phone);
      if (!validation.isValid) {
        newErrors.phone = validation.error || 'Invalid phone number format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onUpdate(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => ({ ...prev, phone: value || '' }));
  };

  const exampleNumber = selectedCountry ? getExamplePhone(selectedCountry) : '+1 234 567 8900';

  return (
    <HoverCard className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.firstName ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Enter your first name"
            />
            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.lastName ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Enter your last name"
            />
            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <PhoneInput
                international
                defaultCountry={selectedCountry}
                value={formData.phone}
                onChange={handlePhoneChange}
                onCountryChange={(country) => country && setSelectedCountry(country)}
                className={`phone-input-enhanced ${
                  errors.phone
                    ? 'border-red-500 focus-within:border-red-600 focus-within:ring-red-200'
                    : phoneValidation?.isValid
                    ? 'border-green-500 focus-within:border-green-600 focus-within:ring-green-200'
                    : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-200'
                }`}
                disabled={isLoading}
                placeholder="Enter phone number"
              />
              {/* Real-time validation icon */}
              {formData.phone && formData.phone.length > 3 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {phoneValidation?.isValid ? (
                    <FaCheck className="text-green-500" />
                  ) : (
                    <FaTimes className="text-red-500" />
                  )}
                </div>
              )}
            </div>
            {errors.phone && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-red-600"
              >
                {errors.phone}
              </motion.p>
            )}
            {phoneValidation?.isValid && !errors.phone && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-green-600 flex items-center gap-1"
              >
                <FaCheck size={12} />
                Valid phone number
              </motion.p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Example: {exampleNumber}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>

        <div className="flex justify-end">
          <AnimatedButton
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FaSave />
                Save Changes
              </>
            )}
          </AnimatedButton>
        </div>
      </form>
    </HoverCard>
  );
};

const AddressesTab: React.FC<{
  addresses: Address[];
  onAdd: (address: Omit<Address, 'id'>) => void;
  onUpdate: (index: number, address: Partial<Address>) => void;
  onDelete: (index: number) => void;
  isLoading: boolean;
}> = ({ addresses, onAdd, onUpdate, onDelete, isLoading }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    poBox: '',
    makaniNumber: '',
    country: '',
    isDefault: false,
  });

  const resetForm = () => {
    setFormData({
      label: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      poBox: '',
      makaniNumber: '',
      country: '',
      isDefault: false,
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex !== null) {
      onUpdate(editingIndex, formData);
    } else {
      onAdd(formData);
    }
    resetForm();
  };

  const startEdit = (address: Address, index: number) => {
    setFormData({
      label: address.label || '',
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode || '',
      poBox: address.poBox || '',
      makaniNumber: address.makaniNumber || '',
      country: address.country,
      isDefault: address.isDefault,
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDeleteClick = (index: number) => {
    setAddressToDelete(index);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (addressToDelete !== null) {
      onDelete(addressToDelete);
      setShowDeleteDialog(false);
      setAddressToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setAddressToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Add Address Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">Addresses</h3>
        <AnimatedButton
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <FaPlus />
          Add Address
        </AnimatedButton>
      </div>

      {/* Address List */}
      <div className="grid gap-4">
        {addresses.map((address, index) => (
          <HoverCard key={address.id || index} className="bg-white p-6 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{address.label}</h4>
                  {address.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-gray-600">
                  {address.street}<br />
                  {address.city}, {address.state} {address.zipCode || address.poBox}<br />
                  {address.poBox && <span>P.O. Box: {address.poBox}<br /></span>}
                  {address.makaniNumber && <span>Makani: {address.makaniNumber}<br /></span>}
                  {address.country}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(address, index)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDeleteClick(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </HoverCard>
        ))}
      </div>

      {/* Add/Edit Address Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <HoverCard className="bg-white p-6 rounded-2xl border border-gray-200">
              <h4 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Address' : 'Add New Address'}
              </h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label *
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Home, Office"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Country"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Street address"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="City"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="State"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.country?.toLowerCase() === 'united arab emirates' || formData.country?.toLowerCase() === 'uae'
                        ? 'Postal Code / P.O. Box *'
                        : 'Postal Code *'}
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.country?.toLowerCase() === 'united arab emirates' || formData.country?.toLowerCase() === 'uae'
                        ? 'Postal code or leave empty if using P.O. Box'
                        : 'Postal code'}
                      required={!formData.poBox}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.country?.toLowerCase() === 'united arab emirates' || formData.country?.toLowerCase() === 'uae'
                        ? 'Enter postal code, or use P.O. Box field below for UAE addresses'
                        : 'Enter your postal/zip code'}
                    </p>
                  </div>

                  {/* UAE-specific fields: Show when UAE is selected */}
                  {(formData.country?.toLowerCase() === 'united arab emirates' || formData.country?.toLowerCase() === 'uae') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          P.O. Box {!formData.zipCode && '*'}
                        </label>
                        <input
                          type="text"
                          value={formData.poBox}
                          onChange={(e) => setFormData(prev => ({ ...prev, poBox: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 12345"
                          pattern="\d{4,6}"
                          required={!formData.zipCode}
                        />
                        <p className="text-xs text-gray-500 mt-1">UAE P.O. Box (4-6 digits)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Makani Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.makaniNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, makaniNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 1234567890"
                          pattern="\d{10}"
                        />
                        <p className="text-xs text-gray-500 mt-1">Emirates Post code (10 digits)</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                    Set as default address
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <AnimatedButton
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        {editingId ? 'Update' : 'Add'} Address
                      </>
                    )}
                  </AnimatedButton>
                </div>
              </form>
            </HoverCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isLoading}
      />
    </div>
  );
};

const PreferencesTab: React.FC<{
  userProfile: UserProfile | null;
  onUpdate: (data: UpdateProfileData) => void;
  isLoading: boolean;
}> = ({ userProfile, onUpdate, isLoading }) => {
  const [preferences, setPreferences] = useState({
    email: userProfile?.preferences?.notifications?.email ?? true,
    sms: userProfile?.preferences?.notifications?.sms ?? false,
    push: userProfile?.preferences?.notifications?.push ?? true,
    marketing: userProfile?.preferences?.notifications?.marketing ?? true,
    security: userProfile?.preferences?.notifications?.security ?? true,
    bookingReminders: userProfile?.preferences?.notifications?.bookingReminders ?? true,
    eventUpdates: userProfile?.preferences?.notifications?.eventUpdates ?? true,
  });

  useEffect(() => {
    if (userProfile?.preferences?.notifications) {
      setPreferences({
        email: userProfile.preferences.notifications.email ?? true,
        sms: userProfile.preferences.notifications.sms ?? false,
        push: userProfile.preferences.notifications.push ?? true,
        marketing: userProfile.preferences.notifications.marketing ?? true,
        security: userProfile.preferences.notifications.security ?? true,
        bookingReminders: userProfile.preferences.notifications.bookingReminders ?? true,
        eventUpdates: userProfile.preferences.notifications.eventUpdates ?? true,
      });
    }
  }, [userProfile]);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      preferences: {
        notifications: preferences
      }
    });
  };

  return (
    <HoverCard className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
      <form onSubmit={handleSubmit}>
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Preferences</h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-4 text-gray-900">Notification Settings</h4>
            <p className="text-sm text-gray-600 mb-4">
              Choose which notifications you want to receive
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label htmlFor="email" className="font-medium text-gray-900 block">
                    Email Notifications
                  </label>
                  <span className="text-sm text-gray-600">
                    Receive notifications via email
                  </span>
                </div>
                <input
                  id="email"
                  type="checkbox"
                  checked={preferences.email}
                  onChange={() => handleToggle('email')}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label htmlFor="sms" className="font-medium text-gray-900 block">
                    SMS Notifications
                  </label>
                  <span className="text-sm text-gray-600">
                    Receive notifications via SMS
                  </span>
                </div>
                <input
                  id="sms"
                  type="checkbox"
                  checked={preferences.sms}
                  onChange={() => handleToggle('sms')}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label htmlFor="push" className="font-medium text-gray-900 block">
                    Push Notifications
                  </label>
                  <span className="text-sm text-gray-600">
                    Receive push notifications in your browser
                  </span>
                </div>
                <input
                  id="push"
                  type="checkbox"
                  checked={preferences.push}
                  onChange={() => handleToggle('push')}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label htmlFor="marketing" className="font-medium text-gray-900 block">
                    Marketing Emails
                  </label>
                  <span className="text-sm text-gray-600">
                    Receive promotional offers and updates
                  </span>
                </div>
                <input
                  id="marketing"
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={() => handleToggle('marketing')}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label htmlFor="security" className="font-medium text-gray-900 block">
                    Security Alerts
                  </label>
                  <span className="text-sm text-gray-600">
                    Important security notifications
                  </span>
                </div>
                <input
                  id="security"
                  type="checkbox"
                  checked={preferences.security}
                  onChange={() => handleToggle('security')}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label htmlFor="bookingReminders" className="font-medium text-gray-900 block">
                    Booking Reminders
                  </label>
                  <span className="text-sm text-gray-600">
                    Reminders about your upcoming bookings
                  </span>
                </div>
                <input
                  id="bookingReminders"
                  type="checkbox"
                  checked={preferences.bookingReminders}
                  onChange={() => handleToggle('bookingReminders')}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label htmlFor="eventUpdates" className="font-medium text-gray-900 block">
                    Event Updates
                  </label>
                  <span className="text-sm text-gray-600">
                    Updates about events you're interested in
                  </span>
                </div>
                <input
                  id="eventUpdates"
                  type="checkbox"
                  checked={preferences.eventUpdates}
                  onChange={() => handleToggle('eventUpdates')}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <AnimatedButton
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FaSave />
                Save Preferences
              </>
            )}
          </AnimatedButton>
        </div>
      </form>
    </HoverCard>
  );
};

// Main ProfilePage Component
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const userProfile = useSelector(selectUserProfile);
  const isLoading = useSelector(selectIsProfileLoading);
  const error = useSelector(selectProfileError);
  const user = useSelector(selectUser);

  const [activeTab, setActiveTab] = useState('personal');

  // Load profile on component mount
  useEffect(() => {
    if (!userProfile) {
      dispatch(getFullProfile() as any);
    }
  }, [dispatch, userProfile]);

  // Profile update handlers
  const handleProfileUpdate = useCallback((data: UpdateProfileData) => {
    dispatch(updateProfile(data) as any);
  }, [dispatch]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    const avatarData: AvatarUploadData = { file };
    await dispatch(uploadAvatar(avatarData) as any);
    // Refresh profile to update completion percentage
    dispatch(getFullProfile() as any);
  }, [dispatch]);

  const handleAvatarRemove = useCallback(async () => {
    await dispatch(removeAvatar() as any);
    // Refresh profile to update completion percentage
    dispatch(getFullProfile() as any);
  }, [dispatch]);

  const handleAddAddress = useCallback(async (address: Omit<Address, 'id'>) => {
    await dispatch(addAddress(address) as any);
    // Refresh profile to update completion percentage
    dispatch(getFullProfile() as any);
  }, [dispatch]);

  const handleUpdateAddress = useCallback(async (addressIndex: number, address: Partial<Address>) => {
    await dispatch(updateAddress({ addressIndex, address }) as any);
    // Refresh profile to update completion percentage
    dispatch(getFullProfile() as any);
  }, [dispatch]);

  const handleDeleteAddress = useCallback(async (addressIndex: number) => {
    await dispatch(deleteAddress(addressIndex) as any);
    // Refresh profile to update completion percentage
    dispatch(getFullProfile() as any);
  }, [dispatch]);

  // Error handling
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Verification handlers
  const handleSendEmailVerification = useCallback(async () => {
    if (userProfile?.email) {
      await dispatch(resendVerificationEmail(userProfile.email) as any).unwrap();
    }
  }, [dispatch, userProfile]);

  const handleVerifyEmail = useCallback(async (otp: string) => {
    await dispatch(verifyEmailWithOTP(otp) as any).unwrap();
    // Refresh profile after verification
    dispatch(getFullProfile() as any);
  }, [dispatch]);

  const handleResendEmailVerification = useCallback(async () => {
    if (userProfile?.email) {
      await dispatch(resendVerificationEmail(userProfile.email) as any).unwrap();
    }
  }, [dispatch, userProfile]);

  const handleSendPhoneVerification = useCallback(async (phone: string) => {
    await dispatch(sendPhoneVerificationOTP(phone) as any).unwrap();
  }, [dispatch]);

  const handleVerifyPhone = useCallback(async (otp: string) => {
    await dispatch(verifyPhoneOTP(otp) as any).unwrap();
    // Refresh profile after verification
    dispatch(getFullProfile() as any);
  }, [dispatch]);

  const handleResendPhoneVerification = useCallback(async () => {
    await dispatch(resendPhoneVerificationOTP() as any).unwrap();
  }, [dispatch]);

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: <FaUser /> },
    { id: 'verification', label: 'Verification', icon: <FaCheck /> },
    { id: 'addresses', label: 'Addresses', icon: <FaMapMarkerAlt /> },
    { id: 'security', label: 'Security', icon: <FaShieldAlt /> },
    { id: 'preferences', label: 'Preferences', icon: <FaCog /> },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer staggerDelay={0.1}>
            {/* Profile Header */}
            <FadeIn delay={0.1}>
              <ProfileHeader
                userProfile={userProfile}
                onAvatarUpload={handleAvatarUpload}
                onAvatarRemove={handleAvatarRemove}
                isLoading={isLoading}
              />
            </FadeIn>

            {/* Navigation Tabs */}
            <SlideIn direction="up" delay={0.2}>
              <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex flex-wrap gap-4">
                  {tabs.map((tab) => (
                    <TabButton
                      key={tab.id}
                      icon={tab.icon}
                      label={tab.label}
                      isActive={activeTab === tab.id}
                      onClick={() => setActiveTab(tab.id)}
                    />
                  ))}
                </div>
              </div>
            </SlideIn>

            {/* Tab Content */}
            <SlideIn direction="up" delay={0.3}>
              <div className="mt-8">
                <AnimatePresence mode="wait">
                  {activeTab === 'personal' && (
                    <motion.div
                      key="personal"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PersonalInfoTab
                        userProfile={userProfile}
                        onUpdate={handleProfileUpdate}
                        isLoading={isLoading}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'verification' && (
                    <motion.div
                      key="verification"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">Account Verification</h3>
                          <p className="text-sm text-gray-600 mb-6">
                            Verify your email and phone number to secure your account and enable all features
                          </p>

                          <div className="space-y-4">
                            <EmailVerificationSection
                              email={userProfile?.email || ''}
                              isEmailVerified={userProfile?.isEmailVerified || false}
                              onSendVerification={handleSendEmailVerification}
                              onVerifyEmail={handleVerifyEmail}
                              onResendVerification={handleResendEmailVerification}
                            />

                            <PhoneVerificationSection
                              phone={userProfile?.phone}
                              isPhoneVerified={userProfile?.isPhoneVerified || false}
                              onSendVerification={handleSendPhoneVerification}
                              onVerifyPhone={handleVerifyPhone}
                              onResendVerification={handleResendPhoneVerification}
                            />
                          </div>
                        </div>

                        {(userProfile?.isEmailVerified && userProfile?.isPhoneVerified) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                <FaCheck className="text-white text-xl" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-green-900 mb-1">
                                  All Verified!
                                </h4>
                                <p className="text-sm text-green-700">
                                  Your account is fully verified. You can now access all features and enjoy enhanced security.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'addresses' && (
                    <motion.div
                      key="addresses"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AddressesTab
                        addresses={userProfile?.addresses || []}
                        onAdd={handleAddAddress}
                        onUpdate={handleUpdateAddress}
                        onDelete={handleDeleteAddress}
                        isLoading={isLoading}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div
                      key="security"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <HoverCard className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h3>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <FaLock className="text-gray-600" />
                              <div>
                                <h4 className="font-medium">Change Password</h4>
                                <p className="text-sm text-gray-600">Update your account password</p>
                              </div>
                            </div>
                            <AnimatedButton
                              onClick={() => navigate('/dashboard/change-password')}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Change
                            </AnimatedButton>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <FaShieldAlt className="text-gray-600" />
                              <div>
                                <h4 className="font-medium">Two-Factor Authentication</h4>
                                <p className="text-sm text-gray-600">Add an extra layer of security</p>
                              </div>
                            </div>
                            <AnimatedButton className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                              Enable
                            </AnimatedButton>
                          </div>
                        </div>
                      </HoverCard>
                    </motion.div>
                  )}

                  {activeTab === 'preferences' && (
                    <motion.div
                      key="preferences"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PreferencesTab
                        userProfile={userProfile}
                        onUpdate={handleProfileUpdate}
                        isLoading={isLoading}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </SlideIn>
          </StaggerContainer>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProfilePage;