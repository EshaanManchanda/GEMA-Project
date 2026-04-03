import React from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaCalendar, FaRedoAlt } from 'react-icons/fa';

interface GiftCardPromoProps {
  activityCount?: number;
}

const GiftCardPromo: React.FC<GiftCardPromoProps> = ({ activityCount = 100 }) => {
  return (
    <section className="w-full py-10 sm:py-16 md:py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-screen-xl mx-auto">
        <div
          className="relative overflow-visible rounded-3xl p-5 sm:p-8 md:p-12 lg:p-16"
          style={{
            background: 'linear-gradient(135deg, #2E1065 0%, #7C3AED 50%, #1E3A8A 100%)'
          }}
        >
          {/* Enhanced Sparkle effects - decorative overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Large sparkles */}
            <div className="absolute top-10 left-10 w-3 h-3 bg-white rounded-full opacity-60 animate-pulse"></div>
            <div className="absolute top-20 right-20 w-2.5 h-2.5 bg-white rounded-full opacity-50 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-white rounded-full opacity-70 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-32 right-1/3 w-2.5 h-2.5 bg-white rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-1/3 right-10 w-3 h-3 bg-white rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.75s' }}></div>

            {/* Medium sparkles */}
            <div className="absolute top-32 left-1/3 w-2 h-2 bg-pink-200 rounded-full opacity-50 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="absolute top-1/2 left-20 w-1.5 h-1.5 bg-white rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.8s' }}></div>
            <div className="absolute bottom-40 right-20 w-2 h-2 bg-purple-200 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1.2s' }}></div>
            <div className="absolute top-16 right-1/4 w-1.5 h-1.5 bg-white rounded-full opacity-50 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
            <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-blue-200 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1.4s' }}></div>

            {/* Small sparkles */}
            <div className="absolute top-24 left-1/2 w-1 h-1 bg-white rounded-full opacity-70 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="absolute top-40 right-1/3 w-1 h-1 bg-pink-300 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.9s' }}></div>
            <div className="absolute bottom-24 left-16 w-1 h-1 bg-white rounded-full opacity-50 animate-pulse" style={{ animationDelay: '1.1s' }}></div>
            <div className="absolute bottom-1/4 right-16 w-1 h-1 bg-purple-300 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1.3s' }}></div>
            <div className="absolute top-1/4 left-24 w-1 h-1 bg-white rounded-full opacity-40 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <div className="absolute top-2/3 right-24 w-1 h-1 bg-blue-300 rounded-full opacity-50 animate-pulse" style={{ animationDelay: '1.6s' }}></div>
            <div className="absolute bottom-16 left-1/3 w-1 h-1 bg-white rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.7s' }}></div>
            <div className="absolute top-1/2 right-1/2 w-1 h-1 bg-pink-200 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1.7s' }}></div>

            {/* Extra tiny sparkles for more density */}
            <div className="absolute top-14 right-12 w-0.5 h-0.5 bg-white rounded-full opacity-80 animate-pulse" style={{ animationDelay: '0.15s' }}></div>
            <div className="absolute bottom-28 left-12 w-0.5 h-0.5 bg-white rounded-full opacity-70 animate-pulse" style={{ animationDelay: '0.95s' }}></div>
            <div className="absolute top-1/3 left-1/4 w-0.5 h-0.5 bg-white rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1.25s' }}></div>
            <div className="absolute bottom-1/2 right-1/4 w-0.5 h-0.5 bg-white rounded-full opacity-70 animate-pulse" style={{ animationDelay: '1.55s' }}></div>
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="text-white relative z-10">
              <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                Stuck for ideas?<br />
                Give the gift card<br />
                for {activityCount}+ activities!
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <FaEnvelope className="text-xl md:text-2xl" aria-hidden="true" />
                  </div>
                  <span className="text-base md:text-lg">Instantly via email</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <FaCalendar className="text-xl md:text-2xl" aria-hidden="true" />
                  </div>
                  <span className="text-base md:text-lg">12 months to book</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <FaRedoAlt className="text-xl md:text-2xl" aria-hidden="true" />
                  </div>
                  <span className="text-base md:text-lg">Can be used multiple times</span>
                </div>
              </div>

              <Link
                to="/contact"
                className="inline-block px-5 py-3 sm:px-8 sm:py-4 bg-pink-600 text-white text-sm sm:text-lg font-semibold rounded-full hover:bg-pink-700 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-pink-400"
                aria-label="Contact us to purchase gift card"
              >
                Gift Now
              </Link>
            </div>

            {/* Right Column - Gift Card Image */}
            <div className="flex justify-center lg:justify-end relative">
              <div style={{ zIndex: 100 }}>
                <img
                  src="/assets/images/kidrove-card.png"
                  alt="Kidrove Gift Card - over 100 activities for kids like workshops and competitions"
                  className="transform rotate-6 rounded-xl transition-transform duration-300 hover:rotate-3 hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GiftCardPromo;
