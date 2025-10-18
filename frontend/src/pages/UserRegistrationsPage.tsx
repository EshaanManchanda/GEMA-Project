import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Loader2,
  Filter,
  Search,
} from 'lucide-react';

import { AppDispatch } from '@/store';
import {
  fetchUserRegistrations,
  selectRegistrations,
  selectIsRegistrationLoading,
  selectRegistrationPagination,
  selectRegistrationFilters,
  setFilters,
  clearFilters,
} from '@/store/slices/registrationsSlice';
import { RegistrationStatus } from '@/types/registration';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const UserRegistrationsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const registrations = useSelector(selectRegistrations);
  const isLoading = useSelector(selectIsRegistrationLoading);
  const pagination = useSelector(selectRegistrationPagination);
  const filters = useSelector(selectRegistrationFilters);

  const [searchQuery, setSearchQuery] = useState('');

  // Load registrations on mount
  useEffect(() => {
    dispatch(fetchUserRegistrations({ page: 1, limit: 10 }));
  }, [dispatch]);

  // Handle filter change
  const handleFilterChange = (status?: RegistrationStatus) => {
    dispatch(setFilters({ status, search: searchQuery }));
    dispatch(fetchUserRegistrations({ page: 1, limit: 10, status, search: searchQuery }));
  };

  // Handle search
  const handleSearch = () => {
    dispatch(setFilters({ search: searchQuery }));
    dispatch(fetchUserRegistrations({ page: 1, limit: 10, search: searchQuery }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    dispatch(fetchUserRegistrations({ page, limit: 10, ...filters }));
  };

  // Get status badge variant
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Registrations</h1>
          <p className="text-gray-600">View and manage your event registrations</p>
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
                    placeholder="Search events..."
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
                  <option value={RegistrationStatus.DRAFT}>Draft</option>
                  <option value={RegistrationStatus.SUBMITTED}>Submitted</option>
                  <option value={RegistrationStatus.UNDER_REVIEW}>Under Review</option>
                  <option value={RegistrationStatus.APPROVED}>Approved</option>
                  <option value={RegistrationStatus.REJECTED}>Rejected</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    dispatch(clearFilters());
                    dispatch(fetchUserRegistrations({ page: 1, limit: 10 }));
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
                <p className="text-gray-600">Loading your registrations...</p>
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
                  : "You haven't registered for any events yet"}
              </p>
              <Button variant="primary" onClick={() => navigate('/events')}>
                Browse Events
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Registrations List */}
        {!isLoading && registrations.length > 0 && (
          <div className="space-y-4">
            {registrations.map((registration) => (
              <Card
                key={registration._id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/registrations/${registration._id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {registration.confirmationNumber || 'Registration'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Registered on {new Date(registration.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(registration.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {/* Payment Info */}
                        <div className="flex items-center space-x-2 text-sm">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            registration.payment.status === 'paid'
                              ? 'bg-green-100'
                              : 'bg-yellow-100'
                          }`}>
                            <CheckCircle className={`w-4 h-4 ${
                              registration.payment.status === 'paid'
                                ? 'text-green-600'
                                : 'text-yellow-600'
                            }`} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {registration.payment.currency} {registration.payment.amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {registration.payment.status === 'paid' ? 'Paid' : 'Pending Payment'}
                            </div>
                          </div>
                        </div>

                        {/* Files Count */}
                        {registration.files.length > 0 && (
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {registration.files.length} {registration.files.length === 1 ? 'File' : 'Files'}
                              </div>
                              <div className="text-xs text-gray-500">Attached</div>
                            </div>
                          </div>
                        )}

                        {/* Submission Date */}
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {registration.metadata.submittedAt
                                ? new Date(registration.metadata.submittedAt).toLocaleDateString()
                                : 'Not submitted'}
                            </div>
                            <div className="text-xs text-gray-500">Submission Date</div>
                          </div>
                        </div>
                      </div>

                      {/* Vendor Review */}
                      {registration.vendorReview && (
                        <div className={`mt-4 p-3 rounded-lg border ${
                          registration.vendorReview.status === 'approved'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="text-sm font-medium mb-1">
                            {registration.vendorReview.status === 'approved' ? 'Approved' : 'Rejected'} by Organizer
                          </div>
                          {registration.vendorReview.remarks && (
                            <div className="text-xs text-gray-600">{registration.vendorReview.remarks}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/registrations/${registration._id}`);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
      </div>
    </div>
  );
};

export default UserRegistrationsPage;
