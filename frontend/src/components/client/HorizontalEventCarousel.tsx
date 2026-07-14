import React, { useRef, useState, useCallback, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import EventCard from './EventCard';

interface HorizontalEventCarouselProps {
  title: string;
  events: any[];
  onCardClick: (event: any, position: number) => void;
}

const HorizontalEventCarousel: React.FC<HorizontalEventCarouselProps> = ({
  title,
  events,
  onCardClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [updateScrollButtons, events]);

  const scrollByCard = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-carousel-card]');
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
  };

  if (!events.length) return null;

  return (
    <section className="py-8 px-4 md:px-6 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {(canScrollLeft || canScrollRight) && (
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => scrollByCard('left')}
              disabled={!canScrollLeft}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Scroll left"
            >
              <FaChevronLeft size={12} />
            </button>
            <button
              onClick={() => scrollByCard('right')}
              disabled={!canScrollRight}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Scroll right"
            >
              <FaChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent z-10" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent z-10" />
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
        >
          {events.map((ev: any, position: number) => {
            const targetId = ev._id || ev.id;
            return (
              <div key={targetId} data-carousel-card className="snap-start flex-shrink-0 w-72">
                <EventCard
                  {...ev}
                  variant="compact"
                  showWishlist={false}
                  onClick={() => onCardClick(ev, position)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HorizontalEventCarousel;
