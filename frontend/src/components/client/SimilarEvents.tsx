import React, { useEffect, useState } from 'react';
import EventCard from './EventCard';
import eventsAPI from '@/services/api/eventsAPI';

interface SimilarEventsProps {
  eventId: string;
  organizerName?: string;
  limit?: number;
}

const HorizontalStrip: React.FC<{
  title: string;
  events: any[];
  onCardClick?: (id: string) => void;
}> = ({ title, events }) => {
  if (!events.length) return null;

  return (
    <section className="py-8 px-4 md:px-6 border-t border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {events.map((ev: any) => (
          <div key={ev._id || ev.id} className="snap-start flex-shrink-0 w-72">
            <EventCard {...ev} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  );
};

const SimilarEvents: React.FC<SimilarEventsProps> = ({
  eventId,
  organizerName,
  limit = 5,
}) => {
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

  return (
    <>
      <HorizontalStrip title="Similar Events" events={similar} />
      {organizer.length > 0 && (
        <HorizontalStrip
          title={organizerName ? `More from ${organizerName}` : 'More from this organizer'}
          events={organizer}
        />
      )}
    </>
  );
};

export default SimilarEvents;
