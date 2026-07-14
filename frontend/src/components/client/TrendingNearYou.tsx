import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HorizontalEventCarousel from './HorizontalEventCarousel';
import eventsAPI from '@/services/api/eventsAPI';
import analyticsEventsAPI from '@/services/api/analyticsEventsAPI';

interface TrendingNearYouProps {
  city?: string;
  excludeEventId?: string;
  limit?: number;
}

const TrendingNearYou: React.FC<TrendingNearYouProps> = ({
  city,
  excludeEventId,
  limit = 8,
}) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    eventsAPI
      .getTrendingNearYou(city, excludeEventId, limit)
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [city, excludeEventId, limit]);

  if (loading) {
    return (
      <div className="py-8 px-4 md:px-6 border-t border-gray-100">
        <div className="h-5 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-64 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <HorizontalEventCarousel
      title={city ? `Trending in ${city}` : 'Trending Near You'}
      events={events}
      onCardClick={(ev, position) => {
        const targetId = ev._id || ev.id;
        analyticsEventsAPI.trackEvent('similarEventClicked', {
          eventId: targetId,
          sourceEventId: excludeEventId,
          section: 'trending',
          position,
        });
        navigate(`/events/${ev.slug || targetId}`);
      }}
    />
  );
};

export default TrendingNearYou;
