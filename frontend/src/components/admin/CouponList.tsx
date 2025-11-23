import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  Download,
  MoreVertical,
  Calendar,
  Users,
  Tag,
  TrendingUp,
  Percent,
  DollarSign,
  Truck,
  Copy,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import CouponForm from './CouponForm';
import CouponUsageStats from './CouponUsageStats';
import ConfirmDialog from '../common/ConfirmDialog';
import couponAPI from '../../services/api/couponAPI';
import eventsAPI from '../../services/api/eventsAPI';

interface Coupon {
  _id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  currency?: string;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  userUsageLimit?: number;
  isActive: boolean;
  status: 'active' | 'inactive' | 'expired';
  applicableCategories: string[];
  applicableEvents: string[];
  excludedEvents: string[];
  firstTimeOnly: boolean;
  createdBy: string | null;
  usage: any[];
  createdAt: string;
  updatedAt: string;
}

interface CouponFilters {
  page: number;
  limit: number;
  search: string;
  status: string;
  type: string;
}

// Debounce hook for search functionality
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const CouponList: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [filters, setFilters] = useState<CouponFilters>({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    type: ''
  });

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    fetchCoupons();
  }, [filters]);

  // Fetch events once on component mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: debouncedSearch,
      page: 1 // Reset to first page on new search
    }));
  }, [debouncedSearch]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await couponAPI.getAllCoupons(filters);
      setCoupons(response.coupons);
      setPagination(response.pagination);
    } catch (error: any) {
      // Provide detailed error messages
      let errorMessage = 'Failed to fetch coupons';

      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please ensure backend is running.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Unauthorized. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view coupons';
      } else if (error.response?.status === 404) {
        errorMessage = 'Coupons endpoint not found.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getAllEvents({ limit: 100 }) as any;
      setEvents(Array.isArray(response) ? response : (response.events || response.data?.events || []));
    } catch (error) {
      console.error('Error fetching events:', error);
      // Don't show error toast as this is not critical
    }
  };

  const handleCreateCoupon = () => {
    setSelectedCoupon(null);
    setShowCouponForm(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setShowCouponForm(true);
  };

  const handleDeleteCoupon = (couponId: string) => {
    setCouponToDelete(couponId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCoupon = async () => {
    if (!couponToDelete) return;

    try {
      await couponAPI.deleteCoupon(couponToDelete);
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(`Error: ${error.response.data.message}`);
      } else {
        toast.error('Failed to delete coupon');
      }
    } finally {
      setShowDeleteConfirm(false);
      setCouponToDelete(null);
    }
  };

  const handleSubmitCoupon = async (data: any) => {
    try {
      if (selectedCoupon) {
        await couponAPI.updateCoupon(selectedCoupon._id, data);
        toast.success('Coupon updated successfully');
      } else {
        await couponAPI.createCoupon(data);
        toast.success('Coupon created successfully');
      }
      fetchCoupons();
      setShowCouponForm(false);
    } catch (error: any) {
      console.error('[CouponList] Error submitting coupon:', error);

      // Provide user-friendly error messages
      const errorMessage = error.response?.data?.message;

      if (errorMessage) {
        toast.error(errorMessage);
      } else if (error.response?.status === 400) {
        toast.error('Invalid coupon data. Please check your inputs.');
      } else {
        toast.error('Failed to save coupon. Please try again.');
      }
      throw error;
    }
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'inactive' | 'expired') => {
    if (selectedCoupons.length === 0) {
      toast.error('Please select coupons first');
      return;
    }

    try {
      setBulkActionLoading(true);
      await couponAPI.bulkUpdateCoupons(selectedCoupons, status);
      toast.success(`${selectedCoupons.length} coupon(s) updated successfully`);
      setSelectedCoupons([]);
      fetchCoupons();
    } catch (error: any) {
      console.error('[CouponList] Error bulk updating coupons:', error);
      if (error.response?.data?.message) {
        toast.error(`Error: ${error.response.data.message}`);
      } else {
        toast.error('Failed to update coupons');
      }
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleFilterChange = (key: keyof CouponFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);

    if (!coupon.isActive || coupon.status === 'inactive') {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (validUntil < now || coupon.status === 'expired') {
      return <Badge variant="danger">Expired</Badge>;
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return <Badge variant="warning">Used Up</Badge>;
    }

    return <Badge variant="success">Active</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4 text-blue-600" />;
      case 'fixed_amount':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'free_shipping':
        return <Truck className="w-4 h-4 text-purple-600" />;
      default:
        return <Tag className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDiscount = (coupon: Coupon) => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.value}%`;
      case 'fixed_amount':
        return `${coupon.currency || 'AED'} ${coupon.value}`;
      case 'free_shipping':
        return 'Free Shipping';
      default:
        return '';
    }
  };

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedCoupons.length === coupons.length && coupons.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedCoupons(coupons.map(c => c._id));
            } else {
              setSelectedCoupons([]);
            }
          }}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      ),
      render: (value: any, coupon: Coupon) => {
        if (!coupon) return null;
        return (
          <input
            type="checkbox"
            checked={selectedCoupons.includes(coupon._id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedCoupons([...selectedCoupons, coupon._id]);
              } else {
                setSelectedCoupons(selectedCoupons.filter(id => id !== coupon._id));
              }
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        );
      }
    },
    {
      key: 'coupon',
      label: 'Coupon',
      render: (_value: any, coupon: Coupon) => {
        if (!coupon) return null;
        return (
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-gray-100 rounded">
              {getTypeIcon(coupon.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900">
                  {coupon.code}
                </h3>
                <button
                  onClick={() => copyToClipboard(coupon.code)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <p className="text-sm text-gray-600">{coupon.name}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs font-medium text-green-600">
                  {formatDiscount(coupon)}
                </span>
                {coupon.firstTimeOnly && (
                  <Badge variant="secondary" size="sm">First-time</Badge>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'validity',
      label: 'Validity',
      render: (_value: any, coupon: Coupon) => {
        if (!coupon) return null;
        return (
          <div className="text-sm">
            <div className="text-gray-900">
              {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
            </div>
            <div className="text-gray-500 text-xs">
              {new Date(coupon.validUntil) > new Date()
                ? `${Math.ceil((new Date(coupon.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                : 'Expired'
              }
            </div>
          </div>
        );
      }
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (_value: any, coupon: Coupon) => {
        if (!coupon) return null;
        return (
          <div className="text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{coupon.usageCount}</span>
              {coupon.usageLimit && (
                <span className="text-gray-500">/ {coupon.usageLimit}</span>
              )}
            </div>
            {coupon.usageLimit && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{
                    width: `${Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100)}%`
                  }}
                />
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (_value: any, coupon: Coupon) => {
        if (!coupon) return null;
        return getStatusBadge(coupon);
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value: any, coupon: Coupon) => {
        if (!coupon) return null;
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedCoupon(coupon);
                setShowStatsModal(true);
              }}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleEditCoupon(coupon)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteCoupon(coupon._id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
          <p className="text-sm text-gray-600">
            Create and manage discount coupons for your events
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedCoupons.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedCoupons.length} selected
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkStatusUpdate('active')}
                disabled={bulkActionLoading}
                loading={bulkActionLoading}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Activate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkStatusUpdate('inactive')}
                disabled={bulkActionLoading}
                loading={bulkActionLoading}
              >
                <Clock className="w-4 h-4 mr-1" />
                Deactivate
              </Button>
            </div>
          )}
          <Button onClick={handleCreateCoupon}>
            <Plus className="w-4 h-4 mr-2" />
            Create Coupon
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Total Coupons</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Tag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">
                  {coupons.filter(c => c.status === 'active' && c.isActive).length}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Used</p>
                <p className="text-2xl font-bold">
                  {coupons.reduce((sum, c) => sum + c.usageCount, 0)}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold">
                  {coupons.filter(c => new Date(c.validUntil) < new Date() || c.status === 'expired').length}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  id="coupon-search"
                  name="couponSearch"
                  placeholder="Search coupons..."
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                id="filter-status"
                name="filterStatus"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coupon Table */}
      <Card>
        <CardContent className="p-0">
          {error && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Coupons</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">{error}</p>
              <Button onClick={fetchCoupons} variant="primary">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : coupons.length === 0 && !loading && !error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Tag className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Coupons Found</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                {searchInput || filters.status || filters.type
                  ? 'No coupons match your current filters. Try adjusting your search criteria.'
                  : 'Get started by creating your first coupon to offer discounts to your customers.'}
              </p>
              {!searchInput && !filters.status && !filters.type && (
                <Button onClick={handleCreateCoupon} variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Coupon
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={coupons}
              loading={loading}
              rowKey="_id"
              pagination={{
                page: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                pageSizeOptions: [10, 25, 50, 100]
              }}
              onPageChange={(page) => handleFilterChange('page', page)}
              onPageSizeChange={(limit) => handleFilterChange('limit', limit)}
            />
          )}
        </CardContent>
      </Card>

      {/* Coupon Form Modal */}
      <CouponForm
        coupon={selectedCoupon}
        isOpen={showCouponForm}
        onClose={() => setShowCouponForm(false)}
        onSubmit={handleSubmitCoupon}
        events={events}
      />

      {/* Coupon Stats Modal */}
      {selectedCoupon && (
        <CouponUsageStats
          coupon={selectedCoupon}
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCouponToDelete(null);
        }}
        onConfirm={confirmDeleteCoupon}
        title="Delete Coupon"
        message="Are you sure you want to delete this coupon? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default CouponList;