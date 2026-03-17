import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { approveCommissions } from '../../store/slices/adminSlice';
import type { AppDispatch } from '../../store';
import type { CommissionTransaction } from '../../store/slices/adminSlice';
import adminAPI from '../../services/api/adminAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const STATUS_STYLES: Record<string, string> = {
  calculated: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const RECIPIENT_LABELS: Record<string, string> = {
  vendor: 'Vendor',
  affiliate: 'Affiliate',
  referrer: 'Referrer',
  platform: 'Platform',
};

function formatCurrency(amount: number, currency = 'AED') {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString();
}

const AdminCommissionTransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();

  const [transaction, setTransaction] = useState<CommissionTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminAPI.getCommissionTransaction(id)
      .then((data) => {
        const t = data.transaction || data;
        setTransaction({
          ...t,
          id: t._id?.toString() || t.id,
          vendorId: typeof t.vendorId === 'object' ? t.vendorId?._id?.toString() : t.vendorId,
          customerId: typeof t.customerId === 'object' ? t.customerId?._id?.toString() : t.customerId,
        });
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load transaction');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!transaction) return;
    setApproving(true);
    try {
      await dispatch(approveCommissions([transaction.id])).unwrap();
      setTransaction((prev) => prev ? { ...prev, status: 'approved' } : prev);
      toast.success('Commission approved');
    } catch {
      toast.error('Approval failed');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading transaction...</div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error || 'Transaction not found'}</div>
      </div>
    );
  }

  const currency = 'AED';

  return (
    <div className="min-h-screen bg-gray-50">
      <PrivatePageSEO title="Commission Transaction" />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/commissions"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              ← Back to Commissions
            </Link>
            <span className="text-gray-300">|</span>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Transaction ID</p>
              <p className="font-mono text-sm text-gray-700">{transaction.transactionId || transaction.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[transaction.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </span>
            {transaction.status === 'calculated' && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {approving ? 'Approving...' : 'Approve'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Original Amount', value: formatCurrency(transaction.originalAmount, currency) },
            { label: 'Total Commission', value: formatCurrency(transaction.totalCommissionAmount, currency) },
            { label: 'Platform Take', value: formatCurrency(transaction.platformCommission, currency) },
            { label: 'Vendor Payout', value: formatCurrency(transaction.vendorCommission, currency) },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-lg font-semibold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Vendor + Customer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Vendor</h3>
            <p className="text-base font-medium text-gray-900">{transaction.vendorName || '—'}</p>
            <p className="text-sm text-gray-400 font-mono mt-1">{transaction.vendorId}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Customer</h3>
            <p className="text-base font-medium text-gray-900">{transaction.customerName || '—'}</p>
            <p className="text-sm text-gray-400 font-mono mt-1">{transaction.customerId}</p>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Order Details</h3>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-gray-400">Order Number</p>
              <p className="font-medium text-gray-900">{transaction.orderNumber || transaction.orderId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Calculated At</p>
              <p className="font-medium text-gray-900">{formatDate(transaction.calculatedAt) || '—'}</p>
            </div>
          </div>
        </div>

        {/* Commission Breakdown */}
        {transaction.commissions?.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Commission Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Recipient', 'Type', 'Gross', 'Net', 'Rate %', 'Rule'].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transaction.commissions.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{c.recipientId || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {RECIPIENT_LABELS[c.recipientType] ?? c.recipientType}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(c.grossAmount, currency)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(c.netAmount, currency)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{c.percentage?.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.rule || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Trail */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Audit Trail</h3>
          <ol className="relative border-l border-gray-200 space-y-4 pl-4">
            <li>
              <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-yellow-400 mt-1" />
              <p className="text-sm font-medium text-gray-700">Calculated</p>
              <p className="text-xs text-gray-400">{formatDate(transaction.calculatedAt) || '—'}</p>
            </li>
            {transaction.approvedAt && (
              <li>
                <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-blue-500 mt-1" />
                <p className="text-sm font-medium text-gray-700">
                  Approved{transaction.approvedBy ? ` by ${transaction.approvedBy}` : ''}
                </p>
                <p className="text-xs text-gray-400">{formatDate(transaction.approvedAt)}</p>
              </li>
            )}
            {transaction.paidAt && (
              <li>
                <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-green-500 mt-1" />
                <p className="text-sm font-medium text-gray-700">Paid</p>
                <p className="text-xs text-gray-400">{formatDate(transaction.paidAt)}</p>
              </li>
            )}
          </ol>
        </div>

      </div>
    </div>
  );
};

export default AdminCommissionTransactionDetailPage;
