import React, { useState, useEffect } from 'react';
import vendorAPI from '../../services/api/vendorAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';
import BookingFilters from '../../components/vendor/BookingFilters';
import VendorBookingEditModal from '../../components/vendor/VendorBookingEditModal';
import ExportOptionsModal from '../../components/vendor/ExportOptionsModal';
import VendorBookingImportModal from '../../components/vendor/VendorBookingImportModal';

interface Participant {
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  allergies?: string[];
  medicalConditions?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  specialRequirements?: string;
  registrationData?: Array<{
    fieldId: string;
    fieldLabel: string;
    fieldType: string;
    value: any;
  }>;
}

interface Booking {
  _id: string;
  userId: string;
  orderNumber: string;
  items: Array<{
    eventId: any;
    eventTitle: string;
    scheduleDate: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: string;
    participants?: Participant[];
  }>;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'stripe' | 'paypal' | 'razorpay';
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  vendorNotes?: string;
  vendorStatus?: string;
  isFulfilled?: boolean;
}

const VendorBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<Array<{ _id: string; title: string }>>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentStatus: 'all',
    eventId: 'all',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });

  useEffect(() => {
    fetchBookings();
  }, [currentPage, pageSize, filters, sortConfig]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      // Build query parameters
      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
      };

      // Add filters
      if (filters.search) params.search = filters.search;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.paymentStatus !== 'all') params.paymentStatus = filters.paymentStatus;
      if (filters.eventId !== 'all') params.eventId = filters.eventId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.minAmount) params.minAmount = filters.minAmount;
      if (filters.maxAmount) params.maxAmount = filters.maxAmount;

      const response = await vendorAPI.getVendorBookings(params);

      setBookings(response.bookings || []);
      setPagination(response.pagination);
      setStats(response.stats);
      setEvents(response.events || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      paymentStatus: 'all',
      eventId: 'all',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
    });
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleRowExpansion = (bookingId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  const handleEdit = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowEditModal(true);
  };

  const handleUpdateComplete = () => {
    fetchBookings();
    setShowEditModal(false);
  };

  const handleImportComplete = () => {
    fetchBookings();
    setShowImportModal(false);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount: number, currency: string = 'AED') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const formatRegistrationValue = (fieldType: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    switch (fieldType) {
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'date':
        return value ? new Date(value).toLocaleDateString() : 'N/A';
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  };

  const renderParticipantDetails = (booking: Booking) => {
    const participants = booking.items[0]?.participants || [];

    if (participants.length === 0) {
      return (
        <tr>
          <td colSpan={10} className="px-6 py-4 bg-gray-50">
            <p className="text-sm text-gray-500 text-center">No participant information available</p>
          </td>
        </tr>
      );
    }

    return (
      <tr>
        <td colSpan={10} className="px-6 py-4 bg-gray-50">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Participant Details</h3>
            {participants.map((participant, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-md font-semibold text-gray-800">
                    Participant {index + 1}: {participant.name}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {participant.age && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Age:</span>
                      <span className="ml-2 text-sm text-gray-900">{participant.age}</span>
                    </div>
                  )}
                  {participant.gender && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Gender:</span>
                      <span className="ml-2 text-sm text-gray-900 capitalize">{participant.gender}</span>
                    </div>
                  )}
                  {participant.phone && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Phone:</span>
                      <span className="ml-2 text-sm text-gray-900">{participant.phone}</span>
                    </div>
                  )}
                  {participant.allergies && participant.allergies.length > 0 && (
                    <div className="lg:col-span-3">
                      <span className="text-sm font-medium text-gray-600">Allergies:</span>
                      <span className="ml-2 text-sm text-gray-900">{participant.allergies.join(', ')}</span>
                    </div>
                  )}
                  {participant.medicalConditions && participant.medicalConditions.length > 0 && (
                    <div className="lg:col-span-3">
                      <span className="text-sm font-medium text-gray-600">Medical Conditions:</span>
                      <span className="ml-2 text-sm text-gray-900">{participant.medicalConditions.join(', ')}</span>
                    </div>
                  )}
                  {participant.specialRequirements && (
                    <div className="lg:col-span-3">
                      <span className="text-sm font-medium text-gray-600">Special Requirements:</span>
                      <span className="ml-2 text-sm text-gray-900">{participant.specialRequirements}</span>
                    </div>
                  )}
                </div>

                {participant.emergencyContact && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h5 className="text-sm font-semibold text-gray-800 mb-2">Emergency Contact</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Name:</span>
                        <span className="ml-2 text-sm text-gray-900">{participant.emergencyContact.name}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Relationship:</span>
                        <span className="ml-2 text-sm text-gray-900">{participant.emergencyContact.relationship}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Phone:</span>
                        <span className="ml-2 text-sm text-gray-900">{participant.emergencyContact.phone}</span>
                      </div>
                    </div>
                  </div>
                )}

                {participant.registrationData && participant.registrationData.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-semibold text-gray-800 mb-2">Custom Registration Responses</h5>
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {participant.registrationData.map((field, fieldIndex) => (
                          <div key={fieldIndex} className="flex flex-col">
                            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                              {field.fieldLabel}
                            </span>
                            <span className="mt-1 text-sm text-gray-900">
                              {formatRegistrationValue(field.fieldType, field.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </td>
      </tr>
    );
  };

  if (isLoading && bookings.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <VendorNavigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Bookings Management</h1>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-primary rounded-md shadow-sm text-sm font-medium text-primary bg-white hover:bg-primary-light"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue || 0)}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalBookings || 0}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Confirmed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.confirmedBookings || 0}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.paidBookings || 0}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <BookingFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          events={events}
          onClearFilters={handleClearFilters}
        />

        {/* Bookings Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort('orderNumber')}>
                      Order #
                      {sortConfig.key === 'orderNumber' && (
                        <svg className={`ml-1 h-4 w-4 ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort('total')}>
                      Amount
                      {sortConfig.key === 'total' && (
                        <svg className={`ml-1 h-4 w-4 ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center cursor-pointer" onClick={() => handleSort('createdAt')}>
                      Booked
                      {sortConfig.key === 'createdAt' && (
                        <svg className={`ml-1 h-4 w-4 ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.length > 0 ? (
                  bookings.map((booking) => {
                    const isExpanded = expandedRows.has(booking._id);
                    const hasParticipants = booking.items[0]?.participants && booking.items[0].participants.length > 0;

                    return (
                      <React.Fragment key={booking._id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center space-x-2">
                              {hasParticipants && (
                                <button
                                  onClick={() => toggleRowExpansion(booking._id)}
                                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                  title={isExpanded ? "Collapse participant details" : "Expand participant details"}
                                >
                                  <svg
                                    className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              )}
                              <span>#{booking.orderNumber || booking._id.slice(-6)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.billingAddress.firstName} {booking.billingAddress.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{booking.billingAddress.email}</div>
                            {booking.billingAddress.phone && (
                              <div className="text-sm text-gray-500">{booking.billingAddress.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.items[0]?.eventTitle}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(booking.items[0]?.scheduleDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {booking.items[0]?.quantity}
                            {hasParticipants && (
                              <span className="ml-1 text-xs text-blue-600">
                                ({booking.items[0].participants!.length} participants)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(booking.total, booking.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(booking.status)}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusBadgeClass(booking.paymentStatus)}`}>
                              {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(booking.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEdit(booking)}
                              className="text-primary hover:text-primary-dark mr-4"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                        {isExpanded && renderParticipantDetails(booking)}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
                      No bookings found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!pagination.hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                    <span className="font-medium">{pagination.totalPages}</span> ({pagination.totalBookings} total bookings)
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-md text-sm px-2 py-1"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>

                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!pagination.hasPrevPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      {pagination.currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={!pagination.hasNextPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedBooking && (
        <VendorBookingEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          booking={selectedBooking}
          onUpdate={handleUpdateComplete}
        />
      )}

      <ExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        filters={filters}
      />

      <VendorBookingImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
};

export default VendorBookingsPage;
