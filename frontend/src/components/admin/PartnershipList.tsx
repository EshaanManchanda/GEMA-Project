import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  Globe,
  Building2,
  Calendar,
  Check,
  X,
  MessageSquare,
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import api from '../../services/api';

interface Partnership {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  partnershipType: 'vendor' | 'influencer' | 'school' | 'affiliate' | 'other';
  website?: string;
  message: string;
  agreeToTerms: boolean;
  status: 'pending' | 'contacted' | 'approved' | 'rejected';
  contactedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PartnershipFilters {
  page: number;
  limit: number;
  status: string;
  partnershipType: string;
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

const PartnershipList: React.FC = () => {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [partnershipToDelete, setPartnershipToDelete] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  });

  const [filters, setFilters] = useState<PartnershipFilters>({
    page: 1,
    limit: 10,
    status: '',
    partnershipType: ''
  });

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    fetchPartnerships();
  }, [filters]);

  const fetchPartnerships = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: filters.page,
        limit: filters.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.partnershipType && { partnershipType: filters.partnershipType })
      };

      const response = await api.get('/partnerships', { params });

      if (response.data.success) {
        setPartnerships(response.data.data.partnerships);
        setPagination(response.data.data.pagination);
      }
    } catch (error: any) {
      console.error('Failed to fetch partnerships:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch partnership inquiries';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (partnershipId: string, newStatus: string, notes?: string) => {
    try {
      const response = await api.patch(`/partnerships/${partnershipId}`, {
        status: newStatus,
        notes
      });

      if (response.data.success) {
        toast.success(`Partnership status updated to ${newStatus}`);
        fetchPartnerships();
        setShowDetailsModal(false);
        setSelectedPartnership(null);
      }
    } catch (error: any) {
      console.error('Failed to update partnership status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await api.delete(`/partnerships/${id}`);

      if (response.data.success) {
        toast.success('Partnership inquiry deleted successfully');
        fetchPartnerships();
        setShowDeleteConfirm(false);
        setPartnershipToDelete(null);
      }
    } catch (error: any) {
      console.error('Failed to delete partnership:', error);
      toast.error(error.response?.data?.message || 'Failed to delete partnership inquiry');
    }
  };

  const getPartnershipTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      vendor: 'Vendor',
      influencer: 'Influencer',
      school: 'School',
      affiliate: 'Affiliate',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getPartnershipTypeBadgeVariant = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'danger'> = {
      vendor: 'default',
      influencer: 'secondary',
      school: 'success',
      affiliate: 'warning',
      other: 'default'
    };
    return variants[type] || 'default';
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'danger'> = {
      pending: 'warning',
      contacted: 'default',
      approved: 'success',
      rejected: 'danger'
    };
    return variants[status] || 'default';
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      cell: (partnership: Partnership) => (
        <div>
          <div className="font-medium text-gray-900">{partnership.name}</div>
          {partnership.organization && (
            <div className="text-sm text-gray-500">{partnership.organization}</div>
          )}
        </div>
      )
    },
    {
      header: 'Contact',
      accessor: 'email',
      cell: (partnership: Partnership) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Mail className="w-4 h-4 mr-2 text-gray-400" />
            <a href={`mailto:${partnership.email}`} className="text-blue-600 hover:underline">
              {partnership.email}
            </a>
          </div>
          {partnership.phone && (
            <div className="flex items-center text-sm">
              <Phone className="w-4 h-4 mr-2 text-gray-400" />
              <a href={`tel:${partnership.phone}`} className="text-gray-600">
                {partnership.phone}
              </a>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'partnershipType',
      cell: (partnership: Partnership) => (
        <Badge variant={getPartnershipTypeBadgeVariant(partnership.partnershipType)}>
          {getPartnershipTypeLabel(partnership.partnershipType)}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (partnership: Partnership) => (
        <Badge variant={getStatusBadgeVariant(partnership.status)}>
          {partnership.status.charAt(0).toUpperCase() + partnership.status.slice(1)}
        </Badge>
      )
    },
    {
      header: 'Submitted',
      accessor: 'createdAt',
      cell: (partnership: Partnership) => (
        <div className="text-sm text-gray-600">
          {new Date(partnership.createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: '_id',
      cell: (partnership: Partnership) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedPartnership(partnership);
              setShowDetailsModal(true);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPartnershipToDelete(partnership._id);
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partnership Inquiries</h1>
          <p className="text-gray-600 mt-1">Manage and review partnership applications</p>
        </div>
        <Button onClick={fetchPartnerships} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Partnership Type
              </label>
              <select
                value={filters.partnershipType}
                onChange={(e) => setFilters({ ...filters, partnershipType: e.target.value, page: 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">All Types</option>
                <option value="vendor">Vendor</option>
                <option value="influencer">Influencer</option>
                <option value="school">School</option>
                <option value="affiliate">Affiliate</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items per page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value), page: 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partnerships Table */}
      {error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>{error}</p>
              <Button onClick={fetchPartnerships} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={partnerships}
              loading={loading}
              pagination={{
                currentPage: pagination.currentPage,
                totalPages: pagination.totalPages,
                onPageChange: (page) => setFilters({ ...filters, page })
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPartnership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPartnership.name}</h2>
                  <p className="text-gray-600 mt-1">
                    {getPartnershipTypeLabel(selectedPartnership.partnershipType)} Partnership
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedPartnership(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 mr-3 text-gray-400" />
                    <a href={`mailto:${selectedPartnership.email}`} className="text-blue-600 hover:underline">
                      {selectedPartnership.email}
                    </a>
                  </div>
                  {selectedPartnership.phone && (
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 mr-3 text-gray-400" />
                      <a href={`tel:${selectedPartnership.phone}`} className="text-gray-600">
                        {selectedPartnership.phone}
                      </a>
                    </div>
                  )}
                  {selectedPartnership.organization && (
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 mr-3 text-gray-400" />
                      <span className="text-gray-600">{selectedPartnership.organization}</span>
                    </div>
                  )}
                  {selectedPartnership.website && (
                    <div className="flex items-center">
                      <Globe className="w-5 h-5 mr-3 text-gray-400" />
                      <a
                        href={selectedPartnership.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedPartnership.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Message</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedPartnership.message}</p>
                </div>
              </div>

              {/* Status & Notes */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Status & Notes</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Current Status:</label>
                    <Badge variant={getStatusBadgeVariant(selectedPartnership.status)}>
                      {selectedPartnership.status.charAt(0).toUpperCase() + selectedPartnership.status.slice(1)}
                    </Badge>
                  </div>

                  {selectedPartnership.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700"><strong>Notes:</strong> {selectedPartnership.notes}</p>
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <div>Submitted: {new Date(selectedPartnership.createdAt).toLocaleString()}</div>
                    {selectedPartnership.contactedAt && (
                      <div>Contacted: {new Date(selectedPartnership.contactedAt).toLocaleString()}</div>
                    )}
                    {selectedPartnership.approvedAt && (
                      <div>Approved: {new Date(selectedPartnership.approvedAt).toLocaleString()}</div>
                    )}
                    {selectedPartnership.rejectedAt && (
                      <div>Rejected: {new Date(selectedPartnership.rejectedAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleStatusUpdate(selectedPartnership._id, 'contacted')}
                    variant="outline"
                    disabled={selectedPartnership.status === 'contacted'}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Mark as Contacted
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate(selectedPartnership._id, 'approved')}
                    variant="outline"
                    disabled={selectedPartnership.status === 'approved'}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate(selectedPartnership._id, 'rejected')}
                    variant="outline"
                    disabled={selectedPartnership.status === 'rejected'}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPartnershipToDelete(null);
        }}
        onConfirm={() => partnershipToDelete && handleDelete(partnershipToDelete)}
        title="Delete Partnership Inquiry"
        message="Are you sure you want to delete this partnership inquiry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default PartnershipList;
