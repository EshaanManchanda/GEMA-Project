import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import EventCard from './EventCard';
import { transformEvent } from '../../utils/dataTransformers';

type Event = {
  _id?: string;
  id: string;
  title: string;
  description?: string;
  images?: string[];
  image: string;
  price?: number;
  currency?: string;
  location?: {
    city?: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  } | string;
  category?: string;
  categories?: string[];
  ageRange?: {
    min: number;
    max: number;
  };
  ageGroup?: string;
  dateSchedule?: Array<{
    startDate: string;
    endDate: string;
  }>;
  date?: string;
  isFeatured?: boolean;
  viewsCount?: number;
  bookingsCount?: number;
  rating?: number;
  reviewsCount?: number;
  vendorId?: {
    businessName: string;
  };
};


interface EventGridSectionProps {
  events: Event[];
}

const EventGridSection: React.FC<EventGridSectionProps> = ({ events = [] }) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  // Ensure events is an array and not undefined/null
  const safeEvents = Array.isArray(events) ? events : [];

  // Transform events to ensure consistent data structure
  const transformedEvents = safeEvents.map(transformEvent);

  // Sort events by popularity (viewsCount high to low)
  const sortedEvents = [...transformedEvents].sort((a, b) => {
    return (b.viewsCount || 0) - (a.viewsCount || 0);
  });

  // Debug logging (only in development with debug flag)
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_COMPONENTS === 'true') {
    console.log('EventGridSection:', {
      receivedEvents: events?.length || 0,
      safeEvents: safeEvents.length,
      transformedEvents: transformedEvents.length,
      sortedEvents: sortedEvents.length
    });
  }

  // Apply display limit
  const displayLimit = showAll ? sortedEvents.length : 8;
  const filteredEvents = sortedEvents.slice(0, displayLimit);
  const hasMoreEvents = sortedEvents.length > displayLimit;

  return (
    <section className="px-6 py-16 max-w-screen-xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
            <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>Explore</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">🎉 Most Popular Experiences</h2>
          <p className="text-gray-700">
            Discover the most viewed and loved kids activities in Dubai, Abu Dhabi and the UAE
          </p>
          {filteredEvents.length > 0 && (
            <p className="text-sm text-gray-700 mt-1">
              Showing top {filteredEvents.length} most viewed experiences
            </p>
          )}
        </div>
        <button 
          onClick={() => navigate('/events')}
          className="mt-4 md:mt-0 flex items-center gap-2 font-medium hover:underline" 
          style={{ color: 'var(--primary-color)' }}
        >
          View All Experiences <FaArrowRight size={14} />
        </button>
      </div>


      {/* Grid View */}
      {filteredEvents.length > 0 ? (
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              {...event}
              variant="default"
              showStats={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎪</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No events found</h3>
          <p className="text-gray-700 mb-6">
            No popular events are currently available.
          </p>
        </div>
      )}
      
      {/* View More Button */}
      {hasMoreEvents && (
        <div className="mt-12 text-center">
          <button 
            onClick={() => setShowAll(!showAll)}
            className="px-8 py-3 rounded-lg font-semibold border-2 transition-all duration-300 hover:shadow-md"
            style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
          >
            {showAll ? 'Show Less' : `Load More Experiences (${sortedEvents.length - displayLimit} more)`}
          </button>
        </div>
      )}
      
      {!hasMoreEvents && filteredEvents.length > 0 && (
        <div className="mt-12 text-center">
          <p className="text-gray-700 text-sm">
            Showing all {filteredEvents.length} experiences
          </p>
          <button 
            onClick={() => navigate('/events')}
            className="mt-3 px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:shadow-md"
            style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}
          >
            Browse All Events
          </button>
        </div>
      )}
    </section>
  );
};

// Memoize to prevent re-renders when events/loading don't change
export default React.memo(EventGridSection);
