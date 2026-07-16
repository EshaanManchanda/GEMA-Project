import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import adminAPI from '../../services/api/adminAPI';
import logger from '@/utils/logger';

/**
 * Monthly vendor payout settlement panel.
 *
 * Two-layer settlement model:
 *  - payoutHoldHours (below, in Payout Settings) controls WHEN a
 *    RevenueTransaction becomes eligible (refund/clawback safety window).
 *  - VendorPayoutBatch (the table below) controls WHEN eligible money is
 *    actually SETTLED — grouped monthly per vendor, reviewed and approved
 *    here, then marked paid with a reference.
 *
 * See doc/architecture/PAYMENT_COMMISSION_PAYOUT_SYSTEM.md for the full flow.
 */

interface PayoutBatch {
  _id: string;
  vendorId: { _id: string; businessName?: string; email?: string } | string;
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  platformCommission: number;
  refunds: number;
  netPayout: number;
  currency: string;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  paymentMethod?: string;
  transactionReference?: string;
  createdAt: string;
}

interface PayoutSettings {
  payoutHoldHours: number;
  payoutFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  monthlyPayoutDay: number;
  minimumPayoutAmount: number;
  payoutCurrency: string;
  autoPayoutEnabled: boolean;
}

const formatCurrency = (amount: number, currency: string = 'AED') =>
  new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const statusBadgeClass: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const VendorPayoutBatchesPanel: React.FC = () => {
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<PayoutSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Mark-paid modal
  const [markPaidBatch, setMarkPaidBatch] = useState<PayoutBatch | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [transactionReference, setTransactionReference] = useState('');

  const loadBatches = useCallback(async () => {
    setIsLoading(true);
    try {
      // ApiService.get() unwraps the axios response, returning the backend's
      // { success, data, pagination } body directly — response.data is the
      // batch array. Matches the convention used throughout adminSlice.ts
      // (e.g. fetchPayoutRequests: `action.payload.data`).
      const response = await adminAPI.getPayoutBatches({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      });
      setBatches((response as any)?.data || []);
    } catch (error) {
      logger.error('Failed to load payout batches:', error);
      toast.error('Failed to load payout batches');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const loadSettings = useCallback(async () => {
    try {
      // GET /admin/settings returns { success, data: AdminRevenueSettings }
      const response = await adminAPI.getSettings();
      setSettingsDraft((response as any)?.data ?? null);
    } catch (error) {
      logger.error('Failed to load payout settings:', error);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async () => {
    if (!settingsDraft) return;
    setIsSavingSettings(true);
    try {
      await adminAPI.updateSettings({
        payoutHoldHours: settingsDraft.payoutHoldHours,
        payoutFrequency: settingsDraft.payoutFrequency,
        monthlyPayoutDay: settingsDraft.monthlyPayoutDay,
        minimumPayoutAmount: settingsDraft.minimumPayoutAmount,
        autoPayoutEnabled: settingsDraft.autoPayoutEnabled,
      });
      toast.success('Payout settings saved');
      await loadSettings();
    } catch (error) {
      logger.error('Failed to save payout settings:', error);
      toast.error('Failed to save payout settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleGenerateBatches = async () => {
    setIsGenerating(true);
    try {
      // POST .../batches/generate returns { success, message, data: { created, skipped } }
      const response = await adminAPI.generatePayoutBatches();
      toast.success((response as any)?.message || 'Batches generated');
      await loadBatches();
    } catch (error) {
      logger.error('Failed to generate payout batches:', error);
      toast.error('Failed to generate payout batches');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await adminAPI.approvePayoutBatch(id);
      toast.success('Batch approved');
      await loadBatches();
    } catch (error) {
      logger.error('Failed to approve batch:', error);
      toast.error('Failed to approve batch');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this batch? Its transactions will become eligible for a future batch again.')) return;
    try {
      await adminAPI.cancelPayoutBatch(id);
      toast.success('Batch cancelled');
      await loadBatches();
    } catch (error) {
      logger.error('Failed to cancel batch:', error);
      toast.error('Failed to cancel batch');
    }
  };

  const handleMarkPaidSubmit = async () => {
    if (!markPaidBatch) return;
    try {
      await adminAPI.markPayoutBatchPaid(markPaidBatch._id, {
        paymentMethod,
        transactionReference: transactionReference || undefined,
      });
      toast.success('Batch marked as paid');
      setMarkPaidBatch(null);
      setTransactionReference('');
      await loadBatches();
    } catch (error) {
      logger.error('Failed to mark batch as paid:', error);
      toast.error('Failed to mark batch as paid');
    }
  };

  const handleExport = (id: string) => {
    const apiBase = (import.meta as any)?.env?.VITE_API_URL || '/api';
    window.open(`${apiBase}/admin/payouts/batches/${id}/export?format=csv`, '_blank');
  };

  const vendorLabel = (batch: PayoutBatch) => {
    if (typeof batch.vendorId === 'string') return batch.vendorId;
    return batch.vendorId?.businessName || batch.vendorId?.email || batch.vendorId?._id || 'Unknown vendor';
  };

  return (
    <div className="space-y-6">
      {/* Payout hold + settlement settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Payout Settings</h3>
        <p className="text-sm text-gray-500 mb-4">
          <strong>Payout hold hours</strong> is the refund/clawback safety window before a
          transaction becomes payout-eligible. <strong>Payout frequency</strong> controls
          settlement cadence — set to "monthly" to enable batch settlement below.
        </p>
        {settingsDraft ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payout Hold (hours)</label>
              <input
                type="number"
                min={0}
                value={settingsDraft.payoutHoldHours ?? 24}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, payoutHoldHours: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payout Frequency</label>
              <select
                value={settingsDraft.payoutFrequency}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, payoutFrequency: e.target.value as PayoutSettings['payoutFrequency'] })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly (batch settlement)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payout Day</label>
              <input
                type="number"
                min={1}
                max={28}
                value={settingsDraft.monthlyPayoutDay ?? 5}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, monthlyPayoutDay: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Payout ({settingsDraft.payoutCurrency || 'AED'})
              </label>
              <input
                type="number"
                min={0}
                value={settingsDraft.minimumPayoutAmount ?? 50}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, minimumPayoutAmount: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium transition-colors"
              >
                {isSavingSettings ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Loading settings…</p>
        )}
      </div>

      {/* Batches table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Monthly Payout Batches</h3>
            <p className="text-sm text-gray-500">Draft batches settle eligible, unbatched vendor earnings for a period.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={handleGenerateBatches}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {isGenerating ? 'Generating…' : 'Generate Batches'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Payout</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading…</td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No payout batches yet</td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{vendorLabel(batch)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(batch.periodStart).toLocaleDateString()} – {new Date(batch.periodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(batch.grossRevenue, batch.currency)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">{formatCurrency(batch.platformCommission, batch.currency)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(batch.netPayout, batch.currency)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass[batch.status] || 'bg-gray-100 text-gray-700'}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{batch.transactionReference || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right space-x-2 whitespace-nowrap">
                      {batch.status === 'draft' && (
                        <>
                          <button onClick={() => handleApprove(batch._id)} className="text-blue-600 hover:text-blue-800 font-medium">Approve</button>
                          <button onClick={() => handleCancel(batch._id)} className="text-red-600 hover:text-red-800 font-medium">Cancel</button>
                        </>
                      )}
                      {batch.status === 'approved' && (
                        <>
                          <button onClick={() => setMarkPaidBatch(batch)} className="text-green-600 hover:text-green-800 font-medium">Mark Paid</button>
                          <button onClick={() => handleCancel(batch._id)} className="text-red-600 hover:text-red-800 font-medium">Cancel</button>
                        </>
                      )}
                      <button onClick={() => handleExport(batch._id)} className="text-gray-600 hover:text-gray-800 font-medium">Export</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark-paid modal */}
      {markPaidBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Mark Batch Paid — {vendorLabel(markPaidBatch)}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Net payout: <strong>{formatCurrency(markPaidBatch.netPayout, markPaidBatch.currency)}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="stripe_connect">Stripe Connect</option>
                  <option value="manual">Manual</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference (optional)</label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. bank confirmation number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setMarkPaidBatch(null); setTransactionReference(''); }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaidSubmit}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPayoutBatchesPanel;
