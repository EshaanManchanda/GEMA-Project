import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminOrders } from '@/features/admin/hooks/useAdminApis';
import { adminOrdersAPI } from '@/features/admin/services/adminApis';
import { IOrder } from '../../types/order';
import { Search, ChevronDown, ChevronUp, Check, X, Trash2, DollarSign, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';
import { AdminPageHeader, AdminEmptyState, AdminStatusBadge } from '@/shared/components/admin';

const AdminOrdersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'total' | 'status' | 'paymentStatus'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'confirm' | 'cancel' | 'refund' | 'delete' | null>(null);
  const [orderToAction, setOrderToAction] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);

  const { data: ordersResponse, isLoading, refetch } = useAdminOrders({
    page: currentPage,
    limit,
    sortBy,
    sortOrder,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
    search: searchTerm || undefined,
  });

  const orders: IOrder[] = ordersResponse?.data?.orders || ordersResponse?.orders || [];
  const totalPages = ordersResponse?.data?.pagination?.totalPages || ordersResponse?.pagination?.totalPages || 1;
  const totalOrders = ordersResponse?.data?.pagination?.totalOrders || ordersResponse?.pagination?.totalOrders || 0;

  const handleSort = (key: 'createdAt' | 'total' | 'status' | 'paymentStatus') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrders(orders.map(order => order._id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleActionClick = (orderId: string, action: 'confirm' | 'cancel' | 'refund' | 'delete') => {
    setOrderToAction(orderId);
    setActionType(action);
    setRefundAmount('');
    setRefundReason('');
    setIsActionModalOpen(true);
  };

  const handleActionConfirm = async () => {
    if (!orderToAction || !actionType) return;

    try {
      switch (actionType) {
        case 'confirm':
          await adminOrdersAPI.updateStatus(orderToAction, { status: 'confirmed' });
          toast.success('Order confirmed successfully');
          break;
        case 'cancel':
          await adminOrdersAPI.updateStatus(orderToAction, { status: 'cancelled' });
          toast.success('Order cancelled successfully');
          break;
        case 'refund': {
          await adminOrdersAPI.updateStatus(orderToAction, { status: 'refunded', refundAmount, refundReason });
          toast.success('Order refunded successfully');
          break;
        }
        case 'delete':
          await adminOrdersAPI.updateStatus(orderToAction, { status: 'deleted' });
          toast.success('Order deleted successfully');
          break;
      }

      await refetch();
    } catch (error: any) {
      logger.error('Error performing order action:', error);
      toast.error(error?.response?.data?.message || `Failed to ${actionType} order`);
    } finally {
      setIsActionModalOpen(false);
      setOrderToAction(null);
      setActionType(null);
      setRefundAmount('');
      setRefundReason('');
    }
  };

  const handleBulkAction = async (action: 'confirm' | 'cancel' | 'refund') => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to perform bulk action');
      return;
    }

    try {
      for (const orderId of selectedOrders) {
        await adminOrdersAPI.updateStatus(orderId, {
          status: action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : 'refunded',
        });
      }

      toast.success(`${selectedOrders.length} order(s) ${action}ed successfully`);
      await refetch();
      setSelectedOrders([]);
    } catch (error: any) {
      logger.error('Error performing bulk action:', error);
      toast.error(error?.response?.data?.message || `Failed to perform bulk ${action}`);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'AED') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getActionModalTitle = () => {
    if (!actionType) return '';

    switch (actionType) {
      case 'confirm':
        return 'Confirm Order';
      case 'cancel':
        return 'Cancel Order';
      case 'refund':
        return 'Refund Order';
      case 'delete':
        return 'Delete Order';
      default:
        return 'Update Order';
    }
  };

  const getActionModalMessage = () => {
    if (!actionType) return '';

    switch (actionType) {
      case 'confirm':
        return 'Are you sure you want to confirm this order? This will send tickets to the customer.';
      case 'cancel':
        return 'Are you sure you want to cancel this order? This action cannot be undone.';
      case 'refund':
        return 'Enter refund details below. Leave amount empty for full refund.';
      case 'delete':
        return 'Are you sure you want to delete this order? This action cannot be undone and is only allowed for pending/cancelled orders.';
      default:
        return 'Are you sure you want to update this order?';
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <PrivatePageSEO title="Admin - Orders | Gema" description="Manage orders and bookings" />
      <div className="max-w-7xl mx-auto">
        <AdminPageHeader
          title="Order Management"
          description="View and manage all customer orders"
        />

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Payment Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="free">Free (Registration)</option>
            </select>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>

        {selectedOrders.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-blue-800 font-medium">
                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('confirm')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Confirm All
                </button>
                <button
                  onClick={() => handleBulkAction('cancel')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel All
                </button>
                <button
                  onClick={() => handleBulkAction('refund')}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Refund All
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('total')}>
                    <div className="flex items-center gap-1">
                      Total
                      {sortBy === 'total' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1">
                      Status
                      {sortBy === 'status' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('paymentStatus')}>
                    <div className="flex items-center gap-1">
                      Payment
                      {sortBy === 'paymentStatus' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1">
                      Created
                      {sortBy === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/admin/orders/${order._id}`} className="text-primary hover:text-primary-dark font-medium">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{order.billingAddress.firstName} {order.billingAddress.lastName}</div>
                      <div className="text-sm text-gray-500">{order.billingAddress.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-gray-500">{order.items[0]?.eventTitle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.total, order.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <AdminStatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <AdminStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleActionClick(order._id, 'confirm')}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <button
                            onClick={() => handleActionClick(order._id, 'cancel')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {order.paymentStatus === 'paid' && order.status !== 'refunded' && (
                          <button
                            onClick={() => handleActionClick(order._id, 'refund')}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'cancelled') && (
                          <button
                            onClick={() => handleActionClick(order._id, 'delete')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && !isLoading && (
            <AdminEmptyState title="No orders found" />
          )}

          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * limit, totalOrders)}</span> of{' '}
                <span className="font-medium">{totalOrders}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                  .map((page, index, array) => {
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === currentPage
                            ? 'z-10 bg-primary border-primary text-white'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {isActionModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{getActionModalTitle()}</h3>
              <p className="text-gray-600 mb-6">{getActionModalMessage()}</p>

              {actionType === 'refund' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refund Amount (optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="Leave empty for full refund"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Refund Reason (optional)
                    </label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Enter reason for refund..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsActionModalOpen(false);
                    setOrderToAction(null);
                    setActionType(null);
                    setRefundAmount('');
                    setRefundReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionConfirm}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${actionType === 'confirm' ? 'bg-green-600 hover:bg-green-700' :
                    actionType === 'cancel' ? 'bg-red-600 hover:bg-red-700' :
                      actionType === 'refund' ? 'bg-orange-600 hover:bg-orange-700' :
                        'bg-red-600 hover:bg-red-700'
                    }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminOrdersPage;
