import React from 'react';
import { FaShieldAlt, FaUsers, FaStar, FaHeadset, FaTicketAlt, FaMobileAlt } from 'react-icons/fa';
import { ScrollReveal, StaggerContainer } from '@/components/animations';

interface Feature {
  title: string;
  description: string;
  icon?: string;
}

interface WhyChooseUsProps {
  features?: Feature[];
}

const WhyChooseUs: React.FC<WhyChooseUsProps> = ({ features }) => {
  // Default features if none provided
  const defaultFeatures = [
    {
      title: 'Curated Activities',
      description: 'Every activity is carefully vetted by our expert team to ensure quality, safety, and fun for your children.',
      icon: 'FaShieldAlt'
    },
    {
      title: 'Trusted Vendors',
      description: '750+ verified vendors with background checks, insurance, and safety certifications.',
      icon: 'FaUsers'
    },
    {
      title: 'Best Price Guarantee',
      description: 'Find the best deals on kids activities. We match prices and offer exclusive discounts.',
      icon: 'FaStar'
    },
    {
      title: '24/7 Support',
      description: 'Our customer support team is always here to help with bookings, changes, or questions.',
      icon: 'FaHeadset'
    },
    {
      title: 'Instant Booking',
      description: 'Book in seconds with instant confirmation. Digital tickets sent directly to your email.',
      icon: 'FaTicketAlt'
    },
    {
      title: 'Mobile Friendly',
      description: 'Browse and book on the go with our mobile-optimized website and PWA app.',
      icon: 'FaMobileAlt'
    }
  ];

  const displayFeatures = features && features.length > 0 ? features : defaultFeatures;

  // Icon mapping
  const iconMap: Record<string, React.ReactElement> = {
    FaShieldAlt: <FaShieldAlt className="w-8 h-8" />,
    FaUsers: <FaUsers className="w-8 h-8" />,
    FaStar: <FaStar className="w-8 h-8" />,
    FaHeadset: <FaHeadset className="w-8 h-8" />,
    FaTicketAlt: <FaTicketAlt className="w-8 h-8" />,
    FaMobileAlt: <FaMobileAlt className="w-8 h-8" />
  };

  return (
    <section className="py-10 sm:py-16 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
            Why Families Love Us
          </h2>
          <p className="text-sm sm:text-base text-center text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Discover why thousands of families trust us to create unforgettable experiences for their children
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
          {displayFeatures.map((feature, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                {/* Icon */}
                <div className="inline-flex p-4 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon && iconMap[feature.icon] ? iconMap[feature.icon] : <FaStar className="w-8 h-8" />}
                </div>

                {/* Content */}
                <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default WhyChooseUs;
