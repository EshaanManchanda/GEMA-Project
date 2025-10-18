import React, { useState, useEffect } from 'react';
import vendorAPI from '../../services/api/vendorAPI';
import { Employee } from '../../pages/vendor/VendorEmployeesPage';

interface AssignEventModalProps {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}

interface Event {
  _id: string;
  title: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

const AssignEventModal: React.FC<AssignEventModalProps> = ({
  employee,
  onClose,
  onSuccess,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await vendorAPI.getVendorEvents();
      setEvents(response || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedEventId) {
      setError('Please select an event');
      return;
    }

    setIsAssigning(true);
    setError(null);

    try {
      await vendorAPI.assignEmployeeToEvent(employee._id, selectedEventId);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error assigning employee to event:', err);
      setError(err.response?.data?.message || 'Failed to assign employee to event');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async (eventId: string) => {
    if (!confirm('Are you sure you want to remove this employee from this event?')) {
      return;
    }

    try {
      await vendorAPI.removeEmployeeFromEvent(employee._id, eventId);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error removing employee from event:', err);
      setError(err.response?.data?.message || 'Failed to remove employee from event');
    }
  };

  // Filter out events that are already assigned
  const assignedEventIds = (employee.assignedEvents || []).map((e: any) => e._id);
  const availableEvents = events.filter((event) => !assignedEventIds.includes(event._id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Manage Event Assignments</h2>
          <p className="text-sm text-gray-600 mt-1">
            Assign or remove events for{' '}
            <span className="font-medium">
              {employee.firstName} {employee.lastName}
            </span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Currently Assigned Events */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Currently Assigned Events
            </h3>
            {employee.assignedEvents && employee.assignedEvents.length > 0 ? (
              <div className="space-y-2">
                {employee.assignedEvents.map((event: any) => (
                  <div
                    key={event._id}
                    className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      {event.category && (
                        <p className="text-sm text-gray-600">{event.category}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(event._id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No events assigned yet</p>
            )}
          </div>

          {/* Assign New Event */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Assign to New Event
            </h3>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading events...</p>
              </div>
            ) : availableEvents.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  All available events have been assigned to this employee, or you have no events created yet.
                </p>
              </div>
            ) : (
              <div>
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                >
                  <option value="">Select an event...</option>
                  {availableEvents.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.title} {event.category ? `(${event.category})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={!selectedEventId || isAssigning}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAssigning ? 'Assigning...' : 'Assign to Event'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignEventModal;
