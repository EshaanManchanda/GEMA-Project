import React from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiCalendar, FiMapPin, FiAward, FiHeart } from 'react-icons/fi';
import SEO from '@/components/common/SEO';

const AboutPage: React.FC = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'About', url: '/about' }
  ];

  return (
    <>
      <SEO
        title="About Gema Events - Leading Kids Activities Platform in UAE"
        description="Learn about Gema Events, the UAE's trusted platform for discovering and booking amazing kids activities, educational programs, and family events. Our mission is to create memorable experiences for children."
        keywords={['about gema events', 'kids activities UAE', 'family events', 'children entertainment', 'about us']}
        breadcrumbs={breadcrumbs}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About Gema Events',
          description: 'Learn about Gema Events, the UAE\'s leading platform for kids activities and family events.',
          mainEntity: {
            '@type': 'Organization',
            name: 'Gema Events',
            description: 'Leading platform for kids activities and family events in the UAE',
            foundingDate: '2023',
            areaServed: 'United Arab Emirates',
            serviceType: ['Event Management', 'Kids Activities', 'Educational Programs', 'Family Entertainment']
          }
        }}
      />
      <div className="container mx-auto px-4 py-12">
      <motion.div 
        className="max-w-4xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">About Gema Events</h1>
          <p className="text-xl text-gray-600 mb-8">Connecting families with amazing experiences for children</p>
          <div className="w-24 h-1 bg-primary mx-auto"></div>
        </motion.div>

        {/* Our Story */}
        <motion.div variants={itemVariants} className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Our Story</h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">
              Gema Events was founded in 2020 with a simple mission: to help parents discover and book the best activities and events for their children. As parents ourselves, we understood the challenge of finding quality, age-appropriate experiences that children would love and remember.
            </p>
            <p className="text-gray-600 mb-4">
              What started as a small platform with just a handful of local vendors has grown into a comprehensive marketplace connecting thousands of families with hundreds of event providers across the country.
            </p>
            <p className="text-gray-600">
              Today, we're proud to be the go-to platform for parents seeking memorable experiences for their children, from educational workshops and sports activities to birthday parties and seasonal events.
            </p>
          </div>
        </motion.div>

        {/* Our Mission */}
        <motion.div variants={itemVariants} className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Our Mission</h2>
          <div className="bg-primary bg-opacity-5 rounded-lg p-8 border-l-4 border-primary">
            <p className="text-xl italic text-gray-700">
              "To enrich children's lives by connecting families with diverse, high-quality experiences that inspire learning, creativity, and joy."
            </p>
          </div>
        </motion.div>

        {/* Key Features */}
        <motion.div variants={itemVariants} className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 flex">
              <div className="mr-4">
                <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                  <FiCalendar size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Diverse Events</h3>
                <p className="text-gray-600">From educational workshops to fun outdoor activities, we curate a wide range of events for all interests and age groups.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 flex">
              <div className="mr-4">
                <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                  <FiMapPin size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Easy Discovery</h3>
                <p className="text-gray-600">Our platform makes it simple to find events near you with advanced filtering by location, date, age, and category.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 flex">
              <div className="mr-4">
                <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                  <FiAward size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Quality Assurance</h3>
                <p className="text-gray-600">We carefully vet all vendors and collect authentic reviews to ensure high-quality experiences for your children.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 flex">
              <div className="mr-4">
                <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                  <FiHeart size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Seamless Booking</h3>
                <p className="text-gray-600">Book and pay for events in just a few clicks, with instant confirmations and easy management of your bookings.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Team Section */}
        <motion.div variants={itemVariants} className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-1">Sarah Johnson</h3>
                <p className="text-primary mb-3">Founder & CEO</p>
                <p className="text-gray-600 text-sm">Former educator with a passion for creating enriching experiences for children.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-1">Michael Chen</h3>
                <p className="text-primary mb-3">CTO</p>
                <p className="text-gray-600 text-sm">Tech innovator focused on creating intuitive platforms that connect communities.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-1">Aisha Patel</h3>
                <p className="text-primary mb-3">Head of Partnerships</p>
                <p className="text-gray-600 text-sm">Relationship builder with extensive experience in the events and education sectors.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Our Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-gray-600">Event Vendors</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-gray-600">Monthly Bookings</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-gray-600">Happy Families</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl font-bold text-primary mb-2">20+</div>
              <div className="text-gray-600">Cities Covered</div>
            </div>
          </div>
        </motion.div>

        {/* Join Us CTA */}
        <motion.div variants={itemVariants} className="text-center">
          <div className="bg-primary rounded-lg shadow-lg p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
            <p className="text-xl mb-6">Discover amazing events for your children or become a vendor and share your experiences with families.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="px-6 py-3 bg-white text-primary font-semibold rounded-md hover:bg-gray-100 transition-colors">
                Browse Events
              </button>
              <button className="px-6 py-3 bg-primary-dark text-white font-semibold rounded-md hover:bg-opacity-90 transition-colors border border-white">
                Become a Vendor
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
    </>
  );
};

export default AboutPage;