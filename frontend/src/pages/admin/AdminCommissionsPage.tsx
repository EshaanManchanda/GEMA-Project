import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AdminNavigation from '../../components/admin/AdminNavigation';
import {
  fetchCommissionConfigs,
  fetchCommissionTransactions,
  fetchCommissionStats,
  createCommissionConfig,
  updateCommissionConfig,
  deleteCommissionConfig,
  approveCommissions,
  selectCommissionConfigs,
  selectCommissionTransactions,
  selectCommissionStats,
  selectPendingCommissions,
  selectIsCommissionLoading,
  selectCommissionError,
  selectCommissionSummary
} from '../../store/slices/adminSlice';
import type { AppDispatch } from '../../store';
import type { CommissionConfig, CommissionTransaction, CommissionRule } from '../../store/slices/adminSlice';

interface CommissionFilters {
  status: string;
  vendor: string;
  dateRange: string;
  minAmount: string;
  maxAmount: string;
}

const AdminCommissionsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const commissionConfigs = useSelector(selectCommissionConfigs);
  const commissionTransactions = useSelector(selectCommissionTransactions);
  const commissionStats = useSelector(selectCommissionStats);
  const pendingCommissions = useSelector(selectPendingCommissions);
  const isLoading = useSelector(selectIsCommissionLoading);
  const error = useSelector(selectCommissionError);
  const commissionSummary = useSelector(selectCommissionSummary);

  const [activeTab, setActiveTab] = useState<'configs' | 'transactions' | 'analytics'>('configs');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [filters, setFilters] = useState<CommissionFilters>({
    status: 'all',
    vendor: '',
    dateRange: 'all',
    minAmount: '',
    maxAmount: ''
  });

  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CommissionConfig | null>(null);
  const [configToDelete, setConfigToDelete] = useState<CommissionConfig | null>(null);

  // Form state for commission config
  const [configForm, setConfigForm] = useState({
    name: '',
    description: '',
    platformCommission: {
      defaultPercentage: 5,
      minAmount: 0,
      maxAmount: 10000,
      currency: 'AED'
    },
    rules: [] as CommissionRule[],
    multiLevelEnabled: false,
    maxLevels: 3
  });

  useEffect(() => {
    loadCommissionData();
  }, [dispatch]);

  const loadCommissionData = async () => {
    try {
      await Promise.all([
        dispatch(fetchCommissionConfigs()).unwrap(),
        dispatch(fetchCommissionTransactions()).unwrap(),
        dispatch(fetchCommissionStats()).unwrap()
      ]);
    } catch (error) {
      console.error('Failed to load commission data:', error);
    }
  };

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAllTransactions = () => {
    const filteredTransactions = getFilteredTransactions();
    const allSelected = filteredTransactions.length > 0 && 
      filteredTransactions.every(transaction => selectedTransactions.includes(transaction.id));
    
    if (allSelected) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(transaction => transaction.id));
    }
  };

  const handleApproveSelected = async () => {
    if (selectedTransactions.length === 0) return;
    
    try {
      await dispatch(approveCommissions(selectedTransactions)).unwrap();
      setSelectedTransactions([]);
      toast.success(`${selectedTransactions.length} commission(s) approved successfully!`);
    } catch (error) {
      console.error('Failed to approve commissions:', error);
    }
  };

  const handleCreateConfig = () => {
    setEditingConfig(null);
    setConfigForm({
      name: '',
      description: '',
      platformCommission: {
        defaultPercentage: 5,
        minAmount: 0,
        maxAmount: 10000,
        currency: 'AED'
      },
      rules: [],
      multiLevelEnabled: false,
      maxLevels: 3
    });
    setShowConfigModal(true);
  };

  const handleEditConfig = (config: CommissionConfig) => {
    setEditingConfig(config);
    setConfigForm({
      name: config.name,
      description: config.description || '',
      platformCommission: config.platformCommission,
      rules: config.rules,
      multiLevelEnabled: config.multiLevelEnabled || false,
      maxLevels: config.maxLevels || 3
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    try {
      if (editingConfig) {
        await dispatch(updateCommissionConfig({
          id: editingConfig.id,
          configData: configForm
        })).unwrap();
        toast.success('Commission configuration updated successfully!');
      } else {
        await dispatch(createCommissionConfig(configForm)).unwrap();
        toast.success('Commission configuration created successfully!');
      }
      setShowConfigModal(false);
    } catch (error) {
      console.error('Failed to save commission config:', error);
    }
  };

  const handleDeleteConfig = async () => {
    if (!configToDelete) return;
    
    try {
      await dispatch(deleteCommissionConfig(configToDelete.id)).unwrap();
      toast.success('Commission configuration deleted successfully!');
      setShowDeleteModal(false);
      setConfigToDelete(null);
    } catch (error) {
      console.error('Failed to delete commission config:', error);
    }
  };

  const addRule = () => {
    const newRule: CommissionRule = {
      id: `rule_${Date.now()}`,
      name: 'New Rule',
      type: 'percentage',
      recipient: 'vendor',
      percentage: 10,
      status: 'active',
      priority: configForm.rules.length + 1
    };
    setConfigForm({
      ...configForm,
      rules: [...configForm.rules, newRule]
    });
  };

  const updateRule = (index: number, updatedRule: Partial<CommissionRule>) => {
    const updatedRules = [...configForm.rules];
    updatedRules[index] = { ...updatedRules[index], ...updatedRule };
    setConfigForm({
      ...configForm,
      rules: updatedRules
    });
  };

  const removeRule = (index: number) => {
    setConfigForm({
      ...configForm,
      rules: configForm.rules.filter((_, i) => i !== index)
    });
  };

  const getFilteredTransactions = () => {
    let filtered = commissionTransactions;

    if (filters.status !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === filters.status);
    }

    if (filters.vendor.trim()) {
      const search = filters.vendor.toLowerCase();
      filtered = filtered.filter(transaction =>
        transaction.vendorName.toLowerCase().includes(search)
      );
    }

    if (filters.minAmount) {
      filtered = filtered.filter(transaction => transaction.totalCommissionAmount >= parseFloat(filters.minAmount));
    }

    if (filters.maxAmount) {
      filtered = filtered.filter(transaction => transaction.totalCommissionAmount <= parseFloat(filters.maxAmount));
    }

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'calculated': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'AED') => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading && commissionConfigs.length === 0) {
    return (
      <>
        <AdminNavigation />
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <p className="mt-4 text-xl font-semibold text-gray-700">Loading commissions...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Commission Management</h1>
          <div className="flex space-x-3">
            {activeTab === 'configs' && (
              <button
                onClick={handleCreateConfig}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <span className="mr-2">+</span>
                Create Configuration
              </button>
            )}
            {activeTab === 'transactions' && (
              <button
                onClick={handleApproveSelected}
                disabled={selectedTransactions.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="mr-2">✓</span>
                Approve Selected ({selectedTransactions.length})
              </button>
            )}
            <Link
              to="/admin/commissions/export"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              <span className="mr-2">📊</span>
              Export Data
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-blue-700">Total Commissions</h3>
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">💰</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900">{commissionSummary.totalCommissions}</p>
            <p className="text-sm text-blue-600 mt-1">{formatCurrency(commissionSummary.totalAmount)}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-orange-700">Pending Approval</h3>
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 text-xl">⏳</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-orange-900">{commissionSummary.pendingCommissions}</p>
            <p className="text-sm text-orange-600 mt-1">{formatCurrency(commissionSummary.pendingAmount)}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-green-700">Approved</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">✅</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-900">{formatCurrency(commissionSummary.approvedAmount)}</p>
            <p className="text-sm text-green-600 mt-1">Ready for payout</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-purple-700">Average Rate</h3>
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-xl">📈</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-900">{commissionSummary.averageRate}%</p>
            <p className="text-sm text-purple-600 mt-1">Platform average</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('configs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'configs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Configurations ({commissionConfigs.length})
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Transactions ({commissionTransactions.length})
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics & Reports
              </button>
            </nav>
          </div>

          {/* Filters */}
          {activeTab === 'transactions' && (
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="calculated">Calculated</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
                  <input
                    type="text"
                    value={filters.vendor}
                    onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                    placeholder="Search vendor..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                  <input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                  <input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                    placeholder="∞"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {activeTab === 'configs' && (
              <div>
                {/* Commission Configurations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {commissionConfigs.map((config) => (
                    <div
                      key={config.id}
                      className={`bg-white border rounded-xl p-6 hover:shadow-lg transition-shadow ${
                        config.isDefault ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">{config.name}</h3>
                          <p className="text-sm text-gray-500">{config.description}</p>
                          {config.isDefault && (
                            <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditConfig(config)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✏️
                          </button>
                          {!config.isDefault && (
                            <button
                              onClick={() => {
                                setConfigToDelete(config);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Platform Commission:</span>
                          <span className="font-medium">{config.platformCommission.defaultPercentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Active Rules:</span>
                          <span className="font-medium">{config.rules.filter(rule => rule.status === 'active').length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Multi-level:</span>
                          <span className={`font-medium ${config.multiLevelEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                            {config.multiLevelEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(config.status)}`}>
                            {config.status.charAt(0).toUpperCase() + config.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Commission Rules</h4>
                        <div className="space-y-2">
                          {config.rules.slice(0, 3).map((rule, index) => (
                            <div key={rule.id} className="flex justify-between text-sm">
                              <span className="text-gray-600">{rule.name}</span>
                              <span className="font-medium">
                                {rule.type === 'percentage' ? `${rule.percentage}%` : formatCurrency(rule.fixedAmount || 0)}
                              </span>
                            </div>
                          ))}
                          {config.rules.length > 3 && (
                            <p className="text-sm text-gray-500">+{config.rules.length - 3} more rules</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {commissionConfigs.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">⚙️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No commission configurations</h3>
                    <p className="text-gray-500 mb-4">Create your first commission configuration to get started.</p>
                    <button
                      onClick={handleCreateConfig}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create Configuration
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                {/* Commission Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={getFilteredTransactions().length > 0 && getFilteredTransactions().every(t => selectedTransactions.includes(t.id))}
                            onChange={handleSelectAllTransactions}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commission Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredTransactions().map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.includes(transaction.id)}
                              onChange={() => handleSelectTransaction(transaction.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">#{transaction.transactionId}</div>
                              <div className="text-sm text-gray-500">Config: {transaction.commissionConfigId}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">Order #{transaction.orderNumber}</div>
                              <div className="text-sm text-gray-500">{formatCurrency(transaction.originalAmount)} total</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{transaction.vendorName}</div>
                              <div className="text-sm text-gray-500">Customer: {transaction.customerName}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(transaction.totalCommissionAmount)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Platform: {formatCurrency(transaction.platformCommission)} | 
                                Vendor: {formatCurrency(transaction.vendorCommission)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(transaction.calculatedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Link
                                to={`/admin/commissions/transactions/${transaction.id}`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View
                              </Link>
                              {transaction.status === 'calculated' && (
                                <button
                                  onClick={() => handleApproveSelected()}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Approve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {getFilteredTransactions().length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-6xl mb-4">📊</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No commission transactions found</h3>
                      <p className="text-gray-500">Try adjusting your filters or check back later.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                {/* Analytics and Reports */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Commission Trends</h3>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <div className="text-gray-400 text-4xl mb-2">📈</div>
                        <p className="text-gray-500">Commission trend chart will be displayed here</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top Earning Vendors</h3>
                    <div className="space-y-3">
                      {commissionStats?.topVendors?.slice(0, 5).map((vendor, index) => (
                        <div key={vendor.vendorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="ml-3 font-medium text-gray-900">{vendor.vendorName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">{formatCurrency(vendor.totalAmount)}</div>
                            <div className="text-sm text-gray-500">{vendor.totalCommissions} commissions</div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-8 text-gray-500">No vendor data available</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Commission Distribution</h3>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <div className="text-gray-400 text-4xl mb-2">🥧</div>
                        <p className="text-gray-500">Commission distribution pie chart</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Export Reports</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Export Commission Summary (PDF)
                      </button>
                      <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        Export Transaction Log (CSV)
                      </button>
                      <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        Export Vendor Performance (Excel)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {/* Commission Configuration Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingConfig ? 'Edit Commission Configuration' : 'Create Commission Configuration'}
                </h3>
                
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Configuration Name
                      </label>
                      <input
                        type="text"
                        value={configForm.name}
                        onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                        placeholder="e.g., Standard Commission Rules"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={configForm.description}
                        onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                        placeholder="Brief description of this configuration"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Platform Commission */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Platform Commission</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Percentage (%)
                        </label>
                        <input
                          type="number"
                          value={configForm.platformCommission.defaultPercentage}
                          onChange={(e) => setConfigForm({
                            ...configForm,
                            platformCommission: {
                              ...configForm.platformCommission,
                              defaultPercentage: parseFloat(e.target.value) || 0
                            }
                          })}
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Amount
                        </label>
                        <input
                          type="number"
                          value={configForm.platformCommission.minAmount}
                          onChange={(e) => setConfigForm({
                            ...configForm,
                            platformCommission: {
                              ...configForm.platformCommission,
                              minAmount: parseFloat(e.target.value) || 0
                            }
                          })}
                          min="0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Amount
                        </label>
                        <input
                          type="number"
                          value={configForm.platformCommission.maxAmount || ''}
                          onChange={(e) => setConfigForm({
                            ...configForm,
                            platformCommission: {
                              ...configForm.platformCommission,
                              maxAmount: parseFloat(e.target.value) || undefined
                            }
                          })}
                          min="0"
                          placeholder="No limit"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Commission Rules */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Commission Rules</h4>
                      <button
                        onClick={addRule}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        Add Rule
                      </button>
                    </div>
                    <div className="space-y-3">
                      {configForm.rules.map((rule, index) => (
                        <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rule Name
                              </label>
                              <input
                                type="text"
                                value={rule.name}
                                onChange={(e) => updateRule(index, { name: e.target.value })}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type
                              </label>
                              <select
                                value={rule.type}
                                onChange={(e) => updateRule(index, { type: e.target.value as 'percentage' | 'fixed' | 'tiered' })}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="percentage">Percentage</option>
                                <option value="fixed">Fixed Amount</option>
                                <option value="tiered">Tiered</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Recipient
                              </label>
                              <select
                                value={rule.recipient}
                                onChange={(e) => updateRule(index, { recipient: e.target.value as 'vendor' | 'affiliate' | 'referrer' | 'platform' })}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="vendor">Vendor</option>
                                <option value="affiliate">Affiliate</option>
                                <option value="referrer">Referrer</option>
                                <option value="platform">Platform</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {rule.type === 'percentage' ? 'Percentage (%)' : 'Amount'}
                              </label>
                              <div className="flex">
                                <input
                                  type="number"
                                  value={rule.type === 'percentage' ? rule.percentage || '' : rule.fixedAmount || ''}
                                  onChange={(e) => updateRule(index, 
                                    rule.type === 'percentage' 
                                      ? { percentage: parseFloat(e.target.value) || 0 }
                                      : { fixedAmount: parseFloat(e.target.value) || 0 }
                                  )}
                                  min="0"
                                  step="0.1"
                                  className="flex-1 border border-gray-300 rounded-l px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => removeRule(index)}
                                  className="px-2 py-1 bg-red-500 text-white rounded-r text-sm hover:bg-red-600"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {configForm.rules.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No rules added yet. Click "Add Rule" to create commission rules.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi-level Settings */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Multi-level Commission</h4>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={configForm.multiLevelEnabled}
                          onChange={(e) => setConfigForm({ ...configForm, multiLevelEnabled: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">Enable multi-level commissions</span>
                      </label>
                    </div>
                    {configForm.multiLevelEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Levels
                        </label>
                        <input
                          type="number"
                          value={configForm.maxLevels}
                          onChange={(e) => setConfigForm({ ...configForm, maxLevels: parseInt(e.target.value) || 3 })}
                          min="2"
                          max="10"
                          className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    disabled={!configForm.name.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editingConfig ? 'Update' : 'Create'} Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Configuration Modal */}
        {showDeleteModal && configToDelete && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Configuration</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete the commission configuration{' '}
                    <strong>"{configToDelete.name}"</strong>? This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    onClick={handleDeleteConfig}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminCommissionsPage;