import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaSave, FaSpinner } from 'react-icons/fa';
import api from '../../services/api';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

const AdminVendorCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [website, setWebsite] = useState('');
  const [paymentMode, setPaymentMode] = useState<'platform_stripe' | 'custom_stripe'>('platform_stripe');
  const [commissionRate, setCommissionRate] = useState(5);
  const [subscriptionAmount, setSubscriptionAmount] = useState(150);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!firstName) newErrors.firstName = 'First name is required';
    if (!lastName) newErrors.lastName = 'Last name is required';
    if (!email) newErrors.email = 'Email is required';
    if (!businessName) newErrors.businessName = 'Business name is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const response = await api.post('/admin/vendors', {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password: password || undefined,
        businessName,
        description: description || undefined,
        category: category || undefined,
        website: website || undefined,
        paymentMode,
        commissionRate: paymentMode === 'platform_stripe' ? commissionRate : undefined,
        subscriptionAmount: paymentMode === 'custom_stripe' ? subscriptionAmount : undefined,
      });
      const vendorId = response.data?.data?.vendor?.id;
      const tempPassword = response.data?.data?.temporaryPassword;
      if (tempPassword) {
        toast.success(
          `Vendor created. Temporary password: ${tempPassword}\nShare this with the vendor now — it will not be shown again.`,
          { duration: 15000 },
        );
      } else {
        toast.success('Vendor created successfully');
      }
      navigate(vendorId ? `/admin/vendors/${vendorId}` : '/admin/vendors');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create vendor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PrivatePageSEO title="Create Vendor — Admin" description="Create a new vendor account" />
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/admin/vendors')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <FaArrowLeft />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Create Vendor</h1>
            </div>
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-60 font-medium">
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
              {saving ? 'Creating…' : 'Create Vendor'}
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">Owner Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>First Name</label>
                <input className={`${inputCls} ${errors.firstName ? 'border-red-500' : ''}`} value={firstName} onChange={e => setFirstName(e.target.value)} />
                {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input className={`${inputCls} ${errors.lastName ? 'border-red-500' : ''}`} value={lastName} onChange={e => setLastName(e.target.value)} />
                {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={`${inputCls} ${errors.email ? 'border-red-500' : ''}`} value={email} onChange={e => setEmail(e.target.value)} />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Password</label>
                <input type="text" className={inputCls} value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to auto-generate a temporary password" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelCls}>Business Name</label>
                <input className={`${inputCls} ${errors.businessName ? 'border-red-500' : ''}`} value={businessName} onChange={e => setBusinessName(e.target.value)} />
                {errors.businessName && <p className="text-sm text-red-500 mt-1">{errors.businessName}</p>}
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <input className={inputCls} value={category} onChange={e => setCategory(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Website</label>
                <input className={inputCls} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea className={inputCls} rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">Payment Model</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Payment Model</label>
                <select className={inputCls} value={paymentMode} onChange={e => setPaymentMode(e.target.value as 'platform_stripe' | 'custom_stripe')}>
                  <option value="platform_stripe">Commission Model (Default)</option>
                  <option value="custom_stripe">Subscription Model</option>
                </select>
              </div>
              {paymentMode === 'platform_stripe' ? (
                <div>
                  <label className={labelCls}>Commission Rate (%)</label>
                  <input type="number" min={0} max={100} step={0.5} className={inputCls} value={commissionRate} onChange={e => setCommissionRate(Number(e.target.value))} />
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Monthly Subscription (AED)</label>
                  <input type="number" min={0} className={inputCls} value={subscriptionAmount} onChange={e => setSubscriptionAmount(Number(e.target.value))} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminVendorCreatePage;
