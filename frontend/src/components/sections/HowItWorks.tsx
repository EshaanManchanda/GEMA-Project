import React from 'react';
import { FaSearch, FaTicketAlt, FaCalendarCheck, FaSmile } from 'react-icons/fa';
import { ScrollReveal, StaggerContainer } from '@/components/animations';

const HowItWorks: React.FC = () => {
  const steps = [
    {
      icon: <FaSearch className="w-10 h-10" />,
      title: 'Browse Activities',
      description: 'Explore 2500+ verified kids activities across UAE. Filter by age, category, location, and price.',
      color: 'from-blue-500 to-blue-600',
      step: 1
    },
    {
      icon: <FaTicketAlt className="w-10 h-10" />,
      title: 'Book Instantly',
      description: 'Select your preferred time slot and book securely online with instant confirmation.',
      color: 'from-purple-500 to-purple-600',
      step: 2
    },
    {
      icon: <FaCalendarCheck className="w-10 h-10" />,
      title: 'Attend & Enjoy',
      description: 'Show your digital ticket or QR code and let your kids have an amazing time!',
      color: 'from-green-500 to-green-600',
      step: 3
    },
    {
      icon: <FaSmile className="w-10 h-10" />,
      title: 'Share Feedback',
      description: 'Rate your experience and help other families discover great activities.',
      color: 'from-yellow-500 to-orange-500',
      step: 4
    }
  ];

  return (
    <section
      className="py-16 bg-white"
      itemScope
      itemType="https://schema.org/HowTo"
    >
      <div className="max-w-screen-xl mx-auto px-6">
        <ScrollReveal>
          <h2
            itemProp="name"
            className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900"
          >
            How It Works
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Finding and booking the perfect kids activity has never been easier. Just 4 simple steps!
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <ScrollReveal
              key={index}
              delay={index * 0.1}
              {...({ itemProp: 'step', itemScope: true, itemType: 'https://schema.org/HowToStep' } as any)}
            >
              <div className="relative">
                {/* Step connector line (hidden on last step) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-gray-300 to-gray-200 z-0" />
                )}

                <div className="relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 z-10">
                  {/* Step number */}
                  <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-lg bg-gradient-to-br ${step.color} text-white mb-4`}>
                    {step.icon}
                  </div>

                  {/* Content */}
                  <h3
                    itemProp="name"
                    className="text-xl font-bold text-gray-900 mb-3"
                  >
                    {step.title}
                  </h3>
                  <p
                    itemProp="text"
                    className="text-gray-600 text-sm leading-relaxed"
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </StaggerContainer>

        {/* CTA */}
        <ScrollReveal delay={0.5}>
          <div className="text-center mt-12">
            <a
              href="/events"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <FaSearch />
              Start Exploring Activities
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default HowItWorks;
