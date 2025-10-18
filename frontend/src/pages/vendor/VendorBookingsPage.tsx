import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import vendorAPI from '../../services/api/vendorAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';

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
    eventId: string;
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
  // Computed fields for UI
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventTitle: string;
  eventDate: string;
  ticketCount: number;
  totalAmount: number;
}

const VendorBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof Booking; direction: 'ascending' | 'descending' }>({
    key: 'createdAt',
    direction: 'descending'
  });

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch real bookings from backend
        const bookingsData = await vendorAPI.getVendorBookings();
        
        // Transform backend data to frontend format
        const transformedBookings: Booking[] = bookingsData.map((order: any) => ({
          _id: order._id || order.id,
          userId: order.userId,
          orderNumber: order.orderNumber,
          items: order.items.map((item: any) => ({
            eventId: item.eventId,
            eventTitle: item.eventTitle,
            scheduleDate: item.scheduleDate,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            currency: item.currency,
            participants: item.participants || []
          })),
          total: order.total,
          currency: order.currency,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          billingAddress: order.billingAddress,
          createdAt: order.createdAt,
          // Computed fields for UI
          customerName: `${order.billingAddress.firstName} ${order.billingAddress.lastName}`,
          customerEmail: order.billingAddress.email,
          customerPhone: order.billingAddress.phone || 'N/A',
          eventTitle: order.items[0]?.eventTitle || 'Multiple Events',
          eventDate: order.items[0]?.scheduleDate || 'TBD',
          ticketCount: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
          totalAmount: order.total
        }));
        
        setBookings(transformedBookings);
        setFilteredBookings(transformedBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBookings();
  }, []);

  useEffect(() => {
    // Apply filters and search
    let result = [...bookings];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(booking => booking.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(booking => booking.eventDate === today);
    } else if (dateFilter === 'upcoming') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(booking => booking.eventDate > today);
    } else if (dateFilter === 'past') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(booking => booking.eventDate < today);
    }
    
    // Apply search term
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      result = result.filter(
        booking =>
          booking.eventTitle.toLowerCase().includes(lowercasedSearch) ||
          booking.customerName.toLowerCase().includes(lowercasedSearch) ||
          booking.customerEmail.toLowerCase().includes(lowercasedSearch) ||
          booking.id.toLowerCase().includes(lowercasedSearch)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredBookings(result);
  }, [bookings, searchTerm, statusFilter, dateFilter, sortConfig]);

  const handleSort = (key: keyof Booking) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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
          <td colSpan={9} className="px-6 py-4 bg-gray-50">
            <p className="text-sm text-gray-500 text-center">No participant information available</p>
          </td>
        </tr>
      );
    }

    return (
      <tr>
        <td colSpan={9} className="px-6 py-4 bg-gray-50">
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

  if (isLoading) {
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
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search bookings..."
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          
          <select
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          
          <select
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center">
                    Booking ID
                    {sortConfig.key === 'id' && (
                      <svg
                        className={`ml-1 h-4 w-4 ${sortConfig.direction === 'ascending' ? 'transform rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('eventTitle')}
                >
                  <div className="flex items-center">
                    Event
                    {sortConfig.key === 'eventTitle' && (
                      <svg
                        className={`ml-1 h-4 w-4 ${sortConfig.direction === 'ascending' ? 'transform rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('customerName')}
                >
                  <div className="flex items-center">
                    Customer
                    {sortConfig.key === 'customerName' && (
                      <svg
                        className={`ml-1 h-4 w-4 ${sortConfig.direction === 'ascending' ? 'transform rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('eventDate')}
                >
                  <div className="flex items-center">
                    Event Date
                    {sortConfig.key === 'eventDate' && (
                      <svg
                        className={`ml-1 h-4 w-4 ${sortConfig.direction === 'ascending' ? 'transform rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ticketCount')}
                >
                  <div className="flex items-center">
                    Tickets
                    {sortConfig.key === 'ticketCount' && (
                      <svg
                        className={`ml-1 h-4 w-4 ${sortConfig.direction === 'ascending' ? 'transform rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center">
                    Amount
                    {sortConfig.key === 'totalAmount' && (
                      <svg
                        className={`ml-1 h-4 w-4 ${sortConfig.direction === 'ascending' ? 'transform rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {sortConfig.key === 'status' && (
                      <svg
                        className={`ml-1 h-4 w-4 ${sortConfig.direction === 'ascending' ? 'transform rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    Booking Date
                    {sortConfig.key === 'createdAt' && (
                      <svg
                        className={`ml-1 h-4 w-4 ${sortConfig.direction === 'ascending' ? 'transform rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
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
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => {
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.eventTitle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                          <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(booking.eventDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.ticketCount}
                          {hasParticipants && (
                            <span className="ml-1 text-xs text-blue-600">
                              ({booking.items[0].participants!.length} participants)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(booking.totalAmount, booking.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(booking.status)}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(booking.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/vendor/bookings/${booking._id}`}
                            className="text-primary hover:text-primary-dark mr-4"
                          >
                            View
                          </Link>
                          {booking.status === 'confirmed' && (
                            <button
                              className="text-red-600 hover:text-red-900"
                              onClick={() => {
                                // In a real app, you would call an API to cancel the booking
                                const updatedBookings = bookings.map(b =>
                                  b._id === booking._id ? { ...b, status: 'cancelled' as const } : b
                                );
                                setBookings(updatedBookings);
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && renderParticipantDetails(booking)}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                    No bookings found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Booking Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-500 text-lg font-semibold">
                  {filteredBookings.filter(b => b.status === 'confirmed').length}
                </div>
                <div className="text-sm text-gray-600">Confirmed Bookings</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-blue-500 text-lg font-semibold">
                  {filteredBookings.filter(b => b.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed Bookings</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-red-500 text-lg font-semibold">
                  {filteredBookings.filter(b => b.status === 'cancelled').length}
                </div>
                <div className="text-sm text-gray-600">Cancelled Bookings</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default VendorBookingsPage;