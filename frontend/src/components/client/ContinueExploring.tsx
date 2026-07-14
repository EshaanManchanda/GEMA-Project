import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { selectRecentlyViewed } from '@/store/slices/recentlyViewedSlice';
import EventCard from './EventCard';
import analyticsEventsAPI from '@/services/api/analyticsEventsAPI';

interface ContinueExploringProps {
  /** Exclude the event currently being viewed from its own recently-viewed strip */
  excludeEventId?: string;
}

const ContinueExploring: React.FC<ContinueExploringProps> = ({ excludeEventId }) => {
  const navigate = useNavigate();
  const items = useAppSelector(selectRecentlyViewed).filter(
    (item) => item.id !== excludeEventId,
  );

  if (items.length === 0) return null;

  return (
    <section className="py-8 px-4 md:px-6 border-t border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Continue Exploring</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {items.map((item, position) => (
          <div key={item.id} className="snap-start flex-shrink-0 w-72">
            <EventCard
              id={item.id}
              slug={item.slug}
              title={item.title}
              image={item.image}
              price={item.price}
              currency={item.currency}
              location={item.city ? { city: item.city } : undefined}
              ageRange={item.ageRange}
              variant="compact"
              onClick={() => {
                analyticsEventsAPI.trackEvent('recentlyViewedClicked', {
                  eventId: item.id,
                  sourceEventId: excludeEventId,
                  section: 'recentlyViewed',
                  position,
                });
                navigate(`/events/${item.slug || item.id}`);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ContinueExploring;
