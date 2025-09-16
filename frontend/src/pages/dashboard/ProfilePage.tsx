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
  selectUserProfile,
  selectIsProfileLoading,
  selectProfileError,
  selectProfileCompletion,
  selectUser
} from '@/store/slices/authSlice';
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
  const [formData, setFormData] = useState({
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
    phone: userProfile?.phone || '',
    dateOfBirth: userProfile?.dateOfBirth || '',
    gender: userProfile?.gender || '',
    bio: userProfile?.bio || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        phone: userProfile.phone || '',
        dateOfBirth: userProfile.dateOfBirth || '',
        gender: userProfile.gender || '',
        bio: userProfile.bio || '',
      });
    }
  }, [userProfile]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (formData.phone && !/^[\d\s\(\)\-\+]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
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
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.phone ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Enter your phone number"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
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
  onUpdate: (id: string, address: Partial<Address>) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}> = ({ addresses, onAdd, onUpdate, onDelete, isLoading }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    isDefault: false,
  });

  const resetForm = () => {
    setFormData({
      label: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isDefault: false,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, formData);
    } else {
      onAdd(formData);
    }
    resetForm();
  };

  const startEdit = (address: Address) => {
    setFormData({
      label: address.label,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setEditingId(address.id || '');
    setShowAddForm(true);
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
                  {address.city}, {address.state} {address.postalCode}<br />
                  {address.country}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(address)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => onDelete(address.id || '')}
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
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Postal code"
                      required
                    />
                  </div>
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
    </div>
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

  const handleAvatarUpload = useCallback((file: File) => {
    const avatarData: AvatarUploadData = { file };
    dispatch(uploadAvatar(avatarData) as any);
  }, [dispatch]);

  const handleAvatarRemove = useCallback(() => {
    dispatch(removeAvatar() as any);
  }, [dispatch]);

  const handleAddAddress = useCallback((address: Omit<Address, 'id'>) => {
    dispatch(addAddress(address) as any);
  }, [dispatch]);

  const handleUpdateAddress = useCallback((addressId: string, address: Partial<Address>) => {
    dispatch(updateAddress({ addressId, address }) as any);
  }, [dispatch]);

  const handleDeleteAddress = useCallback((addressId: string) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      dispatch(deleteAddress(addressId) as any);
    }
  }, [dispatch]);

  // Error handling
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: <FaUser /> },
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
                      <HoverCard className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">Preferences</h3>
                        <div className="space-y-6">
                          <div>
                            <h4 className="font-medium mb-4">Notifications</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span>Email notifications</span>
                                <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" defaultChecked />
                              </div>
                              <div className="flex items-center justify-between">
                                <span>SMS notifications</span>
                                <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Marketing emails</span>
                                <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </HoverCard>
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