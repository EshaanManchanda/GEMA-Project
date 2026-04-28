import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaSave, FaUser, FaShieldAlt, FaCog, FaGlobe,
  FaSpinner, FaCheck, FaTimes
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import adminAPI from '@services/api/adminAPI';
import { AdminUser } from '@/types/auth';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

type TabId = 'basic' | 'security' | 'role' | 'social';

const ROLE_OPTIONS = ['customer', 'vendor', 'teacher', 'employee', 'admin'] as const;
const STATUS_OPTIONS = ['active', 'inactive', 'suspended', 'pending'] as const;
const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
const PAYOUT_SCHEDULE_OPTIONS = ['daily', 'weekly', 'monthly'] as const;
const EMPLOYEE_ROLE_OPTIONS = ['manager', 'scanner', 'coordinator', 'security'] as const;
const TEACHING_MODE_OPTIONS = ['online', 'offline', 'hybrid'] as const;
const VERIFICATION_STATUS_OPTIONS = ['pending', 'verified', 'rejected'] as const;

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  vendor: 'bg-blue-100 text-blue-700',
  teacher: 'bg-green-100 text-green-700',
  employee: 'bg-orange-100 text-orange-700',
  customer: 'bg-gray-100 text-gray-700',
};

const AdminUserEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('basic');

  // Basic info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatar, setAvatar] = useState('');

  // Security
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  // Social media
  const [smFacebook, setSmFacebook] = useState('');
  const [smInstagram, setSmInstagram] = useState('');
  const [smTwitter, setSmTwitter] = useState('');
  const [smLinkedin, setSmLinkedin] = useState('');
  const [smWebsite, setSmWebsite] = useState('');

  // Preferences
  const [prefLanguage, setPrefLanguage] = useState('en');
  const [prefCurrency, setPrefCurrency] = useState('AED');
  const [prefTimezone, setPrefTimezone] = useState('Asia/Dubai');

  // Vendor User payment settings (on User model)
  const [commissionRate, setCommissionRate] = useState(5);
  const [payoutSchedule, setPayoutSchedule] = useState('weekly');
  const [minimumPayout, setMinimumPayout] = useState(50);
  const [hasCustomStripeAccount, setHasCustomStripeAccount] = useState(false);
  const [acceptsPlatformPayments, setAcceptsPlatformPayments] = useState(true);

  // Vendor Profile (separate Vendor document)
  const [vendorBusinessName, setVendorBusinessName] = useState('');
  const [vendorDescription, setVendorDescription] = useState('');
  const [vendorCategory, setVendorCategory] = useState('');
  const [vendorVerificationStatus, setVendorVerificationStatus] = useState('');
  const [vendorPaymentMode, setVendorPaymentMode] = useState('');
  const [vendorCustomCommissionRate, setVendorCustomCommissionRate] = useState<number | ''>('');
  const [vendorSubscriptionStatus, setVendorSubscriptionStatus] = useState('');
  const [vendorIsActive, setVendorIsActive] = useState(true);
  const [vendorIsSuspended, setVendorIsSuspended] = useState(false);
  const [vendorSuspensionReason, setVendorSuspensionReason] = useState('');

  // Teacher Profile
  const [teacherBio, setTeacherBio] = useState('');
  const [teacherSpecialization, setTeacherSpecialization] = useState('');
  const [teacherSubjects, setTeacherSubjects] = useState('');
  const [teacherYearsOfExp, setTeacherYearsOfExp] = useState(0);
  const [teacherMode, setTeacherMode] = useState('online');
  const [teacherVerificationStatus, setTeacherVerificationStatus] = useState('pending');
  const [teacherIsActive, setTeacherIsActive] = useState(true);
  const [teacherIsSuspended, setTeacherIsSuspended] = useState(false);
  const [teacherCommissionRate, setTeacherCommissionRate] = useState(5);
  const [teacherPayoutSchedule, setTeacherPayoutSchedule] = useState('weekly');

  // Employee Profile
  const [employeeId, setEmployeeId] = useState('');
  const [employeeRole, setEmployeeRole] = useState('');
  const [empStatus, setEmpStatus] = useState('active');
  const [empVendorId, setEmpVendorId] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminAPI.getUserById(id)
      .then((res: any) => {
        const u: AdminUser = res.data?.user ?? res.user ?? res.data ?? res;
        setUser(u);
        // Basic
        setFirstName(u.firstName ?? '');
        setLastName(u.lastName ?? '');
        setEmail(u.email ?? '');
        setPhone(u.phone ?? '');
        setRole(u.role ?? '');
        setStatus(u.status ?? '');
        setGender(u.gender ?? '');
        setDateOfBirth(u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '');
        setAvatar(u.avatar ?? '');
        // Security
        setIsEmailVerified(u.isEmailVerified ?? false);
        setIsPhoneVerified(u.isPhoneVerified ?? false);
        setTwoFAEnabled(u.twoFactorAuth?.enabled ?? false);
        // Social media
        setSmFacebook(u.socialMedia?.facebook ?? '');
        setSmInstagram(u.socialMedia?.instagram ?? '');
        setSmTwitter(u.socialMedia?.twitter ?? '');
        setSmLinkedin(u.socialMedia?.linkedin ?? '');
        setSmWebsite(u.socialMedia?.website ?? '');
        // Preferences
        setPrefLanguage(u.preferences?.language ?? 'en');
        setPrefCurrency(u.preferences?.currency ?? 'AED');
        setPrefTimezone(u.preferences?.timezone ?? 'Asia/Dubai');
        // Vendor user payment settings
        if (u.vendorPaymentSettings) {
          setCommissionRate(u.vendorPaymentSettings.commissionRate ?? 5);
          setPayoutSchedule(u.vendorPaymentSettings.payoutSchedule ?? 'weekly');
          setMinimumPayout(u.vendorPaymentSettings.minimumPayout ?? 50);
          setHasCustomStripeAccount(u.vendorPaymentSettings.hasCustomStripeAccount ?? false);
          setAcceptsPlatformPayments(u.vendorPaymentSettings.acceptsPlatformPayments ?? true);
        }
        // Vendor profile
        if (u.vendorProfile) {
          setVendorBusinessName(u.vendorProfile.businessName ?? '');
          setVendorDescription(u.vendorProfile.description ?? '');
          setVendorCategory(u.vendorProfile.category ?? '');
          setVendorVerificationStatus(u.vendorProfile.verificationStatus ?? '');
          setVendorPaymentMode(u.vendorProfile.paymentMode ?? '');
          setVendorCustomCommissionRate(u.vendorProfile.customCommissionRate ?? '');
          setVendorSubscriptionStatus(u.vendorProfile.subscriptionStatus ?? '');
          setVendorIsActive(u.vendorProfile.isActive ?? true);
          setVendorIsSuspended(u.vendorProfile.isSuspended ?? false);
          setVendorSuspensionReason(u.vendorProfile.suspensionReason ?? '');
        }
        // Teacher profile
        if (u.teacherProfile) {
          setTeacherBio(u.teacherProfile.bio ?? '');
          setTeacherSpecialization(u.teacherProfile.specialization ?? '');
          setTeacherSubjects((u.teacherProfile.subjects ?? []).join(', '));
          setTeacherYearsOfExp(u.teacherProfile.yearsOfExperience ?? 0);
          setTeacherMode(u.teacherProfile.teachingMode ?? 'online');
          setTeacherVerificationStatus(u.teacherProfile.verificationStatus ?? 'pending');
          setTeacherIsActive(u.teacherProfile.isActive ?? true);
          setTeacherIsSuspended(u.teacherProfile.isSuspended ?? false);
          setTeacherCommissionRate(u.teacherProfile.commissionRate ?? 5);
          setTeacherPayoutSchedule(u.teacherProfile.payoutSchedule ?? 'weekly');
        }
        // Employee profile
        if (u.employeeProfile) {
          setEmployeeId(u.employeeProfile.employeeId ?? '');
          setEmployeeRole(u.employeeProfile.role ?? '');
          setEmpStatus(u.employeeProfile.status ?? 'active');
          setEmpVendorId(u.employeeProfile.vendorId ?? '');
        } else if (u.employeeDetails) {
          setEmployeeId(u.employeeDetails.employeeId ?? '');
          setEmployeeRole(u.employeeDetails.employeeRole ?? '');
        }
      })
      .catch(() => {
        toast.error('Failed to load user');
        navigate('/admin/users');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (firstName) payload.firstName = firstName;
      if (lastName) payload.lastName = lastName;
      if (email) payload.email = email;
      payload.phone = phone || undefined;
      if (role) payload.role = role;
      if (status) payload.status = status;
      payload.gender = gender || undefined;
      if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
      payload.avatar = avatar || undefined;
      payload.isEmailVerified = isEmailVerified;
      payload.isPhoneVerified = isPhoneVerified;

      // 2FA
      payload.twoFactorAuth = { enabled: twoFAEnabled };

      // Social media
      const sm: Record<string, string> = {};
      if (smFacebook) sm.facebook = smFacebook;
      if (smInstagram) sm.instagram = smInstagram;
      if (smTwitter) sm.twitter = smTwitter;
      if (smLinkedin) sm.linkedin = smLinkedin;
      if (smWebsite) sm.website = smWebsite;
      if (Object.keys(sm).length) payload.socialMedia = sm;

      // Preferences
      payload.preferences = { language: prefLanguage, currency: prefCurrency, timezone: prefTimezone };

      if (role === 'vendor') {
        // User-level vendor payment settings
        payload.vendorPaymentSettings = {
          commissionRate,
          payoutSchedule,
          minimumPayout,
          hasCustomStripeAccount,
          acceptsPlatformPayments,
        };
        // Vendor model fields
        payload.vendorProfile = {
          businessName: vendorBusinessName,
          description: vendorDescription,
          category: vendorCategory,
          verificationStatus: vendorVerificationStatus,
          paymentMode: vendorPaymentMode,
          customCommissionRate: vendorCustomCommissionRate !== '' ? vendorCustomCommissionRate : undefined,
          subscriptionStatus: vendorSubscriptionStatus,
          isActive: vendorIsActive,
          isSuspended: vendorIsSuspended,
          suspensionReason: vendorIsSuspended ? vendorSuspensionReason : undefined,
        };
      }

      if (role === 'teacher') {
        payload.teacherProfile = {
          bio: teacherBio,
          specialization: teacherSpecialization,
          subjects: teacherSubjects ? teacherSubjects.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          yearsOfExperience: teacherYearsOfExp,
          teachingMode: teacherMode,
          verificationStatus: teacherVerificationStatus,
          isActive: teacherIsActive,
          isSuspended: teacherIsSuspended,
          commissionRate: teacherCommissionRate,
          payoutSchedule: teacherPayoutSchedule,
        };
      }

      if (role === 'employee') {
        payload.employeeProfile = {
          employeeId,
          role: employeeRole,
          status: empStatus,
          ...(empVendorId ? { vendorId: empVendorId } : {}),
        };
      }

      const response = await adminAPI.updateUser(id, payload);
      if (response?.success || response?.data) {
        toast.success('User updated successfully');
        navigate('/admin/users');
      } else {
        toast.error(response?.message ?? 'Update failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const showRoleTab = role === 'vendor' || role === 'employee' || role === 'teacher';

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'basic', label: 'Basic Info', icon: <FaUser /> },
    { id: 'security', label: 'Security', icon: <FaShieldAlt /> },
    { id: 'social', label: 'Social & Preferences', icon: <FaGlobe /> },
    ...(showRoleTab ? [{ id: 'role' as TabId, label: 'Role Settings', icon: <FaCog /> }] : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-blue-600 text-3xl" />
      </div>
    );
  }

  return (
    <>
      <PrivatePageSEO title={`Edit User – ${user?.firstName ?? ''} ${user?.lastName ?? ''}`} />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/users')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaArrowLeft />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[user?.role ?? 'customer']}`}>
                    {user?.role}
                  </span>
                  <span className="text-sm text-gray-500">{user?.email}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {ROLE_OPTIONS.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">— Optional —</option>
                    {GENDER_OPTIONS.map(g => (
                      <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Avatar URL</label>
                  <input type="url" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://... (optional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">Security Settings</h2>
              <div className="space-y-4">
                <Toggle label="Email Verified" description="Mark user's email address as verified"
                  enabled={isEmailVerified} onChange={setIsEmailVerified} />
                <Toggle label="Phone Verified" description="Mark user's phone number as verified"
                  enabled={isPhoneVerified} onChange={setIsPhoneVerified} />
                <Toggle label="Two-Factor Authentication" description="Enable or disable 2FA for this user"
                  enabled={twoFAEnabled} onChange={setTwoFAEnabled} />
              </div>
            </div>
          )}

          {/* Social & Preferences Tab */}
          {activeTab === 'social' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                <h2 className="text-lg font-semibold text-gray-800">Social Media</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Facebook</label>
                    <input type="url" value={smFacebook} onChange={e => setSmFacebook(e.target.value)} placeholder="https://facebook.com/..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram</label>
                    <input type="url" value={smInstagram} onChange={e => setSmInstagram(e.target.value)} placeholder="https://instagram.com/..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Twitter / X</label>
                    <input type="url" value={smTwitter} onChange={e => setSmTwitter(e.target.value)} placeholder="https://twitter.com/..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn</label>
                    <input type="url" value={smLinkedin} onChange={e => setSmLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
                    <input type="url" value={smWebsite} onChange={e => setSmWebsite(e.target.value)} placeholder="https://..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                <h2 className="text-lg font-semibold text-gray-800">Preferences</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                    <input type="text" value={prefLanguage} onChange={e => setPrefLanguage(e.target.value)} placeholder="en"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                    <input type="text" value={prefCurrency} onChange={e => setPrefCurrency(e.target.value)} placeholder="AED"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
                    <input type="text" value={prefTimezone} onChange={e => setPrefTimezone(e.target.value)} placeholder="Asia/Dubai"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Role Settings Tab */}
          {activeTab === 'role' && (
            <div className="space-y-6">
              {role === 'vendor' && (
                <>
                  {/* Vendor User Account settings */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-gray-800">Vendor Account Settings</h2>
                    <p className="text-sm text-gray-500">These fields are stored on the User model.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Commission Rate (%)</label>
                        <input type="number" min={0} max={100} step={0.1} value={commissionRate}
                          onChange={e => setCommissionRate(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payout Schedule</label>
                        <select value={payoutSchedule} onChange={e => setPayoutSchedule(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          {PAYOUT_SCHEDULE_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimum Payout (AED)</label>
                        <input type="number" min={0} value={minimumPayout}
                          onChange={e => setMinimumPayout(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                    </div>
                    <div className="space-y-3 pt-1">
                      <Toggle label="Has Custom Stripe Account" description="Vendor has their own Stripe Connect account"
                        enabled={hasCustomStripeAccount} onChange={setHasCustomStripeAccount} />
                      <Toggle label="Accepts Platform Payments" description="Vendor accepts payments through platform"
                        enabled={acceptsPlatformPayments} onChange={setAcceptsPlatformPayments} />
                    </div>
                  </div>

                  {/* Vendor Profile (Vendor document) */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-gray-800">Vendor Profile</h2>
                    <p className="text-sm text-gray-500">These fields are stored in the Vendor model document.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                        <input type="text" value={vendorBusinessName} onChange={e => setVendorBusinessName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                        <input type="text" value={vendorCategory} onChange={e => setVendorCategory(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <textarea value={vendorDescription} onChange={e => setVendorDescription(e.target.value)} rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification Status</label>
                        <select value={vendorVerificationStatus} onChange={e => setVendorVerificationStatus(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">— Select —</option>
                          {VERIFICATION_STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode</label>
                        <select value={vendorPaymentMode} onChange={e => setVendorPaymentMode(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">— Select —</option>
                          <option value="platform">Platform</option>
                          <option value="stripe_connect">Stripe Connect</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Custom Commission Rate (%)</label>
                        <input type="number" min={0} max={100} step={0.1}
                          value={vendorCustomCommissionRate}
                          onChange={e => setVendorCustomCommissionRate(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Leave blank to use default"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Subscription Status</label>
                        <select value={vendorSubscriptionStatus} onChange={e => setVendorSubscriptionStatus(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="">— Select —</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="trial">Trial</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3 pt-1">
                      <Toggle label="Is Active" description="Vendor profile is active and visible"
                        enabled={vendorIsActive} onChange={setVendorIsActive} />
                      <Toggle label="Is Suspended" description="Vendor profile is suspended"
                        enabled={vendorIsSuspended} onChange={setVendorIsSuspended} />
                    </div>
                    {vendorIsSuspended && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Suspension Reason</label>
                        <textarea value={vendorSuspensionReason} onChange={e => setVendorSuspensionReason(e.target.value)} rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                      </div>
                    )}
                  </div>
                </>
              )}

              {role === 'teacher' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                  <h2 className="text-lg font-semibold text-gray-800">Teacher Profile</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                      <textarea value={teacherBio} onChange={e => setTeacherBio(e.target.value)} rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialization</label>
                      <input type="text" value={teacherSpecialization} onChange={e => setTeacherSpecialization(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Subjects (comma-separated)</label>
                      <input type="text" value={teacherSubjects} onChange={e => setTeacherSubjects(e.target.value)}
                        placeholder="Math, Physics, Chemistry"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience</label>
                      <input type="number" min={0} value={teacherYearsOfExp} onChange={e => setTeacherYearsOfExp(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Teaching Mode</label>
                      <select value={teacherMode} onChange={e => setTeacherMode(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        {TEACHING_MODE_OPTIONS.map(m => (
                          <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification Status</label>
                      <select value={teacherVerificationStatus} onChange={e => setTeacherVerificationStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        {VERIFICATION_STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Commission Rate (%)</label>
                      <input type="number" min={0} max={100} step={0.1} value={teacherCommissionRate}
                        onChange={e => setTeacherCommissionRate(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Payout Schedule</label>
                      <select value={teacherPayoutSchedule} onChange={e => setTeacherPayoutSchedule(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        {PAYOUT_SCHEDULE_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3 pt-1">
                    <Toggle label="Is Active" description="Teacher profile is active"
                      enabled={teacherIsActive} onChange={setTeacherIsActive} />
                    <Toggle label="Is Suspended" description="Teacher profile is suspended"
                      enabled={teacherIsSuspended} onChange={setTeacherIsSuspended} />
                  </div>
                </div>
              )}

              {role === 'employee' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                  <h2 className="text-lg font-semibold text-gray-800">Employee Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee ID</label>
                      <input type="text" value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee Role</label>
                      <select value={employeeRole} onChange={e => setEmployeeRole(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">— Select role —</option>
                        {EMPLOYEE_ROLE_OPTIONS.map(r => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select value={empStatus} onChange={e => setEmpStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Vendor ID</label>
                      <input type="text" value={empVendorId} onChange={e => setEmpVendorId(e.target.value)}
                        placeholder="ObjectId (optional)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Small reusable toggle component
interface ToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
    <div>
      <div className="text-sm font-medium text-gray-800">{label}</div>
      <div className="text-xs text-gray-500 mt-0.5">{description}</div>
    </div>
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none
                  ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                    ${enabled ? 'translate-x-6' : 'translate-x-0'}`}
      />
      <span className="sr-only">{enabled ? <FaCheck /> : <FaTimes />}</span>
    </button>
  </div>
);

export default AdminUserEditPage;
