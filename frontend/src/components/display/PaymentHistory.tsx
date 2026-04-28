import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaCreditCard,
  FaEye,
  FaFilter,
  FaSearch,
  FaCheck,
  FaTimes,
  FaClock,
  FaExclamationTriangle,
  FaReceipt,
  FaUndo,
  FaCalendarAlt
} from 'react-icons/fa';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { AppDispatch } from '../../store';
import {
  fetchAllPayments,
  processRefund,
  selectPayments,
  selectPaymentsLoading
} from '../../store/slices/paymentsSlice';
import type { Payment, PaymentStatus, PaymentMethodType } from '../../services/api/index';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../interactive/Modal';
import DataTable from '../interactive/DataTable';

interface PaymentHistoryProps {
  userId?: string;
  eventId?: string;
  className?: string;
  showFilters?: boolean;
  showExport?: boolean;
  compact?: boolean;
  maxHeight?: string;
}

interface FilterState {
  status: PaymentStatus | 'all';
  method: PaymentMethodType | 'all';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  search: string;
  amountMin: string;
  amountMax: string;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  userId,
  eventId,
  className = '',
  showFilters = true,
  compact = false,
  maxHeight = '600px'
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const payments = useSelector(selectPayments);
  const isLoading = useSelector(selectPaymentsLoading);

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    method: 'all',
    dateRange: 'month',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    search: '',
    amountMin: '',
    amountMax: ''
  });

  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Derive stats from payments list
  const stats = useMemo(() => ({
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    successfulPayments: payments.filter(p => p.status === 'completed').length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    failedPayments: payments.filter(p => p.status === 'failed').length,
  }), [payments]);

  useEffect(() => {
    const queryParams = {
      page: 1,
      limit: 20,
      ...(userId && { userId }),
      ...(filters.status !== 'all' && { status: filters.status }),
      ...(filters.dateRange !== 'all' && {
        startDate: filters.startDate,
        endDate: filters.endDate
      }),
    };

    dispatch(fetchAllPayments(queryParams));
  }, [dispatch, userId, eventId, filters]);

  const handleDateRangeChange = (range: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter': {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      }
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      dateRange: range as FilterState['dateRange'],
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    }));
  };

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const handleRefund = (payment: Payment) => {
    setSelectedPayment(payment);
    setRefundAmount(payment.amount.toString());
    setRefundReason('');
    setShowRefundModal(true);
  };

  const handleProcessRefund = async () => {
    if (selectedPayment && refundAmount && refundReason) {
      try {
        await dispatch(processRefund({
          paymentId: selectedPayment._id,
          amount: parseFloat(refundAmount),
          reason: refundReason
        })).unwrap();
        setShowRefundModal(false);
        setSelectedPayment(null);
        setRefundAmount('');
        setRefundReason('');
      } catch {
        // Error handled in slice
      }
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'completed': return <FaCheck className="text-green-500" />;
      case 'pending': return <FaClock className="text-yellow-500" />;
      case 'processing': return <FaClock className="text-blue-500" />;
      case 'failed': return <FaTimes className="text-red-500" />;
      case 'refunded': return <FaUndo className="text-purple-500" />;
      case 'partially_refunded': return <FaUndo className="text-orange-500" />;
      default: return <FaExclamationTriangle className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'completed': return 'text-green-700 bg-green-100';
      case 'pending': return 'text-yellow-700 bg-yellow-100';
      case 'processing': return 'text-blue-700 bg-blue-100';
      case 'failed': return 'text-red-700 bg-red-100';
      case 'refunded': return 'text-purple-700 bg-purple-100';
      case 'partially_refunded': return 'text-orange-700 bg-orange-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getMethodIcon = (method: PaymentMethodType) => {
    switch (method) {
      case 'credit_card':
      case 'debit_card': return <FaCreditCard className="text-blue-500" />;
      case 'bank_transfer': return <FaReceipt className="text-green-500" />;
      case 'digital_wallet': return <FaCreditCard className="text-purple-500" />;
      default: return <FaCreditCard className="text-gray-500" />;
    }
  };

  const columns = [
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      render: (payment: Payment) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
          </div>
          <div className="text-gray-500">
            {format(new Date(payment.createdAt), 'HH:mm')}
          </div>
        </div>
      )
    },
    {
      key: 'transactionId',
      label: 'Transaction ID',
      render: (payment: Payment) => (
        <div className="font-mono text-sm text-gray-600">
          {payment.transactionId?.slice(-8) || payment._id.slice(-8)}
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (payment: Payment) => (
        <div className="text-sm font-medium">
          ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (payment: Payment) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(payment.status)}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1).replace('_', ' ')}
          </span>
        </div>
      )
    },
    {
      key: 'paymentMethod',
      label: 'Method',
      render: (payment: Payment) => (
        <div className="flex items-center space-x-2">
          {getMethodIcon(payment.paymentMethod)}
          <span className="text-sm capitalize">
            {payment.paymentMethod.replace('_', ' ')}
          </span>
          {payment.paymentDetails?.cardLast4 && (
            <span className="text-xs text-gray-500">
              •••• {payment.paymentDetails.cardLast4}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'billingAddress',
      label: 'Customer',
      render: (payment: Payment) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {payment.billingAddress
              ? `${payment.billingAddress.firstName} ${payment.billingAddress.lastName}`
              : 'N/A'}
          </div>
          {payment.billingAddress?.email && (
            <div className="text-gray-500">{payment.billingAddress.email}</div>
          )}
        </div>
      )
    }
  ];

  const actions = [
    {
      label: 'View Details',
      icon: <FaEye size={14} />,
      onClick: handleViewDetails,
      className: 'text-blue-600 hover:text-blue-800'
    },
    {
      label: 'Refund',
      icon: <FaUndo size={14} />,
      onClick: handleRefund,
      className: 'text-purple-600 hover:text-purple-800',
      condition: (payment: Payment) => payment.status === 'completed' && !payment.refunds?.length
    }
  ];

  if (isLoading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaCreditCard className="text-gray-600" size={20} />
            <h3 className="text-lg font-medium text-gray-900">
              Payment History
            </h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {payments.length} transactions
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {showFilters && (
              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`p-2 rounded-md transition-colors ${
                  showFiltersPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <FaFilter size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-green-600 text-sm font-medium">Total Revenue</div>
            <div className="text-green-900 text-lg font-semibold">
              ${stats.totalAmount.toFixed(2)}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-blue-600 text-sm font-medium">Successful</div>
            <div className="text-blue-900 text-lg font-semibold">
              {stats.successfulPayments}
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-yellow-600 text-sm font-medium">Pending</div>
            <div className="text-yellow-900 text-lg font-semibold">
              {stats.pendingPayments}
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-red-600 text-sm font-medium">Failed</div>
            <div className="text-red-900 text-lg font-semibold">
              {stats.failedPayments}
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFiltersPanel && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status */}
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as PaymentStatus | 'all' }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="partially_refunded">Partially Refunded</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Method */}
              <select
                value={filters.method}
                onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value as PaymentMethodType | 'all' }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Methods</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="digital_wallet">Digital Wallet</option>
                <option value="cash">Cash</option>
              </select>

              {/* Date Range */}
              <select
                value={filters.dateRange}
                onChange={(e) => {
                  const range = e.target.value;
                  setFilters(prev => ({ ...prev, dateRange: range as FilterState['dateRange'] }));
                  if (range !== 'custom') {
                    handleDateRangeChange(range);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>

              {/* Amount Range */}
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.amountMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.amountMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Custom Date Range */}
            {filters.dateRange === 'custom' && (
              <div className="flex space-x-4 mt-4">
                <div className="flex items-center space-x-2">
                  <FaCalendarAlt className="text-gray-400" size={14} />
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-gray-500">to</span>
                <div className="flex items-center space-x-2">
                  <FaCalendarAlt className="text-gray-400" size={14} />
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ maxHeight }}>
        <DataTable
          {...({
            data: payments,
            columns,
            actions,
            loading: isLoading,
            emptyMessage: 'No payment transactions found',
            compact,
          } as any)}
        />
      </div>

      {/* Payment Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Payment Details"
        size="lg"
      >
        {selectedPayment && (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(selectedPayment.status)}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedPayment.status)}`}>
                  {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1).replace('_', ' ')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ${selectedPayment.amount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedPayment.currency.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Transaction Details</h4>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Transaction ID</dt>
                    <dd className="text-sm font-medium text-gray-900 font-mono">
                      {selectedPayment.transactionId || selectedPayment._id}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Date</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {format(new Date(selectedPayment.createdAt), 'MMM dd, yyyy HH:mm')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Payment Method</dt>
                    <dd className="text-sm font-medium text-gray-900 capitalize">
                      {selectedPayment.paymentMethod.replace('_', ' ')}
                    </dd>
                  </div>
                  {selectedPayment.paymentIntentId && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Intent ID</dt>
                      <dd className="text-sm font-medium text-gray-900 font-mono truncate max-w-32">
                        {selectedPayment.paymentIntentId}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {selectedPayment.billingAddress && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Name</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {`${selectedPayment.billingAddress.firstName} ${selectedPayment.billingAddress.lastName}` || 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Email</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {selectedPayment.billingAddress.email}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>

            {/* Billing Address */}
            {selectedPayment.billingAddress?.address && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Billing Address</h4>
                <div className="text-sm text-gray-600">
                  <div>{selectedPayment.billingAddress.address}</div>
                  <div>
                    {selectedPayment.billingAddress.city}, {selectedPayment.billingAddress.state} {selectedPayment.billingAddress.zipCode}
                  </div>
                  <div>{selectedPayment.billingAddress.country}</div>
                </div>
              </div>
            )}

            {/* Refunds */}
            {selectedPayment.refunds && selectedPayment.refunds.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Refunds</h4>
                <div className="space-y-2">
                  {selectedPayment.refunds.map((refund, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-purple-900">
                          Refunded ${refund.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-purple-700">
                          {refund.reason}
                        </div>
                      </div>
                      <div className="text-xs text-purple-600">
                        {format(new Date(refund.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Process Refund"
        size="md"
      >
        {selectedPayment && (
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-600">
                Process a refund for payment of ${selectedPayment.amount.toFixed(2)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="refund-amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Amount
                </label>
                <input
                  id="refund-amount"
                  type="number"
                  max={selectedPayment.amount}
                  min="0.01"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="refund-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Refund
                </label>
                <textarea
                  id="refund-reason"
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter the reason for this refund..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessRefund}
                disabled={!refundAmount || !refundReason}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Process Refund
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentHistory;
