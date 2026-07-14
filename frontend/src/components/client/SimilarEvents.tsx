import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HorizontalEventCarousel from './HorizontalEventCarousel';
import eventsAPI from '@/services/api/eventsAPI';
import analyticsEventsAPI, { AnalyticsEventSection } from '@/services/api/analyticsEventsAPI';

interface SimilarEventsProps {
  eventId: string;
  organizerName?: string;
  limit?: number;
}

const SimilarEvents: React.FC<SimilarEventsProps> = ({
  eventId,
  organizerName,
  limit = 5,
}) => {
  const navigate = useNavigate();
  const [similar, setSimilar] = useState<any[]>([]);
  const [organizer, setOrganizer] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);

    Promise.all([
      eventsAPI.getSimilarEvents(eventId, limit).catch(() => []),
      eventsAPI.getOrganizerEvents(eventId, 4).catch(() => []),
    ]).then(([sim, org]) => {
      setSimilar(Array.isArray(sim) ? sim : []);
      setOrganizer(Array.isArray(org) ? org : []);
      setLoading(false);
    });
  }, [eventId, limit]);

  if (loading) {
    return (
      <div className="py-8 px-4 md:px-6 border-t border-gray-100">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-64 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const handleClick = (section: AnalyticsEventSection) => (ev: any, position: number) => {
    const targetId = ev._id || ev.id;
    analyticsEventsAPI.trackEvent('similarEventClicked', {
      eventId: targetId,
      sourceEventId: eventId,
      section,
      position,
    });
    navigate(`/events/${ev.slug || targetId}`);
  };

  return (
    <>
      <HorizontalEventCarousel
        title="Similar Events"
        events={similar}
        onCardClick={handleClick('similar')}
      />
      {organizer.length > 0 && (
        <HorizontalEventCarousel
          title={organizerName ? `More from ${organizerName}` : 'More from this organizer'}
          events={organizer}
          onCardClick={handleClick('organizer')}
        />
      )}
    </>
  );
};

export default SimilarEvents;
