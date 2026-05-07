import React, { useState, useEffect } from 'react';
import vendorAPI from '../../services/api/vendorAPI';

interface VendorBookingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onUpdate: () => void;
}

const VendorBookingEditModal: React.FC<VendorBookingEditModalProps> = ({
  isOpen,
  onClose,
  booking,
  onUpdate,
}) => {
  const [vendorNotes, setVendorNotes] = useState('');
  const [vendorStatus, setVendorStatus] = useState('');
  const [isFulfilled, setIsFulfilled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (booking) {
      setVendorNotes(booking.vendorNotes || '');
      setVendorStatus(booking.vendorStatus || 'processing');
      setIsFulfilled(booking.isFulfilled || false);
    }
  }, [booking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await vendorAPI.updateVendorBooking(booking._id, {
        vendorNotes,
        vendorStatus,
        isFulfilled,
      });

      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update booking');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Edit Booking - {booking?.orderNumber}
                  </h3>

                  {/* Display Order Info */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Customer:</span>
                        <p className="text-gray-900">
                          {booking?.billingAddress?.firstName} {booking?.billingAddress?.lastName}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Email:</span>
                        <p className="text-gray-900">{booking?.billingAddress?.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Status:</span>
                        <p className="text-gray-900 capitalize">{booking?.status}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Payment:</span>
                        <p className="text-gray-900 capitalize">{booking?.paymentStatus}</p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Vendor Status */}
                    <div>
                      <label htmlFor="vendorStatus" className="block text-sm font-medium text-gray-700 mb-1">
                        Fulfillment Status
                      </label>
                      <select
                        id="vendorStatus"
                        value={vendorStatus}
                        onChange={(e) => setVendorStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      >
                        <option value="processing">Processing</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                        <option value="issue">Issue/Problem</option>
                      </select>
                    </div>

                    {/* Fulfilled Checkbox */}
                    <div className="flex items-center">
                      <input
                        id="isFulfilled"
                        type="checkbox"
                        checked={isFulfilled}
                        onChange={(e) => setIsFulfilled(e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="isFulfilled" className="ml-2 block text-sm text-gray-900">
                        Mark as fulfilled
                      </label>
                    </div>

                    {/* Vendor Notes */}
                    <div>
                      <label htmlFor="vendorNotes" className="block text-sm font-medium text-gray-700 mb-1">
                        Vendor Notes (Internal)
                      </label>
                      <textarea
                        id="vendorNotes"
                        rows={4}
                        value={vendorNotes}
                        onChange={(e) => setVendorNotes(e.target.value)}
                        placeholder="Add any internal notes about this booking..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        These notes are only visible to you and won't be shown to customers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update Booking'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorBookingEditModal;
