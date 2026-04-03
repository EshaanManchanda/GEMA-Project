import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useVendorBookingQuery } from '@/hooks/queries/useVendorQuery';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

interface Participant {
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  allergies?: string[];
  medicalConditions?: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  specialRequirements?: string;
  registrationData?: Array<{
    fieldId: string;
    fieldLabel: string;
    fieldType: string;
    value: any;
  }>;
}

const formatDate = (d: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const formatCurrency = (amount: number, currency = 'AED') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const statusClass: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

const Badge: React.FC<{ label: string; type?: string }> = ({ label, type = 'pending' }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass[type] ?? 'bg-gray-100 text-gray-700'}`}>
    {label.charAt(0).toUpperCase() + label.slice(1)}
  </span>
);

const formatFieldValue = (fieldType: string, value: any): string => {
  if (value === null || value === undefined) return 'N/A';
  if (Array.isArray(value)) return value.join(', ');
  if (fieldType === 'checkbox' || fieldType === 'boolean') return value ? 'Yes' : 'No';
  if (fieldType === 'date') return value ? new Date(value).toLocaleDateString() : 'N/A';
  return String(value);
};

const VendorBookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: rawData, isLoading, isError } = useVendorBookingQuery(id!);
  // Server returns { booking: {...} } — unwrap it
  const booking = rawData?.booking || rawData;

  if (isLoading) {
    return (
      <>
        <PrivatePageSEO title="Booking Detail | Kidrove" description="Booking detail" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
        </div>
      </>
    );
  }

  if (isError || !booking) {
    return (
      <>
        <PrivatePageSEO title="Booking Detail | Kidrove" description="Booking detail" />
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <p className="text-gray-500 mb-4">Booking not found.</p>
          <Link to="/vendor/bookings" className="text-indigo-600 hover:underline text-sm">
            Back to bookings
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PrivatePageSEO title={`Booking #${booking.orderNumber || id} | Kidrove`} description="Booking detail" />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/vendor/bookings')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              Order #{booking.orderNumber || id?.slice(-6)}
            </h1>
          </div>
          <div className="flex gap-2">
            <Badge label={booking.status} type={booking.status} />
            <Badge label={booking.paymentStatus} type={booking.paymentStatus} />
            {booking.vendorStatus && (
              <Badge label={booking.vendorStatus} type="pending" />
            )}
          </div>
        </div>

        {/* Booking Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Booking Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Order Number</span>
              <p className="font-medium text-gray-900">{booking.orderNumber || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Booked On</span>
              <p className="font-medium text-gray-900">{formatDate(booking.createdAt)}</p>
            </div>
            <div>
              <span className="text-gray-500">Payment Method</span>
              <p className="font-medium text-gray-900 capitalize">{booking.paymentMethod || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Total</span>
              <p className="font-medium text-gray-900">{formatCurrency(booking.total, booking.currency)}</p>
            </div>
            {booking.isFulfilled !== undefined && (
              <div>
                <span className="text-gray-500">Fulfilled</span>
                <p className="font-medium text-gray-900">{booking.isFulfilled ? 'Yes' : 'No'}</p>
              </div>
            )}
            {booking.vendorNotes && (
              <div className="col-span-2 md:col-span-3">
                <span className="text-gray-500">Vendor Notes</span>
                <p className="font-medium text-gray-900">{booking.vendorNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Customer</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name</span>
              <p className="font-medium text-gray-900">
                {booking.billingAddress?.firstName} {booking.billingAddress?.lastName}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="font-medium text-gray-900">{booking.billingAddress?.email || '—'}</p>
            </div>
            {booking.billingAddress?.phone && (
              <div>
                <span className="text-gray-500">Phone</span>
                <p className="font-medium text-gray-900">{booking.billingAddress.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items & Participants */}
        {booking.items?.map((item: any, itemIdx: number) => (
          <div key={itemIdx} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Item header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {item.eventTitle || item.eventId?.title || 'Event'}
                  </h2>
                  {item.scheduleDate && (
                    <p className="text-sm text-gray-500 mt-0.5">{formatDate(item.scheduleDate)}</p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-500">{item.quantity} × {formatCurrency(item.unitPrice, item.currency)}</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(item.totalPrice, item.currency)}</p>
                </div>
              </div>
            </div>

            {/* Participants */}
            {item.participants && item.participants.length > 0 ? (
              <div className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Participants ({item.participants.length})
                </h3>
                {item.participants.map((p: Participant, pIdx: number) => (
                  <div key={pIdx} className="border border-gray-100 rounded-lg p-4 space-y-3">
                    <p className="font-semibold text-gray-800 text-sm">
                      {pIdx + 1}. {p.name}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {p.age !== undefined && (
                        <div><span className="text-gray-500">Age: </span><span>{p.age}</span></div>
                      )}
                      {p.gender && (
                        <div><span className="text-gray-500">Gender: </span><span className="capitalize">{p.gender}</span></div>
                      )}
                      {p.phone && (
                        <div><span className="text-gray-500">Phone: </span><span>{p.phone}</span></div>
                      )}
                      {p.allergies && p.allergies.length > 0 && (
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-gray-500">Allergies: </span>
                          <span>{p.allergies.join(', ')}</span>
                        </div>
                      )}
                      {p.medicalConditions && p.medicalConditions.length > 0 && (
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-gray-500">Medical Conditions: </span>
                          <span>{p.medicalConditions.join(', ')}</span>
                        </div>
                      )}
                      {p.specialRequirements && (
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-gray-500">Special Requirements: </span>
                          <span>{p.specialRequirements}</span>
                        </div>
                      )}
                    </div>

                    {p.emergencyContact && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                        <p className="font-medium text-gray-700 mb-2">Emergency Contact</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <div><span className="text-gray-500">Name: </span><span>{p.emergencyContact.name}</span></div>
                          <div><span className="text-gray-500">Relation: </span><span>{p.emergencyContact.relationship}</span></div>
                          <div><span className="text-gray-500">Phone: </span><span>{p.emergencyContact.phone}</span></div>
                        </div>
                      </div>
                    )}

                    {p.registrationData && p.registrationData.length > 0 && (
                      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-sm">
                        <p className="font-medium text-gray-700 mb-2">Custom Fields</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {p.registrationData.map((field, fIdx) => (
                            <div key={fIdx}>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                {field.fieldLabel}:{' '}
                              </span>
                              <span className="text-gray-900">
                                {formatFieldValue(field.fieldType, field.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 text-sm text-gray-400">No participant details recorded.</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default VendorBookingDetailPage;
