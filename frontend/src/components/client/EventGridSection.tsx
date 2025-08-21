import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaChild, FaArrowRight } from 'react-icons/fa';

type Event = {
  id: string;
  title: string;
  image: string;
  location?: string;
  ageGroup?: string;
  price?: number;
  category?: string;
  description?: string;
  date?: string;
};


interface EventGridSectionProps {
  events: Event[];
}

const EventGridSection: React.FC<EventGridSectionProps> = ({ events = [] }) => {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('All');

  // Get unique categories from events
  const categories = ['All', ...Array.from(new Set(events.map(event => event.category).filter(Boolean)))];
  
  const filteredEvents =
    selectedFilter === 'All'
      ? events.slice(0, 8) // Show first 8 events
      : events.filter((event) => event.category === selectedFilter).slice(0, 8);

  return (
    <section className="px-6 py-16 max-w-screen-xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}>
            <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>Explore</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">🎉 Handpicked Experiences</h2>
          <p className="text-gray-600">
            Our pick of the best kids activities in Dubai, Abu Dhabi and the rest of the UAE
          </p>
        </div>
        <button 
          onClick={() => navigate('/events')}
          className="mt-4 md:mt-0 flex items-center gap-2 font-medium hover:underline" 
          style={{ color: 'var(--primary-color)' }}
        >
          View All Experiences <FaArrowRight size={14} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-10 overflow-x-auto pb-2 -mx-1 px-1">
        {categories.map((filter) => (
          <button
            key={filter}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${selectedFilter === filter ? 'shadow-md' : 'hover:shadow-sm'}`}
            style={{
              backgroundColor: selectedFilter === filter ? 'var(--primary-color)' : 'white',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--primary-color)',
              color: selectedFilter === filter ? 'white' : 'var(--primary-color)'
            }}
            onClick={() => setSelectedFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Grid View */}
      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 group"
          >
            <div className="relative overflow-hidden">
              <img 
                src={event.image} 
                alt={event.title} 
                className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105" 
              />
              {event.ageGroup && (
                <div className="absolute top-3 right-3 bg-white rounded-full px-3 py-1 text-sm font-semibold shadow-sm" style={{ color: 'var(--primary-color)' }}>
                  Ages {event.ageGroup}
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold mb-2 line-clamp-2 min-h-[3.5rem]">{event.title}</h3>
              {event.location && (
                <div className="flex items-center text-gray-500 mb-3 text-sm">
                  <FaMapMarkerAlt className="mr-1" style={{ color: 'var(--primary-color)' }} />
                  <p className="truncate">{event.location}</p>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div>
                  {event.price && (
                    <>
                      <span className="text-xs text-gray-500">Starting from</span>
                      <div className="font-bold text-lg" style={{ color: 'var(--primary-color)' }}>AED {event.price}</div>
                    </>
                  )}
                  {!event.price && event.date && (
                    <div className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="px-4 py-2 text-white text-sm rounded-lg hover:shadow-md transition-all duration-300" 
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* View More Button */}
      <div className="mt-12 text-center">
        <button 
          className="px-8 py-3 rounded-lg font-semibold border-2 transition-all duration-300 hover:shadow-md"
          style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
        >
          Load More Experiences
        </button>
      </div>
    </section>
  );
};

export default EventGridSection;
