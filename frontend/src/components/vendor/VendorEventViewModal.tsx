import React from 'react';
import { FaTimes, FaEdit, FaStar, FaMapMarkerAlt, FaWpforms } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

interface DateSchedule {
  _id?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  availableSeats: number;
  totalSeats?: number;
  price: number;
}

interface EventData {
  _id: string;
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
  ageRange: [number, number];
  location: {
    city: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  currency: string;
  isApproved?: boolean;
  isFeatured?: boolean;
  viewsCount?: number;
  images: string[];
  isDeleted?: boolean;
  tags: string[];
  dateSchedule: DateSchedule[];
  seoMeta?: {
    title: string;
    description: string;
    keywords: string[];
  };
  faqs?: Array<{
    _id?: string;
    question: string;
    answer: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
}

interface VendorEventViewModalProps {
  event: EventData;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const VendorEventViewModal: React.FC<VendorEventViewModalProps> = ({ event, isOpen, onClose, onEdit }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status Badges */}
          <div className="flex items-center gap-2 mb-4">
            {event.isApproved ? (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                Approved
              </span>
            ) : (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                Pending Approval
              </span>
            )}
            {event.isFeatured && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                <FaStar className="inline mr-1" size={10} />
                Featured
              </span>
            )}
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              {event.type}
            </span>
            {event.status && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {event.status}
              </span>
            )}
          </div>

          {/* Images */}
          {event.images && event.images.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Images</p>
              <div className="grid grid-cols-3 gap-2">
                {event.images.slice(0, 3).map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Event ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = '/default-event.jpg';
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <p className="text-gray-900">{event.category}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Venue Type</p>
              <p className="text-gray-900">{event.venueType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Age Range</p>
              <p className="text-gray-900">{event.ageRange[0]} - {event.ageRange[1]} years</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Price</p>
              <p className="text-gray-900">{event.currency} {event.price}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Location</p>
              <p className="text-gray-900">
                <FaMapMarkerAlt className="inline mr-1 text-emerald-600" />
                {event.location.address}, {event.location.city}
              </p>
            </div>
            {event.viewsCount !== undefined && (
              <div>
                <p className="text-sm font-medium text-gray-500">Views</p>
                <p className="text-gray-900">{event.viewsCount.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Description</p>
            <p className="text-gray-900 text-sm whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Date Schedules */}
          {event.dateSchedule && event.dateSchedule.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Date Schedules</p>
              <div className="space-y-2">
                {event.dateSchedule.map((schedule, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                    <p>
                      <span className="font-medium">Date:</span>{' '}
                      {schedule.startDate
                        ? new Date(schedule.startDate).toLocaleString()
                        : schedule.date
                        ? new Date(schedule.date).toLocaleString()
                        : 'N/A'}
                      {schedule.endDate && ` - ${new Date(schedule.endDate).toLocaleString()}`}
                    </p>
                    <p>
                      <span className="font-medium">Seats:</span> {schedule.availableSeats} available
                      {schedule.totalSeats && ` / ${schedule.totalSeats} total`}
                    </p>
                    <p>
                      <span className="font-medium">Price:</span> {event.currency} {schedule.price}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQs */}
          {event.faqs && event.faqs.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">FAQs</p>
              <div className="space-y-2">
                {event.faqs.map((faq, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium text-sm text-gray-900">{faq.question}</p>
                    <p className="text-sm text-gray-700 mt-1">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO Meta */}
          {event.seoMeta && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">SEO Meta</p>
              <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                {event.seoMeta.title && (
                  <p><span className="font-medium">Title:</span> {event.seoMeta.title}</p>
                )}
                {event.seoMeta.description && (
                  <p><span className="font-medium">Description:</span> {event.seoMeta.description}</p>
                )}
                {event.seoMeta.keywords && event.seoMeta.keywords.length > 0 && (
                  <p><span className="font-medium">Keywords:</span> {event.seoMeta.keywords.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          {event.createdAt && (
            <div className="mb-6 text-xs text-gray-500">
              <p>Created: {new Date(event.createdAt).toLocaleString()}</p>
              {event.updatedAt && (
                <p>Updated: {new Date(event.updatedAt).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => navigate(`/vendor/events/${event._id}/registration/builder`)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
          >
            <FaWpforms className="mr-2" />
            Form Builder
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center"
          >
            <FaEdit className="mr-2" />
            Edit
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorEventViewModal;
