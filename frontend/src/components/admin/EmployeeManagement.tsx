import React, { useState, useEffect, useMemo } from 'react';
// import { useDispatch } from 'react-redux';
import { 
  FaUsers,
  FaUserTie,
  FaCrown,
  FaShieldAlt,
  FaTrash,
  FaCheck,
  FaSearch,
  FaFilter,
  FaUserPlus,
  FaEye,
  FaCalendarAlt,
  FaBuilding,
  FaKey,
  FaStar,
  FaChartBar
} from 'react-icons/fa';
import { format } from 'date-fns';
// import { AppDispatch } from '../../store';
import Modal from '../interactive/Modal';
import DataTable from '../interactive/DataTable';

interface EmployeeManagementProps {
  className?: string;
  compact?: boolean;
}

interface Employee {
  _id: string;
  vendorId: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'manager' | 'coordinator' | 'staff' | 'security' | 'support';
  permissions: Permission[];
  assignedEvents: string[];
  assignedVenues: string[];
  status: 'active' | 'inactive' | 'suspended';
  hiredAt: string;
  createdAt: string;
  updatedAt: string;
  performance?: {
    eventsHandled: number;
    rating: number;
    completedTasks: number;
    punctuality: number;
  };
}

interface Permission {
  _id: string;
  action: 'view_events' | 'view_dashboard' | 'manage_events' | 'manage_venues' | 'handle_bookings' | 'access_reports' | 'moderate_content';
  scope: 'assigned' | 'all' | 'vendor';
}

interface EmployeeFilters {
  role: 'all' | 'manager' | 'coordinator' | 'staff' | 'security' | 'support';
  status: 'all' | 'active' | 'inactive' | 'suspended';
  vendor: 'all' | string;
  assignmentStatus: 'all' | 'assigned' | 'unassigned';
  search: string;
  hiredDateRange: 'all' | 'month' | 'quarter' | 'year';
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  className = '',
  compact = false
}) => {
  // const dispatch = useDispatch<AppDispatch>();
  
  // Mock data based on MongoDB employee structure
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState(0);
  
  const [filters, setFilters] = useState<EmployeeFilters>({
    role: 'all',
    status: 'all',
    vendor: 'all',
    assignmentStatus: 'all',
    search: '',
    hiredDateRange: 'all'
  });
  
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1
  });

  // Mock employee data matching MongoDB structure
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const mockEmployees: Employee[] = [
        {
          _id: '68b56a3f9640fde891a81b76',
          vendorId: '68b2867eedc0af7c0c8fdf73',
          userId: '68b2917e0cf45d6b6f33f745',
          employeeId: 'EMP-1756719679585',
          firstName: 'Eshaan',
          lastName: 'Manchanda',
          email: 'eshaanmanchanda01@gmail.com',
          role: 'coordinator',
          permissions: [
            {
              _id: '68b56a3f9640fde891a81b77',
              action: 'view_events',
              scope: 'assigned'
            },
            {
              _id: '68b56a3f9640fde891a81b78',
              action: 'view_dashboard',
              scope: 'assigned'
            }
          ],
          assignedEvents: ['68b2d0d63293690deba680a2'],
          assignedVenues: ['68b28680edc0af7c0c8fdfd5'],
          status: 'active',
          hiredAt: '2025-09-01T09:41:19.585Z',
          createdAt: '2025-09-01T09:41:19.596Z',
          updatedAt: '2025-09-01T09:41:19.596Z',
          performance: {
            eventsHandled: 12,
            rating: 4.5,
            completedTasks: 45,
            punctuality: 92
          }
        },
        {
          _id: '68b56a3f9640fde891a81b79',
          vendorId: '68b2867eedc0af7c0c8fdf73',
          userId: '68b2917e0cf45d6b6f33f746',
          employeeId: 'EMP-1756719679586',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@example.com',
          role: 'manager',
          permissions: [
            {
              _id: '68b56a3f9640fde891a81b80',
              action: 'manage_events',
              scope: 'vendor'
            },
            {
              _id: '68b56a3f9640fde891a81b81',
              action: 'access_reports',
              scope: 'vendor'
            },
            {
              _id: '68b56a3f9640fde891a81b82',
              action: 'manage_venues',
              scope: 'vendor'
            }
          ],
          assignedEvents: ['68b2d0d63293690deba680a2', '68b2d0d63293690deba680a3'],
          assignedVenues: ['68b28680edc0af7c0c8fdfd5', '68b28680edc0af7c0c8fdfd6'],
          status: 'active',
          hiredAt: '2025-08-15T10:00:00.000Z',
          createdAt: '2025-08-15T10:00:00.000Z',
          updatedAt: '2025-09-05T14:30:00.000Z',
          performance: {
            eventsHandled: 28,
            rating: 4.8,
            completedTasks: 95,
            punctuality: 96
          }
        },
        {
          _id: '68b56a3f9640fde891a81b83',
          vendorId: '68b2867eedc0af7c0c8fdf74',
          userId: '68b2917e0cf45d6b6f33f747',
          employeeId: 'EMP-1756719679587',
          firstName: 'Ahmed',
          lastName: 'Hassan',
          email: 'ahmed.hassan@example.com',
          role: 'security',
          permissions: [
            {
              _id: '68b56a3f9640fde891a81b84',
              action: 'view_events',
              scope: 'assigned'
            }
          ],
          assignedEvents: [],
          assignedVenues: ['68b28680edc0af7c0c8fdfd7'],
          status: 'active',
          hiredAt: '2025-08-20T08:30:00.000Z',
          createdAt: '2025-08-20T08:30:00.000Z',
          updatedAt: '2025-09-01T12:00:00.000Z',
          performance: {
            eventsHandled: 8,
            rating: 4.2,
            completedTasks: 22,
            punctuality: 88
          }
        }
      ];
      
      setEmployees(mockEmployees);
      setTotalEmployees(mockEmployees.length);
      setIsLoading(false);
    }, 1000);
  }, [filters, pagination.page]);

  // Filter employees based on current filters
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    if (filters.role !== 'all') {
      filtered = filtered.filter(emp => emp.role === filters.role);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(emp => emp.status === filters.status);
    }

    if (filters.assignmentStatus !== 'all') {
      if (filters.assignmentStatus === 'assigned') {
        filtered = filtered.filter(emp => emp.assignedEvents.length > 0 || emp.assignedVenues.length > 0);
      } else {
        filtered = filtered.filter(emp => emp.assignedEvents.length === 0 && emp.assignedVenues.length === 0);
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.firstName.toLowerCase().includes(searchLower) ||
        emp.lastName.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        emp.employeeId.toLowerCase().includes(searchLower)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [employees, filters]);

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
  };

  const handleEditPermissions = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowPermissionModal(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    if (window.confirm(`Are you sure you want to remove ${employee.firstName} ${employee.lastName} from the team?`)) {
      console.log('Delete employee:', employee);
      // In real app, dispatch delete action
    }
  };

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  // Unused function - commented out to fix TypeScript error
  // const handleSelectAll = () => {
  //   if (selectedEmployees.size === filteredEmployees.length) {
  //     setSelectedEmployees(new Set());
  //   } else {
  //     setSelectedEmployees(new Set(filteredEmployees.map(emp => emp._id)));
  //   }
  // };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'manager': return <FaCrown className="text-purple-500" />;
      case 'coordinator': return <FaUserTie className="text-blue-500" />;
      case 'security': return <FaShieldAlt className="text-red-500" />;
      case 'support': return <FaUsers className="text-green-500" />;
      default: return <FaUserTie className="text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'text-purple-700 bg-purple-100';
      case 'coordinator': return 'text-blue-700 bg-blue-100';
      case 'security': return 'text-red-700 bg-red-100';
      case 'support': return 'text-green-700 bg-green-100';
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

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const columns = [
    {
      key: 'select',
      title: '',
      render: (employee: Employee) => (
        <input
          type="checkbox"
          checked={selectedEmployees.has(employee._id)}
          onChange={() => handleSelectEmployee(employee._id)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      width: '50px'
    },
    {
      key: 'employee',
      title: 'Employee',
      sortable: true,
      render: (employee: Employee) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {getRoleIcon(employee.role)}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {employee.firstName} {employee.lastName}
            </div>
            <div className="text-sm text-gray-500">{employee.email}</div>
            <div className="text-xs text-gray-400 font-mono">{employee.employeeId}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      render: (employee: Employee) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(employee.role)}`}>
          {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (employee: Employee) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
          {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
        </span>
      )
    },
    {
      key: 'assignments',
      title: 'Assignments',
      render: (employee: Employee) => (
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-gray-600">
            <FaCalendarAlt size={12} />
            <span>{employee.assignedEvents.length} events</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-600 mt-1">
            <FaBuilding size={12} />
            <span>{employee.assignedVenues.length} venues</span>
          </div>
        </div>
      )
    },
    {
      key: 'permissions',
      title: 'Permissions',
      render: (employee: Employee) => (
        <div className="text-sm">
          <div className="flex items-center space-x-1 text-blue-600">
            <FaKey size={12} />
            <span>{employee.permissions.length} permissions</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {employee.permissions.slice(0, 2).map(p => p.action.replace('_', ' ')).join(', ')}
            {employee.permissions.length > 2 && '...'}
          </div>
        </div>
      )
    },
    {
      key: 'performance',
      title: 'Performance',
      render: (employee: Employee) => (
        <div className="text-sm">
          {employee.performance ? (
            <>
              <div className={`flex items-center space-x-1 ${getPerformanceColor(employee.performance.rating)}`}>
                <FaStar size={12} />
                <span className="font-medium">{employee.performance.rating.toFixed(1)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {employee.performance.eventsHandled} events
              </div>
              <div className="text-xs text-gray-500">
                {employee.performance.punctuality}% punctuality
              </div>
            </>
          ) : (
            <span className="text-gray-400">No data</span>
          )}
        </div>
      )
    },
    {
      key: 'hiredAt',
      title: 'Hired Date',
      sortable: true,
      render: (employee: Employee) => (
        <div className="text-sm text-gray-600">
          {format(new Date(employee.hiredAt), 'MMM dd, yyyy')}
        </div>
      )
    }
  ];

  const actions = [
    {
      key: 'view',
      label: 'View Details',
      icon: <FaEye size={14} />,
      onClick: handleViewEmployee,
      className: 'text-blue-600 hover:text-blue-800'
    },
    {
      key: 'edit',
      label: 'Edit Permissions',
      icon: <FaKey size={14} />,
      onClick: handleEditPermissions,
      className: 'text-purple-600 hover:text-purple-800'
    },
    {
      key: 'delete',
      label: 'Delete Employee',
      icon: <FaTrash size={14} />,
      onClick: handleDeleteEmployee,
      className: 'text-red-600 hover:text-red-800'
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
              <h2 className="text-xl font-semibold text-gray-900">Employee Management</h2>
              <p className="text-sm text-gray-600">
                Manage staff members, roles, and permissions across venues
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
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              <FaUserPlus size={14} className="mr-2" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaUsers className="text-blue-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Total Employees</p>
                <p className="text-2xl font-semibold text-blue-600">{totalEmployees}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaCheck className="text-green-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Active Staff</p>
                <p className="text-2xl font-semibold text-green-600">
                  {employees.filter(e => e.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaCrown className="text-purple-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Managers</p>
                <p className="text-2xl font-semibold text-purple-600">
                  {employees.filter(e => e.role === 'manager').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <FaChartBar className="text-orange-500" size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-900">Avg. Rating</p>
                <p className="text-2xl font-semibold text-orange-600">
                  {(employees.reduce((sum, e) => sum + (e.performance?.rating || 0), 0) / employees.length).toFixed(1)}
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
                  placeholder="Search employees..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value as EmployeeFilters['role'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="manager">Manager</option>
                <option value="coordinator">Coordinator</option>
                <option value="staff">Staff</option>
                <option value="security">Security</option>
                <option value="support">Support</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as EmployeeFilters['status'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={filters.assignmentStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, assignmentStatus: e.target.value as EmployeeFilters['assignmentStatus'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Assignments</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>

              <select
                value={filters.hiredDateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, hiredDateRange: e.target.value as EmployeeFilters['hiredDateRange'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Employees Table */}
      <div>
        <DataTable
          data={filteredEmployees}
          columns={columns}
          actions={actions}
          loading={isLoading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: filteredEmployees.length,
            onChange: (page: number) => setPagination(prev => ({ ...prev, page }))
          }}
        />
      </div>

      {/* Employee Details Modal */}
      <Modal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        title="Employee Details"
        size="lg"
      >
        {selectedEmployee && (
          <div className="p-6 space-y-6">
            {/* Employee Header */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getRoleIcon(selectedEmployee.role)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </h3>
                <p className="text-gray-600">{selectedEmployee.email}</p>
                <div className="flex items-center space-x-3 mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedEmployee.role)}`}>
                    {selectedEmployee.role.charAt(0).toUpperCase() + selectedEmployee.role.slice(1)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEmployee.status)}`}>
                    {selectedEmployee.status.charAt(0).toUpperCase() + selectedEmployee.status.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {selectedEmployee.employeeId}
                  </span>
                </div>
              </div>
            </div>

            {/* Employee Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Work Information</h4>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Hired Date:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {format(new Date(selectedEmployee.hiredAt), 'MMM dd, yyyy')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Assigned Events:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedEmployee.assignedEvents.length}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Assigned Venues:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedEmployee.assignedVenues.length}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Permissions:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedEmployee.permissions.length}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Metrics</h4>
                {selectedEmployee.performance ? (
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Rating:</dt>
                      <dd className={`text-sm font-medium ${getPerformanceColor(selectedEmployee.performance.rating)}`}>
                        {selectedEmployee.performance.rating.toFixed(1)} / 5.0
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Events Handled:</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {selectedEmployee.performance.eventsHandled}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Completed Tasks:</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {selectedEmployee.performance.completedTasks}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Punctuality:</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {selectedEmployee.performance.punctuality}%
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-gray-500">No performance data available</p>
                )}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Current Permissions</h4>
              <div className="space-y-2">
                {selectedEmployee.permissions.map((permission) => (
                  <div key={permission._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FaKey className="text-blue-500" size={14} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {permission.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-gray-500">
                          Scope: {permission.scope.charAt(0).toUpperCase() + permission.scope.slice(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => handleEditPermissions(selectedEmployee)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Edit Permissions
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit Employee
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Permission Management Modal */}
      <Modal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        title="Manage Permissions"
        size="md"
      >
        {selectedEmployee && (
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Manage permissions for {selectedEmployee.firstName} {selectedEmployee.lastName}
            </p>
            
            <div className="space-y-4">
              {[
                { action: 'view_events', label: 'View Events', description: 'Can view assigned events' },
                { action: 'manage_events', label: 'Manage Events', description: 'Can create and edit events' },
                { action: 'view_dashboard', label: 'View Dashboard', description: 'Can access dashboard analytics' },
                { action: 'manage_venues', label: 'Manage Venues', description: 'Can manage venue settings' },
                { action: 'handle_bookings', label: 'Handle Bookings', description: 'Can process bookings' },
                { action: 'access_reports', label: 'Access Reports', description: 'Can view reports and analytics' },
                { action: 'moderate_content', label: 'Moderate Content', description: 'Can moderate user content' }
              ].map((perm) => (
                <div key={perm.action} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{perm.label}</div>
                    <div className="text-sm text-gray-500">{perm.description}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedEmployee.permissions.some(p => p.action === perm.action)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    onChange={() => console.log('Toggle permission:', perm.action)}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Permissions
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Employee Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Employee"
        size="lg"
      >
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Add a new team member to your organization. Employee will receive an invitation email to complete their profile setup.
          </p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select role</option>
                <option value="manager">Manager</option>
                <option value="coordinator">Coordinator</option>
                <option value="staff">Staff</option>
                <option value="security">Security</option>
                <option value="support">Support</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Send Invitation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeManagement;