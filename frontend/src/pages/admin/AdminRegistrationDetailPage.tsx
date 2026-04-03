import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Calendar, DollarSign, CheckCircle,
  XCircle, FileText, Download, Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import adminAPI from '../../services/api/adminAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};

const AdminRegistrationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await adminAPI.getRegistrationById(id);
        const inner = res?.data?.data || res?.data || res;
        setRegistration(inner?.registration || inner);
      } catch (err: any) {
        logger.error('Failed to load registration', err);
        toast.error('Failed to load registration');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleReview = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await adminAPI.reviewRegistration(id, { status: reviewAction, remarks });
      toast.success(`Registration ${reviewAction}`);
      setRegistration((r: any) => ({ ...r, status: reviewAction, adminRemarks: remarks }));
      setShowReviewModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="p-6 text-center text-gray-500">
        Registration not found.{' '}
        <button onClick={() => navigate(-1)} className="text-indigo-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const user = registration.userId || {};
  const event = registration.eventId || {};
  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';

  return (
    <>
      <PrivatePageSEO title={`Registration: ${userName}`} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Registration Detail</h1>
              <p className="text-sm text-gray-500">ID: {registration._id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${STATUS_COLORS[registration.status] || 'bg-gray-100 text-gray-700'}`}>
              {registration.status}
            </span>
            {registration.status !== 'approved' && (
              <button
                onClick={() => { setReviewAction('approved'); setRemarks(''); setShowReviewModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
            )}
            {registration.status !== 'rejected' && (
              <button
                onClick={() => { setReviewAction('rejected'); setRemarks(''); setShowReviewModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: User + Event info */}
          <div className="space-y-4">
            {/* User card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Participant
              </h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div><span className="font-medium text-gray-800">Name:</span> {userName}</div>
                {user.email && <div><span className="font-medium text-gray-800">Email:</span> {user.email}</div>}
                {user.phone && <div><span className="font-medium text-gray-800">Phone:</span> {user.phone}</div>}
              </div>
            </div>

            {/* Event card */}
            {(event.title || event._id) && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Event
                </h2>
                <div className="space-y-2 text-sm text-gray-600">
                  {event.title && <div className="font-medium text-gray-800">{event.title}</div>}
                  {event._id && (
                    <button
                      onClick={() => navigate(`/admin/events/${event._id}`)}
                      className="text-indigo-600 hover:underline text-xs"
                    >
                      View event →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Payment card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment
              </h2>
              <div className="space-y-2 text-sm text-gray-600">
                {registration.amount != null && (
                  <div>
                    <span className="font-medium text-gray-800">Amount:</span>{' '}
                    {registration.amount} {registration.currency || ''}
                  </div>
                )}
                {registration.paymentStatus && (
                  <div>
                    <span className="font-medium text-gray-800">Payment Status:</span>{' '}
                    {registration.paymentStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timestamps
              </h2>
              <div className="space-y-2 text-sm text-gray-600">
                {registration.submittedAt && (
                  <div>
                    <span className="font-medium text-gray-800">Submitted:</span>{' '}
                    {new Date(registration.submittedAt).toLocaleString()}
                  </div>
                )}
                {registration.updatedAt && (
                  <div>
                    <span className="font-medium text-gray-800">Last Modified:</span>{' '}
                    {new Date(registration.updatedAt).toLocaleString()}
                  </div>
                )}
                {registration.adminRemarks && (
                  <div>
                    <span className="font-medium text-gray-800">Admin Remarks:</span>{' '}
                    {registration.adminRemarks}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Registration data + files */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dynamic registration form data */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Registration Form Data
              </h2>
              {(registration.registrationData || []).length === 0 ? (
                <p className="text-sm text-gray-400">No form data submitted.</p>
              ) : (
                <div className="space-y-3">
                  {(registration.registrationData as any[]).map((field: any, i: number) => (
                    <div key={i} className="grid grid-cols-3 gap-4 py-2 border-b border-gray-50 last:border-0">
                      <div className="text-sm font-medium text-gray-600">{field.fieldLabel || field.fieldId || `Field ${i + 1}`}</div>
                      <div className="col-span-2 text-sm text-gray-900 break-words">
                        {Array.isArray(field.value)
                          ? field.value.join(', ')
                          : field.value != null
                          ? String(field.value)
                          : <span className="text-gray-400">—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uploaded files */}
            {(registration.uploadedFiles || []).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Uploaded Files
                </h2>
                <div className="space-y-2">
                  {(registration.uploadedFiles as any[]).map((file: any, i: number) => (
                    <a
                      key={i}
                      href={file.url || file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      <Download className="w-4 h-4 flex-shrink-0" />
                      {file.name || file.fieldLabel || `File ${i + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
              {reviewAction} Registration
            </h2>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Remarks (optional)..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={actionLoading}
                className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
                  reviewAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewAction === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminRegistrationDetailPage;
