import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import collectionsAPI from '../../services/api/collectionsAPI';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';

interface CollectionInfo {
  heading: string;
  shortDescription: string;
  link: string;
}

interface EventCollectionsListProps {
  collections: CollectionInfo[];
}

// Autoplay plugin for keen-slider
const AutoplayPlugin = (slider: any) => {
  let timeout: ReturnType<typeof setTimeout>;
  let mouseOver = false;

  const clearNextTimeout = () => {
    clearTimeout(timeout);
  };

  const nextTimeout = () => {
    clearTimeout(timeout);
    if (mouseOver) return;
    timeout = setTimeout(() => {
      slider.next();
    }, 5000);
  };

  slider.on('created', () => {
    slider.container.addEventListener('mouseover', () => {
      mouseOver = true;
      clearNextTimeout();
    });
    slider.container.addEventListener('mouseout', () => {
      mouseOver = false;
      nextTimeout();
    });
    nextTimeout();
  });

  slider.on('dragStarted', clearNextTimeout);
  slider.on('animationEnded', nextTimeout);
  slider.on('updated', nextTimeout);
};

const CollectionBlock: React.FC<{ collection: CollectionInfo }> = ({ collection }) => {
  // Extract slug from link
  const slug = collection.link.split('/').filter(Boolean).pop() || '';
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['collection', slug],
    queryFn: async () => {
      const res = await collectionsAPI.getCollectionById(slug);
      return res.collection;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch 1st 8 events from collection
  const sortedEvents = data?.events 
    ? [...data.events].slice(0, 8)
    : [];

  // Keen-slider setup
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: sortedEvents.length > 1,
      drag: true,
      slides: {
        perView: 1,
        spacing: 20,
      },
      breakpoints: {
        '(min-width: 640px)': { slides: { perView: 2, spacing: 24 } },
        '(min-width: 1024px)': { slides: { perView: 4, spacing: 28 } },
      },
      slideChanged(slider) {
        setCurrentSlide(slider.track.details.rel);
      },
      created() {
        setLoaded(true);
      },
    },
    [AutoplayPlugin]
  );

  if (isLoading) return null;
  if (error || !data) return null;
  if (sortedEvents.length === 0) return null;

  return (
    <div className="mt-16 mb-16 pt-8 border-t border-gray-100">
      <div className="flex flex-col md:flex-row justify-between text-left items-start md:items-center mb-8">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black mb-2 text-slate-900 tracking-tight">
            {collection.heading}
          </h2>
          <p className="text-sm sm:text-base text-slate-500">
            {collection.shortDescription}
          </p>
        </div>
        <a href={collection.link} className="mt-4 md:mt-0 flex items-center gap-2 font-bold hover:underline text-indigo-600 transition-colors">
          View All <FaChevronRight size={14} />
        </a>
      </div>

      <div className="relative py-4">
        <div ref={sliderRef} className="keen-slider min-h-[400px] overflow-hidden">
          {sortedEvents.map((event, i) => (
            <div key={event.id || event._id || i} className="keen-slider__slide px-2 py-2">
              <div
                onClick={() => window.location.href = `/events/${event.slug || event.id || event._id}`}
                className="group relative bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-medium border border-slate-100/80 cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full min-h-[380px]"
              >
                {/* Card Image Area */}
                <div className="h-56 w-full relative overflow-hidden bg-slate-50 flex items-center justify-center p-4 shrink-0">
                  <div
                    className="absolute inset-0 bg-cover bg-no-repeat bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url('${event.images?.[0] || event.image || '/assets/images/placeholder.jpg'}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                    <div className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/25 shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all duration-350">
                      View Details
                    </div>
                  </div>
                </div>

                {/* Card Info Area */}
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200">
                      {event.category || 'Event'}
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-lg mt-3 group-hover:text-indigo-650 transition-colors leading-snug line-clamp-2">
                      {event.title}
                    </h3>
                    {event.shortDescription && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                        {event.shortDescription.replace(/<[^>]*>?/gm, '')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      <span>{event.ageRange ? `${event.ageRange[0]}-${event.ageRange[1]} yrs` : 'All Ages'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold bg-slate-150 px-3 py-1.5 rounded-full">
                      <span className="text-base text-slate-900">{event.price ? `${event.currency || 'AED'} ${event.price}` : 'Free'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        {loaded && instanceRef.current && sortedEvents.length > 1 && (
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => instanceRef.current?.prev()}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Previous slide"
            >
              <FaChevronLeft size={14} />
            </button>
            <button
              onClick={() => instanceRef.current?.next()}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Next slide"
            >
              <FaChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Dot indicators */}
        {loaded && sortedEvents.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {sortedEvents.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-8' : 'w-2'
                  }`}
                style={{
                  backgroundColor: currentSlide === idx ? 'var(--primary-color, #4F46E5)' : '#D1D5DB'
                }}
                onClick={() => instanceRef.current?.moveToIdx(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EventCollectionsList: React.FC<EventCollectionsListProps> = ({ collections }) => {
  if (!collections || collections.length === 0) return null;

  return (
    <div className="mt-8">
      {collections.map((collection, index) => (
        <CollectionBlock key={index} collection={collection} />
      ))}
    </div>
  );
};

export default EventCollectionsList;
