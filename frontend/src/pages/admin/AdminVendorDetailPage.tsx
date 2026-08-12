import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Edit, Save, X, CreditCard, Power, Banknote, Trash2,
  CheckCircle, XCircle, Building2, UserCircle2, FileBadge2, Wallet, ShieldCheck,
} from 'lucide-react';
import { FaSpinner } from 'react-icons/fa';
import api from '../../services/api';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';

interface VendorDoc {
  url: string;
  uploadedAt?: string;
  status?: string;
}

interface SubscriptionPayment {
  paymentDate: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  transactionId?: string;
  invoiceUrl?: string;
}

interface CommissionAgreement {
  rate: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}

interface VendorDetail {
  id: string;
  businessName: string;
  description?: string;
  category?: string;
  website?: string;
  profileVideoUrl?: string;
  videoDescription?: string;
  languagesSpoken?: string[];
  coverImage?: string;
  slug?: string;
  email: string;
  phone: string;
  contactPerson?: { name?: string; position?: string; email?: string; phone?: string };
  address?: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
  socialMedia?: { facebook?: string; instagram?: string; twitter?: string; linkedin?: string; youtube?: string; website?: string };
  taxInformation?: { taxId?: string; businessType?: string; registrationNumber?: string; vatNumber?: string };
  verificationNotes?: string;
  memberSince?: string;
  user?: {
    firstName: string; lastName: string; email: string; phone?: string;
    status?: string; lastLogin?: string; isEmailVerified?: boolean; isPhoneVerified?: boolean; createdAt?: string;
  };
  paymentSettings: {
    paymentMode: 'platform_stripe' | 'custom_stripe';
    commissionRate: number;
    customCommissionRate?: number;
    commissionAgreements?: CommissionAgreement[];
    subscriptionStatus?: string;
    subscriptionAmount?: number;
    subscriptionPaidUntil?: string;
    subscriptionCancelAtPeriodEnd?: boolean;
    subscriptionHistory?: SubscriptionPayment[];
    payoutSchedule?: string;
    minimumPayout?: number;
    preferredPayoutMethod?: string;
    bankAccountDetails?: {
      accountHolderName?: string; bankName?: string; accountNumber?: string;
      routingNumber?: string; iban?: string; swiftCode?: string; country?: string; accountType?: string;
    };
    acceptsPlatformPayments?: boolean;
    autoPayoutEnabled?: boolean;
    stripeConnect?: {
      accountId?: string; onboardingComplete?: boolean;
      capabilities?: { card_payments?: string; transfers?: string };
      testMode?: boolean; subscriptionStatus?: string; currentPeriodEnd?: string;
    };
  };
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  verificationStatus: string;
  verificationDocuments?: {
    businessLicense?: VendorDoc;
    taxCertificate?: VendorDoc;
    identityDocument?: VendorDoc;
    [key: string]: VendorDoc | undefined;
  };
  logo?: string;
  stats?: { totalEvents: number; totalBookings: number; totalRevenue: number; averageRating: number; totalReviews: number };
  createdAt: string;
}

type TabType = 'business' | 'owner' | 'legal' | 'financial' | 'verification';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent';
const labelCls = 'block text-xs font-medium text-gray-500 uppercase mb-1';

const AdminVendorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(location.pathname.endsWith('/edit'));
  const [activeTab, setActiveTab] = useState<TabType>('business');

  // Editable fields
  const [form, setForm] = useState<Record<string, any>>({});

  // Payment mode / status action modal (quick actions, kept as small popups)
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'paymentMode' | 'status'>('paymentMode');
  const [paymentMode, setPaymentMode] = useState<'platform_stripe' | 'custom_stripe'>('platform_stripe');
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [subscriptionAmount, setSubscriptionAmount] = useState<number>(150);
  const [isActive, setIsActive] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');

  const fetchVendor = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/admin/vendors/${id}`);
      const v: VendorDetail = response.data.data.vendor;
      setVendor(v);
      setForm({
        firstName: v.user?.firstName || '',
        lastName: v.user?.lastName || '',
        businessName: v.businessName || '',
        description: v.description || '',
        category: v.category || '',
        website: v.website || '',
        email: v.email || '',
        phone: v.phone || '',
        contactName: v.contactPerson?.name || '',
        contactPosition: v.contactPerson?.position || '',
        contactEmail: v.contactPerson?.email || '',
        contactPhone: v.contactPerson?.phone || '',
        street: v.address?.street || '',
        city: v.address?.city || '',
        state: v.address?.state || '',
        zipCode: v.address?.zipCode || '',
        country: v.address?.country || '',
        taxId: v.taxInformation?.taxId || '',
        businessType: v.taxInformation?.businessType || '',
        registrationNumber: v.taxInformation?.registrationNumber || '',
        vatNumber: v.taxInformation?.vatNumber || '',
        facebook: v.socialMedia?.facebook || '',
        instagram: v.socialMedia?.instagram || '',
        twitter: v.socialMedia?.twitter || '',
        linkedin: v.socialMedia?.linkedin || '',
        payoutSchedule: 'monthly',
        minimumPayout: v.paymentSettings?.minimumPayout ?? 50,
        preferredPayoutMethod: v.paymentSettings?.preferredPayoutMethod === 'stripe' ? 'stripe' : 'bank_transfer',
        logo: v.logo || '',
        coverImage: v.coverImage || '',
        profileVideoUrl: v.profileVideoUrl || '',
        videoDescription: v.videoDescription || '',
        languagesSpoken: (v.languagesSpoken || []).join(', '),
        verificationNotes: v.verificationNotes || '',
        accountHolderName: v.paymentSettings?.bankAccountDetails?.accountHolderName || '',
        bankName: v.paymentSettings?.bankAccountDetails?.bankName || '',
        accountNumber: v.paymentSettings?.bankAccountDetails?.accountNumber || '',
        routingNumber: v.paymentSettings?.bankAccountDetails?.routingNumber || '',
        iban: v.paymentSettings?.bankAccountDetails?.iban || '',
        swiftCode: v.paymentSettings?.bankAccountDetails?.swiftCode || '',
        bankCountry: v.paymentSettings?.bankAccountDetails?.country || '',
        accountType: v.paymentSettings?.bankAccountDetails?.accountType || 'checking',
      });
    } catch (err) {
      logger.error('Failed to fetch vendor details:', err);
      toast.error('Failed to load vendor');
      navigate('/admin/vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/admin/vendors/${id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        businessName: form.businessName,
        description: form.description,
        category: form.category,
        website: form.website,
        email: form.email,
        phone: form.phone,
        contactPerson: {
          name: form.contactName,
          position: form.contactPosition,
          email: form.contactEmail,
          phone: form.contactPhone,
        },
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: form.country,
        },
        taxInformation: {
          taxId: form.taxId,
          businessType: form.businessType,
          registrationNumber: form.registrationNumber,
          vatNumber: form.vatNumber,
        },
        socialMedia: {
          facebook: form.facebook,
          instagram: form.instagram,
          twitter: form.twitter,
          linkedin: form.linkedin,
        },
        payoutSchedule: form.payoutSchedule,
        minimumPayout: Number(form.minimumPayout),
        preferredPayoutMethod: form.preferredPayoutMethod,
        logo: form.logo,
        coverImage: form.coverImage,
        profileVideoUrl: form.profileVideoUrl,
        videoDescription: form.videoDescription,
        languagesSpoken: form.languagesSpoken
          ? form.languagesSpoken.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        verificationNotes: form.verificationNotes,
        bankAccountDetails: {
          accountHolderName: form.accountHolderName,
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          routingNumber: form.routingNumber,
          iban: form.iban,
          swiftCode: form.swiftCode,
          country: form.bankCountry,
          accountType: form.accountType,
        },
      });
      toast.success('Vendor updated successfully');
      setEditMode(false);
      navigate(`/admin/vendors/${id}`, { replace: true });
      fetchVendor();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update vendor');
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModeModal = () => {
    if (!vendor) return;
    setPaymentMode(vendor.paymentSettings.paymentMode);
    setCommissionRate(vendor.paymentSettings.commissionRate);
    setSubscriptionAmount(vendor.paymentSettings.subscriptionAmount || 150);
    setModalMode('paymentMode');
    setShowModal(true);
  };

  const openStatusModal = () => {
    if (!vendor) return;
    setIsActive(vendor.isActive);
    setIsSuspended(vendor.isSuspended);
    setSuspensionReason('');
    setModalMode('status');
    setShowModal(true);
  };

  const handleUpdatePaymentMode = async () => {
    if (!id) return;
    try {
      await api.put(`/admin/vendors/${id}/payment-mode`, {
        paymentMode,
        commissionRate: paymentMode === 'platform_stripe' ? commissionRate : undefined,
        subscriptionAmount: paymentMode === 'custom_stripe' ? subscriptionAmount : undefined,
      });
      toast.success('Payment mode updated');
      setShowModal(false);
      fetchVendor();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update payment mode');
    }
  };

  const handleUpdateStatus = async () => {
    if (!id) return;
    try {
      await api.put(`/admin/vendors/${id}/status`, {
        isActive,
        isSuspended,
        suspensionReason: isSuspended ? suspensionReason : undefined,
      });
      toast.success('Vendor status updated');
      setShowModal(false);
      fetchVendor();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleUpdateVerification = async (status: string) => {
    if (!id) return;
    try {
      await api.put(`/admin/vendors/${id}/verification`, { verificationStatus: status });
      toast.success(`Vendor verification ${status}`);
      fetchVendor();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update verification');
    }
  };

  const handleVerifyDocument = async (docType: string, status: 'approved' | 'rejected') => {
    if (!id) return;
    try {
      await api.patch(`/admin/vendors/${id}/verify-document`, { docType, status });
      toast.success(`Document ${status}`);
      fetchVendor();
    } catch {
      toast.error('Failed to update document');
    }
  };

  const handleAddManualPayment = async () => {
    if (!id) return;
    if (!window.confirm('Add a manual subscription payment for this vendor? This will extend their subscription by 1 month.')) return;
    try {
      await api.put(`/admin/vendors/${id}/subscription-status`, { addPayment: true });
      toast.success('Manual payment added successfully');
      fetchVendor();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add payment');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Delete this vendor? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/vendors/${id}`);
      toast.success('Vendor deleted successfully');
      navigate('/admin/vendors');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-6 text-center text-gray-500">
        Vendor not found.{' '}
        <button onClick={() => navigate('/admin/vendors')} className="text-orange-600 hover:underline">
          Back to Vendors
        </button>
      </div>
    );
  }

  const docLabels: Record<string, string> = {
    businessLicense: 'Business License',
    taxCertificate: 'Tax Certificate',
    identityDocument: 'Identity Document',
  };

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'business', label: 'Business Info', icon: Building2 },
    { id: 'owner', label: 'Owner & Address', icon: UserCircle2 },
    { id: 'legal', label: 'Tax & Social', icon: FileBadge2 },
    { id: 'financial', label: 'Payment & Payout', icon: Wallet },
    { id: 'verification', label: 'Verification', icon: ShieldCheck },
  ];

  return (
    <>
      <PrivatePageSEO title={`${vendor.businessName} | Vendor Detail — Admin`} description="Vendor detail page" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/admin/vendors')} className="p-2 hover:bg-gray-100 rounded-lg mt-0.5">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              {vendor.logo && (
                <img src={vendor.logo} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{vendor.businessName}</h1>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">ID: {vendor.id}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {!editMode ? (
              <>
                <button
                  onClick={openPaymentModeModal}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                >
                  <CreditCard className="w-4 h-4" /> Payment Mode
                </button>
                <button
                  onClick={openStatusModal}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 text-sm font-medium"
                >
                  <Power className="w-4 h-4" /> Status
                </button>
                {vendor.paymentSettings.paymentMode === 'custom_stripe' && (
                  <button
                    onClick={handleAddManualPayment}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-sm font-medium"
                  >
                    <Banknote className="w-4 h-4" /> Manual Payment
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setEditMode(false); fetchVendor(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {vendor.isActive ? 'Active' : 'Inactive'}
          </span>
          {vendor.isSuspended && (
            <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-red-100 text-red-800">Suspended</span>
          )}
          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
            vendor.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
            vendor.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            vendor.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {vendor.verificationStatus}
          </span>
          <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
            {vendor.paymentSettings.paymentMode === 'custom_stripe' ? 'Subscription' : 'Commission'}
          </span>
          <span className="text-sm text-gray-500">{vendor.email}</span>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="space-y-6">
          {activeTab === 'business' && (
            <>
              <Section title="Business Information">
                {editMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Business Name"><input className={inputCls} value={form.businessName} onChange={e => handleChange('businessName', e.target.value)} /></Field>
                    <Field label="Category"><input className={inputCls} value={form.category} onChange={e => handleChange('category', e.target.value)} /></Field>
                    <Field label="Website"><input className={inputCls} value={form.website} onChange={e => handleChange('website', e.target.value)} /></Field>
                    <div className="md:col-span-2">
                      <Field label="Description"><textarea className={inputCls} rows={3} value={form.description} onChange={e => handleChange('description', e.target.value)} /></Field>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    <DetailRow label="Category" value={vendor.category || '-'} />
                    <DetailRow label="Website" value={vendor.website || '-'} />
                    <DetailRow label="Member Since" value={new Date(vendor.createdAt).toLocaleDateString()} />
                    <DetailRow label="Slug" value={vendor.slug || '-'} />
                    <DetailRow label="Description" value={vendor.description || '-'} />
                  </div>
                )}
              </Section>

              <Section title="Media & Branding">
                {editMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Logo URL"><input className={inputCls} value={form.logo} onChange={e => handleChange('logo', e.target.value)} placeholder="https://..." /></Field>
                    <Field label="Cover Image URL"><input className={inputCls} value={form.coverImage} onChange={e => handleChange('coverImage', e.target.value)} placeholder="https://..." /></Field>
                    <Field label="Profile Video URL"><input className={inputCls} value={form.profileVideoUrl} onChange={e => handleChange('profileVideoUrl', e.target.value)} placeholder="https://..." /></Field>
                    <Field label="Languages Spoken (comma-separated)"><input className={inputCls} value={form.languagesSpoken} onChange={e => handleChange('languagesSpoken', e.target.value)} placeholder="English, Arabic" /></Field>
                    <div className="md:col-span-2">
                      <Field label="Video Description"><textarea className={inputCls} rows={2} value={form.videoDescription} onChange={e => handleChange('videoDescription', e.target.value)} /></Field>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    <DetailRow label="Logo" value={vendor.logo || '-'} />
                    <DetailRow label="Cover Image" value={vendor.coverImage || '-'} />
                    <DetailRow label="Profile Video" value={vendor.profileVideoUrl || '-'} />
                    <DetailRow label="Languages Spoken" value={vendor.languagesSpoken?.length ? vendor.languagesSpoken.join(', ') : '-'} />
                    <DetailRow label="Video Description" value={vendor.videoDescription || '-'} />
                  </div>
                )}
              </Section>

              {vendor.stats && (
                <Section title="Statistics">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatBlock label="Events" value={String(vendor.stats.totalEvents)} />
                    <StatBlock label="Bookings" value={String(vendor.stats.totalBookings)} />
                    <StatBlock label="Revenue" value={`AED ${vendor.stats.totalRevenue}`} />
                    <StatBlock label="Avg Rating" value={vendor.stats.averageRating?.toFixed(1) ?? '-'} />
                    <StatBlock label="Reviews" value={String(vendor.stats.totalReviews)} />
                  </div>
                </Section>
              )}
            </>
          )}

          {activeTab === 'owner' && (
            <>
              <Section title="Owner & Contact">
                {editMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Owner First Name"><input className={inputCls} value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} /></Field>
                    <Field label="Owner Last Name"><input className={inputCls} value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} /></Field>
                    <Field label="Business Email"><input className={inputCls} type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} /></Field>
                    <Field label="Business Phone"><input className={inputCls} value={form.phone} onChange={e => handleChange('phone', e.target.value)} /></Field>
                    <Field label="Contact Person Name"><input className={inputCls} value={form.contactName} onChange={e => handleChange('contactName', e.target.value)} /></Field>
                    <Field label="Contact Position"><input className={inputCls} value={form.contactPosition} onChange={e => handleChange('contactPosition', e.target.value)} /></Field>
                    <Field label="Contact Email"><input className={inputCls} value={form.contactEmail} onChange={e => handleChange('contactEmail', e.target.value)} /></Field>
                    <Field label="Contact Phone"><input className={inputCls} value={form.contactPhone} onChange={e => handleChange('contactPhone', e.target.value)} /></Field>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    <DetailRow label="Owner" value={vendor.user ? `${vendor.user.firstName} ${vendor.user.lastName}` : '-'} />
                    <DetailRow label="Account Email" value={vendor.user?.email || '-'} />
                    <DetailRow label="Business Email" value={vendor.email} />
                    <DetailRow label="Business Phone" value={vendor.phone} />
                    <DetailRow label="Contact Person" value={vendor.contactPerson?.name || '-'} />
                    <DetailRow label="Contact Position" value={vendor.contactPerson?.position || '-'} />
                    <DetailRow label="Contact Email" value={vendor.contactPerson?.email || '-'} />
                    <DetailRow label="Contact Phone" value={vendor.contactPerson?.phone || '-'} />
                    <DetailRow label="Account Status" value={vendor.user?.status || '-'} />
                    <DetailRow label="Email Verified" value={vendor.user?.isEmailVerified ? 'Yes' : 'No'} />
                    <DetailRow label="Phone Verified" value={vendor.user?.isPhoneVerified ? 'Yes' : 'No'} />
                    <DetailRow label="Last Login" value={vendor.user?.lastLogin ? new Date(vendor.user.lastLogin).toLocaleString() : 'Never'} />
                  </div>
                )}
              </Section>

              <Section title="Address">
                {editMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Street"><input className={inputCls} value={form.street} onChange={e => handleChange('street', e.target.value)} /></Field>
                    <Field label="City"><input className={inputCls} value={form.city} onChange={e => handleChange('city', e.target.value)} /></Field>
                    <Field label="State"><input className={inputCls} value={form.state} onChange={e => handleChange('state', e.target.value)} /></Field>
                    <Field label="Zip Code"><input className={inputCls} value={form.zipCode} onChange={e => handleChange('zipCode', e.target.value)} /></Field>
                    <Field label="Country"><input className={inputCls} value={form.country} onChange={e => handleChange('country', e.target.value)} /></Field>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    <DetailRow label="Street" value={vendor.address?.street || '-'} />
                    <DetailRow label="City" value={vendor.address?.city || '-'} />
                    <DetailRow label="State" value={vendor.address?.state || '-'} />
                    <DetailRow label="Zip Code" value={vendor.address?.zipCode || '-'} />
                    <DetailRow label="Country" value={vendor.address?.country || '-'} />
                  </div>
                )}
              </Section>
            </>
          )}

          {activeTab === 'legal' && (
            <>
              <Section title="Tax & Legal">
                {editMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Tax ID"><input className={inputCls} value={form.taxId} onChange={e => handleChange('taxId', e.target.value)} /></Field>
                    <Field label="Business Type"><input className={inputCls} value={form.businessType} onChange={e => handleChange('businessType', e.target.value)} /></Field>
                    <Field label="Registration Number"><input className={inputCls} value={form.registrationNumber} onChange={e => handleChange('registrationNumber', e.target.value)} /></Field>
                    <Field label="VAT Registration Number"><input className={inputCls} value={form.vatNumber} onChange={e => handleChange('vatNumber', e.target.value)} /></Field>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    <DetailRow label="Tax ID" value={vendor.taxInformation?.taxId || '-'} />
                    <DetailRow label="Business Type" value={vendor.taxInformation?.businessType || '-'} />
                    <DetailRow label="Registration Number" value={vendor.taxInformation?.registrationNumber || '-'} />
                    <DetailRow label="VAT Registration Number" value={vendor.taxInformation?.vatNumber || '-'} />
                  </div>
                )}
              </Section>

              <Section title="Social Media">
                {editMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Facebook"><input className={inputCls} value={form.facebook} onChange={e => handleChange('facebook', e.target.value)} /></Field>
                    <Field label="Instagram"><input className={inputCls} value={form.instagram} onChange={e => handleChange('instagram', e.target.value)} /></Field>
                    <Field label="Twitter / X"><input className={inputCls} value={form.twitter} onChange={e => handleChange('twitter', e.target.value)} /></Field>
                    <Field label="LinkedIn"><input className={inputCls} value={form.linkedin} onChange={e => handleChange('linkedin', e.target.value)} /></Field>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    <DetailRow label="Facebook" value={vendor.socialMedia?.facebook || '-'} />
                    <DetailRow label="Instagram" value={vendor.socialMedia?.instagram || '-'} />
                    <DetailRow label="Twitter / X" value={vendor.socialMedia?.twitter || '-'} />
                    <DetailRow label="LinkedIn" value={vendor.socialMedia?.linkedin || '-'} />
                  </div>
                )}
              </Section>
            </>
          )}

          {activeTab === 'financial' && (
            <>
              <Section title="Payment & Payout">
                {editMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Payout Schedule">
                      <select className={inputCls} value={form.payoutSchedule} onChange={e => handleChange('payoutSchedule', e.target.value)}>
                        <option value="monthly">Monthly</option>
                      </select>
                    </Field>
                    <Field label="Minimum Payout (AED)"><input type="number" className={inputCls} value={form.minimumPayout} onChange={e => handleChange('minimumPayout', e.target.value)} /></Field>
                    <Field label="Preferred Payout Method">
                      <select className={inputCls} value={form.preferredPayoutMethod} onChange={e => handleChange('preferredPayoutMethod', e.target.value)}>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="stripe" disabled={!vendor.paymentSettings.stripeConnect?.accountId}>
                          Stripe{!vendor.paymentSettings.stripeConnect?.accountId ? ' (not connected)' : ''}
                        </option>
                      </select>
                      {form.preferredPayoutMethod === 'stripe' && !vendor.paymentSettings.stripeConnect?.accountId && (
                        <p className="text-xs text-amber-600 mt-1">
                          Vendor hasn't connected a Stripe account yet — payouts will fall back to bank transfer until they complete onboarding. See the Stripe Connect section below.
                        </p>
                      )}
                      {vendor.paymentSettings.stripeConnect?.accountId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Stripe account info is set by the vendor via Connect onboarding, not entered here — see Stripe Connect below.
                        </p>
                      )}
                    </Field>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    <DetailRow label="Payment Model" value={vendor.paymentSettings.paymentMode === 'custom_stripe' ? 'Subscription' : 'Commission'} />
                    <DetailRow label="Commission Rate" value={`${vendor.paymentSettings.commissionRate}%`} />
                    <DetailRow label="Subscription Amount" value={`AED ${vendor.paymentSettings.subscriptionAmount ?? 150}/mo`} />
                    <DetailRow label="Subscription Status" value={vendor.paymentSettings.subscriptionStatus || '-'} />
                    <DetailRow label="Subscription Paid Until" value={vendor.paymentSettings.subscriptionPaidUntil ? new Date(vendor.paymentSettings.subscriptionPaidUntil).toLocaleDateString() : '-'} />
                    <DetailRow label="Payout Schedule" value={vendor.paymentSettings.payoutSchedule || '-'} />
                    <DetailRow label="Minimum Payout" value={vendor.paymentSettings.minimumPayout != null ? `AED ${vendor.paymentSettings.minimumPayout}` : '-'} />
                    <DetailRow label="Preferred Payout Method" value={vendor.paymentSettings.preferredPayoutMethod || '-'} />
                    <DetailRow label="Custom Commission Rate" value={vendor.paymentSettings.customCommissionRate != null ? `${vendor.paymentSettings.customCommissionRate}%` : '-'} />
                    <DetailRow label="Accepts Platform Payments" value={vendor.paymentSettings.acceptsPlatformPayments ? 'Yes' : 'No'} />
                    <DetailRow label="Auto Payout" value={vendor.paymentSettings.autoPayoutEnabled ? 'Enabled' : 'Disabled'} />
                  </div>
                )}
              </Section>

              <Section title="Bank Account Details">
                {editMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Account Holder Name"><input className={inputCls} value={form.accountHolderName} onChange={e => handleChange('accountHolderName', e.target.value)} /></Field>
                    <Field label="Bank Name"><input className={inputCls} value={form.bankName} onChange={e => handleChange('bankName', e.target.value)} /></Field>
                    <Field label="Account Number"><input className={inputCls} value={form.accountNumber} onChange={e => handleChange('accountNumber', e.target.value)} /></Field>
                    <Field label="Routing Number"><input className={inputCls} value={form.routingNumber} onChange={e => handleChange('routingNumber', e.target.value)} /></Field>
                    <Field label="IBAN"><input className={inputCls} value={form.iban} onChange={e => handleChange('iban', e.target.value)} /></Field>
                    <Field label="SWIFT Code"><input className={inputCls} value={form.swiftCode} onChange={e => handleChange('swiftCode', e.target.value)} /></Field>
                    <Field label="Country"><input className={inputCls} value={form.bankCountry} onChange={e => handleChange('bankCountry', e.target.value)} /></Field>
                    <Field label="Account Type">
                      <select className={inputCls} value={form.accountType} onChange={e => handleChange('accountType', e.target.value)}>
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </Field>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    <DetailRow label="Account Holder Name" value={vendor.paymentSettings.bankAccountDetails?.accountHolderName || '-'} />
                    <DetailRow label="Bank Name" value={vendor.paymentSettings.bankAccountDetails?.bankName || '-'} />
                    <DetailRow label="Account Number" value={maskAccountNumber(vendor.paymentSettings.bankAccountDetails?.accountNumber)} />
                    <DetailRow label="Routing Number" value={vendor.paymentSettings.bankAccountDetails?.routingNumber || '-'} />
                    <DetailRow label="IBAN" value={maskAccountNumber(vendor.paymentSettings.bankAccountDetails?.iban)} />
                    <DetailRow label="SWIFT Code" value={vendor.paymentSettings.bankAccountDetails?.swiftCode || '-'} />
                    <DetailRow label="Country" value={vendor.paymentSettings.bankAccountDetails?.country || '-'} />
                    <DetailRow label="Account Type" value={vendor.paymentSettings.bankAccountDetails?.accountType || '-'} />
                  </div>
                )}
              </Section>

              <Section title="Stripe Connect">
                <div className="divide-y divide-gray-50">
                  <DetailRow label="Connected Account ID" value={vendor.paymentSettings.stripeConnect?.accountId || '-'} />
                  <DetailRow label="Onboarding Complete" value={vendor.paymentSettings.stripeConnect?.onboardingComplete ? 'Yes' : 'No'} />
                  <DetailRow label="Test Mode" value={vendor.paymentSettings.stripeConnect?.testMode ? 'Yes' : 'No'} />
                  <DetailRow label="Card Payments" value={vendor.paymentSettings.stripeConnect?.capabilities?.card_payments || '-'} />
                  <DetailRow label="Transfers" value={vendor.paymentSettings.stripeConnect?.capabilities?.transfers || '-'} />
                  <DetailRow label="Billing Subscription Status" value={vendor.paymentSettings.stripeConnect?.subscriptionStatus || '-'} />
                  <DetailRow label="Billing Period End" value={vendor.paymentSettings.stripeConnect?.currentPeriodEnd ? new Date(vendor.paymentSettings.stripeConnect.currentPeriodEnd).toLocaleDateString() : '-'} />
                </div>
              </Section>

              {!!vendor.paymentSettings.subscriptionHistory?.length && (
                <Section title="Subscription Payment History">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                          <th className="pb-2 pr-4">Date</th>
                          <th className="pb-2 pr-4">Amount</th>
                          <th className="pb-2 pr-4">Period</th>
                          <th className="pb-2 pr-4">Status</th>
                          <th className="pb-2">Transaction ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendor.paymentSettings.subscriptionHistory!.map((p, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-4">{new Date(p.paymentDate).toLocaleDateString()}</td>
                            <td className="py-2 pr-4">AED {p.amount}</td>
                            <td className="py-2 pr-4">{new Date(p.periodStart).toLocaleDateString()} – {new Date(p.periodEnd).toLocaleDateString()}</td>
                            <td className="py-2 pr-4 capitalize">{p.status}</td>
                            <td className="py-2 text-gray-500">{p.transactionId || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {!!vendor.paymentSettings.commissionAgreements?.length && (
                <Section title="Commission Agreements">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                          <th className="pb-2 pr-4">Rate</th>
                          <th className="pb-2 pr-4">Start Date</th>
                          <th className="pb-2 pr-4">End Date</th>
                          <th className="pb-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {vendor.paymentSettings.commissionAgreements!.map((c, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-4">{c.rate}%</td>
                            <td className="py-2 pr-4">{new Date(c.startDate).toLocaleDateString()}</td>
                            <td className="py-2 pr-4">{c.endDate ? new Date(c.endDate).toLocaleDateString() : '-'}</td>
                            <td className="py-2 text-gray-500">{c.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}
            </>
          )}

          {activeTab === 'verification' && (
            <Section title="Document Verification">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-600">Current status:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  vendor.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                  vendor.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  vendor.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {vendor.verificationStatus}
                </span>
              </div>

              {vendor.verificationDocuments && Object.keys(vendor.verificationDocuments).length > 0 ? (
                <div className="space-y-2 mb-4">
                  {(['businessLicense', 'taxCertificate', 'identityDocument'] as const).map((docType) => {
                    const doc = vendor.verificationDocuments?.[docType];
                    if (!doc?.url) return null;
                    return (
                      <div key={docType} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{docLabels[docType]}</p>
                            {doc.uploadedAt && <p className="text-xs text-gray-500">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>}
                            {doc.status && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                                doc.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {doc.status}
                              </span>
                            )}
                          </div>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 underline">View</a>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleVerifyDocument(docType, 'approved')} disabled={doc.status === 'approved'}
                            className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            Approve
                          </button>
                          <button onClick={() => handleVerifyDocument(docType, 'rejected')} disabled={doc.status === 'rejected'}
                            className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-4">No documents uploaded yet.</p>
              )}

              <div className="flex gap-2">
                <button onClick={() => handleUpdateVerification('verified')} disabled={vendor.verificationStatus === 'verified'}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Approve Vendor
                </button>
                <button onClick={() => handleUpdateVerification('rejected')} disabled={vendor.verificationStatus === 'rejected'}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" /> Reject Vendor
                </button>
                <button onClick={() => handleUpdateVerification('pending')} disabled={vendor.verificationStatus === 'pending'}
                  className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Set Pending
                </button>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Payment Mode / Status quick-action modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {modalMode === 'paymentMode' ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Update Payment Model</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Model</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as 'platform_stripe' | 'custom_stripe')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                    <option value="platform_stripe">Commission Model (Default)</option>
                    <option value="custom_stripe">Subscription Model</option>
                  </select>
                </div>
                {paymentMode === 'platform_stripe' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                    <input type="number" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))}
                      min="0" max="100" step="0.5" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                  </div>
                )}
                {paymentMode === 'custom_stripe' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Subscription (AED)</label>
                    <input type="number" value={subscriptionAmount} onChange={(e) => setSubscriptionAmount(Number(e.target.value))}
                      min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleUpdatePaymentMode} className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium">Update</button>
                  <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancel</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Update Vendor Status</h2>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input type="checkbox" checked={isSuspended} onChange={(e) => setIsSuspended(e.target.checked)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Suspended</span>
                  </label>
                </div>
                {isSuspended && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Suspension Reason</label>
                    <textarea value={suspensionReason} onChange={(e) => setSuspensionReason(e.target.value)} rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="Enter reason for suspension..." />
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleUpdateStatus} className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium">Update</button>
                  <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const maskAccountNumber = (value?: string): string => {
  if (!value) return '-';
  if (value.length <= 4) return value;
  return `${'•'.repeat(value.length - 4)}${value.slice(-4)}`;
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-6">
    <h2 className="font-semibold text-gray-900 text-base mb-3">{title}</h2>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className={labelCls}>{label}</label>
    {children}
  </div>
);

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div className="w-44 shrink-0 text-gray-500 text-sm">{label}</div>
    <div className="text-sm text-gray-900 flex-1 break-words">{value}</div>
  </div>
);

const StatBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className={labelCls}>{label}</dt>
    <dd className="text-lg font-semibold text-gray-900">{value}</dd>
  </div>
);

export default AdminVendorDetailPage;
