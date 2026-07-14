import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { AnimatedButton } from '@/components/animations';
import EventCard from '@/components/client/EventCard';
import type { Event as UIEvent } from '@/components/client/CollectionSection.types';

export interface FeaturedEvent extends UIEvent {
    buttonLabel: string;
    image: string; // Ensure at least string is returned
}

// Autoplay plugin for Keen-Slider
const AutoplayPlugin = (slider: any) => {
    let timeout: ReturnType<typeof setTimeout>;
    let mouseOver = false;

    function clearNextTimeout() {
        clearTimeout(timeout);
    }

    function nextTimeout() {
        clearTimeout(timeout);
        if (mouseOver) return;
        timeout = setTimeout(() => {
            slider.next();
        }, 5000);
    }

    slider.on("created", () => {
        slider.container.addEventListener("mouseover", () => {
            mouseOver = true;
            clearNextTimeout();
        });
        slider.container.addEventListener("mouseout", () => {
            mouseOver = false;
            nextTimeout();
        });
        nextTimeout();
    });

    slider.on("animationEnded", nextTimeout);
    slider.on("updated", nextTimeout);
};

const FeaturedEventsCarousel: React.FC<{
    featuredEvents: FeaturedEvent[];
}> = ({ featuredEvents }) => {
    const navigate = useNavigate();
    const [, setCurrentSlide] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
        {
            loop: true,
            drag: false, // Disable drag feature
            slides: {
                perView: 1,
                spacing: 20,
            },
            breakpoints: {
                '(min-width: 640px)': {
                    slides: { perView: 2, spacing: 24 },
                },
                '(min-width: 768px)': {
                    slides: { perView: 3, spacing: 24 },
                },
                '(min-width: 1024px)': {
                    slides: { perView: 4, spacing: 28 },
                },
                '(min-width: 1280px)': {
                    slides: { perView: 5, spacing: 30 },
                },
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

    return (
        <div className="px-4 sm:px-6 py-10 sm:py-16 max-w-screen-xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h2 className="text-xl sm:text-3xl font-bold mb-2 text-gray-900">Our Top Recommendations</h2>
                    <p className="text-sm sm:text-base text-gray-700">Only the highest-rated activities in Dubai, Abu Dhabi, and the UAE make our list</p>
                </div>
                <AnimatedButton
                    className="mt-4 md:mt-0 flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1 transition-colors"
                    onClick={() => navigate('/search?featured=true')}
                    aria-label="View all events"
                >
                    View All Events <FaChevronRight size={14} aria-hidden="true" />
                </AnimatedButton>
            </div>

            <div className="relative py-4">
                <div ref={sliderRef} className="keen-slider min-h-[400px] overflow-hidden">
                    {featuredEvents && featuredEvents.length > 0 ? featuredEvents.map((event, index) => (
                        <div key={index} className="keen-slider__slide px-2 py-2">
                            <EventCard
                                {...event}
                                variant="overlay"
                                showPrice={true}
                                showLocation={true}
                                showDate={false}
                                showTime={false}
                                showDescription={false}
                                showStats={false}
                                showFeaturedBadge={false}
                                showCategory={false}
                                showVendor={false}
                                showAgeGroup={true}
                                priority={index === 0}
                                lazyLoad={index > 0}
                                showWishlist={false}
                            />
                        </div>
                    )) : (
                        <div className="keen-slider__slide flex items-center justify-center p-8">
                            <div className="text-center py-16 px-6">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center bg-primary-50 text-primary-DEFAULT">
                                    <div className="text-4xl">🎪</div>
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-gray-700">No Events Yet</h3>
                                <p className="text-gray-700 mb-6 max-w-md mx-auto">We're working on bringing you amazing events. Check back soon for exciting activities!</p>
                                <AnimatedButton
                                    onClick={() => navigate('/search')}
                                    className="px-6 py-3 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 bg-primary-DEFAULT"
                                    aria-label="Explore all events"
                                >
                                    Explore All Events
                                </AnimatedButton>
                            </div>
                        </div>
                    )}
                </div>

                {loaded && instanceRef.current && (
                    <div className="flex justify-center gap-3 mt-6">
                        <button
                            onClick={() => instanceRef.current?.prev()}
                            className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900"
                            aria-label="Previous events"
                        >
                            <FaChevronLeft size={14} />
                        </button>
                        <button
                            onClick={() => instanceRef.current?.next()}
                            className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-900 text-gray-900"
                            aria-label="Next events"
                        >
                            <FaChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FeaturedEventsCarousel;
