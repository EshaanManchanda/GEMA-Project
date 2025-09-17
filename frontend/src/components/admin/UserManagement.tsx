import React, { useState, useEffect, useMemo } from 'react';
// import { useDispatch } from 'react-redux';
import { 
  FaUsers, 
  FaUserShield,
  FaUserTie,
  FaUser,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaSearch,
  FaFilter,
  FaUserPlus,
  FaEye,
  FaBan,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCrown,
  FaShieldAlt
} from 'react-icons/fa';
import { format } from 'date-fns';
// import { AppDispatch } from '../../store';
import type { User } from '../../types/auth';
import Modal from '../interactive/Modal';
import DataTable from '../interactive/DataTable';

interface UserManagementProps {
  className?: string;
  compact?: boolean;
}

interface UserFilters {
  role: 'all' | 'admin' | 'vendor' | 'customer' | 'employee';
  status: 'all' | 'active' | 'inactive' | 'suspended';
  verificationStatus: 'all' | 'verified' | 'unverified' | 'pending';
  search: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
}

interface BulkAction {
  type: 'activate' | 'deactivate' | 'suspend' | 'delete' | 'verify';
  label: string;
  icon: React.ReactNode;
  color: string;
}

const UserManagement: React.FC<UserManagementProps> = ({
  className = '',
  compact = false
}) => {
  // const dispatch = useDispatch<AppDispatch>();
  
  // Mock data - In real app, this would come from Redux store
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  
  const [filters, setFilters] = useState<UserFilters>({
    role: 'all',
    status: 'all',
    verificationStatus: 'all',
    search: '',
    dateRange: 'all'
  });
  
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBulkModal, setBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1
  });

  // Mock user data - In real implementation, fetch from API
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const mockUsers: User[] = [
        {
          _id: '68b2867eedc0af7c0c8fdf65',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@gema.com',
          phone: '+971501234567',
          country: 'UAE',
          role: 'admin',
          status: 'active',
          isEmailVerified: true,
          isPhoneVerified: false,
          createdAt: '2025-08-30T05:05:02.375Z',
          updatedAt: '2025-09-07T04:30:51.006Z',
          lastLogin: '2025-09-07T04:30:51.004Z',
          verificationStatus: 'verified',
          loginAttempts: []
        },
        {
          _id: '68b2867eedc0af7c0c8fdf73',
          firstName: 'John',
          lastName: 'Vendor',
          email: 'vendor@example.com',
          phone: '+971501234568',
          country: 'UAE',
          role: 'vendor',
          status: 'active',
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: '2025-08-29T10:15:30.000Z',
          updatedAt: '2025-09-06T15:22:10.000Z',
          lastLogin: '2025-09-06T15:22:10.000Z',
          verificationStatus: 'verified',
          loginAttempts: []
        },
        {
          _id: '68b2917e0cf45d6b6f33f745',
          firstName: 'Jane',
          lastName: 'Customer',
          email: 'customer@example.com',
          phone: '+971501234569',
          country: 'UAE',
          role: 'customer',
          status: 'active',
          isEmailVerified: true,
          isPhoneVerified: false,
          createdAt: '2025-08-28T14:30:45.000Z',
          updatedAt: '2025-09-05T09:45:20.000Z',
          lastLogin: '2025-09-05T09:45:20.000Z',
          verificationStatus: 'unverified',
          loginAttempts: []
        },
        {
          _id: '68b56a3f9640fde891a81b76',
          firstName: 'Eshaan',
          lastName: 'Manchanda',
          email: 'eshaanmanchanda01@gmail.com',
          phone: '+971501234570',
          country: 'UAE',
          role: 'employee',
          status: 'active',
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: '2025-09-01T09:41:19.596Z',
          updatedAt: '2025-09-01T09:41:19.596Z',
          lastLogin: '2025-09-01T09:41:19.596Z',
          verificationStatus: 'verified',
          loginAttempts: []
        }
      ];
      
      setUsers(mockUsers);
      setTotalUsers(mockUsers.length);
      setIsLoading(false);
    }, 1000);
  }, [filters, pagination.page]);

  // Filter users based on current filters
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    if (filters.verificationStatus !== 'all') {
      if (filters.verificationStatus === 'verified') {
        filtered = filtered.filter(user => user.isEmailVerified && user.isPhoneVerified);
      } else if (filters.verificationStatus === 'unverified') {
        filtered = filtered.filter(user => !user.isEmailVerified || !user.isPhoneVerified);
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone?.includes(searchLower)
      );
    }

    return filtered;
  }, [users, filters]);

  const bulkActions: BulkAction[] = [
    {
      type: 'activate',
      label: 'Activate Users',
      icon: <FaCheck size={14} />,
      color: 'text-green-600'
    },
    {
      type: 'deactivate',
      label: 'Deactivate Users',
      icon: <FaBan size={14} />,
      color: 'text-orange-600'
    },
    {
      type: 'suspend',
      label: 'Suspend Users',
      icon: <FaTimes size={14} />,
      color: 'text-red-600'
    },
    {
      type: 'verify',
      label: 'Mark as Verified',
      icon: <FaShieldAlt size={14} />,
      color: 'text-blue-600'
    },
    {
      type: 'delete',
      label: 'Delete Users',
      icon: <FaTrash size={14} />,
      color: 'text-red-600'
    }
  ];

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    // In real app, open edit modal
    console.log('Edit user:', user);
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      // In real app, dispatch delete action
      console.log('Delete user:', user);
    }
  };

  const handleBulkAction = (action: BulkAction) => {
    setBulkAction(action);
    setBulkModal(true);
  };

  const executeBulkAction = () => {
    if (bulkAction && selectedUsers.size > 0) {
      console.log(`Executing ${bulkAction.type} on users:`, Array.from(selectedUsers));
      // In real app, dispatch bulk action
      setSelectedUsers(new Set());
      setBulkModal(false);
      setBulkAction(null);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user._id)));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <FaUserShield className="text-red-500" />;
      case 'vendor': return <FaUserTie className="text-blue-500" />;
      case 'employee': return <FaCrown className="text-purple-500" />;
      default: return <FaUser className="text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-700 bg-red-100';
      case 'vendor': return 'text-blue-700 bg-blue-100';
      case 'employee': return 'text-purple-700 bg-purple-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100';
      case 'inactive': return 'text-gray-700 bg-gray-100';
      case 'suspended': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
          onChange={handleSelectAll}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      render: (user: User) => (
        <input
          type="checkbox"
          checked={selectedUsers.has(user._id)}
          onChange={() => handleSelectUser(user._id)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      width: '50px'
    },
    {
      key: 'user',
      label: 'User',
      sortable: true,
      render: (user: User) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {getRoleIcon(user.role)}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (user: User) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (user: User) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </span>
      )
    },
    {
      key: 'verification',
      label: 'Verification',
      render: (user: User) => (
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 ${user.isEmailVerified ? 'text-green-600' : 'text-gray-400'}`}>
            <FaEnvelope size={12} />
            <span className="text-xs">{user.isEmailVerified ? 'Verified' : 'Pending'}</span>
          </div>
          <div className={`flex items-center space-x-1 ${user.isPhoneVerified ? 'text-green-600' : 'text-gray-400'}`}>
            <FaPhone size={12} />
            <span className="text-xs">{user.isPhoneVerified ? 'Verified' : 'Pending'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      sortable: true,
      render: (user: User) => (
        <div className="text-sm">
          {user.lastLogin ? (
            <>
              <div className="text-gray-900">
                {format(new Date(user.lastLogin), 'MMM dd, yyyy')}
              </div>
              <div className="text-gray-500">
                {format(new Date(user.lastLogin), 'HH:mm')}
              </div>
            </>
          ) : (
            <span className="text-gray-400">Never</span>
          )}
        </div>
      )
    },
    {
      key: 'joinDate',
      label: 'Join Date',
      sortable: true,
      render: (user: User) => (
        <div className="text-sm text-gray-600">
          {format(new Date(user.createdAt), 'MMM dd, yyyy')}
        </div>
      )
    }
  ];

  const actions = [
    {
      label: 'View Details',
      icon: <FaEye size={14} />,
      onClick: handleViewUser,
      className: 'text-blue-600 hover:text-blue-800'
    },
    {
      label: 'Edit User',
      icon: <FaEdit size={14} />,
      onClick: handleEditUser,
      className: 'text-green-600 hover:text-green-800'
    },
    {
      label: 'Delete User',
      icon: <FaTrash size={14} />,
      onClick: handleDeleteUser,
      className: 'text-red-600 hover:text-red-800',
      condition: (user: User) => user.role !== 'admin'
    }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaUsers className="text-gray-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <p className="text-sm text-gray-600">
                Manage users, roles, and permissions across the platform
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <FaFilter size={16} />
            </button>
            
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
              <FaUserPlus size={14} className="mr-2" />
              Add User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaUsers className="text-blue-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Total Users</p>
                <p className="text-2xl font-semibold text-blue-600">{totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaCheck className="text-green-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Active Users</p>
                <p className="text-2xl font-semibold text-green-600">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaShieldAlt className="text-purple-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Verified Users</p>
                <p className="text-2xl font-semibold text-purple-600">
                  {users.filter(u => u.isEmailVerified && u.isPhoneVerified).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaCrown className="text-orange-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-900">Staff Members</p>
                <p className="text-2xl font-semibold text-orange-600">
                  {users.filter(u => ['admin', 'employee'].includes(u.role)).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value as UserFilters['role'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="vendor">Vendor</option>
                <option value="employee">Employee</option>
                <option value="customer">Customer</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as UserFilters['status'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={filters.verificationStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, verificationStatus: e.target.value as UserFilters['verificationStatus'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Verification</option>
                <option value="verified">Fully Verified</option>
                <option value="unverified">Unverified</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as UserFilters['dateRange'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                {bulkActions.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => handleBulkAction(action)}
                    className={`flex items-center px-3 py-1 text-xs rounded-md border transition-colors ${action.color} border-current hover:bg-current hover:text-white`}
                  >
                    {action.icon}
                    <span className="ml-1">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div>
        <DataTable
          data={filteredUsers}
          columns={columns}
          actions={actions}
          isLoading={isLoading}
          pagination={{
            ...pagination,
            totalItems: filteredUsers.length
          }}
          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
          emptyMessage="No users found matching your criteria"
          compact={compact}
        />
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="p-6 space-y-6">
            {/* User Header */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getRoleIcon(selectedUser.role)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <p className="text-gray-600">{selectedUser.email}</p>
                <div className="flex items-center space-x-3 mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                    {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                    {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* User Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
                <dl className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FaEnvelope className="text-gray-400" size={14} />
                    <dt className="text-sm text-gray-500">Email:</dt>
                    <dd className="text-sm font-medium text-gray-900">{selectedUser.email}</dd>
                    {selectedUser.isEmailVerified && (
                      <FaCheck className="text-green-500" size={12} />
                    )}
                  </div>
                  
                  {selectedUser.phone && (
                    <div className="flex items-center space-x-2">
                      <FaPhone className="text-gray-400" size={14} />
                      <dt className="text-sm text-gray-500">Phone:</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedUser.phone}</dd>
                      {selectedUser.isPhoneVerified && (
                        <FaCheck className="text-green-500" size={12} />
                      )}
                    </div>
                  )}
                  
                  {selectedUser.country && (
                    <div className="flex items-center space-x-2">
                      <FaMapMarkerAlt className="text-gray-400" size={14} />
                      <dt className="text-sm text-gray-500">Country:</dt>
                      <dd className="text-sm font-medium text-gray-900">{selectedUser.country}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Account Information</h4>
                <dl className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FaCalendarAlt className="text-gray-400" size={14} />
                    <dt className="text-sm text-gray-500">Joined:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {format(new Date(selectedUser.createdAt), 'MMM dd, yyyy')}
                    </dd>
                  </div>
                  
                  {selectedUser.lastLogin && (
                    <div className="flex items-center space-x-2">
                      <FaClock className="text-gray-400" size={14} />
                      <dt className="text-sm text-gray-500">Last Login:</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {format(new Date(selectedUser.lastLogin), 'MMM dd, yyyy HH:mm')}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => handleEditUser(selectedUser)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit User
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Action Confirmation Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setBulkModal(false)}
        title={`Confirm ${bulkAction?.label}`}
        size="sm"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Are you sure you want to {bulkAction?.label.toLowerCase()} {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}?
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setBulkModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={executeBulkAction}
              className={`px-4 py-2 text-white rounded-md hover:opacity-90 ${
                bulkAction?.type === 'delete' ? 'bg-red-600' : 'bg-blue-600'
              }`}
            >
              {bulkAction?.label}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;