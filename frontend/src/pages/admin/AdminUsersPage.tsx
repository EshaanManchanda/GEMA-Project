import React, { useState, useEffect, useMemo } from 'react';
import { FaSearch, FaFilter, FaEdit, FaTrash, FaPlus, FaSort, FaEye, FaUserCog, FaUsers } from 'react-icons/fa';
import { format } from 'date-fns';
import adminAPI from '@services/api/adminAPI';
import AdminNavigation from '@components/admin/AdminNavigation';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'customer' | 'vendor' | 'employee';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  avatar?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLogin?: string;
  loginAttempts: number;
  createdAt: string;
  updatedAt: string;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'ascending' | 'descending' }>({ 
    key: 'createdAt', 
    direction: 'descending' 
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        
        // Fetch real data from backend
        const params = {
          page: 1,
          limit: 20,
          search: searchTerm,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction
        };
        
        const [usersResponse, statsResponse] = await Promise.all([
          adminAPI.getAllUsers(params),
          adminAPI.getUserStats()
        ]);
        
        if (usersResponse.success) {
          setUsers(usersResponse.data.users);
          setFilteredUsers(usersResponse.data.users);
          setPagination(usersResponse.data.pagination);
        }
        
        if (statsResponse.success) {
          setUserStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        
        // Fallback to mock data if API fails
        const mockUsers: User[] = [
          {
            id: '1',
            firstName: 'Admin',
            lastName: 'User',
            fullName: 'Admin User',
            email: 'admin@gema.com',
            phone: '+971501234567',
            role: 'admin',
            status: 'active',
            avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
            isEmailVerified: true,
            isPhoneVerified: true,
            lastLogin: '2023-07-28T14:22:00Z',
            loginAttempts: 0,
            createdAt: '2023-01-15T10:30:00Z',
            updatedAt: '2023-07-28T14:22:00Z',
          },
          {
            id: '2',
            firstName: 'John',
            lastName: 'Smith',
            fullName: 'John Smith',
            email: 'john.smith@example.com',
            phone: '+971501234568',
            role: 'admin',
            status: 'active',
            avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
            isEmailVerified: true,
            isPhoneVerified: true,
            lastLogin: '2023-07-27T14:22:00Z',
            loginAttempts: 0,
            createdAt: '2023-01-16T10:30:00Z',
            updatedAt: '2023-07-27T14:22:00Z',
          },
          {
            id: '3',
            firstName: 'Sarah',
            lastName: 'Johnson',
            fullName: 'Sarah Johnson',
            email: 'sarah.j@example.com',
            phone: '+971502345678',
            role: 'customer',
            status: 'active',
            avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
            isEmailVerified: true,
            isPhoneVerified: false,
            lastLogin: '2023-07-28T11:45:00Z',
            loginAttempts: 2,
            createdAt: '2023-02-20T09:15:00Z',
            updatedAt: '2023-07-28T11:45:00Z',
          },
          {
            id: '4',
            firstName: 'Mike',
            lastName: 'Wilson',
            fullName: 'Mike Wilson',
            email: 'mike.w@example.com',
            phone: '+971503456789',
            role: 'vendor',
            status: 'active',
            avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
            isEmailVerified: true,
            isPhoneVerified: true,
            lastLogin: '2023-07-27T20:30:00Z',
            loginAttempts: 1,
            createdAt: '2023-03-10T16:45:00Z',
            updatedAt: '2023-07-27T20:30:00Z',
          },
          {
            id: '5',
            firstName: 'Emma',
            lastName: 'Davis',
            fullName: 'Emma Davis',
            email: 'emma.d@example.com',
            role: 'customer',
            status: 'inactive',
            avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
            isEmailVerified: false,
            isPhoneVerified: false,
            lastLogin: '2023-07-25T09:15:00Z',
            loginAttempts: 5,
            createdAt: '2023-04-05T12:20:00Z',
            updatedAt: '2023-07-25T09:15:00Z',
          },
          {
            id: '6',
            firstName: 'Alex',
            lastName: 'Brown',
            fullName: 'Alex Brown',
            email: 'alex.b@example.com',
            phone: '+971504567890',
            role: 'employee',
            status: 'active',
            avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
            isEmailVerified: true,
            isPhoneVerified: false,
            lastLogin: '2023-07-28T16:20:00Z',
            loginAttempts: 0,
            createdAt: '2023-05-12T14:30:00Z',
            updatedAt: '2023-07-28T16:20:00Z',
          }
        ];
        
        setUsers(mockUsers);
        setFilteredUsers(mockUsers);
        setPagination({ currentPage: 1, totalPages: 1, totalUsers: mockUsers.length });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Filter and sort users
  useEffect(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort users
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter, sortConfig]);

  const handleSort = (key: keyof User) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'ascending' 
        ? 'descending' 
        : 'ascending'
    }));
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await adminAPI.deleteUser(userId);
      if (response.success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        setUserToDelete(null);
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      // Fallback: remove from local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      setUserToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleCreateUser = () => {
    setIsCreateModalOpen(true);
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const response = await adminAPI.updateUserStatus(userId, newStatus);
      if (response.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, status: newStatus as any } : user
        ));
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await adminAPI.updateUserRole(userId, newRole);
      if (response.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, role: newRole as any } : user
        ));
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <>
        <AdminNavigation />
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
      </>
    );
  }

  return (
    <>
      <AdminNavigation />
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
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">🔍 All Roles</option>
            <option value="admin">👑 Admin</option>
            <option value="vendor">🏪 Vendor</option>
            <option value="employee">👷 Employee</option>
            <option value="customer">👤 Customer</option>
          </select>
          
          <select
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">📊 All Status</option>
            <option value="active">✅ Active</option>
            <option value="inactive">⭕ Inactive</option>
            <option value="pending">⏳ Pending</option>
            <option value="suspended">🚫 Suspended</option>
          </select>
          
          <div className="flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredUsers.length}</div>
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
                    👤 User
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('role')}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors duration-300 group"
                  >
                    🏷️ Role
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors duration-300 group"
                  >
                    📊 Status
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('lastLogin')}
                    className="flex items-center gap-2 hover:text-blue-600 transition-colors duration-300 group"
                  >
                    🕒 Last Login
                    <FaSort className="w-3 h-3 group-hover:scale-110 transition-transform duration-300" />
                  </button>
                </th>
                <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  ⚡ Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user, index) => (
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
                        <div className="text-sm text-gray-500 flex items-center">
                          📧 {user.email}
                        </div>
                        {user.phone && (
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            📞 {user.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ring-1 ring-inset ${getRoleBadgeClass(user.role)} transition-all duration-300 hover:scale-105`}>
                      {user.role === 'admin' ? '👑' : user.role === 'vendor' ? '🏪' : user.role === 'employee' ? '👷' : '👤'} {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ring-1 ring-inset ${getStatusBadgeClass(user.status)} transition-all duration-300 hover:scale-105`}>
                      {user.status === 'active' ? '✅' : user.status === 'pending' ? '⏳' : user.status === 'suspended' ? '🚫' : '⭕'} {user.status}
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
                        className="p-2 text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg"
                        onClick={() => {
                          setUserToDelete(user.id);
                          setIsDeleteModalOpen(true);
                        }}
                        title="Delete User"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => userToDelete && handleDeleteUser(userToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User View Modal */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">User Details</h3>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2 flex items-center mb-4">
                <img
                  className="h-16 w-16 rounded-full mr-4"
                  src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.fullName}&background=random`}
                  alt={selectedUser.fullName}
                />
                <div>
                  <h4 className="text-lg font-semibold">{selectedUser.fullName}</h4>
                  <p className="text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <p className="text-gray-900">{selectedUser.firstName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <p className="text-gray-900">{selectedUser.lastName}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Verified</label>
                <p className="text-gray-900">{selectedUser.isEmailVerified ? 'Yes' : 'No'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Verified</label>
                <p className="text-gray-900">{selectedUser.isPhoneVerified ? 'Yes' : 'No'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login Attempts</label>
                <p className="text-gray-900">{selectedUser.loginAttempts}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
                <p className="text-gray-900">
                  {selectedUser.lastLogin ? format(new Date(selectedUser.lastLogin), 'MMM dd, yyyy HH:mm') : 'Never'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                <p className="text-gray-900">{format(new Date(selectedUser.createdAt), 'MMM dd, yyyy HH:mm')}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEditUser(selectedUser);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {isCreateModalOpen ? 'Create New User' : 'Edit User'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const userData = {
                firstName: formData.get('firstName') as string,
                lastName: formData.get('lastName') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                role: formData.get('role') as string,
                status: formData.get('status') as string,
                isEmailVerified: formData.get('isEmailVerified') === 'on',
                isPhoneVerified: formData.get('isPhoneVerified') === 'on',
              };
              
              try {
                if (isCreateModalOpen) {
                  const createData = {
                    ...userData,
                    password: formData.get('password') as string || 'TempPass123!'
                  };
                  const response = await adminAPI.createUser(createData);
                  if (response.success) {
                    setUsers(prev => [...prev, response.data.user]);
                    setIsCreateModalOpen(false);
                  }
                } else if (selectedUser) {
                  const response = await adminAPI.updateUser(selectedUser.id, userData);
                  if (response.success) {
                    setUsers(prev => prev.map(user => 
                      user.id === selectedUser.id ? response.data.user : user
                    ));
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }
                }
              } catch (error) {
                console.error('Error saving user:', error);
                alert('Error saving user: ' + (error.response?.data?.message || error.message));
              }
            }}>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {isCreateModalOpen && (
                  <div>
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    name="role"
                    defaultValue={selectedUser?.role || 'customer'}
                    required
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
                
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isEmailVerified"
                      defaultChecked={selectedUser?.isEmailVerified || false}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Email Verified</label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isPhoneVerified"
                      defaultChecked={selectedUser?.isPhoneVerified || false}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Phone Verified</label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {isCreateModalOpen ? 'Create User' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default AdminUsersPage;