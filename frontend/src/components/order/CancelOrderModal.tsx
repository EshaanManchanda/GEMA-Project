import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import api from '../../services/api';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  eventTitle: string;
  eventDate: Date | string;
  totalAmount: number;
  serviceFee: number;
  tax?: number;
  subtotal: number;
  currency: string;
  onSuccess?: () => void;
}

interface CancellationResult {
  orderId: string;
  orderNumber: string;
  refundAmount: number;
  nonRefundableAmount: number;
  serviceFee: number;
  tax: number;
  refundId?: string;
  message: string;
}

const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  eventTitle,
  eventDate,
  totalAmount,
  serviceFee,
  tax = 0,
  subtotal,
  currency,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CancellationResult | null>(null);
  const [step, setStep] = useState<'confirm' | 'result'>('confirm');
  const [canCancel, setCanCancel] = useState(true);
  const [cantCancelReason, setCantCancelReason] = useState<string | null>(null);

  // Calculate refund amount (subtotal is the ticket price, which is refundable)
  // Non-refundable = serviceFee + tax
  const refundAmount = subtotal;
  const nonRefundableAmount = serviceFee + tax;

  // Check if cancellation is allowed (24 hours before event)
  useEffect(() => {
    if (isOpen) {
      const eventDateTime = new Date(eventDate);
      const now = new Date();
      const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilEvent < 24) {
        setCanCancel(false);
        setCantCancelReason('Cancellation is not available within 24 hours of the event.');
      } else {
        setCanCancel(true);
        setCantCancelReason(null);
      }
    }
  }, [isOpen, eventDate]);

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.put(`/orders/${orderId}/cancel`, { reason });
      setResult(response.data.data);
      setStep('result');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel order');
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
                <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                  step === 'result' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {step === 'result' ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <h3 className="ml-3 text-lg font-semibold leading-6 text-gray-900">
                  {step === 'confirm' ? 'Cancel Order' : 'Order Cancelled'}
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
                {!canCancel ? (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Cannot Cancel</h3>
                        <p className="mt-2 text-sm text-red-700">{cantCancelReason}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md bg-gray-50 p-4">
                      <h4 className="text-sm font-medium text-gray-900">Order Details</h4>
                      <dl className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Order Number:</dt>
                          <dd className="font-medium text-gray-900">{orderNumber}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Event:</dt>
                          <dd className="font-medium text-gray-900">{eventTitle}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Event Date:</dt>
                          <dd className="font-medium text-gray-900">{formatDate(eventDate)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="mt-4 rounded-md bg-green-50 p-4">
                      <h4 className="text-sm font-medium text-green-800">Refund Breakdown</h4>
                      <dl className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-green-700">Ticket Price (Refundable):</dt>
                          <dd className="font-bold text-green-800">{currency} {refundAmount.toFixed(2)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Service Fee:</dt>
                          <dd className="text-gray-600">{currency} {serviceFee.toFixed(2)}</dd>
                        </div>
                        {tax > 0 && (
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Tax:</dt>
                            <dd className="text-gray-600">{currency} {tax.toFixed(2)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                          <dt className="text-red-600 font-medium">Non-refundable Total:</dt>
                          <dd className="text-red-600 font-medium">{currency} {nonRefundableAmount.toFixed(2)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="mt-4 rounded-md bg-yellow-50 p-4">
                      <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Please Note</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <ul className="list-disc space-y-1 pl-5">
                              <li>Service fee and tax are non-refundable</li>
                              <li>Refunds take 5-10 business days to process</li>
                              <li>You will receive a confirmation email</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                        Reason for Cancellation (Optional)
                      </label>
                      <textarea
                        id="reason"
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Let us know why you're cancelling..."
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </>
                )}

                {error && (
                  <div className="mt-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <div className="rounded-md bg-green-50 p-4">
                  <h4 className="text-sm font-medium text-green-800">Your order has been cancelled</h4>
                  <p className="mt-2 text-sm text-green-700">{result?.message}</p>
                </div>

                {result && (
                  <div className="mt-4 rounded-md bg-gray-50 p-4">
                    <h5 className="text-sm font-medium text-gray-700">Refund Details</h5>
                    <dl className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Order Number:</dt>
                        <dd className="font-medium text-gray-900">{result.orderNumber}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Refund Amount:</dt>
                        <dd className="font-bold text-green-600">{currency} {result.refundAmount.toFixed(2)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Non-refundable (Fees + Tax):</dt>
                        <dd className="text-gray-600">{currency} {result.nonRefundableAmount.toFixed(2)}</dd>
                      </div>
                      {result.refundId && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Refund ID:</dt>
                          <dd className="font-mono text-xs text-gray-600">{result.refundId}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                <p className="mt-4 text-sm text-gray-500">
                  A confirmation email has been sent to your registered email address.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            {step === 'confirm' ? (
              <>
                {canCancel && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Cancel Order'
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  {canCancel ? 'Go Back' : 'Close'}
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

export default CancelOrderModal;
