import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaEye, FaEdit, FaCog, FaCreditCard, FaBan, FaCheck, FaLock, FaUnlock, FaTrash } from 'react-icons/fa';
import {
  useAdminTeachers,
  useUpdateTeacherStatus,
  useDeleteTeacher,
} from '@/features/admin/hooks/useAdminApis';
import { adminTeachersAPI } from '@/features/admin/services/adminApis';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';
import { AdminPageHeader, AdminStatCard, AdminStatusBadge, AdminEmptyState } from '@/shared/components/admin';

interface Teacher {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  bio?: string;
  subjects?: string[];
  specialization?: string;
  yearsOfExperience?: number;
  languagesSpoken?: string[];
  teachingMode?: string;
  paymentMode: 'platform_stripe' | 'custom_stripe';
  commissionRate?: number;
  isActive: boolean;
  isSuspended: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  stripeConnectAccountId?: string;
  stripeConnectOnboardingComplete?: boolean;
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    iban?: string;
    swiftCode?: string;
    isVerified?: boolean;
  };
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

interface TeacherStats {
  totalTeachers: number;
  activeTeachers: number;
  pendingVerification: number;
  suspendedTeachers: number;
  teachersByPaymentMode: Record<string, number>;
  teachersByVerificationStatus: Record<string, number>;
}

const AdminTeachersPage: React.FC = () => {
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'status' | 'payment' | 'view'>('view');

  const [formData, setFormData] = useState({
    fullName: '',
    bio: '',
    subjects: [] as string[],
    specialization: '',
    yearsOfExperience: 0,
    languagesSpoken: [] as string[],
    teachingMode: 'online',
  });
  const [paymentMode, setPaymentMode] = useState<'platform_stripe' | 'custom_stripe'>('platform_stripe');
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [isActive, setIsActive] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');

  const [search, setSearch] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [filterVerification, setFilterVerification] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);

  const { data: teachersResponse, isLoading, refetch } = useAdminTeachers({
    page,
    limit: '10',
    search: search || undefined,
    paymentMode: filterPaymentMode || undefined,
    verificationStatus: filterVerification || undefined,
    isActive: filterActive || undefined,
  });

  const updateTeacherStatus = useUpdateTeacherStatus();
  const deleteTeacher = useDeleteTeacher();

  const teachers: Teacher[] = teachersResponse?.data?.teachers || teachersResponse?.teachers || [];
  const totalPages = teachersResponse?.data?.pagination?.totalPages || teachersResponse?.pagination?.totalPages || 1;

  const [stats, setStats] = useState<TeacherStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminTeachersAPI.getStats();
        setStats(response.data || response);
      } catch (error) {
        logger.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  const handleUpdateVerification = async (teacherId: string, status: 'verified' | 'rejected' | 'pending') => {
    try {
      await updateTeacherStatus.mutateAsync({ id: teacherId, data: { verificationStatus: status } });
      toast.success(`Teacher verification ${status}`);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update verification');
    }
  };

  const openViewModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setModalMode('view');
    setShowModal(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      fullName: teacher.fullName || '',
      bio: teacher.bio || '',
      subjects: teacher.subjects || [],
      specialization: teacher.specialization || '',
      yearsOfExperience: teacher.yearsOfExperience || 0,
      languagesSpoken: teacher.languagesSpoken || [],
      teachingMode: teacher.teachingMode || 'online',
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const openStatusModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsActive(teacher.isActive);
    setIsSuspended(teacher.isSuspended);
    setVerificationStatus(teacher.verificationStatus);
    setModalMode('status');
    setShowModal(true);
  };

  const openPaymentModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setPaymentMode(teacher.paymentMode);
    setCommissionRate(teacher.commissionRate || 10);
    setModalMode('payment');
    setShowModal(true);
  };

  const handleUpdateTeacher = async () => {
    if (!selectedTeacher) return;

    try {
      await adminTeachersAPI.update(selectedTeacher._id, formData);
      toast.success('Teacher updated successfully');
      setShowModal(false);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update teacher');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTeacher) return;

    try {
      await updateTeacherStatus.mutateAsync({
        id: selectedTeacher._id,
        data: { isActive, isSuspended, verificationStatus },
      });
      toast.success('Teacher status updated successfully');
      setShowModal(false);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleUpdatePaymentMode = async () => {
    if (!selectedTeacher) return;

    try {
      await adminTeachersAPI.updatePaymentMode(selectedTeacher._id, {
        paymentMode,
        commissionRate: paymentMode === 'platform_stripe' ? commissionRate : undefined,
      });
      toast.success(`Payment mode updated to ${paymentMode === 'platform_stripe' ? 'Commission' : 'Subscription'}`);
      setShowModal(false);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update payment mode');
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) return;

    try {
      await deleteTeacher.mutateAsync(teacherId);
      toast.success('Teacher deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete teacher');
    }
  };

  const handleQuickToggleActive = async (teacher: Teacher) => {
    try {
      await adminTeachersAPI.toggleActive(teacher._id);
      toast.success(`Teacher ${!teacher.isActive ? 'activated' : 'deactivated'}`);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleQuickToggleSuspend = async (teacher: Teacher) => {
    try {
      await adminTeachersAPI.toggleSuspension(teacher._id);
      toast.success(`Teacher ${!teacher.isSuspended ? 'suspended' : 'unsuspended'}`);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to toggle suspension');
    }
  };

  const getVerificationBadgeColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <>
      <PrivatePageSEO title="Admin - Teachers | Gema" description="Manage teachers and teaching profiles" />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <AdminPageHeader
            title="Teacher Management"
            description="Manage teacher profiles, verification, and payment settings"
          />

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <AdminStatCard label="Total Teachers" value={stats.totalTeachers} color="bg-blue-500" icon={<span className="text-xl">👨‍🏫</span>} />
              <AdminStatCard label="Active Teachers" value={stats.activeTeachers} color="bg-green-500" icon={<span className="text-xl">✅</span>} />
              <AdminStatCard label="Pending Verification" value={stats.pendingVerification} color="bg-yellow-500" icon={<span className="text-xl">⏳</span>} />
              <AdminStatCard label="Suspended" value={stats.suspendedTeachers} color="bg-red-500" icon={<span className="text-xl">🚫</span>} />
              <AdminStatCard label="Commission Model" value={stats.teachersByPaymentMode?.platform_stripe || 0} color="bg-purple-500" icon={<span className="text-xl">💰</span>} />
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label htmlFor="teacher-search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input type="text" id="teacher-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-gray-900" />
              </div>
              <div>
                <label htmlFor="filter-payment" className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select id="filter-payment" value={filterPaymentMode} onChange={(e) => setFilterPaymentMode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900">
                  <option value="">All</option>
                  <option value="platform_stripe">Commission</option>
                  <option value="custom_stripe">Subscription</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-verification" className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
                <select id="filter-verification" value={filterVerification} onChange={(e) => setFilterVerification(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900">
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label htmlFor="filter-active" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="filter-active" value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900">
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => { setSearch(''); setFilterPaymentMode(''); setFilterVerification(''); setFilterActive(''); }} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Clear Filters</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading teachers...</p>
              </div>
            ) : teachers.length === 0 ? (
              <AdminEmptyState title="No teachers found" description="Try adjusting your filters" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teachers.map((teacher, index) => (
                      <tr key={teacher._id || index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{teacher.fullName}</div>
                            <div className="text-sm text-gray-500">{teacher.email}</div>
                            <div className="text-xs text-gray-400">{teacher.phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{teacher.specialization || '-'}</div>
                          <div className="text-xs text-gray-500">{teacher.yearsOfExperience ? `${teacher.yearsOfExperience} yrs exp` : ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <AdminStatusBadge status={teacher.paymentMode === 'custom_stripe' ? 'Subscription' : 'Commission'} variant={teacher.paymentMode === 'custom_stripe' ? 'info' : 'default'} />
                          {teacher.paymentMode === 'platform_stripe' && teacher.commissionRate && (
                            <div className="text-xs text-gray-500 mt-1">{teacher.commissionRate}%</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerificationBadgeColor(teacher.verificationStatus)}`}>{teacher.verificationStatus}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <AdminStatusBadge status={teacher.isActive ? 'Active' : 'Inactive'} variant={teacher.isActive ? 'success' : 'danger'} />
                            {teacher.isSuspended && <AdminStatusBadge status="Suspended" variant="danger" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openViewModal(teacher)} title="View" className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"><FaEye /></button>
                            <button onClick={() => openEditModal(teacher)} title="Edit" className="p-2 rounded-lg text-blue-600 hover:text-blue-900 hover:bg-blue-50 transition-colors"><FaEdit /></button>
                            <button onClick={() => openStatusModal(teacher)} title="Status" className="p-2 rounded-lg text-orange-600 hover:text-orange-900 hover:bg-orange-50 transition-colors"><FaCog /></button>
                            <button onClick={() => openPaymentModal(teacher)} title="Payment" className="p-2 rounded-lg text-purple-600 hover:text-purple-900 hover:bg-purple-50 transition-colors"><FaCreditCard /></button>
                            <button onClick={() => handleQuickToggleActive(teacher)} title={teacher.isActive ? 'Deactivate' : 'Activate'} className={`p-2 rounded-lg transition-colors ${teacher.isActive ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50' : 'text-green-600 hover:text-green-900 hover:bg-green-50'}`}>{teacher.isActive ? <FaBan /> : <FaCheck />}</button>
                            <button onClick={() => handleQuickToggleSuspend(teacher)} title={teacher.isSuspended ? 'Unsuspend' : 'Suspend'} className={`p-2 rounded-lg transition-colors ${teacher.isSuspended ? 'text-green-600 hover:text-green-900 hover:bg-green-50' : 'text-red-600 hover:text-red-900 hover:bg-red-50'}`}>{teacher.isSuspended ? <FaUnlock /> : <FaLock />}</button>
                            <button onClick={() => handleDeleteTeacher(teacher._id)} title="Delete" className="p-2 rounded-lg text-red-600 hover:text-red-900 hover:bg-red-50 transition-colors"><FaTrash /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Previous</button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">Next</button>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && selectedTeacher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              {modalMode === 'view' && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Teacher Details</h2>
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Profile</h3>
                    <div className="space-y-2">
                      {[['Name', selectedTeacher.fullName], ['Email', selectedTeacher.email], ['Phone', selectedTeacher.phone || 'N/A'], ['Specialization', selectedTeacher.specialization || 'N/A'], ['Subjects', selectedTeacher.subjects?.join(', ') || 'N/A'], ['Experience', selectedTeacher.yearsOfExperience ? `${selectedTeacher.yearsOfExperience} years` : 'N/A'], ['Languages', selectedTeacher.languagesSpoken?.join(', ') || 'N/A'], ['Teaching Mode', selectedTeacher.teachingMode || 'N/A'], ['Joined', new Date(selectedTeacher.createdAt).toLocaleDateString()]].map(([label, value]) => (
                        <div key={label} className="flex gap-2"><span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}:</span><span className="text-sm font-medium text-gray-800 break-all">{value as string}</span></div>
                      ))}
                      {selectedTeacher.bio && (<div className="flex gap-2"><span className="text-xs text-gray-500 w-28 flex-shrink-0">Bio:</span><span className="text-sm text-gray-800 line-clamp-3">{selectedTeacher.bio}</span></div>)}
                    </div>
                  </div>

                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Verification</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selectedTeacher.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' : selectedTeacher.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{selectedTeacher.verificationStatus}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { handleUpdateVerification(selectedTeacher._id, 'verified'); }} disabled={selectedTeacher.verificationStatus === 'verified'} className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Approve</button>
                      <button onClick={() => { handleUpdateVerification(selectedTeacher._id, 'rejected'); }} disabled={selectedTeacher.verificationStatus === 'rejected'} className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Reject</button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Payment & Stripe</h3>
                    <div className="space-y-2">
                      {[['Payment Mode', selectedTeacher.paymentMode || 'platform_stripe'], ['Commission Rate', selectedTeacher.commissionRate != null ? `${selectedTeacher.commissionRate}%` : 'Default'], ['Stripe Account ID', selectedTeacher.stripeConnectAccountId || 'Not connected'], ['Stripe Onboarding', selectedTeacher.stripeConnectOnboardingComplete ? 'Complete' : 'Incomplete']].map(([label, value]) => (
                        <div key={label} className="flex gap-2"><span className="text-xs text-gray-500 w-36 flex-shrink-0">{label}:</span><span className="text-sm font-medium text-gray-800 break-all">{value as string}</span></div>
                      ))}
                      {selectedTeacher.bankDetails && (<>
                        <div className="border-t border-gray-100 pt-2 mt-2"><span className="text-xs font-medium text-gray-600">Bank Details</span></div>
                        {[['Account Holder', selectedTeacher.bankDetails.accountHolderName], ['Bank Name', selectedTeacher.bankDetails.bankName], ['Account No.', selectedTeacher.bankDetails.accountNumber ? `****${selectedTeacher.bankDetails.accountNumber.slice(-4)}` : undefined], ['IBAN', selectedTeacher.bankDetails.iban ? `****${selectedTeacher.bankDetails.iban.slice(-6)}` : undefined], ['Bank Verified', selectedTeacher.bankDetails.isVerified ? 'Yes' : 'No']].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label} className="flex gap-2"><span className="text-xs text-gray-500 w-36 flex-shrink-0">{label}:</span><span className="text-sm font-medium text-gray-800">{value as string}</span></div>
                        ))}
                      </>)}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button onClick={() => openEditModal(selectedTeacher)} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">Edit</button>
                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">Close</button>
                  </div>
                </>
              )}

              {modalMode === 'edit' && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Teacher</h2>
                  <p className="text-sm text-gray-600 mb-4">Teacher: <strong>{selectedTeacher.fullName}</strong></p>
                  <div className="space-y-4">
                    <div><label htmlFor="edit-fullname" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" id="edit-fullname" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" /></div>
                    <div><label htmlFor="edit-bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label><textarea id="edit-bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" /></div>
                    <div><label htmlFor="edit-specialization" className="block text-sm font-medium text-gray-700 mb-1">Specialization</label><input type="text" id="edit-specialization" value={formData.specialization} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" /></div>
                    <div><label htmlFor="edit-experience" className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label><input type="number" id="edit-experience" value={formData.yearsOfExperience} onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" /></div>
                    <div><label htmlFor="edit-mode" className="block text-sm font-medium text-gray-700 mb-1">Teaching Mode</label><select id="edit-mode" value={formData.teachingMode} onChange={(e) => setFormData({ ...formData, teachingMode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"><option value="online">Online</option><option value="in_person">In Person</option><option value="hybrid">Hybrid</option></select></div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={handleUpdateTeacher} className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium">Save Changes</button>
                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancel</button>
                  </div>
                </>
              )}

              {modalMode === 'status' && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Update Teacher Status</h2>
                  <p className="text-sm text-gray-600 mb-4">Teacher: <strong>{selectedTeacher.fullName}</strong></p>
                  <div className="space-y-4">
                    <div><label className="flex items-center"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2" /><span className="text-sm font-medium text-gray-700">Active</span></label><p className="text-xs text-gray-500 mt-1 ml-6">Inactive teachers' events won't be displayed on the portal</p></div>
                    <div><label className="flex items-center"><input type="checkbox" checked={isSuspended} onChange={(e) => setIsSuspended(e.target.checked)} className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 mr-2" /><span className="text-sm font-medium text-gray-700">Suspended</span></label><p className="text-xs text-gray-500 mt-1 ml-6">Suspended teachers cannot access their dashboard</p></div>
                    <div><label htmlFor="status-verification" className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label><select id="status-verification" value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={handleUpdateStatus} className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium">Update Status</button>
                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancel</button>
                  </div>
                </>
              )}

              {modalMode === 'payment' && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Update Payment Model</h2>
                  <p className="text-sm text-gray-600 mb-4">Teacher: <strong>{selectedTeacher.fullName}</strong></p>
                  <div className="space-y-4">
                    <div><label htmlFor="payment-mode-select" className="block text-sm font-medium text-gray-700 mb-2">Payment Model</label><select id="payment-mode-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as 'platform_stripe' | 'custom_stripe')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"><option value="platform_stripe">Commission Model (Default)</option><option value="custom_stripe">Subscription Model</option></select></div>
                    {paymentMode === 'platform_stripe' && (<div><label htmlFor="commission-rate-input" className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label><input type="number" id="commission-rate-input" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} min="0" max="100" step="0.5" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" /></div>)}
                    <div className="bg-gray-50 rounded-lg p-3"><p className="text-sm text-gray-600">{paymentMode === 'platform_stripe' ? <>Teacher will pay <strong>{commissionRate}%</strong> commission on each transaction.</> : <>Teacher will pay a monthly subscription fee with no commission.</>}</p></div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button onClick={handleUpdatePaymentMode} className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium">Update Payment</button>
                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminTeachersPage;
