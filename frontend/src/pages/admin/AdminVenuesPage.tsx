import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import adminAPI from '../../services/api/adminAPI';
import VenueDetailsModal from '../../components/admin/VenueDetailsModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

interface Venue {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'suspended';
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  capacity: number;
  venueType: string;
  facilities: string[];
  amenities?: string[];
  operatingHours: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  timezone: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  baseRentalPrice?: number;
  currency: string;
  safetyFeatures?: string[];
  certifications?: string[];
  totalEvents: number;
  averageRating?: number;
  isApproved: boolean;
  vendor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface VenueStats {
  totalVenues: number;
  approvedVenues: number;
  pendingVenues: number;
  activeVenues: number;
  venuesByType: Record<string, number>;
  venuesByStatus: Record<string, number>;
  venuesByCity: Record<string, number>;
  capacityStats: {
    totalCapacity: number;
    averageCapacity: number;
    maxCapacity: number;
    minCapacity: number;
  };
  recentVenues: Venue[];
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalVenues: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

interface ApiResponse {
  venues: Venue[];
  pagination: PaginationInfo;
  filters: {
    search?: string;
    venueType?: string;
    status?: string;
    isApproved?: string;
    city?: string;
    country?: string;
    vendorId?: string;
    minCapacity?: string;
    maxCapacity?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

const AdminVenuesPage: React.FC = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalVenues: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [maxCapacity, setMaxCapacity] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New modal states
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [venueToDelete, setVenueToDelete] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);
  const [bulkAction, setBulkAction] = useState<string>('');

  const fetchVenues = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.venueType = typeFilter;
      if (approvalFilter !== 'all') params.isApproved = approvalFilter === 'approved';
      if (cityFilter.trim()) params.city = cityFilter.trim();
      if (minCapacity) params.minCapacity = minCapacity;
      if (maxCapacity) params.maxCapacity = maxCapacity;

      const response = await adminAPI.getAllVenues(params);
      
      if (response.success) {
        setVenues(response.data.venues);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.message || 'Failed to fetch venues');
      }
    } catch (error: any) {
      console.error('Error fetching venues:', error);
      setError(error.message || 'Failed to load venues');
      toast.error(error.message || 'Failed to load venues');
      setVenues([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, typeFilter, approvalFilter, cityFilter, minCapacity, maxCapacity, sortBy, sortOrder]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await adminAPI.getVenueStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching venue stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  useEffect(() => {
    if (showStatsModal && !stats) {
      fetchStats();
    }
  }, [showStatsModal, stats, fetchStats]);

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    fetchVenues();
  }, [fetchVenues]);

  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setCurrentPage(1);
    switch (filterType) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'type':
        setTypeFilter(value);
        break;
      case 'approval':
        setApprovalFilter(value);
        break;
      case 'city':
        setCityFilter(value);
        break;
    }
  }, []);

  const handleCapacityFilter = useCallback(() => {
    setCurrentPage(1);
    fetchVenues();
  }, [fetchVenues]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setApprovalFilter('all');
    setCityFilter('');
    setMinCapacity('');
    setMaxCapacity('');
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field: string) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newOrder);
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handleApprove = useCallback(async (venueId: string) => {
    try {
      setIsRefreshing(true);
      const response = await adminAPI.approveVenue(venueId);
      if (response.success) {
        toast.success('Venue approved successfully');
        await fetchVenues(true);
      } else {
        throw new Error(response.message || 'Failed to approve venue');
      }
    } catch (error: any) {
      console.error('Error approving venue:', error);
      toast.error(error.message || 'Failed to approve venue');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchVenues]);

  const handleReject = useCallback(async (venueId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason || !reason.trim()) {
      toast.warning('Rejection reason is required');
      return;
    }

    try {
      setIsRefreshing(true);
      const response = await adminAPI.rejectVenue(venueId, reason.trim());
      if (response.success) {
        toast.success('Venue rejected successfully');
        await fetchVenues(true);
      } else {
        throw new Error(response.message || 'Failed to reject venue');
      }
    } catch (error: any) {
      console.error('Error rejecting venue:', error);
      toast.error(error.message || 'Failed to reject venue');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchVenues]);

  const handleStatusChange = useCallback(async (venueId: string, newStatus: string) => {
    try {
      setIsRefreshing(true);
      const response = await adminAPI.updateVenueStatus(venueId, newStatus);
      if (response.success) {
        toast.success(`Venue status updated to ${newStatus}`);
        await fetchVenues(true);
      } else {
        throw new Error(response.message || 'Failed to update venue status');
      }
    } catch (error: any) {
      console.error('Error updating venue status:', error);
      toast.error(error.message || 'Failed to update venue status');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchVenues]);

  const handleViewDetails = useCallback((venue: Venue) => {
    setSelectedVenue(venue);
    setShowDetailsModal(true);
  }, []);

  const handleEditVenue = useCallback((venueId: string) => {
    navigate(`/admin/venues/${venueId}/edit`);
  }, [navigate]);

  const handleDeleteClick = useCallback((venueId: string) => {
    setVenueToDelete(venueId);
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!venueToDelete) return;

    try {
      setIsRefreshing(true);
      const response = await adminAPI.deleteVenue(venueToDelete);
      if (response.success) {
        toast.success('Venue deleted successfully');
        setShowDeleteConfirm(false);
        setVenueToDelete(null);
        await fetchVenues(true);
      } else {
        throw new Error(response.message || 'Failed to delete venue');
      }
    } catch (error: any) {
      console.error('Error deleting venue:', error);
      toast.error(error.message || 'Failed to delete venue');
    } finally {
      setIsRefreshing(false);
    }
  }, [venueToDelete, fetchVenues]);

  const handleBulkActionClick = useCallback((action: string) => {
    if (selectedVenues.length === 0) {
      toast.warning('Please select venues first');
      return;
    }
    setBulkAction(action);
    setShowBulkConfirm(true);
  }, [selectedVenues.length]);

  const handleBulkActionConfirm = useCallback(async () => {
    if (selectedVenues.length === 0 || !bulkAction) return;

    let updateData: any = {};

    switch (bulkAction) {
      case 'approve':
        updateData = { isApproved: true };
        break;
      case 'reject':
        updateData = { isApproved: false };
        break;
      case 'activate':
        updateData = { status: 'active' };
        break;
      case 'deactivate':
        updateData = { status: 'inactive' };
        break;
      default:
        toast.error('Invalid bulk action');
        return;
    }

    try {
      setIsRefreshing(true);
      const response = await adminAPI.bulkUpdateVenues(selectedVenues, updateData);
      if (response.success) {
        toast.success(`${response.data.updatedCount} venue(s) updated successfully`);
        setSelectedVenues([]);
        setShowBulkConfirm(false);
        setBulkAction('');
        await fetchVenues(true);
      } else {
        throw new Error(response.message || 'Failed to update venues');
      }
    } catch (error: any) {
      console.error('Error in bulk action:', error);
      toast.error(error.message || 'Failed to update venues');
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedVenues, bulkAction, fetchVenues]);

  const getBulkActionMessage = useCallback(() => {
    const count = selectedVenues.length;
    switch (bulkAction) {
      case 'approve':
        return `Are you sure you want to approve ${count} venue(s)?`;
      case 'reject':
        return `Are you sure you want to reject ${count} venue(s)?`;
      case 'activate':
        return `Are you sure you want to activate ${count} venue(s)?`;
      case 'deactivate':
        return `Are you sure you want to deactivate ${count} venue(s)?`;
      default:
        return `Are you sure you want to perform this action on ${count} venue(s)?`;
    }
  }, [bulkAction, selectedVenues.length]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatCurrency = useCallback((amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'AED'
    }).format(amount);
  }, []);

  const getStatusBadgeClass = useCallback((status: Venue['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getApprovalBadgeClass = useCallback((isApproved: boolean) => {
    return isApproved
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }, []);

  const handleSelectVenue = useCallback((venueId: string) => {
    setSelectedVenues(prev => 
      prev.includes(venueId)
        ? prev.filter(id => id !== venueId)
        : [...prev, venueId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedVenues.length === venues.length) {
      setSelectedVenues([]);
    } else {
      setSelectedVenues(venues.map(venue => venue.id));
    }
  }, [selectedVenues.length, venues]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Venues Management</h1>
        <Link
          to="/admin/venues/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Venue
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Search by name, email, or city"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="status-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              id="type-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedVenues.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <p className="text-sm font-medium text-blue-800">
                {selectedVenues.length} venue(s) selected
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkActionClick('approve')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleBulkActionClick('reject')}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                Reject
              </button>
              <button
                onClick={() => handleBulkActionClick('activate')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkActionClick('deactivate')}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Venues Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedVenues.length === venues.length && venues.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('name')}
                  >
                    Venue
                    {sortBy === 'name' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        {sortOrder === 'asc' ? (
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {venues.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                    No venues found matching your criteria
                  </td>
                </tr>
              ) : (
                venues.map((venue) => (
                  <tr key={venue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedVenues.includes(venue.id)}
                        onChange={() => handleSelectVenue(venue.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{venue.name}</div>
                        <div className="text-sm text-gray-500">{venue.contactInfo?.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{venue.address.city}</div>
                      <div className="text-sm text-gray-500">{venue.address.country}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{venue.venueType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{venue.capacity.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {venue.vendor?.firstName} {venue.vendor?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{venue.vendor?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(venue.status)}`}>
                        {venue.status.charAt(0).toUpperCase() + venue.status.slice(1)}
                      </span>
                      <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getApprovalBadgeClass(venue.isApproved)}`}>
                        {venue.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(venue.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(venue)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditVenue(venue.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        {!venue.isApproved && (
                          <button
                            onClick={() => handleApprove(venue.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(venue.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {Math.min((currentPage - 1) * pageSize + 1, pagination.totalVenues)}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, pagination.totalVenues)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.totalVenues}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return page === 1 || page === pagination.totalPages || 
                             (page >= currentPage - 2 && page <= currentPage + 2);
                    })
                    .map((page, index, array) => {
                      if (index > 0 && page - array[index - 1] > 1) {
                        return [
                          <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>,
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? 'z-10 bg-primary border-primary text-white'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ];
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-primary border-primary text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Venue Details Modal */}
      <VenueDetailsModal
        venue={selectedVenue}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedVenue(null);
        }}
        onEdit={handleEditVenue}
        onDelete={handleDeleteClick}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setVenueToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Venue"
        message="Are you sure you want to delete this venue? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isRefreshing}
      />

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBulkConfirm}
        onClose={() => {
          setShowBulkConfirm(false);
          setBulkAction('');
        }}
        onConfirm={handleBulkActionConfirm}
        title={`Bulk ${bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)}`}
        message={getBulkActionMessage()}
        confirmText="Confirm"
        cancelText="Cancel"
        type={bulkAction === 'reject' || bulkAction === 'deactivate' ? 'warning' : 'info'}
        isLoading={isRefreshing}
      />

      {/* Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowStatsModal(false)}>
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Venue Statistics</h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {stats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalVenues}</div>
                    <div className="text-sm text-blue-800">Total Venues</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.approvedVenues}</div>
                    <div className="text-sm text-green-800">Approved</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pendingVenues}</div>
                    <div className="text-sm text-yellow-800">Pending</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.activeVenues}</div>
                    <div className="text-sm text-purple-800">Active</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Venues by Type</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.venuesByType).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-sm text-gray-600 capitalize">{type}</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Venues by Status</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.venuesByStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between">
                          <span className="text-sm text-gray-600 capitalize">{status}</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Capacity Statistics</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{stats.capacityStats.totalCapacity.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Total Capacity</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{Math.round(stats.capacityStats.averageCapacity).toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Average</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{stats.capacityStats.maxCapacity.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Maximum</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{stats.capacityStats.minCapacity.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Minimum</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVenuesPage;