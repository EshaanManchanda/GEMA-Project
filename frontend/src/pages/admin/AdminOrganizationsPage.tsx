import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import adminAPI from '@/services/api/adminAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface OrganizationOnboardingRecord {
  _id: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  application?: {
    organizationName?: string;
    primaryContactName?: string;
    primaryContactTitle?: string;
    organizationWebsite?: string;
    organizationPhone?: string;
    countryOfOperation?: string;
    anticipatedTeachersNextMonth?: number;
  };
  agreement?: {
    legalName?: string;
    legalEntityType?: string;
    incorporationLocation?: string;
    acceptedTerms?: boolean;
    authorizedSignerName?: string;
    authorizedSignerTitle?: string;
  };
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
  applicationCompletedAt?: string;
  agreementSignedAt?: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  signedAgreements: number;
}

const badgeClass: Record<ReviewStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const AdminOrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<OrganizationOnboardingRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<OrganizationOnboardingRecord | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: '1', limit: '50' };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const [listResponse, statsResponse] = await Promise.all([
        adminAPI.getOrganizationOnboardings(params),
        adminAPI.getOrganizationOnboardingStats(),
      ]);

      setOrganizations(listResponse.organizations || []);
      setStats(statsResponse || null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setReviewingId(id);
      await adminAPI.reviewOrganizationOnboarding(id, status);
      toast.success(
        status === 'approved'
          ? 'Organization approved'
          : 'Organization rejected',
      );
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update review status');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <>
      <PrivatePageSEO
        title="Admin - Organizations | Gema"
        description="Review and approve organization onboarding submissions"
      />

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Applications</h1>
            <p className="mt-2 text-gray-600">Review application + agreement before approval</p>
          </div>

          {stats && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <p className="text-sm text-gray-600">Agreements Signed</p>
                <p className="text-2xl font-bold text-blue-700">{stats.signedAgreements}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-white p-4 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organization/contact..."
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <button
                type="button"
                onClick={fetchData}
                className="rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700"
              >
                Search
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            {loading ? (
              <div className="p-8 text-center text-gray-600">Loading organizations...</div>
            ) : organizations.length === 0 ? (
              <div className="p-8 text-center text-gray-600">No organization submissions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Agreement</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {organizations.map((item) => (
                      <tr key={item._id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">
                            {item.application?.organizationName || '-'}
                          </p>
                          <p className="text-sm text-gray-600">{item.application?.countryOfOperation || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{item.application?.primaryContactName || '-'}</p>
                          <p>{item.user?.email || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{item.agreementSignedAt ? 'Signed' : 'Not signed'}</p>
                          <p>
                            {item.agreement?.acceptedTerms
                              ? 'Terms accepted'
                              : 'Terms not accepted'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass[item.reviewStatus]}`}>
                            {item.reviewStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelected(item)}
                              className="rounded bg-gray-200 px-2 py-1 font-semibold text-gray-800 hover:bg-gray-300"
                            >
                              View
                            </button>
                            {item.reviewStatus !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleReview(item._id, 'approved')}
                                disabled={reviewingId === item._id}
                                className="rounded bg-green-600 px-2 py-1 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reviewingId === item._id ? 'Saving...' : 'Approve'}
                              </button>
                            )}
                            {item.reviewStatus !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleReview(item._id, 'rejected')}
                                disabled={reviewingId === item._id}
                                className="rounded bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reviewingId === item._id ? 'Saving...' : 'Reject'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Organization Submission</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-800"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-800">
              <div>
                <p className="font-semibold">Application</p>
                <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs">
                  {JSON.stringify(selected.application || {}, null, 2)}
                </pre>
              </div>

              <div>
                <p className="font-semibold">Agreement</p>
                <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs">
                  {JSON.stringify(selected.agreement || {}, null, 2)}
                </pre>
              </div>

              <div>
                <p className="font-semibold">Review Info</p>
                <p>Status: {selected.reviewStatus}</p>
                <p>Application submitted: {selected.applicationCompletedAt || '-'}</p>
                <p>Agreement signed: {selected.agreementSignedAt || '-'}</p>
                <p>Notes: {selected.reviewNotes || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminOrganizationsPage;
