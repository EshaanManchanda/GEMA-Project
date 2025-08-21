import React from 'react';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { FaChevronRight, FaChevronLeft, FaArrowRight } from 'react-icons/fa';

type Collection = {
  title: string;
  icon: string; // path to icon image
  count: string;
  description: string;
};

const collections: Collection[] = [
  { 
    title: 'Summer Camps', 
    icon: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop&crop=center',
    count: '45+ activities',
    description: 'Keep your kids active and engaged during summer break'
  },
  { 
    title: 'Top Daycation Spots', 
    icon: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=80&h=80&fit=crop&crop=center',
    count: '32+ locations',
    description: 'Perfect day trips for the whole family'
  },
  { 
    title: 'Pool, Brunch & more', 
    icon: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=80&h=80&fit=crop&crop=center',
    count: '28+ venues',
    description: 'Relaxing experiences for parents and kids'
  },
  { 
    title: 'Top Kids Play Areas', 
    icon: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=80&h=80&fit=crop&crop=center',
    count: '50+ play zones',
    description: 'Safe and fun indoor play experiences'
  },
  { 
    title: 'Waterparks & Splash Fun', 
    icon: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=80&h=80&fit=crop&crop=center',
    count: '15+ parks',
    description: 'Cool off with exciting water activities'
  },
  { 
    title: 'Have A Pool Day', 
    icon: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=80&h=80&fit=crop&crop=center',
    count: '25+ pools',
    description: 'Swimming fun for all ages and abilities'
  },
  { 
    title: 'Plan a Birthday', 
    icon: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=80&h=80&fit=crop&crop=center',
    count: '40+ venues',
    description: 'Unforgettable birthday celebrations'
  },
];

const CollectionsCarousel: React.FC = () => {
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1.2,
      spacing: 20,
    },
    breakpoints: {
      '(min-width: 640px)': {
        slides: { perView: 2.2 },
      },
      '(min-width: 768px)': {
        slides: { perView: 3 },
      },
      '(min-width: 1024px)': {
        slides: { perView: 4 },
      },
    },
    dragSpeed: 0.8,
    mode: "snap",
  });

  return (
    <section className="max-w-screen-xl mx-auto px-6 my-20">
      <div className="rounded-2xl p-8 md:p-10 shadow-lg" 
        style={{ 
          background: `linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color) 70%, var(--secondary-color) 140%)` 
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div className="mb-4 md:mb-0">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-2" 
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
              COLLECTIONS
            </div>
            <h2 className="text-white text-3xl font-bold">Kidzapproved Collections</h2>
            <p className="text-white/80 mt-2 max-w-md">Curated lists of the best kid-friendly activities and venues</p>
          </div>
          <button className="flex items-center gap-2 text-white bg-white/20 hover:bg-white/30 transition-all duration-300 px-4 py-2 rounded-full font-medium">
            View All Collections <FaArrowRight size={14} />
          </button>
        </div>
        
        <div className="relative">
          <div ref={sliderRef} className="keen-slider overflow-visible">
            {collections.map((item, index) => (
              <div
                key={index}
                className="keen-slider__slide bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group h-full"
              >
                <div className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <div 
                    className="w-20 h-20 rounded-full p-4 mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                    style={{ backgroundColor: 'var(--secondary-color)', opacity: 0.1 }}
                  >
                    <img
                      src={item.icon}
                      alt={item.title}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="text-base font-semibold mb-1" style={{ color: 'var(--primary-color)' }}>{item.title}</p>
                  <p className="text-xs text-gray-500 mb-2">{item.count}</p>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                  <button 
                    className="mt-auto w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all duration-300 group-hover:shadow-lg"
                    style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
                  >
                    <FaChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => instanceRef.current?.prev()}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center z-10 hover:shadow-lg"
            style={{ color: 'var(--primary-color)' }}
          >
            <FaChevronLeft size={16} />
          </button>
          
          <button 
            onClick={() => instanceRef.current?.next()}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center z-10 hover:shadow-lg"
            style={{ color: 'var(--primary-color)' }}
          >
            <FaChevronRight size={16} />
          </button>
        </div>
        
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            {[...Array(5)].map((_, i) => (
              <button 
                key={i} 
                onClick={() => instanceRef.current?.moveToIdx(i)}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: 'white', 
                  opacity: instanceRef.current?.track.details.abs === i ? 1 : 0.5 
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollectionsCarousel;
