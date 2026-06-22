import React, { useState, useEffect } from 'react';
import EditPartnershipModal from './EditPartnershipModal';

import {
  Eye,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  Globe,
  Building2,
  Check,
  X,
  Edit,
  MessageSquare,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import ConfirmDialog from '../common/ConfirmDialog';
import api from '../../services/api';
import logger from '../../utils/logger';

interface Partnership {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  partnershipType: 'vendor' | 'influencer' | 'school' | 'affiliate' | 'summer_camp' | 'play_zone' | 'workshop' | 'activity_centre' | 'other';
  campaignType: 'general' | 'summer_2026';
  selectedPackage?: string;
  campDetails?: string;
  ageGroups?: string[];
  emirate?: string;
  numberOfKids?: string;
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
  campaignType: string;
}


const PartnershipList: React.FC = () => {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [partnershipToDelete, setPartnershipToDelete] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPartnership, setEditingPartnership] = useState<Partnership | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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
    partnershipType: '',
    campaignType: ''
  });

  const [exporting, setExporting] = useState(false);

  const handleExport = async (filtered: boolean = false) => {
    setExporting(true);
    try {
      const params: any = { export: 'true' };
      
      if (filtered) {
        if (filters.status) params.status = filters.status;
        if (filters.partnershipType) params.partnershipType = filters.partnershipType;
        if (filters.campaignType) params.campaignType = filters.campaignType;
      }
      
      const response = await api.get('/partnerships', { params });
      const partnerships = response.data?.data?.partnerships;
      
      if (!partnerships || !Array.isArray(partnerships) || partnerships.length === 0) {
        toast.error('No partnerships to export');
        setExporting(false);
        return;
      }
      
      if (!partnerships || partnerships.length === 0) {
        toast.error('No partnerships to export');
        return;
      }
      
      const headers = ['Name', 'Email', 'Phone', 'Organization', 'Type', 'Campaign', 'Status', 'Created At'];
      
      // Helper to format phone as text (prevents Excel scientific notation)
      const formatPhone = (phone: string | undefined) => {
        if (!phone) return '';
        // Remove any non-digit characters but keep plus sign
        const cleaned = phone.replace(/[^\d+]/g, '');
        // Add tab character to force Excel to treat as text
        return `\t"${cleaned}"`;
      };

      const csvRows = [
        headers.join(','),
        ...partnerships.map((p: Partnership) => [
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${(p.email || '').replace(/"/g, '""')}"`,
          formatPhone(p.phone),
          `"${(p.organization || '').replace(/"/g, '""')}"`,
          `"${p.partnershipType || ''}"`,
          `"${p.campaignType || ''}"`,
          `"${p.status || ''}"`,
          `"${p.createdAt ? new Date(p.createdAt).toISOString() : ''}"`
        ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `partnerships-${filtered ? 'filtered-' : 'all-'}${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${partnerships.length} partnerships`);
    } catch (error: any) {
      logger.error('Failed to export partnerships:', error);
      toast.error('Failed to export partnerships');
    } finally {
      setExporting(false);
    }
  };

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
        ...(filters.partnershipType && { partnershipType: filters.partnershipType }),
        ...(filters.campaignType && { campaignType: filters.campaignType })
      };

      const response = await api.get('/partnerships', { params });

      if (response.data.success) {
        setPartnerships(response.data.data.partnerships);
        setPagination(response.data.data.pagination);
      }
    } catch (error: any) {
      logger.error('Failed to fetch partnerships:', error);
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
      logger.error('Failed to update partnership status:', error);
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
      logger.error('Failed to delete partnership:', error);
      toast.error(error.response?.data?.message || 'Failed to delete partnership inquiry');
    }
  };

  const getPartnershipTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      vendor: 'Vendor',
      influencer: 'Influencer',
      school: 'School',
      affiliate: 'Affiliate',
      summer_camp: 'Summer Camp',
      play_zone: 'Play Zone',
      workshop: 'Workshop',
      activity_centre: 'Activity Centre',
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
      summer_camp: 'success',
      play_zone: 'secondary',
      workshop: 'warning',
      activity_centre: 'default',
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

  const columns: any[] = [
    {
      key: 'name',
      label: 'Name',
      render: (_: any, partnership: Partnership) => (
        <div>
          <div className="font-medium text-gray-900">{partnership.name}</div>
          {partnership.organization && (
            <div className="text-sm text-gray-500">{partnership.organization}</div>
          )}
        </div>
      )
    },
    {
      key: 'email',
      label: 'Contact',
      render: (_: any, partnership: Partnership) => (
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
      key: 'partnershipType',
      label: 'Type',
      render: (_: any, partnership: Partnership) => (
        <Badge variant={getPartnershipTypeBadgeVariant(partnership.partnershipType)}>
          {getPartnershipTypeLabel(partnership.partnershipType)}
        </Badge>
      )
    },
    {
      key: 'campaignType',
      label: 'Campaign',
      render: (_: any, partnership: Partnership) => (
        <Badge variant={partnership.campaignType === 'summer_2026' ? 'secondary' : 'default'}>
          {partnership.campaignType === 'summer_2026' ? 'Summer 2026' : 'General'}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, partnership: Partnership) => (
        <Badge variant={getStatusBadgeVariant(partnership.status)}>
          {partnership.status.charAt(0).toUpperCase() + partnership.status.slice(1)}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      label: 'Submitted',
      render: (_: any, partnership: Partnership) => (
        <div className="text-sm text-gray-600">
          {new Date(partnership.createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      key: '_id',
      label: 'Actions',
      minWidth: '180px',
      render: (_: any, partnership: Partnership) => (
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
                setEditingPartnership(partnership);
                setShowEditModal(true);
              }}
            >
              <Edit className="w-4 h-4" />
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
        <div className="flex items-center gap-2">
          <Button onClick={() => handleExport(false)} variant="outline" disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export All'}
          </Button>
          <Button onClick={() => handleExport(true)} variant="outline" disabled={exporting}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Filtered
          </Button>
          <Button onClick={fetchPartnerships} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign
              </label>
              <select
                value={filters.campaignType}
                onChange={(e) => setFilters({ ...filters, campaignType: e.target.value, page: 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">All Campaigns</option>
                <option value="general">General</option>
                <option value="summer_2026">Summer 2026</option>
              </select>
            </div>

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
                <option value="summer_camp">Summer Camp</option>
                <option value="play_zone">Play Zone</option>
                <option value="workshop">Workshop</option>
                <option value="activity_centre">Activity Centre</option>
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
                page: pagination.currentPage,
                pageSize: pagination.limit,
                total: pagination.totalCount,
              }}
              onPageChange={(page) => setFilters({ ...filters, page })}
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
                <h3 className="font-semibold text-gray-900 mb-3">Submission Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block">Campaign Type</span>
                      <span className="font-medium text-gray-900">{selectedPartnership.campaignType === 'summer_2026' ? 'Summer 2026' : 'General'}</span>
                    </div>
                    {selectedPartnership.selectedPackage && (
                      <div>
                        <span className="text-gray-500 block">Selected Package</span>
                        <span className="font-medium text-gray-900 uppercase">{selectedPartnership.selectedPackage}</span>
                      </div>
                    )}
                    {selectedPartnership.emirate && (
                      <div>
                        <span className="text-gray-500 block">Emirate</span>
                        <span className="font-medium text-gray-900">{selectedPartnership.emirate}</span>
                      </div>
                    )}
                    {selectedPartnership.numberOfKids && (
                      <div>
                        <span className="text-gray-500 block">Est. Kids</span>
                        <span className="font-medium text-gray-900">{selectedPartnership.numberOfKids}</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedPartnership.campDetails && (
                    <div>
                      <span className="text-gray-500 text-sm block mb-1">Camp/Activity Details</span>
                      <p className="text-gray-700">{selectedPartnership.campDetails}</p>
                    </div>
                  )}

                  {selectedPartnership.ageGroups && selectedPartnership.ageGroups.length > 0 && (
                    <div>
                      <span className="text-gray-500 text-sm block mb-1">Target Age Groups</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedPartnership.ageGroups.map(age => (
                          <Badge key={age} variant="secondary" size="sm">{age}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-gray-500 text-sm block mb-1">Inquiry Message</span>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedPartnership.message}</p>
                  </div>
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
      {/* Edit Partnership Modal */}
      <EditPartnershipModal
        partnership={editingPartnership}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPartnership(null);
        }}
        onSaved={fetchPartnerships}
      />
    </div>
  );
};

export default PartnershipList;
