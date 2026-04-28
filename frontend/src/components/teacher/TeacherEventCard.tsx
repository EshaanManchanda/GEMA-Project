import React from 'react';
import { motion } from 'framer-motion';
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUsers,
  FaStar,
  FaEdit,
  FaEye,
  FaTrash,
  FaVideo,
} from 'react-icons/fa';
import type { ITeachingEvent } from '@/types/teacher';
import { getEventImageFromEvent } from '@/utils/imageFallbacks';
import { getEventMode } from '@/utils/eventMode';

interface TeacherEventCardProps {
  event: ITeachingEvent;
  onEdit?: (event: ITeachingEvent) => void;
  onDelete?: (event: ITeachingEvent) => void;
  onView?: (event: ITeachingEvent) => void;
}

const statusColors: Record<string, string> = {
  published: 'bg-green-100 text-green-800 border-green-200',
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

const TeacherEventCard: React.FC<TeacherEventCardProps> = ({
  event,
  onEdit,
  onDelete,
  onView,
}) => {
  const nextSchedule = event.dateSchedule?.[0];
  const totalSeats = event.dateSchedule?.reduce((sum, s) => sum + (s.totalSeats || s.availableSeats || 0), 0) || 0;
  const soldSeats = event.dateSchedule?.reduce((sum, s) => sum + (s.soldSeats || 0), 0) || 0;
  const imageSrc = getEventImageFromEvent(event, 800, 480);
  const eventMode = getEventMode(event);
  const statusLabel = event.status === 'draft' || event.status === 'pending'
    ? 'Pending Approval'
    : event.status.charAt(0).toUpperCase() + event.status.slice(1);

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300"
    >
      {/* Image Section */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-indigo-100">
        <img src={imageSrc} alt={event.title} className="w-full h-full object-cover" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              statusColors[event.status] || statusColors.draft
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Event Type Badge */}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-700 shadow-sm flex items-center gap-1">
            {eventMode === 'Online' ? (
              <>
                <FaVideo className="w-3 h-3" />
                Online
              </>
            ) : (
              <>
                <FaMapMarkerAlt className="w-3 h-3" />
                Offline
              </>
            )}
          </span>
        </div>

        {/* Featured Badge */}
        {event.isFeatured && (
          <div className="absolute bottom-3 left-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg">
              Featured
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5">
        {/* Title & Type */}
        <div className="mb-3">
          <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">
            {event.type}
          </span>
          <h3 className="text-lg font-bold text-gray-900 mt-1 line-clamp-2">{event.title}</h3>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          {/* Date */}
          <div className="flex items-center gap-1">
            <FaCalendarAlt className="w-4 h-4 text-purple-500" />
            <span>{formatDate(nextSchedule?.startDate)}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1">
            {eventMode === 'Online' ? (
              <FaVideo className="w-4 h-4 text-purple-500" />
            ) : (
              <FaMapMarkerAlt className="w-4 h-4 text-purple-500" />
            )}
            <span className="truncate max-w-[100px]">
              {eventMode === 'Online' ? 'Online' : (event.location?.city || 'TBD')}
            </span>
          </div>
        </div>

        {/* Capacity & Rating */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 text-sm">
            <FaUsers className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {soldSeats}/{totalSeats || '∞'} booked
            </span>
          </div>

          {event.averageRating > 0 && (
            <div className="flex items-center gap-1">
              <FaStar className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-gray-700">
                {event.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">({event.reviewCount})</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div>
            <span className="text-2xl font-bold text-purple-600">
              {event.currency} {event.price}
            </span>
            <span className="text-sm text-gray-500 ml-1">/ session</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onView && (
              <button
                onClick={() => onView(event)}
                className="p-2 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                title="View"
              >
                <FaEye className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(event)}
                className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Edit"
              >
                <FaEdit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(event)}
                className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TeacherEventCard;
