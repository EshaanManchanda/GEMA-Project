import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import vendorAPI from '../../services/api/vendorAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';
import EmployeeFilters from '../../components/vendor/EmployeeFilters';
import EmployeeTable from '../../components/vendor/EmployeeTable';
import EmployeeExportModal from '../../components/vendor/EmployeeExportModal';
import AssignEventModal from '../../components/vendor/AssignEventModal';

export interface Employee {
  _id: string;
  vendorId: string;
  userId: any;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'manager' | 'scanner' | 'coordinator' | 'security';
  permissions: Array<{
    action: string;
    scope: 'all' | 'assigned';
  }>;
  assignedEvents: any[];
  assignedVenues: any[];
  status: 'active' | 'inactive' | 'suspended';
  shiftSchedule?: Array<{
    eventId: string;
    date: Date;
    startTime: string;
    endTime: string;
    position: string;
    isActive: boolean;
  }>;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VendorEmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);

  // Modals
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    assignedEvent: 'all',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });

  useEffect(() => {
    fetchEmployees();
  }, [currentPage, pageSize, filters, sortConfig]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      // Build query parameters
      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
      };

      // Add filters
      if (filters.search) params.search = filters.search;
      if (filters.role !== 'all') params.role = filters.role;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.assignedEvent !== 'all') params.assignedEvent = filters.assignedEvent;

      const response = await vendorAPI.getVendorEmployees(params);

      setEmployees(response.employees || []);
      setPagination(response.pagination);
      setStats(response.stats);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
      assignedEvent: 'all',
    });
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) {
      return;
    }

    try {
      await vendorAPI.deleteVendorEmployee(employeeId, false);
      fetchEmployees(); // Refresh the list
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee. Please try again.');
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const filterParams = { ...filters };
      if (filterParams.role === 'all') delete filterParams.role;
      if (filterParams.status === 'all') delete filterParams.status;
      if (filterParams.assignedEvent === 'all') delete filterParams.assignedEvent;

      await vendorAPI.exportVendorEmployees(format, filterParams);
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting employees:', error);
      alert('Failed to export employees. Please try again.');
    }
  };

  const handleAssignEvent = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowAssignModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage your team members and their assignments
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Export
              </button>
              <button
                onClick={() => navigate('/vendor/employees/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                + Add Employee
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeEmployees}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Managers</p>
                <p className="text-2xl font-bold text-blue-600">{stats.managerCount}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Scanners</p>
                <p className="text-2xl font-bold text-purple-600">{stats.scannerCount}</p>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <EmployeeFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No employees found</p>
              <button
                onClick={() => navigate('/vendor/employees/create')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Your First Employee
              </button>
            </div>
          ) : (
            <>
              <EmployeeTable
                employees={employees}
                sortConfig={sortConfig}
                onSort={handleSort}
                onEdit={(employee) => navigate(`/vendor/employees/${employee._id}/edit`)}
                onDelete={handleDelete}
                onAssignEvent={handleAssignEvent}
              />

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * pageSize, pagination.totalEmployees)}
                      </span> of{' '}
                      <span className="font-medium">{pagination.totalEmployees}</span> results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={!pagination.hasPrevPage}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-700">
                        Page {currentPage} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showExportModal && (
        <EmployeeExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}

      {showAssignModal && selectedEmployee && (
        <AssignEventModal
          employee={selectedEmployee}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedEmployee(null);
          }}
          onSuccess={fetchEmployees}
        />
      )}
    </div>
  );
};

export default VendorEmployeesPage;
