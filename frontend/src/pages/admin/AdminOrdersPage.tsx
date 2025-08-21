import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminNavigation from '../../components/admin/AdminNavigation';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  eventName: string;
  eventId: string;
  vendorName: string;
  vendorId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'completed';
  paymentMethod: string;
  bookingDate: string;
  eventDate: string;
  createdAt: string;
  updatedAt: string;
}

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order; direction: 'ascending' | 'descending' }>({ 
    key: 'createdAt', 
    direction: 'descending' 
  });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'confirm' | 'cancel' | 'refund' | 'complete' | null>(null);
  const [orderToAction, setOrderToAction] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock orders data
        const mockOrders: Order[] = [
          {
            id: '1',
            orderNumber: 'ORD-2023-0001',
            customerName: 'John Smith',
            customerEmail: 'john.smith@example.com',
            eventName: 'Summer Music Festival',
            eventId: 'e1',
            vendorName: 'Melody Productions',
            vendorId: 'v1',
            amount: 149.99,
            status: 'confirmed',
            paymentMethod: 'Credit Card',
            bookingDate: '2023-07-15T10:30:00Z',
            eventDate: '2023-08-15T18:00:00Z',
            createdAt: '2023-07-15T10:30:00Z',
            updatedAt: '2023-07-15T10:35:00Z',
          },
          {
            id: '2',
            orderNumber: 'ORD-2023-0002',
            customerName: 'Sarah Johnson',
            customerEmail: 'sarah.j@example.com',
            eventName: 'Tech Conference 2023',
            eventId: 'e2',
            vendorName: 'TechEvents Inc',
            vendorId: 'v2',
            amount: 299.99,
            status: 'pending',
            paymentMethod: 'PayPal',
            bookingDate: '2023-07-16T14:15:00Z',
            eventDate: '2023-09-20T09:00:00Z',
            createdAt: '2023-07-16T14:15:00Z',
            updatedAt: '2023-07-16T14:15:00Z',
          },
          {
            id: '3',
            orderNumber: 'ORD-2023-0003',
            customerName: 'Michael Brown',
            customerEmail: 'michael.b@example.com',
            eventName: 'Food & Wine Festival',
            eventId: 'e3',
            vendorName: 'Gourmet Events',
            vendorId: 'v3',
            amount: 75.00,
            status: 'completed',
            paymentMethod: 'Credit Card',
            bookingDate: '2023-07-10T09:45:00Z',
            eventDate: '2023-07-28T12:00:00Z',
            createdAt: '2023-07-10T09:45:00Z',
            updatedAt: '2023-07-28T15:20:00Z',
          },
          {
            id: '4',
            orderNumber: 'ORD-2023-0004',
            customerName: 'Emily Davis',
            customerEmail: 'emily.d@example.com',
            eventName: 'Yoga Retreat Weekend',
            eventId: 'e4',
            vendorName: 'Zen Wellness',
            vendorId: 'v4',
            amount: 199.99,
            status: 'cancelled',
            paymentMethod: 'Bank Transfer',
            bookingDate: '2023-07-05T16:20:00Z',
            eventDate: '2023-10-14T15:00:00Z',
            createdAt: '2023-07-05T16:20:00Z',
            updatedAt: '2023-07-06T11:10:00Z',
          },
          {
            id: '5',
            orderNumber: 'ORD-2023-0005',
            customerName: 'David Wilson',
            customerEmail: 'david.w@example.com',
            eventName: 'Business Leadership Summit',
            eventId: 'e5',
            vendorName: 'Business Network Group',
            vendorId: 'v5',
            amount: 349.99,
            status: 'refunded',
            paymentMethod: 'Credit Card',
            bookingDate: '2023-06-30T11:30:00Z',
            eventDate: '2023-07-30T10:00:00Z',
            createdAt: '2023-06-30T11:30:00Z',
            updatedAt: '2023-07-02T09:15:00Z',
          },
          {
            id: '6',
            orderNumber: 'ORD-2023-0006',
            customerName: 'Jessica Taylor',
            customerEmail: 'jessica.t@example.com',
            eventName: 'Art Exhibition Opening',
            eventId: 'e6',
            vendorName: 'City Gallery',
            vendorId: 'v6',
            amount: 25.00,
            status: 'confirmed',
            paymentMethod: 'PayPal',
            bookingDate: '2023-07-18T13:40:00Z',
            eventDate: '2023-08-05T19:00:00Z',
            createdAt: '2023-07-18T13:40:00Z',
            updatedAt: '2023-07-18T13:45:00Z',
          },
          {
            id: '7',
            orderNumber: 'ORD-2023-0007',
            customerName: 'Robert Martinez',
            customerEmail: 'robert.m@example.com',
            eventName: 'Comedy Night Special',
            eventId: 'e7',
            vendorName: 'Laugh Factory',
            vendorId: 'v7',
            amount: 35.00,
            status: 'completed',
            paymentMethod: 'Credit Card',
            bookingDate: '2023-07-01T08:50:00Z',
            eventDate: '2023-07-10T20:00:00Z',
            createdAt: '2023-07-01T08:50:00Z',
            updatedAt: '2023-07-10T22:30:00Z',
          },
          {
            id: '8',
            orderNumber: 'ORD-2023-0008',
            customerName: 'Jennifer Anderson',
            customerEmail: 'jennifer.a@example.com',
            eventName: 'Marathon 2023',
            eventId: 'e8',
            vendorName: 'City Athletics',
            vendorId: 'v8',
            amount: 50.00,
            status: 'pending',
            paymentMethod: 'Bank Transfer',
            bookingDate: '2023-07-20T15:10:00Z',
            eventDate: '2023-09-10T07:00:00Z',
            createdAt: '2023-07-20T15:10:00Z',
            updatedAt: '2023-07-20T15:10:00Z',
          },
        ];
        
        setOrders(mockOrders);
        setFilteredOrders(mockOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrders();
  }, []);

  useEffect(() => {
    // Apply filters and search
    let result = [...orders];
    
    // Search filter
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        order =>
          order.orderNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
          order.customerName.toLowerCase().includes(lowerCaseSearchTerm) ||
          order.customerEmail.toLowerCase().includes(lowerCaseSearchTerm) ||
          order.eventName.toLowerCase().includes(lowerCaseSearchTerm) ||
          order.vendorName.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      result = result.filter(order => {
        const orderDate = new Date(order.createdAt);
        if (dateFilter === 'today') {
          return orderDate >= today;
        } else if (dateFilter === 'yesterday') {
          return orderDate >= yesterday && orderDate < today;
        } else if (dateFilter === 'last7days') {
          return orderDate >= lastWeek;
        } else if (dateFilter === 'last30days') {
          return orderDate >= lastMonth;
        }
        return true;
      });
    }
    
    // Sorting
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredOrders(result);
  }, [orders, searchTerm, statusFilter, dateFilter, sortConfig]);

  const handleSort = (key: keyof Order) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrders(filteredOrders.map(order => order.id));
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

  const handleActionClick = (orderId: string, action: 'confirm' | 'cancel' | 'refund' | 'complete') => {
    setOrderToAction(orderId);
    setActionType(action);
    setIsActionModalOpen(true);
  };

  const handleActionConfirm = () => {
    if (orderToAction && actionType) {
      // In a real app, you would call an API to perform the action
      setOrders(
        orders.map(order =>
          order.id === orderToAction
            ? { 
                ...order, 
                status: actionType === 'confirm' ? 'confirmed' : 
                         actionType === 'cancel' ? 'cancelled' : 
                         actionType === 'refund' ? 'refunded' : 
                         'completed',
                updatedAt: new Date().toISOString(),
              }
            : order
        )
      );
    }
    setIsActionModalOpen(false);
    setOrderToAction(null);
    setActionType(null);
  };

  const handleBulkAction = (action: 'confirm' | 'cancel' | 'refund' | 'complete') => {
    // In a real app, you would call an API to perform the bulk action
    setOrders(
      orders.map(order =>
        selectedOrders.includes(order.id)
          ? { 
              ...order, 
              status: action === 'confirm' ? 'confirmed' : 
                       action === 'cancel' ? 'cancelled' : 
                       action === 'refund' ? 'refunded' : 
                       'completed',
              updatedAt: new Date().toISOString(),
            }
          : order
      )
    );
    setSelectedOrders([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      case 'complete':
        return 'Complete Order';
      default:
        return 'Update Order';
    }
  };

  const getActionModalMessage = () => {
    if (!actionType) return '';
    
    switch (actionType) {
      case 'confirm':
        return 'Are you sure you want to confirm this order? This will notify the customer and vendor.';
      case 'cancel':
        return 'Are you sure you want to cancel this order? This will notify the customer and vendor, and may trigger a refund process.';
      case 'refund':
        return 'Are you sure you want to mark this order as refunded? This will notify the customer and vendor.';
      case 'complete':
        return 'Are you sure you want to mark this order as completed? This will notify the customer and vendor.';
      default:
        return 'Are you sure you want to update this order?';
    }
  };

  const getActionButtonClass = () => {
    if (!actionType) return '';
    
    switch (actionType) {
      case 'confirm':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case 'cancel':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'refund':
        return 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500';
      case 'complete':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
      default:
        return 'bg-primary hover:bg-primary-dark focus:ring-primary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <AdminNavigation />
      <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Orders Management</h1>
        <div className="flex space-x-2">
          <Link
            to="/admin/orders/export"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export
          </Link>
          <Link
            to="/admin/orders/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Order
          </Link>
        </div>
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
                placeholder="Search by order #, customer, event, or vendor"
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
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <select
              id="date-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between">
          <div className="flex items-center mb-2 sm:mb-0">
            <span className="text-sm font-medium text-gray-700 mr-4">
              {selectedOrders.length} {selectedOrders.length === 1 ? 'order' : 'orders'} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkAction('confirm')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Confirm
            </button>
            <button
              onClick={() => handleBulkAction('cancel')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cancel
            </button>
            <button
              onClick={() => handleBulkAction('refund')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Refund
            </button>
            <button
              onClick={() => handleBulkAction('complete')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Complete
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={handleSelectAll}
                    />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('orderNumber')}
                  >
                    Order
                    {sortConfig.key === 'orderNumber' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        {sortConfig.direction === 'ascending' ? (
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('customerName')}
                  >
                    Customer
                    {sortConfig.key === 'customerName' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        {sortConfig.direction === 'ascending' ? (
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('eventName')}
                  >
                    Event
                    {sortConfig.key === 'eventName' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        {sortConfig.direction === 'ascending' ? (
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('vendorName')}
                  >
                    Vendor
                    {sortConfig.key === 'vendorName' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        {sortConfig.direction === 'ascending' ? (
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('amount')}
                  >
                    Amount
                    {sortConfig.key === 'amount' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        {sortConfig.direction === 'ascending' ? (
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    {sortConfig.key === 'status' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        {sortConfig.direction === 'ascending' ? (
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSort('createdAt')}
                  >
                    Date
                    {sortConfig.key === 'createdAt' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        {sortConfig.direction === 'ascending' ? (
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </button>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                    No orders found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.eventName}</div>
                      <div className="text-xs text-gray-500">
                        <Link to={`/admin/events/${order.eventId}`} className="text-primary hover:text-primary-dark">
                          View event
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.vendorName}</div>
                      <div className="text-xs text-gray-500">
                        <Link to={`/admin/vendors/${order.vendorId}`} className="text-primary hover:text-primary-dark">
                          View vendor
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          View
                        </Link>
                        <div className="relative inline-block text-left group">
                          <button
                            type="button"
                            className="text-indigo-600 hover:text-indigo-900 group-hover:text-indigo-900"
                          >
                            Actions
                          </button>
                          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none hidden group-hover:block z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleActionClick(order.id, 'confirm')}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                  role="menuitem"
                                >
                                  Confirm Order
                                </button>
                              )}
                              {(order.status === 'pending' || order.status === 'confirmed') && (
                                <button
                                  onClick={() => handleActionClick(order.id, 'cancel')}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                  role="menuitem"
                                >
                                  Cancel Order
                                </button>
                              )}
                              {(order.status === 'confirmed' || order.status === 'cancelled') && (
                                <button
                                  onClick={() => handleActionClick(order.id, 'refund')}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                  role="menuitem"
                                >
                                  Refund Order
                                </button>
                              )}
                              {order.status === 'confirmed' && (
                                <button
                                  onClick={() => handleActionClick(order.id, 'complete')}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                  role="menuitem"
                                >
                                  Complete Order
                                </button>
                              )}
                              <Link
                                to={`/admin/orders/${order.id}/edit`}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                role="menuitem"
                              >
                                Edit Order
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Confirmation Modal */}
      {isActionModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      {getActionModalTitle()}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {getActionModalMessage()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white ${getActionButtonClass()} focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm`}
                  onClick={handleActionConfirm}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsActionModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdminOrdersPage;