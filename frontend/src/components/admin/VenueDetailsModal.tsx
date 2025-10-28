import React from 'react';
import { X, MapPin, Users, Calendar, Phone, Mail, Globe, DollarSign, Shield, Star, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Venue {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'suspended';
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  capacity: number;
  venueType: string;
  facilities: string[];
  amenities?: string[];
  operatingHours: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  timezone: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  baseRentalPrice?: number;
  currency: string;
  safetyFeatures?: string[];
  certifications?: string[];
  totalEvents: number;
  averageRating?: number;
  isApproved: boolean;
  vendor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  } | null;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

interface VenueDetailsModalProps {
  venue: Venue | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (venueId: string) => void;
  onDelete?: (venueId: string) => void;
  onApprove?: (venueId: string) => void;
  onReject?: (venueId: string) => void;
  onStatusChange?: (venueId: string, status: string) => void;
}

const VenueDetailsModal: React.FC<VenueDetailsModalProps> = ({
  venue,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onStatusChange
}) => {
  if (!isOpen || !venue) return null;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'AED'
    }).format(amount);
  };

  const getDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-white">{venue.name}</h2>
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(venue.status)}`}>
                  {venue.status.charAt(0).toUpperCase() + venue.status.slice(1)}
                </span>
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${venue.isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {venue.isApproved ? 'Approved' : 'Pending Approval'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {venue.description && (
                    <p className="text-sm text-gray-700">{venue.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <span className="text-xs text-gray-500">Venue Type:</span>
                      <p className="text-sm font-medium text-gray-900 capitalize">{venue.venueType}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Timezone:</span>
                      <p className="text-sm font-medium text-gray-900">{venue.timezone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  Location
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-700">{venue.address.street}</p>
                  <p className="text-sm text-gray-700">
                    {venue.address.city}, {venue.address.state} {venue.address.zipCode}
                  </p>
                  <p className="text-sm text-gray-700">{venue.address.country}</p>
                  {venue.coordinates && (
                    <p className="text-xs text-gray-500 mt-2">
                      Coordinates: {venue.coordinates.lat}, {venue.coordinates.lng}
                    </p>
                  )}
                </div>
              </div>

              {/* Capacity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Capacity
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-3xl font-bold text-blue-600">{venue.capacity.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Maximum capacity</p>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  Operating Hours
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {venue.operatingHours.map((hours, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium text-gray-900">{getDayName(hours.day)}:</span>{' '}
                        {hours.isClosed ? (
                          <span className="text-red-600">Closed</span>
                        ) : (
                          <span className="text-gray-700">{hours.openTime} - {hours.closeTime}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Facilities */}
              {venue.facilities && venue.facilities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Facilities</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {venue.facilities.map((facility, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {facility}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Amenities */}
              {venue.amenities && venue.amenities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {venue.amenities.map((amenity, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {venue.contactInfo && (
                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {venue.contactInfo.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{venue.contactInfo.phone}</span>
                      </div>
                    )}
                    {venue.contactInfo.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{venue.contactInfo.email}</span>
                      </div>
                    )}
                    {venue.contactInfo.website && (
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <a href={venue.contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing */}
              {venue.baseRentalPrice && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                    Pricing
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(venue.baseRentalPrice, venue.currency)}
                    </p>
                    <p className="text-sm text-gray-500">Base rental price</p>
                  </div>
                </div>
              )}

              {/* Analytics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Star className="w-5 h-5 mr-2 text-blue-600" />
                  Analytics
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Events:</span>
                    <span className="text-sm font-medium text-gray-900">{venue.totalEvents}</span>
                  </div>
                  {venue.averageRating && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Rating:</span>
                      <span className="text-sm font-medium text-gray-900">{venue.averageRating.toFixed(1)} / 5.0</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Safety Features */}
              {venue.safetyFeatures && venue.safetyFeatures.length > 0 && (
                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-600" />
                    Safety Features
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {venue.safetyFeatures.map((feature, index) => (
                        <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Certifications */}
              {venue.certifications && venue.certifications.length > 0 && (
                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Certifications</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {venue.certifications.map((cert, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Vendor Information */}
              {venue.vendor && (
                <div className="col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Vendor Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {venue.vendor.firstName.charAt(0)}{venue.vendor.lastName.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{venue.vendor.fullName}</p>
                        <p className="text-sm text-gray-500">{venue.vendor.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="col-span-2">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span> {format(new Date(venue.createdAt), 'PPpp')}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span> {format(new Date(venue.updatedAt), 'PPpp')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 flex flex-wrap gap-2 justify-end">
            {!venue.isApproved && onApprove && (
              <button
                onClick={() => onApprove(venue.id)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </button>
            )}
            {venue.isApproved && onReject && (
              <button
                onClick={() => onReject(venue.id)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Revoke Approval
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(venue.id)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(venue.id)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueDetailsModal;
