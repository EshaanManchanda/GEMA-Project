import React from 'react';

interface EmployeeFiltersProps {
  filters: {
    search: string;
    role: string;
    status: string;
    assignedEvent: string;
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const hasActiveFilters =
    filters.search ||
    filters.role !== 'all' ||
    filters.status !== 'all' ||
    filters.assignedEvent !== 'all';

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleChange}
            placeholder="Name, email, employee ID..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Role Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select
            name="role"
            value={filters.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Roles</option>
            <option value="manager">Manager</option>
            <option value="scanner">Scanner</option>
            <option value="coordinator">Coordinator</option>
            <option value="security">Security</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            name="status"
            value={filters.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Assigned Event Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Assignment
          </label>
          <select
            name="assignedEvent"
            value={filters.assignedEvent}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All</option>
            {/* Note: In a full implementation, you would fetch and populate events here */}
            <option value="assigned">Has Assignments</option>
            <option value="unassigned">No Assignments</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.search && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Search: {filters.search}
              <button
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.role !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Role: {filters.role}
              <button
                onClick={() => onFilterChange({ ...filters, role: 'all' })}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Status: {filters.status}
              <button
                onClick={() => onFilterChange({ ...filters, status: 'all' })}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.assignedEvent !== 'all' && (
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Assignment: {filters.assignedEvent}
              <button
                onClick={() => onFilterChange({ ...filters, assignedEvent: 'all' })}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeFilters;
