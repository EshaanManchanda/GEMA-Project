import React, { useState, useEffect, useCallback } from 'react';
import { FaSearch, FaEdit, FaTrash, FaPlus, FaSort, FaEye, FaUsers, FaChevronLeft, FaChevronRight, FaShieldAlt, FaCreditCard, FaHistory, FaDatabase, FaCheck, FaTimes } from 'react-icons/fa';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import adminAPI from '@services/api/adminAPI';
import { AdminUser } from '@/types/auth';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
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
    totalUsers: 0,
    limit: 20
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});
  const [viewModalTab, setViewModalTab] = useState<string>('basic');
  const [editModalTab, setEditModalTab] = useState<string>('basic');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'vendor' | 'employee' | 'admin'>('customer');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users function
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = {
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction
      };

      const usersResponse = await adminAPI.getAllUsers(params);

      if (usersResponse.success) {
        setUsers(usersResponse.data.users || []);
        setPagination({
          currentPage: usersResponse.data.pagination?.currentPage || 1,
          totalPages: usersResponse.data.pagination?.totalPages || 1,
          totalUsers: usersResponse.data.pagination?.totalUsers || 0,
          limit: usersResponse.data.pagination?.limit || 20
        });
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error?.response?.data?.message || 'Failed to fetch users');
      setUsers([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalUsers: 0,
        limit: 20
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, roleFilter, statusFilter, sortConfig]);

  // Fetch users when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (key: keyof AdminUser) => {
    // Map fullName to firstName for backend compatibility
    const sortKey = key === 'fullName' ? 'firstName' : key;

    setSortConfig(prevConfig => ({
      key: sortKey,
      direction: prevConfig.key === sortKey && prevConfig.direction === 'asc'
        ? 'desc'
        : 'asc'
    }));
    setCurrentPage(1); // Reset to first page on sort
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setActionLoading({ ...actionLoading, [`delete_${userId}`]: true });
      const response = await adminAPI.deleteUser(userId);

      if (response.success) {
        toast.success('User deleted successfully');
        setUserToDelete(null);
        setIsDeleteModalOpen(false);
        await fetchUsers(); // Refetch to update the list
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading({ ...actionLoading, [`delete_${userId}`]: false });
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditModalTab('basic');
    setIsEditModalOpen(true);
  };

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user);
    setViewModalTab('basic');
    setIsViewModalOpen(true);
  };

  const handleCreateUser = () => {
    setEditModalTab('basic');
    setSelectedRole('customer');
    setIsCreateModalOpen(true);
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'vendor':
        return 'bg-purple-100 text-purple-800';
      case 'employee':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-[50vh]">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-xl font-semibold text-gray-700 animate-pulse">Loading Users...</p>
            <div className="mt-6 space-y-3">
              <div className="h-4 bg-gradient-to-r from-blue-200 to-transparent rounded w-64 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-indigo-200 to-transparent rounded w-48 mx-auto animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-blue-200 to-transparent rounded w-56 mx-auto animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <div className="w-1 h-10 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-4"></div>
            User Management
          </h1>
          <p className="text-lg text-gray-600">Manage users, roles, and permissions across the platform</p>
        </div>
        <button
          className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-xl hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
          onClick={handleCreateUser}
        >
          <FaPlus className="mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 p-6 border border-white/20 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="vendor">Vendor</option>
            <option value="employee">Employee</option>
            <option value="customer">Customer</option>
          </select>

          <select
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>

          <div className="flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{pagination.totalUsers}</div>
              <div className="text-sm text-blue-700 font-medium">Total Users</div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white/20 backdrop-blur-sm">
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <FaUsers className="mr-3 text-blue-600" />
            User Directory
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('fullName')}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors duration-300 group"
                  >
                    User
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('role')}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors duration-300 group"
                  >
                    Role
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors duration-300 group"
                  >
                    Status
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('lastLogin')}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors duration-300 group"
                  >
                    Last Login
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <FaUsers className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-lg font-semibold">No users found</p>
                      <p className="text-sm text-gray-400 mt-2">Try adjusting your filters or search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="relative">
                          <img
                            className="h-12 w-12 rounded-full ring-2 ring-white shadow-lg group-hover:ring-blue-200 transition-all duration-300"
                            src={user.avatar || `https://ui-avatars.com/api/?name=${user.fullName}&background=random`}
                            alt={user.fullName}
                          />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            user.status === 'active' ? 'bg-green-400' :
                            user.status === 'pending' ? 'bg-yellow-400' :
                            user.status === 'suspended' ? 'bg-red-400' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">{user.fullName}</div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="text-xs text-gray-400 mt-1">
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ring-1 ring-inset ${getRoleBadgeClass(user.role)} transition-all duration-300 hover:scale-105`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ring-1 ring-inset ${getStatusBadgeClass(user.status)} transition-all duration-300 hover:scale-105`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {user.lastLogin ? format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm') : 'Never logged in'}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                          onClick={() => handleViewUser(user)}
                          title="View User"
                        >
                          <FaEye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-green-600 hover:text-white hover:bg-green-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                          onClick={() => handleEditUser(user)}
                          title="Edit User"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => {
                            setUserToDelete(user.id);
                            setIsDeleteModalOpen(true);
                          }}
                          disabled={actionLoading[`delete_${user.id}`]}
                          title="Delete User"
                        >
                          <FaTrash className="w-4 h-4" />
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
          <div className="px-8 py-6 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalUsers)} of {pagination.totalUsers} users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  <FaChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  <FaChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={userToDelete ? actionLoading[`delete_${userToDelete}`] : false}
              >
                Cancel
              </button>
              <button
                onClick={() => userToDelete && handleDeleteUser(userToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={userToDelete ? actionLoading[`delete_${userToDelete}`] : false}
              >
                {userToDelete && actionLoading[`delete_${userToDelete}`] ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced User View Modal with Tabs */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <img
                  className="h-12 w-12 rounded-full ring-2 ring-blue-200"
                  src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.firstName} ${selectedUser.lastName}&background=random`}
                  alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                />
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 px-6 bg-gray-50">
              <button
                onClick={() => setViewModalTab('basic')}
                className={`px-4 py-3 font-medium transition-colors ${
                  viewModalTab === 'basic'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setViewModalTab('security')}
                className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                  viewModalTab === 'security'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FaShieldAlt className="w-4 h-4" />
                Security
              </button>
              {selectedUser.role === 'vendor' && (
                <button
                  onClick={() => setViewModalTab('vendor')}
                  className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                    viewModalTab === 'vendor'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FaCreditCard className="w-4 h-4" />
                  Vendor Settings
                </button>
              )}
              <button
                onClick={() => setViewModalTab('history')}
                className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                  viewModalTab === 'history'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FaHistory className="w-4 h-4" />
                Login History
              </button>
              <button
                onClick={() => setViewModalTab('related')}
                className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                  viewModalTab === 'related'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FaDatabase className="w-4 h-4" />
                Related Data
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Basic Info Tab */}
              {viewModalTab === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <p className="text-gray-900 font-semibold">{selectedUser.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <p className="text-gray-900 font-semibold">{selectedUser.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{selectedUser.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleBadgeClass(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
                    <p className="text-gray-900">
                      {selectedUser.lastLogin ? format(new Date(selectedUser.lastLogin), 'MMM dd, yyyy HH:mm:ss') : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                    <p className="text-gray-900">{format(new Date(selectedUser.createdAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Updated At</label>
                    <p className="text-gray-900">{format(new Date(selectedUser.updatedAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <p className="text-gray-600 text-sm font-mono">{selectedUser.id}</p>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {viewModalTab === 'security' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Verification Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedUser.isEmailVerified ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {selectedUser.isEmailVerified ? (
                            <FaCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <FaTimes className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Email Verified</p>
                          <p className="text-sm text-gray-600">{selectedUser.isEmailVerified ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedUser.isPhoneVerified ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {selectedUser.isPhoneVerified ? (
                            <FaCheck className="w-5 h-5 text-green-600" />
                          ) : (
                            <FaTimes className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Phone Verified</p>
                          <p className="text-sm text-gray-600">{selectedUser.isPhoneVerified ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">2FA Status</span>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          selectedUser.twoFactorAuth?.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedUser.twoFactorAuth?.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {selectedUser.twoFactorAuth?.enabled && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Backup Codes</span>
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedUser.twoFactorAuth.backupCodes?.length || 0} backup codes generated
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedUser.emailVerification && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Email Verification Details</h4>
                      <div className="space-y-2">
                        {selectedUser.emailVerification.otp && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Current OTP</span>
                            <p className="text-sm text-gray-900 font-mono">{selectedUser.emailVerification.otp}</p>
                          </div>
                        )}
                        {selectedUser.emailVerification.expiresAt && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">OTP Expires At</span>
                            <p className="text-sm text-gray-900">
                              {format(new Date(selectedUser.emailVerification.expiresAt), 'MMM dd, yyyy HH:mm:ss')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vendor Settings Tab */}
              {viewModalTab === 'vendor' && selectedUser.role === 'vendor' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Payment Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Stripe Account</label>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          selectedUser.vendorPaymentSettings?.hasCustomStripeAccount ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedUser.vendorPaymentSettings?.hasCustomStripeAccount ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Accepts Platform Payments</label>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          selectedUser.vendorPaymentSettings?.acceptsPlatformPayments ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedUser.vendorPaymentSettings?.acceptsPlatformPayments ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate</label>
                        <p className="text-gray-900 font-semibold">{selectedUser.vendorPaymentSettings?.commissionRate || 0}%</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payout Schedule</label>
                        <p className="text-gray-900 capitalize">{selectedUser.vendorPaymentSettings?.payoutSchedule || 'weekly'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Payout</label>
                        <p className="text-gray-900 font-semibold">AED {selectedUser.vendorPaymentSettings?.minimumPayout || 50}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Login History Tab */}
              {viewModalTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Login Attempts ({selectedUser.loginAttempts?.length || 0})</h4>
                  </div>
                  {selectedUser.loginAttempts && selectedUser.loginAttempts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Timestamp</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">IP Address</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">User Agent</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedUser.loginAttempts.map((attempt, index) => (
                            <tr key={attempt._id || index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                {format(new Date(attempt.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{attempt.ip}</td>
                              <td className="px-4 py-3 text-xs max-w-xs truncate" title={attempt.userAgent}>
                                {attempt.userAgent}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  attempt.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {attempt.success ? 'Success' : 'Failed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No login attempts recorded</p>
                  )}
                </div>
              )}

              {/* Related Data Tab */}
              {viewModalTab === 'related' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Favorite Events</h4>
                    {selectedUser.favoriteEvents && selectedUser.favoriteEvents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUser.favoriteEvents.map((eventId, index) => (
                          <div key={index} className="text-sm text-gray-600 font-mono bg-white p-2 rounded">
                            {eventId}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No favorite events</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Addresses</h4>
                    {selectedUser.addresses && selectedUser.addresses.length > 0 ? (
                      <div className="space-y-3">
                        {selectedUser.addresses.map((address, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-gray-200">
                            <p className="font-medium text-gray-900">{address.label}</p>
                            <p className="text-sm text-gray-600">{address.street}</p>
                            <p className="text-sm text-gray-600">
                              {address.city}, {address.state} {address.zipCode}
                            </p>
                            {address.poBox && (
                              <p className="text-sm text-gray-600">P.O. Box: {address.poBox}</p>
                            )}
                            {address.makaniNumber && (
                              <p className="text-sm text-gray-600">Makani: {address.makaniNumber}</p>
                            )}
                            <p className="text-sm text-gray-600">{address.country}</p>
                            {address.isDefault && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 mt-2">
                                Default
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No addresses saved</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Social Logins</h4>
                    {selectedUser.socialLogins && selectedUser.socialLogins.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUser.socialLogins.map((social, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-3 rounded">
                            <div>
                              <p className="font-medium text-gray-900 capitalize">{social.provider}</p>
                              <p className="text-sm text-gray-600">{social.email}</p>
                            </div>
                            <p className="text-xs text-gray-500">
                              {format(new Date(social.connectedAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No social logins connected</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEditUser(selectedUser);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced User Create/Edit Modal with Tabs */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">
                {isCreateModalOpen ? 'Create New User' : 'Edit User'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Tab Navigation - Only for Edit Mode */}
            {isEditModalOpen && (
              <div className="flex border-b border-gray-200 px-6 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setEditModalTab('basic')}
                  className={`px-4 py-3 font-medium transition-colors ${
                    editModalTab === 'basic'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Basic Info
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalTab('security')}
                  className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                    editModalTab === 'security'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FaShieldAlt className="w-4 h-4" />
                  Security
                </button>
                {selectedUser?.role === 'vendor' && (
                  <button
                    type="button"
                    onClick={() => setEditModalTab('vendor')}
                    className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                      editModalTab === 'vendor'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <FaCreditCard className="w-4 h-4" />
                    Vendor Settings
                  </button>
                )}
              </div>
            )}

            {/* Form Content */}
            <form className="flex flex-col flex-1 overflow-hidden" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);

              const userData: any = {
                // Basic Info
                firstName: formData.get('firstName') as string,
                lastName: formData.get('lastName') as string,
                gender: (formData.get('gender') as string) || undefined,
                dateOfBirth: (formData.get('dateOfBirth') as string) || undefined,
                avatar: (formData.get('avatar') as string) || undefined,

                // Contact Info
                email: formData.get('email') as string,
                phone: (formData.get('phone') as string || '').trim() || undefined,

                // Role & Status
                role: formData.get('role') as string,
                status: formData.get('status') as string,

                // Authentication
                isEmailVerified: formData.get('isEmailVerified') === 'on',
                isPhoneVerified: formData.get('isPhoneVerified') === 'on',
              };

              // Employee-specific fields
              const role = formData.get('role') as string;
              if (role === 'employee') {
                userData.employeeId = (formData.get('employeeId') as string) || undefined;
                userData.employeeRole = formData.get('employeeRole') as string;
                userData.hiredAt = (formData.get('hiredAt') as string) || undefined;

                // Emergency contact
                const emergencyContactName = formData.get('emergencyContactName') as string;
                const emergencyContactPhone = formData.get('emergencyContactPhone') as string;
                if (emergencyContactName || emergencyContactPhone) {
                  userData.emergencyContact = {
                    name: emergencyContactName || '',
                    phone: emergencyContactPhone || '',
                    relationship: (formData.get('emergencyContactRelationship') as string) || undefined
                  };
                }
              }

              // Vendor-specific fields
              if (role === 'vendor') {
                // Payment settings
                userData.vendorPaymentSettings = {
                  hasCustomStripeAccount: formData.get('hasCustomStripeAccount') === 'on',
                  acceptsPlatformPayments: formData.get('acceptsPlatformPayments') === 'on',
                  commissionRate: parseFloat(formData.get('commissionRate') as string) || 5,
                  payoutSchedule: formData.get('payoutSchedule') as string || 'weekly',
                  minimumPayout: parseFloat(formData.get('minimumPayout') as string) || 50
                };

                // Social media
                const socialMedia: any = {};
                const facebook = formData.get('socialMediaFacebook') as string;
                const instagram = formData.get('socialMediaInstagram') as string;
                const twitter = formData.get('socialMediaTwitter') as string;
                const linkedin = formData.get('socialMediaLinkedin') as string;
                const website = formData.get('socialMediaWebsite') as string;

                if (facebook) socialMedia.facebook = facebook;
                if (instagram) socialMedia.instagram = instagram;
                if (twitter) socialMedia.twitter = twitter;
                if (linkedin) socialMedia.linkedin = linkedin;
                if (website) socialMedia.website = website;

                if (Object.keys(socialMedia).length > 0) {
                  userData.socialMedia = socialMedia;
                }
              }

              // Add 2FA settings if editing
              if (isEditModalOpen) {
                userData.twoFactorAuth = {
                  enabled: formData.get('twoFactorEnabled') === 'on',
                  backupCodes: selectedUser?.twoFactorAuth?.backupCodes || []
                };

                // Add vendor payment settings if vendor role
                if (selectedUser?.role === 'vendor') {
                  userData.vendorPaymentSettings = {
                    hasCustomStripeAccount: formData.get('hasCustomStripeAccount') === 'on',
                    acceptsPlatformPayments: formData.get('acceptsPlatformPayments') === 'on',
                    commissionRate: parseFloat(formData.get('commissionRate') as string) || 5,
                    payoutSchedule: formData.get('payoutSchedule') as string || 'weekly',
                    minimumPayout: parseFloat(formData.get('minimumPayout') as string) || 50
                  };
                }
              }

              try {
                setActionLoading({ ...actionLoading, form_submit: true });

                if (isCreateModalOpen) {
                  const createData = {
                    ...userData,
                    password: (formData.get('password') as string || '').trim() || 'TempPass123!'
                  };
                  const response = await adminAPI.createUser(createData);
                  if (response.success) {
                    toast.success('User created successfully');
                    setIsCreateModalOpen(false);
                    await fetchUsers();
                  }
                } else if (selectedUser) {
                  const response = await adminAPI.updateUser(selectedUser.id, userData);
                  if (response.success) {
                    toast.success('User updated successfully');
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                    await fetchUsers();
                  }
                }
              } catch (error: any) {
                console.error('Error saving user:', error);
                toast.error(error?.response?.data?.message || 'Failed to save user');
              } finally {
                setActionLoading({ ...actionLoading, form_submit: false });
              }
            }}>
              <div className="flex-1 overflow-y-auto p-4">
                {/* Basic Info Tab (or full form for Create) */}
                {(editModalTab === 'basic' || isCreateModalOpen) && (
                  <div className="space-y-4">
                    {/* Personal Information Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4 sticky top-0 bg-gray-50 z-10 py-2 -mt-2">Personal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                          <input
                            type="text"
                            name="firstName"
                            defaultValue={selectedUser?.firstName || ''}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                          <input
                            type="text"
                            name="lastName"
                            defaultValue={selectedUser?.lastName || ''}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                          <select
                            name="gender"
                            defaultValue={selectedUser?.gender || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            name="dateOfBirth"
                            defaultValue={selectedUser?.dateOfBirth ? selectedUser.dateOfBirth.split('T')[0] : ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                          <input
                            type="url"
                            name="avatar"
                            defaultValue={selectedUser?.avatar || ''}
                            placeholder="https://example.com/avatar.jpg"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Enter a valid image URL for the user's avatar</p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4 sticky top-0 bg-gray-50 z-10 py-2 -mt-2">Contact Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                          <input
                            type="email"
                            name="email"
                            defaultValue={selectedUser?.email || ''}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            name="phone"
                            defaultValue={selectedUser?.phone || ''}
                            placeholder="+971501234567"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">International format with country code</p>
                        </div>
                      </div>
                    </div>

                    {/* Authentication & Security Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4 sticky top-0 bg-gray-50 z-10 py-2 -mt-2">Authentication & Security</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isCreateModalOpen && (
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                              type="password"
                              name="password"
                              placeholder="Leave empty for default password"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Default: TempPass123!</p>
                          </div>
                        )}

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="isEmailVerified"
                            defaultChecked={selectedUser?.isEmailVerified || false}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700 font-medium">Email Verified</label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="isPhoneVerified"
                            defaultChecked={selectedUser?.isPhoneVerified || false}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700 font-medium">Phone Verified</label>
                        </div>
                      </div>
                    </div>

                    {/* Role & Status Section */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4 sticky top-0 bg-gray-50 z-10 py-2 -mt-2">Role & Status</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                          <select
                            name="role"
                            defaultValue={selectedUser?.role || 'customer'}
                            required
                            onChange={(e) => {
                              // Store selected role for conditional rendering
                              const role = e.target.value;
                              setSelectedRole(role as any);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="customer">Customer</option>
                            <option value="vendor">Vendor</option>
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                          <select
                            name="status"
                            defaultValue={selectedUser?.status || 'active'}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Employee-Specific Fields - Conditional */}
                    {(selectedRole === 'employee' || selectedUser?.role === 'employee') && isCreateModalOpen && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">E</span>
                          Employee Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                            <input
                              type="text"
                              name="employeeId"
                              placeholder="Auto-generated if left empty"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Employee Role *</label>
                            <select
                              name="employeeRole"
                              required={selectedRole === 'employee'}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Role</option>
                              <option value="manager">Manager</option>
                              <option value="scanner">Scanner</option>
                              <option value="coordinator">Coordinator</option>
                              <option value="security">Security</option>
                            </select>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hired Date</label>
                            <input
                              type="date"
                              name="hiredAt"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="col-span-2">
                            <h5 className="font-medium text-gray-900 mb-3">Emergency Contact (Optional)</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                  type="text"
                                  name="emergencyContactName"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                  type="tel"
                                  name="emergencyContactPhone"
                                  placeholder="+971501234567"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                                <input
                                  type="text"
                                  name="emergencyContactRelationship"
                                  placeholder="e.g., Spouse, Parent"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vendor-Specific Fields - Conditional */}
                    {(selectedRole === 'vendor' || selectedUser?.role === 'vendor') && isCreateModalOpen && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                          <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">V</span>
                          Vendor Settings
                        </h4>

                        {/* Payment Settings */}
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900 mb-3">Payment Configuration</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  name="hasCustomStripeAccount"
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700 font-medium">Has Custom Stripe Account</label>
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  name="acceptsPlatformPayments"
                                  defaultChecked
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700 font-medium">Accepts Platform Payments</label>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                              <input
                                type="number"
                                name="commissionRate"
                                min="0"
                                max="100"
                                step="0.1"
                                defaultValue="5"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Payout Schedule</label>
                              <select
                                name="payoutSchedule"
                                defaultValue="weekly"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Payout (AED)</label>
                              <input
                                type="number"
                                name="minimumPayout"
                                min="0"
                                defaultValue="50"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Social Media Links */}
                        <div>
                          <h5 className="font-medium text-gray-900 mb-3">Social Media Links (Optional)</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                              <input
                                type="url"
                                name="socialMediaFacebook"
                                placeholder="https://facebook.com/..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                              <input
                                type="url"
                                name="socialMediaInstagram"
                                placeholder="https://instagram.com/..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                              <input
                                type="url"
                                name="socialMediaTwitter"
                                placeholder="https://twitter.com/..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                              <input
                                type="url"
                                name="socialMediaLinkedin"
                                placeholder="https://linkedin.com/..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                              <input
                                type="url"
                                name="socialMediaWebsite"
                                placeholder="https://example.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Security Tab - Only in Edit Mode */}
                {editModalTab === 'security' && isEditModalOpen && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Verification Settings</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="isEmailVerified"
                            defaultChecked={selectedUser?.isEmailVerified || false}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700 font-medium">Email Verified</label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="isPhoneVerified"
                            defaultChecked={selectedUser?.isPhoneVerified || false}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700 font-medium">Phone Verified</label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="twoFactorEnabled"
                            defaultChecked={selectedUser?.twoFactorAuth?.enabled || false}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 text-sm text-gray-700 font-medium">Enable Two-Factor Authentication</label>
                        </div>
                        {selectedUser?.twoFactorAuth?.enabled && selectedUser.twoFactorAuth.backupCodes && selectedUser.twoFactorAuth.backupCodes.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600">
                              {selectedUser.twoFactorAuth.backupCodes.length} backup codes are currently active
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vendor Settings Tab - Only in Edit Mode for Vendors */}
                {editModalTab === 'vendor' && isEditModalOpen && selectedUser?.role === 'vendor' && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Payment Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <div className="flex items-center mb-3">
                            <input
                              type="checkbox"
                              name="hasCustomStripeAccount"
                              defaultChecked={selectedUser?.vendorPaymentSettings?.hasCustomStripeAccount || false}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700 font-medium">Has Custom Stripe Account</label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="acceptsPlatformPayments"
                              defaultChecked={selectedUser?.vendorPaymentSettings?.acceptsPlatformPayments || true}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700 font-medium">Accepts Platform Payments</label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                          <input
                            type="number"
                            name="commissionRate"
                            min="0"
                            max="100"
                            step="0.1"
                            defaultValue={selectedUser?.vendorPaymentSettings?.commissionRate || 5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payout Schedule</label>
                          <select
                            name="payoutSchedule"
                            defaultValue={selectedUser?.vendorPaymentSettings?.payoutSchedule || 'weekly'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Payout (AED)</label>
                          <input
                            type="number"
                            name="minimumPayout"
                            min="0"
                            step="1"
                            defaultValue={selectedUser?.vendorPaymentSettings?.minimumPayout || 50}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={actionLoading.form_submit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={actionLoading.form_submit}
                >
                  {actionLoading.form_submit ? 'Saving...' : (isCreateModalOpen ? 'Create User' : 'Update User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
