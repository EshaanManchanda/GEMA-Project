import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import api from '../../services/api';

interface RefundStatus {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  refundStatus: string;
  refundAmount?: number;
  serviceFee?: number;
  currency: string;
  refundTransactionId?: string;
  refundedAt?: string;
  cancellationType?: string;
}

interface RefundStatusTrackerProps {
  orderId: string;
  className?: string;
}

const RefundStatusTracker: React.FC<RefundStatusTrackerProps> = ({ orderId, className = '' }) => {
  const [status, setStatus] = useState<RefundStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/orders/${orderId}/refund-status`);
      setStatus(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch refund status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [orderId]);

  const getStatusIcon = (refundStatus: string) => {
    switch (refundStatus) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'processing':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case 'pending':
        return <Clock className="h-6 w-6 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusColor = (refundStatus: string) => {
    switch (refundStatus) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'processing':
        return 'bg-yellow-50 border-yellow-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (refundStatus: string) => {
    switch (refundStatus) {
      case 'completed':
        return 'Refund Completed';
      case 'processing':
        return 'Refund Processing';
      case 'pending':
        return 'Refund Pending';
      case 'failed':
        return 'Refund Failed';
      case 'not_initiated':
        return 'No Refund';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusDescription = (refundStatus: string) => {
    switch (refundStatus) {
      case 'completed':
        return 'Your refund has been processed and sent to your payment method.';
      case 'processing':
        return 'Your refund is being processed. This usually takes 5-10 business days.';
      case 'pending':
        return 'Your refund request has been received and will be processed shortly.';
      case 'failed':
        return 'There was an issue processing your refund. Our team is looking into it.';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading refund status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-md bg-red-50 p-4 ${className}`}>
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchStatus}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!status || status.refundStatus === 'not_initiated') {
    return null; // Don't show anything if there's no refund
  }

  return (
    <div className={`rounded-lg border ${getStatusColor(status.refundStatus)} p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          {getStatusIcon(status.refundStatus)}
          <div className="ml-3">
            <h4 className="text-sm font-medium text-gray-900">{getStatusText(status.refundStatus)}</h4>
            <p className="mt-1 text-sm text-gray-500">{getStatusDescription(status.refundStatus)}</p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="rounded-full p-1 hover:bg-white/50"
          title="Refresh status"
        >
          <RefreshCw className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {status.refundStatus !== 'not_initiated' && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {status.refundAmount !== undefined && (
              <>
                <dt className="text-gray-500">Refund Amount:</dt>
                <dd className="font-medium text-green-600">
                  {status.currency} {status.refundAmount.toFixed(2)}
                </dd>
              </>
            )}
            {status.serviceFee !== undefined && status.serviceFee > 0 && (
              <>
                <dt className="text-gray-500">Service Fee (Non-refundable):</dt>
                <dd className="text-gray-600">
                  {status.currency} {status.serviceFee.toFixed(2)}
                </dd>
              </>
            )}
            {status.refundedAt && (
              <>
                <dt className="text-gray-500">Processed On:</dt>
                <dd className="text-gray-900">{formatDate(status.refundedAt)}</dd>
              </>
            )}
            {status.refundTransactionId && (
              <>
                <dt className="text-gray-500">Transaction ID:</dt>
                <dd className="font-mono text-xs text-gray-600">{status.refundTransactionId}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {/* Progress Steps */}
      {status.refundStatus !== 'not_initiated' && status.refundStatus !== 'failed' && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <Step
              label="Requested"
              isActive={true}
              isComplete={['processing', 'completed'].includes(status.refundStatus)}
            />
            <div className="flex-1 mx-2">
              <div className={`h-0.5 ${['processing', 'completed'].includes(status.refundStatus) ? 'bg-green-500' : 'bg-gray-200'}`} />
            </div>
            <Step
              label="Processing"
              isActive={['processing', 'completed'].includes(status.refundStatus)}
              isComplete={status.refundStatus === 'completed'}
            />
            <div className="flex-1 mx-2">
              <div className={`h-0.5 ${status.refundStatus === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
            </div>
            <Step
              label="Completed"
              isActive={status.refundStatus === 'completed'}
              isComplete={status.refundStatus === 'completed'}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface StepProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

const Step: React.FC<StepProps> = ({ label, isActive, isComplete }) => (
  <div className="flex flex-col items-center">
    <div
      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
        isComplete
          ? 'bg-green-500 text-white'
          : isActive
          ? 'bg-blue-500 text-white'
          : 'bg-gray-200 text-gray-500'
      }`}
    >
      {isComplete ? <CheckCircle className="h-4 w-4" /> : null}
    </div>
    <span className={`mt-1 text-xs ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span>
  </div>
);

export default RefundStatusTracker;
