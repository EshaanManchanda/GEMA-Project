import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface CancelEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  onSuccess?: () => void;
}

interface CancellationResult {
  affectedOrders: number;
  refundSummary: {
    totalOrders: number;
    successfulRefunds: number;
    failedRefunds: number;
    totalRefundAmount: number;
  };
  notifications: {
    queued: number;
    failed: number;
  };
}

const CancelEventModal: React.FC<CancelEventModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CancellationResult | null>(null);
  const [step, setStep] = useState<'confirm' | 'result'>('confirm');

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post(`/events/${eventId}/cancel`, { reason });
      setResult(response.data.data);
      setStep('result');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError(null);
    setResult(null);
    setStep('confirm');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="ml-3 text-lg font-semibold leading-6 text-gray-900">
                  {step === 'confirm' ? 'Cancel Event' : 'Cancellation Complete'}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {step === 'confirm' ? (
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Are you sure you want to cancel <strong>"{eventTitle}"</strong>?
                </p>
                <div className="mt-4 rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <ul className="list-disc space-y-1 pl-5">
                          <li>All bookings for this event will be cancelled</li>
                          <li>Customers will receive automatic refunds (minus 10% service fee)</li>
                          <li>Email notifications will be sent to all affected customers</li>
                          <li>This action cannot be undone</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                    Cancellation Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide a reason for cancelling this event..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {error && (
                  <div className="mt-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <div className="rounded-md bg-green-50 p-4">
                  <h4 className="text-sm font-medium text-green-800">Event Cancelled Successfully</h4>
                  <div className="mt-3 text-sm text-green-700">
                    <p><strong>{result?.affectedOrders}</strong> orders affected</p>
                  </div>
                </div>

                {result && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-md bg-gray-50 p-4">
                      <h5 className="text-sm font-medium text-gray-700">Refund Summary</h5>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-gray-500">Total Orders:</dt>
                        <dd className="font-medium text-gray-900">{result.refundSummary.totalOrders}</dd>
                        <dt className="text-gray-500">Successful Refunds:</dt>
                        <dd className="font-medium text-green-600">{result.refundSummary.successfulRefunds}</dd>
                        <dt className="text-gray-500">Failed Refunds:</dt>
                        <dd className="font-medium text-red-600">{result.refundSummary.failedRefunds}</dd>
                        <dt className="text-gray-500">Total Refunded:</dt>
                        <dd className="font-medium text-gray-900">
                          ${result.refundSummary.totalRefundAmount.toFixed(2)}
                        </dd>
                      </dl>
                    </div>

                    <div className="rounded-md bg-gray-50 p-4">
                      <h5 className="text-sm font-medium text-gray-700">Notifications</h5>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-gray-500">Emails Queued:</dt>
                        <dd className="font-medium text-gray-900">{result.notifications.queued}</dd>
                        <dt className="text-gray-500">Failed:</dt>
                        <dd className="font-medium text-red-600">{result.notifications.failed}</dd>
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            {step === 'confirm' ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Event'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  Go Back
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:w-auto"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelEventModal;
