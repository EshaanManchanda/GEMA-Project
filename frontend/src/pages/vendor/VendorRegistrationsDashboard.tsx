import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Loader2,
  Filter,
  Search,
  FileText,
  Calendar,
  Mail,
  DollarSign,
  TrendingUp,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { AppDispatch } from '@/store';
import {
  fetchEventRegistrations,
  reviewRegistration,
  selectRegistrations,
  selectIsRegistrationLoading,
  selectRegistrationPagination,
  selectRegistrationFilters,
  setFilters,
  clearFilters,
} from '@/store/slices/registrationsSlice';
import { RegistrationStatus, RegistrationReviewStatus } from '@/types/registration';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const VendorRegistrationsDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();

  const registrations = useSelector(selectRegistrations);
  const isLoading = useSelector(selectIsRegistrationLoading);
  const pagination = useSelector(selectRegistrationPagination);
  const filters = useSelector(selectRegistrationFilters);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [currentReviewId, setCurrentReviewId] = useState<string | null>(null);

  // Load registrations on mount
  useEffect(() => {
    if (eventId) {
      dispatch(fetchEventRegistrations({ eventId, page: 1, limit: 10 }));
    }
  }, [eventId, dispatch]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = pagination.total || 0;
    const byStatus = registrations.reduce((acc, reg) => {
      acc[reg.status] = (acc[reg.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const paidCount = registrations.filter(r => r.payment.status === 'paid').length;
    const totalRevenue = registrations
      .filter(r => r.payment.status === 'paid')
      .reduce((sum, r) => sum + r.payment.amount, 0);

    return {
      total,
      draft: byStatus[RegistrationStatus.DRAFT] || 0,
      submitted: byStatus[RegistrationStatus.SUBMITTED] || 0,
      underReview: byStatus[RegistrationStatus.UNDER_REVIEW] || 0,
      approved: byStatus[RegistrationStatus.APPROVED] || 0,
      rejected: byStatus[RegistrationStatus.REJECTED] || 0,
      withdrawn: byStatus[RegistrationStatus.WITHDRAWN] || 0,
      paidCount,
      totalRevenue,
    };
  }, [registrations, pagination.total]);

  // Handle filter change
  const handleFilterChange = (status?: RegistrationStatus) => {
    dispatch(setFilters({ status, search: searchQuery }));
    if (eventId) {
      dispatch(fetchEventRegistrations({ eventId, page: 1, limit: 10, status, search: searchQuery }));
    }
  };

  // Handle search
  const handleSearch = () => {
    dispatch(setFilters({ search: searchQuery }));
    if (eventId) {
      dispatch(fetchEventRegistrations({ eventId, page: 1, limit: 10, search: searchQuery }));
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (eventId) {
      dispatch(fetchEventRegistrations({ eventId, page, limit: 10, ...filters }));
    }
  };

  // Handle review action
  const handleReview = async (registrationId: string, status: RegistrationReviewStatus, remarks?: string) => {
    try {
      await dispatch(reviewRegistration({
        registrationId,
        status,
        remarks,
      })).unwrap();

      toast.success(`Registration ${status === RegistrationReviewStatus.APPROVED ? 'approved' : 'rejected'} successfully`);
      setReviewModalOpen(false);
      setCurrentReviewId(null);

      // Refresh list
      if (eventId) {
        dispatch(fetchEventRegistrations({ eventId, page: pagination.currentPage, limit: 10, ...filters }));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to review registration');
    }
  };

  // Get status badge
  const getStatusBadge = (status: RegistrationStatus) => {
    const statusConfig = {
      [RegistrationStatus.DRAFT]: { icon: Clock, variant: 'secondary' as const, label: 'Draft', color: 'text-gray-600' },
      [RegistrationStatus.SUBMITTED]: { icon: Clock, variant: 'warning' as const, label: 'Submitted', color: 'text-yellow-600' },
      [RegistrationStatus.UNDER_REVIEW]: { icon: AlertCircle, variant: 'warning' as const, label: 'Under Review', color: 'text-orange-600' },
      [RegistrationStatus.APPROVED]: { icon: CheckCircle, variant: 'success' as const, label: 'Approved', color: 'text-green-600' },
      [RegistrationStatus.REJECTED]: { icon: XCircle, variant: 'danger' as const, label: 'Rejected', color: 'text-red-600' },
      [RegistrationStatus.WITHDRAWN]: { icon: XCircle, variant: 'secondary' as const, label: 'Withdrawn', color: 'text-gray-600' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'AED') => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Dashboard</h1>
            <p className="text-gray-600">Manage and review event registrations</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/vendor/events/${eventId}/registration/builder`)}
            leftIcon={<Settings className="w-4 h-4" />}
          >
            Form Builder
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Registrations */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Registrations</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-green-600 font-medium">
                  {stats.approved} approved
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Review */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending Review</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.underReview + stats.submitted}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <span>{stats.submitted} submitted, {stats.underReview} reviewing</span>
              </div>
            </CardContent>
          </Card>

          {/* Approved */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <span>{stats.rejected} rejected</span>
              </div>
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <span>{stats.paidCount} paid registrations</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by confirmation number, user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange(e.target.value as RegistrationStatus || undefined)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value={RegistrationStatus.SUBMITTED}>Submitted</option>
                  <option value={RegistrationStatus.UNDER_REVIEW}>Under Review</option>
                  <option value={RegistrationStatus.APPROVED}>Approved</option>
                  <option value={RegistrationStatus.REJECTED}>Rejected</option>
                  <option value={RegistrationStatus.DRAFT}>Draft</option>
                  <option value={RegistrationStatus.WITHDRAWN}>Withdrawn</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    dispatch(clearFilters());
                    if (eventId) {
                      dispatch(fetchEventRegistrations({ eventId, page: 1, limit: 10 }));
                    }
                  }}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading registrations...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && registrations.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Registrations Found</h3>
              <p className="text-gray-600 mb-6">
                {filters.status || searchQuery
                  ? 'Try adjusting your filters'
                  : 'No one has registered for this event yet'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Registrations Table */}
        {!isLoading && registrations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Registrations ({pagination.total})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confirmation #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registrations.map((registration) => (
                      <tr key={registration._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {registration.confirmationNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {typeof registration.userId === 'object' && registration.userId.name
                                  ? registration.userId.name
                                  : 'User'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {typeof registration.userId === 'object' && registration.userId.email
                                  ? registration.userId.email
                                  : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(registration.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              registration.payment.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            <span className="text-sm text-gray-900">
                              {formatCurrency(registration.payment.amount, registration.payment.currency)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {registration.payment.status === 'paid' ? 'Paid' : 'Pending'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.metadata.submittedAt
                            ? new Date(registration.metadata.submittedAt).toLocaleDateString()
                            : 'Not submitted'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => navigate(`/vendor/registrations/${registration._id}`)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            {(registration.status === RegistrationStatus.SUBMITTED ||
                              registration.status === RegistrationStatus.UNDER_REVIEW) && (
                              <>
                                <button
                                  onClick={() => handleReview(registration._id, RegistrationReviewStatus.APPROVED)}
                                  className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    setCurrentReviewId(registration._id);
                                    setReviewModalOpen(true);
                                  }}
                                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {!isLoading && registrations.length > 0 && pagination.totalPages > 1 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {registrations.length} of {pagination.total} registrations
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reject Modal */}
        {reviewModalOpen && currentReviewId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle>Reject Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Please provide a reason for rejecting this registration (optional).
                  </p>
                  <textarea
                    id="reject-remarks"
                    rows={4}
                    placeholder="Enter rejection reason..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-center justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReviewModalOpen(false);
                        setCurrentReviewId(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        const remarks = (document.getElementById('reject-remarks') as HTMLTextAreaElement)?.value;
                        handleReview(currentReviewId, RegistrationReviewStatus.REJECTED, remarks);
                      }}
                    >
                      Reject Registration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorRegistrationsDashboard;
