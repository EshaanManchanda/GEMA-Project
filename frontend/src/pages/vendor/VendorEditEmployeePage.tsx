import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import vendorAPI from '../../services/api/vendorAPI';
import VendorNavigation from '../../components/vendor/VendorNavigation';

interface Employee {
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
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  hiredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VendorEditEmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    role: 'scanner' as 'manager' | 'scanner' | 'coordinator' | 'security',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  const [permissions, setPermissions] = useState<Array<{ action: string; scope: 'all' | 'assigned' }>>([]);

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    setIsLoading(true);
    try {
      const response = await vendorAPI.getVendorEmployeeById(id!);
      const emp = response.employee;
      setEmployee(emp);

      setFormData({
        firstName: emp.firstName,
        lastName: emp.lastName,
        phone: emp.phone || '',
        role: emp.role,
        status: emp.status,
        emergencyContactName: emp.emergencyContact?.name || '',
        emergencyContactPhone: emp.emergencyContact?.phone || '',
        emergencyContactRelationship: emp.emergencyContact?.relationship || '',
      });

      setPermissions(emp.permissions || []);
    } catch (err: any) {
      console.error('Error fetching employee:', err);
      setError('Failed to load employee data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleAddPermission = () => {
    setPermissions([...permissions, { action: '', scope: 'assigned' }]);
  };

  const handleRemovePermission = (index: number) => {
    setPermissions(permissions.filter((_, i) => i !== index));
  };

  const handlePermissionChange = (index: number, field: 'action' | 'scope', value: string) => {
    const updated = [...permissions];
    updated[index][field] = value as any;
    setPermissions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.role) {
        setError('Please fill in all required fields');
        setIsSaving(false);
        return;
      }

      // Prepare employee data
      const employeeData: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        status: formData.status,
        permissions,
      };

      // Add emergency contact if provided
      if (formData.emergencyContactName && formData.emergencyContactPhone) {
        employeeData.emergencyContact = {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelationship || undefined,
        };
      }

      await vendorAPI.updateVendorEmployee(id!, employeeData);

      // Navigate back to employees list
      navigate('/vendor/employees');
    } catch (err: any) {
      console.error('Error updating employee:', err);
      setError(err.response?.data?.message || 'Failed to update employee. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VendorNavigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading employee data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VendorNavigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">Employee not found</p>
            <button
              onClick={() => navigate('/vendor/employees')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Employees
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/vendor/employees')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Back to Employees
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
          <p className="mt-2 text-sm text-gray-600">
            Update employee information and permissions
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span>Employee ID: {employee.employeeId}</span>
            <span>•</span>
            <span>Email: {employee.email}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={employee.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="manager">Manager</option>
                    <option value="scanner">Scanner</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="security">Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Permissions</h2>
                <button
                  type="button"
                  onClick={handleAddPermission}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  + Add Permission
                </button>
              </div>

              {permissions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No custom permissions. Default permissions apply based on role.</p>
              ) : (
                <div className="space-y-3">
                  {permissions.map((permission, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <input
                        type="text"
                        value={permission.action}
                        onChange={(e) => handlePermissionChange(index, 'action', e.target.value)}
                        placeholder="Permission action"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={permission.scope}
                        onChange={(e) => handlePermissionChange(index, 'scope', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="assigned">Assigned Only</option>
                        <option value="all">All Events</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemovePermission(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship
                  </label>
                  <input
                    type="text"
                    name="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Assigned Events */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Events</h2>
              {employee.assignedEvents && employee.assignedEvents.length > 0 ? (
                <div className="space-y-2">
                  {employee.assignedEvents.map((event: any) => (
                    <div key={event._id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-medium text-gray-900">{event.title}</p>
                      {event.category && <p className="text-sm text-gray-600">{event.category}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No events assigned yet</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Use the "Assign to Event" button from the employees list to manage event assignments
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/vendor/employees')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorEditEmployeePage;
