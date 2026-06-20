import React from 'react';
import { Link } from 'react-router-dom';

interface City {
  name: string;
  image: string;
  description: string;
}

const uaeCities: City[] = [
  {
    name: 'Dubai',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=400&fit=crop',
    description: 'Explore family activities in Dubai'
  },
  {
    name: 'Abu Dhabi',
    image: 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=400&h=400&fit=crop',
    description: 'Discover events in Abu Dhabi'
  },
  {
    name: 'Sharjah',
    image: 'https://images.unsplash.com/photo-1580837119756-563d608dd119?w=400&h=400&fit=crop',
    description: 'Find activities in Sharjah'
  },
  {
    name: 'Ajman',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop',
    description: 'Browse events in Ajman'
  },
  {
    name: 'Ras Al Khaimah',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=400&fit=crop',
    description: 'Explore Ras Al Khaimah activities'
  },
];

const CitiesSection: React.FC = () => {
  return (
    <section className="w-full py-10 sm:py-16 md:py-20 bg-white">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-center text-gray-900 mb-8 sm:mb-12">
          Find the best family days out near you
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 md:gap-8">
          {uaeCities.map((city) => (
            <Link
              key={city.name}
              to={`/search?city=${encodeURIComponent(city.name)}`}
              className="flex flex-col items-center group"
              aria-label={city.description}
            >
              <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden mb-3 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg">
                <img
                  src={city.image}
                  alt={`${city.name} - family activities and events`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/assets/images/placeholder.jpg';
                  }}
                />
              </div>
              <span className="text-center font-medium text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
                {city.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CitiesSection;
