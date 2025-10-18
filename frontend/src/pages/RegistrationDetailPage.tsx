import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  FileText,
  User,
  Mail,
  Phone,
  DollarSign,
  CreditCard,
  MapPin,
  Loader2,
  Edit,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { AppDispatch } from '@/store';
import {
  fetchRegistrationById,
  withdrawRegistration,
  reviewRegistration,
  downloadRegistrationFile,
  selectCurrentRegistration,
  selectIsRegistrationLoading,
} from '@/store/slices/registrationsSlice';
import { selectUser } from '@/store/slices/authSlice';
import { RegistrationStatus, RegistrationReviewStatus, FormField } from '@/types/registration';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const RegistrationDetailPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { registrationId } = useParams<{ registrationId: string }>();

  const registration = useSelector(selectCurrentRegistration);
  const isLoading = useSelector(selectIsRegistrationLoading);
  const currentUser = useSelector(selectUser);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<RegistrationReviewStatus | null>(null);
  const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);

  // Load registration on mount
  useEffect(() => {
    if (registrationId) {
      dispatch(fetchRegistrationById(registrationId));
    }
  }, [registrationId, dispatch]);

  // Check if current user is vendor
  const isVendor = currentUser?.role === 'vendor';
  const isOwner = registration && currentUser && registration.userId === currentUser._id;
  const canReview = isVendor && registration?.status &&
    [RegistrationStatus.SUBMITTED, RegistrationStatus.UNDER_REVIEW].includes(registration.status);
  const canWithdraw = isOwner && registration?.status &&
    [RegistrationStatus.DRAFT, RegistrationStatus.SUBMITTED, RegistrationStatus.UNDER_REVIEW].includes(registration.status);

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!registrationId) return;

    try {
      await dispatch(withdrawRegistration(registrationId)).unwrap();
      toast.success('Registration withdrawn successfully');
      setWithdrawConfirmOpen(false);
      navigate('/registrations');
    } catch (error: any) {
      toast.error(error.message || 'Failed to withdraw registration');
    }
  };

  // Handle review
  const handleReview = async (status: RegistrationReviewStatus, remarks?: string) => {
    if (!registrationId) return;

    try {
      await dispatch(reviewRegistration({
        registrationId,
        status,
        remarks,
      })).unwrap();

      toast.success(`Registration ${status === RegistrationReviewStatus.APPROVED ? 'approved' : 'rejected'} successfully`);
      setReviewModalOpen(false);
      setReviewAction(null);

      // Refresh registration
      dispatch(fetchRegistrationById(registrationId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to review registration');
    }
  };

  // Handle file download
  const handleFileDownload = async (fileId: string, fileName: string) => {
    if (!registrationId) return;

    try {
      const blob = await dispatch(downloadRegistrationFile({ registrationId, fileId })).unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('File downloaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download file');
    }
  };

  // Get status badge
  const getStatusBadge = (status: RegistrationStatus) => {
    const statusConfig = {
      [RegistrationStatus.DRAFT]: { icon: Clock, variant: 'secondary' as const, label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      [RegistrationStatus.SUBMITTED]: { icon: Clock, variant: 'warning' as const, label: 'Submitted', color: 'bg-yellow-100 text-yellow-800' },
      [RegistrationStatus.UNDER_REVIEW]: { icon: AlertCircle, variant: 'warning' as const, label: 'Under Review', color: 'bg-orange-100 text-orange-800' },
      [RegistrationStatus.APPROVED]: { icon: CheckCircle, variant: 'success' as const, label: 'Approved', color: 'bg-green-100 text-green-800' },
      [RegistrationStatus.REJECTED]: { icon: XCircle, variant: 'danger' as const, label: 'Rejected', color: 'bg-red-100 text-red-800' },
      [RegistrationStatus.WITHDRAWN]: { icon: XCircle, variant: 'secondary' as const, label: 'Withdrawn', color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg ${config.color}`}>
        <Icon className="w-5 h-5" />
        <span className="font-semibold">{config.label}</span>
      </div>
    );
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'AED') => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  // Get field icon
  const getFieldIcon = (fieldType: string) => {
    const icons: Record<string, any> = {
      text: FileText,
      email: Mail,
      tel: Phone,
      number: FileText,
      textarea: FileText,
      date: Calendar,
      file: FileText,
      dropdown: FileText,
      radio: FileText,
      checkbox: CheckCircle,
    };
    return icons[fieldType] || FileText;
  };

  if (isLoading || !registration) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading registration details...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Group registration data by section
  const groupedData = registration.registrationData.reduce((acc, data) => {
    const section = data.section || 'General Information';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(data);
    return acc;
  }, {} as Record<string, typeof registration.registrationData>);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Registration Details
              </h1>
              <p className="text-gray-600">
                Confirmation: <span className="font-semibold">{registration.confirmationNumber || 'N/A'}</span>
              </p>
            </div>
            {getStatusBadge(registration.status)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex items-center space-x-3">
          {canReview && (
            <>
              <Button
                variant="success"
                onClick={() => handleReview(RegistrationReviewStatus.APPROVED)}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setReviewAction(RegistrationReviewStatus.REJECTED);
                  setReviewModalOpen(true);
                }}
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                Reject
              </Button>
            </>
          )}
          {canWithdraw && (
            <Button
              variant="outline"
              onClick={() => setWithdrawConfirmOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Withdraw Registration
            </Button>
          )}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Payment Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  registration.payment.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <DollarSign className={`w-6 h-6 ${
                    registration.payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(registration.payment.amount, registration.payment.currency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {registration.payment.status === 'paid' ? 'Paid' : 'Pending'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Date */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Submitted</p>
                  <p className="text-lg font-bold text-gray-900">
                    {registration.metadata.submittedAt
                      ? new Date(registration.metadata.submittedAt).toLocaleDateString()
                      : 'Not submitted'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {registration.metadata.submittedAt
                      ? new Date(registration.metadata.submittedAt).toLocaleTimeString()
                      : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files Count */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Attachments</p>
                  <p className="text-lg font-bold text-gray-900">
                    {registration.files.length} {registration.files.length === 1 ? 'File' : 'Files'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(registration.files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registration Data */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Registration Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(groupedData).map(([section, fields]) => (
              <div key={section}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  {section}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fields.map((field, index) => {
                    const Icon = getFieldIcon(field.fieldType);
                    return (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            {field.fieldLabel}
                          </p>
                          <p className="text-base text-gray-900">
                            {field.fieldType === 'checkbox' && Array.isArray(field.value)
                              ? field.value.join(', ')
                              : field.fieldType === 'date' && field.value
                              ? new Date(field.value as string).toLocaleDateString()
                              : field.value?.toString() || 'N/A'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Files */}
        {registration.files.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Attached Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {registration.files.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.originalName}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span>{file.fieldLabel}</span>
                          <span>•</span>
                          <span>{(file.size / 1024).toFixed(2)} KB</span>
                          <span>•</span>
                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFileDownload(file._id || '', file.originalName)}
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor Review */}
        {registration.vendorReview && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Vendor Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg border ${
                registration.vendorReview.status === 'approved'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {registration.vendorReview.status === 'approved' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-semibold text-gray-900">
                    {registration.vendorReview.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
                {registration.vendorReview.remarks && (
                  <p className="text-sm text-gray-700 mb-2">{registration.vendorReview.remarks}</p>
                )}
                <p className="text-xs text-gray-500">
                  Reviewed on {new Date(registration.vendorReview.reviewedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Details */}
        {registration.payment.stripePaymentIntentId && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Intent ID</p>
                  <p className="text-sm font-mono text-gray-900 break-all">
                    {registration.payment.stripePaymentIntentId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Amount</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(registration.payment.amount, registration.payment.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge variant={registration.payment.status === 'paid' ? 'success' : 'warning'}>
                    {registration.payment.status}
                  </Badge>
                </div>
                {registration.payment.paidAt && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Paid At</p>
                    <p className="text-sm text-gray-900">
                      {new Date(registration.payment.paidAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Modal */}
        {reviewModalOpen && reviewAction === RegistrationReviewStatus.REJECTED && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle>Reject Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Please provide a reason for rejecting this registration (optional).
                  </p>
                  <textarea
                    id="reject-remarks"
                    rows={4}
                    placeholder="Enter rejection reason..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex items-center justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReviewModalOpen(false);
                        setReviewAction(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        const remarks = (document.getElementById('reject-remarks') as HTMLTextAreaElement)?.value;
                        handleReview(RegistrationReviewStatus.REJECTED, remarks);
                      }}
                    >
                      Reject Registration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Withdraw Confirmation Modal */}
        {withdrawConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle>Withdraw Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to withdraw this registration? This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setWithdrawConfirmOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleWithdraw}
                    >
                      Withdraw
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationDetailPage;
