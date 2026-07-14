import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard from './EventCard';
import eventsAPI from '@/services/api/eventsAPI';
import analyticsEventsAPI from '@/services/api/analyticsEventsAPI';

interface RecommendedForYouProps {
  limit?: number;
}

const RecommendedForYou: React.FC<RecommendedForYouProps> = ({ limit = 8 }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    eventsAPI
      .getRecommendedForYou(limit)
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="px-4 py-10 sm:px-6 sm:py-16 max-w-screen-xl mx-auto">
        <div className="h-8 w-56 bg-gray-100 rounded animate-pulse mb-8" />
        <div className="flex gap-6 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[350px] h-64 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Backend returns [] when the user has no view/favorite/order signal yet —
  // hide the section entirely rather than showing an empty personalized shelf.
  if (!events.length) return null;

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16 max-w-screen-xl mx-auto">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-gray-900">
        Recommended For You
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-8">
        Picked based on your activity
      </p>
      <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
        <div className="flex gap-6 pb-4 snap-x snap-mandatory">
          {events.map((ev: any, position: number) => {
            const targetId = ev._id || ev.id;
            return (
              <div
                key={targetId}
                className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[350px] snap-start"
              >
                <EventCard
                  {...ev}
                  variant="compact"
                  showWishlist={false}
                  onClick={() => {
                    analyticsEventsAPI.trackEvent('similarEventClicked', {
                      eventId: targetId,
                      section: 'similar',
                      position,
                    });
                    navigate(`/events/${ev.slug || targetId}`);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecommendedForYou;
