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
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import CouponForm from './CouponForm';
import CouponUsageStats from './CouponUsageStats';
import couponAPI from '../../services/api/couponAPI';

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
  applicableEvents: string[];
  excludedEvents: string[];
  firstTimeOnly: boolean;
  createdBy: string;
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

const CouponList: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
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

  useEffect(() => {
    fetchCoupons();
    // fetchEvents(); // Uncomment when events API is available
  }, [filters]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponAPI.getAllCoupons(filters);
      setCoupons(response.data.coupons);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch coupons');
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      // TODO: Fetch events from API
      // const response = await eventsAPI.getAllEvents();
      // setEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
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

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      await couponAPI.deleteCoupon(couponId);
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error('Cannot delete coupon that has been used');
      } else {
        toast.error('Failed to delete coupon');
      }
    }
  };

  const handleSubmitCoupon = async (data: any) => {
    try {
      if (selectedCoupon) {
        await couponAPI.updateCoupon(selectedCoupon._id, data);
      } else {
        await couponAPI.createCoupon(data);
      }
      fetchCoupons();
    } catch (error) {
      throw error;
    }
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'inactive' | 'expired') => {
    if (selectedCoupons.length === 0) {
      toast.error('Please select coupons first');
      return;
    }

    try {
      await couponAPI.bulkUpdateCoupons(selectedCoupons, status);
      toast.success(`${selectedCoupons.length} coupons updated successfully`);
      setSelectedCoupons([]);
      fetchCoupons();
    } catch (error) {
      toast.error('Failed to update coupons');
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
    handleFilterChange('search', value);
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
      render: (coupon: Coupon) => (
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
      )
    },
    {
      key: 'coupon',
      label: 'Coupon',
      render: (coupon: Coupon) => (
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
      )
    },
    {
      key: 'validity',
      label: 'Validity',
      render: (coupon: Coupon) => (
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
      )
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (coupon: Coupon) => (
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
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (coupon: Coupon) => getStatusBadge(coupon)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (coupon: Coupon) => (
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
            disabled={coupon.usageCount > 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkStatusUpdate('active')}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Activate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkStatusUpdate('inactive')}
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
                  placeholder="Search coupons..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
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
          <DataTable
            columns={columns}
            data={coupons}
            loading={loading}
            pagination={{
              currentPage: pagination.page,
              totalPages: pagination.pages,
              onPageChange: (page) => handleFilterChange('page', page)
            }}
          />
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
    </div>
  );
};

export default CouponList;