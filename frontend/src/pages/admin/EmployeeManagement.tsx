import React, { useState, useEffect, useCallback } from 'react';
import { FaSearch, FaEdit, FaTrash, FaPlus, FaSort, FaEye, FaUsers, FaChevronLeft, FaChevronRight, FaUserTie, FaBuilding, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import adminAPI from '@services/api/adminAPI';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Employee interface matching backend response
interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'manager' | 'scanner' | 'coordinator' | 'security';
  status: 'active' | 'inactive' | 'suspended';
  permissions: Array<{
    action: string;
    scope: 'all' | 'assigned';
  }>;
  assignedEvents: any[];
  assignedVenues: any[];
  shiftSchedule?: any[];
  deviceAccess?: any[];
  scanHistory?: any[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: string;
  vendorId: string;
  vendor: {
    id: string;
    businessName: string;
    contactEmail: string;
  } | null;
  userId: string;
  user: {
    id: string;
    email: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalEmployees: number;
  limit: number;
}

interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  employeesByRole: Record<string, number>;
  employeesByStatus: Record<string, number>;
  employeesByVendor: Array<{
    vendorId: string;
    vendorName: string;
    count: number;
  }>;
}

interface Vendor {
  _id: string;
  businessName: string;
  contactEmail: string;
}

const EmployeeManagement: React.FC = () => {
  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalEmployees: 0,
    limit: 20
  });

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<string>('basic');

  // Form state
  const [formData, setFormData] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    vendorId: '',
    role: 'scanner',
    status: 'active',
    permissions: [],
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  // Statistics
  const [stats, setStats] = useState<EmployeeStats | null>(null);

  // Vendors list for dropdown
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch vendors for dropdown
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await adminAPI.getVendorsList();
        if (response.success) {
          setVendors(response.data.vendors || []);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    };
    fetchVendors();
  }, []);

  // Fetch employee statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await adminAPI.getEmployeeStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    }
  }, []);

  // Fetch employees function
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = {
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        vendorId: vendorFilter !== 'all' ? vendorFilter : undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction
      };

      const response = await adminAPI.getAllEmployees(params);

      if (response.success) {
        setEmployees(response.data.employees || []);
        setPagination({
          currentPage: response.data.pagination?.currentPage || 1,
          totalPages: response.data.pagination?.totalPages || 1,
          totalEmployees: response.data.pagination?.totalEmployees || 0,
          limit: response.data.pagination?.limit || 20
        });
      }
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error(error?.response?.data?.message || 'Failed to fetch employees');
      setEmployees([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalEmployees: 0,
        limit: 20
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, vendorFilter, roleFilter, statusFilter, sortConfig]);

  // Fetch employees when dependencies change
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handlers
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const handleCreateEmployee = async () => {
    try {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.vendorId) {
        toast.error('Please fill in all required fields');
        return;
      }

      setActionLoading({ ...actionLoading, create: true });
      const response = await adminAPI.createEmployee(formData);

      if (response.success) {
        toast.success('Employee created successfully');
        setIsCreateModalOpen(false);
        resetForm();
        await fetchEmployees();
        await fetchStats();
      }
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast.error(error?.response?.data?.message || 'Failed to create employee');
    } finally {
      setActionLoading({ ...actionLoading, create: false });
    }
  };

  const handleUpdateEmployee = async () => {
    try {
      if (!selectedEmployee) return;

      setActionLoading({ ...actionLoading, update: true });
      const response = await adminAPI.updateEmployee(selectedEmployee.id, formData);

      if (response.success) {
        toast.success('Employee updated successfully');
        setIsEditModalOpen(false);
        setSelectedEmployee(null);
        resetForm();
        await fetchEmployees();
        await fetchStats();
      }
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error(error?.response?.data?.message || 'Failed to update employee');
    } finally {
      setActionLoading({ ...actionLoading, update: false });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      setActionLoading({ ...actionLoading, [`delete_${employeeId}`]: true });
      const response = await adminAPI.deleteEmployee(employeeId);

      if (response.success) {
        toast.success('Employee deleted successfully');
        setEmployeeToDelete(null);
        setIsDeleteModalOpen(false);
        await fetchEmployees();
        await fetchStats();
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete employee');
    } finally {
      setActionLoading({ ...actionLoading, [`delete_${employeeId}`]: false });
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || '',
      vendorId: employee.vendorId,
      role: employee.role,
      status: employee.status,
      permissions: employee.permissions,
      emergencyContact: employee.emergencyContact || { name: '', phone: '', relationship: '' }
    });
    setActiveTab('basic');
    setIsEditModalOpen(true);
  };

  const openViewModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setActiveTab('basic');
    setIsViewModalOpen(true);
  };

  const openDeleteModal = (employeeId: string) => {
    setEmployeeToDelete(employeeId);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      vendorId: '',
      role: 'scanner',
      status: 'active',
      permissions: [],
      emergencyContact: {
        name: '',
        phone: '',
        relationship: ''
      }
    });
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      manager: 'bg-purple-100 text-purple-800',
      scanner: 'bg-blue-100 text-blue-800',
      coordinator: 'bg-green-100 text-green-800',
      security: 'bg-orange-100 text-orange-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Render statistics cards
  const renderStats = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
            </div>
            <FaUsers className="text-3xl text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeEmployees}</p>
            </div>
            <FaCheckCircle className="text-3xl text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactiveEmployees}</p>
            </div>
            <FaTimesCircle className="text-3xl text-gray-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Managers</p>
              <p className="text-2xl font-bold text-purple-600">{stats.employeesByRole.manager || 0}</p>
            </div>
            <FaUserTie className="text-3xl text-purple-500" />
          </div>
        </div>
      </div>
    );
  };

  // Render employee form
  const renderEmployeeForm = (isEdit: boolean = false) => {
    return (
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 ${activeTab === 'basic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          >
            Employee Details
          </button>
          {isEdit && (
            <button
              onClick={() => setActiveTab('emergency')}
              className={`px-4 py-2 ${activeTab === 'emergency' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            >
              Emergency Contact
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank for default password"
                />
                <p className="text-xs text-gray-500 mt-1">Default: TempPass123!</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
              <select
                value={formData.vendorId}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor._id} value={vendor._id}>{vendor.businessName}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="scanner">Scanner</option>
                <option value="manager">Manager</option>
                <option value="coordinator">Coordinator</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.emergencyContact.name}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={formData.emergencyContact.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <input
                type="text"
                value={formData.emergencyContact.relationship}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (isLoading && employees.length === 0) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner size="large" text="Loading employees..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage employee accounts across all vendors</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FaPlus /> Add Employee
        </button>
      </div>

      {/* Statistics */}
      {renderStats()}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Vendor Filter */}
          <select
            value={vendorFilter}
            onChange={(e) => { setVendorFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Vendors</option>
            {vendors.map(vendor => (
              <option key={vendor._id} value={vendor._id}>{vendor.businessName}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="manager">Manager</option>
            <option value="scanner">Scanner</option>
            <option value="coordinator">Coordinator</option>
            <option value="security">Security</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('employeeId')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Employee ID <FaSort />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('firstName')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Name <FaSort />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th
                  onClick={() => handleSort('createdAt')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    Hired Date <FaSort />
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FaUsers className="mx-auto text-5xl mb-4 text-gray-300" />
                    <p>No employees found</p>
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.fullName}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FaBuilding className="text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {employee.vendor?.businessName || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(employee.role)}`}>
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(employee.status)}`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.hiredAt ? format(new Date(employee.hiredAt), 'MMM d, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openViewModal(employee)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => openEditModal(employee)}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openDeleteModal(employee.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((currentPage - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pagination.limit, pagination.totalEmployees)}
                  </span> of{' '}
                  <span className="font-medium">{pagination.totalEmployees}</span> employees
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft />
                  </button>
                  {[...Array(pagination.totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (
                      page === 1 ||
                      page === pagination.totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Create New Employee</h3>
              {renderEmployeeForm(false)}
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEmployee}
                  disabled={actionLoading.create}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading.create ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Edit Employee</h3>
              {renderEmployeeForm(true)}
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateEmployee}
                  disabled={actionLoading.update}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading.update ? 'Updating...' : 'Update Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Employee Details</h3>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b mb-4">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`px-4 py-2 ${activeTab === 'basic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                  Basic Info
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`px-4 py-2 ${activeTab === 'assignments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                  Assignments
                </button>
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeTab === 'basic' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Employee ID</label>
                      <p className="text-gray-900">{selectedEmployee.employeeId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-gray-900">{selectedEmployee.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{selectedEmployee.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{selectedEmployee.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Vendor</label>
                      <p className="text-gray-900">{selectedEmployee.vendor?.businessName || 'N/A'}</p>
                    </div>
                    {selectedEmployee.emergencyContact && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                        <p className="text-gray-900">
                          {selectedEmployee.emergencyContact.name} - {selectedEmployee.emergencyContact.phone}
                          {selectedEmployee.emergencyContact.relationship && ` (${selectedEmployee.emergencyContact.relationship})`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Role</label>
                      <p className="text-gray-900">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(selectedEmployee.role)}`}>
                          {selectedEmployee.role}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p className="text-gray-900">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(selectedEmployee.status)}`}>
                          {selectedEmployee.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Hired Date</label>
                      <p className="text-gray-900">
                        {selectedEmployee.hiredAt ? format(new Date(selectedEmployee.hiredAt), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Permissions</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedEmployee.permissions.length > 0 ? (
                          selectedEmployee.permissions.map((perm, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {perm.action} ({perm.scope})
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-500">No permissions assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'assignments' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Assigned Events</label>
                      <p className="text-gray-900">
                        {selectedEmployee.assignedEvents.length > 0 ? `${selectedEmployee.assignedEvents.length} events` : 'No events assigned'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Assigned Venues</label>
                      <p className="text-gray-900">
                        {selectedEmployee.assignedVenues.length > 0 ? `${selectedEmployee.assignedVenues.length} venues` : 'No venues assigned'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Shift Schedule</label>
                      <p className="text-gray-900">
                        {selectedEmployee.shiftSchedule && selectedEmployee.shiftSchedule.length > 0 ? `${selectedEmployee.shiftSchedule.length} shifts` : 'No shifts scheduled'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Device Access</label>
                      <p className="text-gray-900">
                        {selectedEmployee.deviceAccess && selectedEmployee.deviceAccess.length > 0 ? `${selectedEmployee.deviceAccess.length} devices` : 'No devices registered'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Scan History</label>
                      <p className="text-gray-900">
                        {selectedEmployee.scanHistory && selectedEmployee.scanHistory.length > 0 ? `${selectedEmployee.scanHistory.length} scans` : 'No scan history'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Delete Employee</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this employee? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEmployee(employeeToDelete)}
                disabled={actionLoading[`delete_${employeeToDelete}`]}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading[`delete_${employeeToDelete}`] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
