import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiCalendar, FiMapPin, FiAward, FiHeart } from 'react-icons/fi';
import SEO from '@/components/common/SEO';
import { useQuery } from '@tanstack/react-query';
import seoContentAPI from '@/services/api/seoContentAPI';
import HomepageFAQs from '@/components/sections/HomepageFAQs';
import {
  getAppNameFull,
  getStatsEventVendors,
  getStatsMonthlyBookings,
  getStatsHappyFamilies,
  getStatsActivities,
} from '../../utils/brandConfig';

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

  const { data: seoContentData } = useQuery({
    queryKey: ['seo-content', 'about'],
    queryFn: () => seoContentAPI.getPublicSEOContent('about'),
    staleTime: 5 * 60 * 1000
  });

  return (
    <>
      <SEO
        title={seoContentData?.seoContent?.metaTitle || `About ${getAppNameFull()} - Leading Kids Activities Platform in UAE`}
        description={seoContentData?.seoContent?.metaDescription || `Learn about ${getAppNameFull()}, the UAE's trusted platform for discovering and booking amazing kids activities, educational programs, and family events. Our mission is to create memorable experiences for children.`}
        keywords={seoContentData?.seoContent?.keywords || ['about gema events', 'kids activities UAE', 'family events', 'children entertainment', 'about us']}
        breadcrumbs={breadcrumbs}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: seoContentData?.seoContent?.metaTitle || `About ${getAppNameFull()}`,
          description: seoContentData?.seoContent?.metaDescription || `Learn about ${getAppNameFull()}, the UAE's leading platform for kids activities and family events.`,
          mainEntity: {
            '@type': 'Organization',
            name: getAppNameFull(),
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-gray-800">About {getAppNameFull()}</h1>
            <p className="text-xl text-gray-600 mb-8">Connecting families with amazing experiences for children</p>
            <div className="w-24 h-1 bg-primary mx-auto"></div>
          </motion.div>

          {/* Our Story */}
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Our Story</h2>
            <div className="bg-white rounded-lg shadow-md p-8">
              <p className="text-gray-600 mb-4">
                {getAppNameFull()} was born from a simple idea: parents in the UAE deserve a single, trusted destination to discover and book the best activities for their children. We understood the challenge of finding quality, age-appropriate experiences across a fast-growing country with so much to offer.
              </p>
              <p className="text-gray-600 mb-4">
                Starting with a small group of passionate local vendors, we built a platform that brings together hundreds of event providers — from art studios and sports academies to outdoor adventure camps and educational workshops — all in one place.
              </p>
              <p className="text-gray-600">
                Today, {getAppNameFull()} is the UAE's go-to platform for families looking to create lasting memories, whether it's a weekend pottery class in Dubai, a football camp in Abu Dhabi, or a creative workshop in Sharjah.
              </p>
            </div>
          </motion.div>

          {/* Our Mission */}
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Our Mission</h2>
            <div className="bg-primary bg-opacity-5 rounded-lg p-8 border-l-4 border-primary">
              <p className="text-xl italic text-gray-700">
                "To enrich children's lives by connecting families with diverse, high-quality experiences that inspire learning, creativity, and joy."
              </p>
            </div>
          </motion.div>

          {/* Key Features */}
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">What We Offer</h2>
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

          {/* Stats */}
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Our Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-4xl font-bold text-primary mb-2">{getStatsEventVendors()}</div>
                <div className="text-gray-600">Event Vendors</div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-4xl font-bold text-primary mb-2">{getStatsMonthlyBookings()}</div>
                <div className="text-gray-600">Monthly Bookings</div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-4xl font-bold text-primary mb-2">{getStatsHappyFamilies()}</div>
                <div className="text-gray-600">Happy Families</div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="text-4xl font-bold text-primary mb-2">{getStatsActivities()}</div>
                <div className="text-gray-600">Activities</div>
              </div>
            </div>
          </motion.div>

          {/* FAQs */}
          {seoContentData?.seoContent?.faqItems && seoContentData.seoContent.faqItems.length > 0 && (
            <motion.div variants={itemVariants} className="mb-16 -mx-4 sm:mx-0 overflow-hidden rounded-xl shadow-md border border-gray-100">
              <HomepageFAQs faqItems={seoContentData.seoContent.faqItems} />
            </motion.div>
          )}

          {/* Join Us CTA */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="rounded-lg shadow-lg p-8 bg-secondary text-white">
              <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
              <p className="text-xl mb-6">Discover amazing events for your children or become a vendor and share your experiences with families.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/search"
                  className="px-6 py-3 font-semibold rounded-md transition-colors bg-white text-secondary hover:bg-gray-100"
                >
                  Browse Events
                </Link>
                <Link
                  to="/partner-with-us"
                  className="px-6 py-3 font-semibold rounded-md transition-colors border border-white bg-white/10 text-white hover:bg-white/20"
                >
                  Become a Vendor
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default AboutPage;
