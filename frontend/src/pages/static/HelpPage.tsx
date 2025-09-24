import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiChevronRight, FiPhone, FiMail, FiMessageSquare, FiHelpCircle } from 'react-icons/fi';
import SEO from '@/components/common/SEO';

const HelpPage: React.FC = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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

  // Help categories
  const helpCategories = [
    {
      id: 'account',
      title: 'Account & Profile',
      icon: '👤',
      description: 'Manage your account, update profile, and security settings',
      articles: [
        'How to create an account',
        'Updating your profile information',
        'Changing your password',
        'Managing notification preferences',
        'Deleting your account'
      ]
    },
    {
      id: 'bookings',
      title: 'Bookings & Tickets',
      icon: '🎟️',
      description: 'Everything about booking events and managing tickets',
      articles: [
        'How to book an event',
        'Viewing your tickets',
        'Cancellation and refund policy',
        'Transferring tickets to someone else',
        'What to do if you lost your ticket'
      ]
    },
    {
      id: 'payments',
      title: 'Payments & Billing',
      icon: '💳',
      description: 'Payment methods, invoices, and billing issues',
      articles: [
        'Accepted payment methods',
        'Understanding service fees',
        'Requesting a refund',
        'Updating payment information',
        'Troubleshooting payment issues'
      ]
    },
    {
      id: 'events',
      title: 'Finding Events',
      icon: '🔍',
      description: 'Discover and search for events that interest you',
      articles: [
        'Searching for events near you',
        'Using filters to find specific events',
        'Saving events for later',
        'Setting up event alerts',
        'Understanding event ratings and reviews'
      ]
    },
    {
      id: 'vendors',
      title: 'For Event Organizers',
      icon: '📊',
      description: 'Resources for vendors and event organizers',
      articles: [
        'Creating a vendor account',
        'Listing your first event',
        'Managing bookings and attendees',
        'Promoting your events',
        'Vendor fees and payments'
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      icon: '🔧',
      description: 'Help with technical issues and troubleshooting',
      articles: [
        'App installation issues',
        'Browser compatibility',
        'Troubleshooting login problems',
        'Fixing notification issues',
        'Reporting bugs and errors'
      ]
    }
  ];

  // Popular help articles
  const popularArticles = [
    'How to cancel a booking and get a refund',
    'Changing or updating your event tickets',
    'What to do if an event is canceled',
    'How to contact an event organizer',
    'Setting up two-factor authentication'
  ];

  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would search the help center
    console.log('Searching for:', searchQuery);
  };

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Help & Support', url: '/help' }
  ];

  return (
    <>
      <SEO
        title="Help & Support - Gema Events"
        description="Get help and support for Gema Events. Find guides for booking kids activities, managing your account, payments, and get quick answers to common questions."
        keywords={['help', 'support', 'gema events help', 'customer service', 'booking help', 'user guide']}
        breadcrumbs={breadcrumbs}
      />
      <div className="container mx-auto px-4 py-12">
      <motion.div 
        className="max-w-6xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">How Can We Help You?</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">Find answers to your questions and learn how to get the most out of Gema Events.</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div variants={itemVariants} className="mb-12">
          <form onSubmit={handleSearchSubmit} className="relative max-w-3xl mx-auto">
            <input
              type="text"
              placeholder="Search for help articles..."
              className="w-full p-5 pl-14 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              value={searchQuery}
              onChange={handleSearch}
            />
            <FiSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 text-2xl" />
            <button 
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </motion.div>

        {/* Popular Articles */}
        <motion.div variants={itemVariants} className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Popular Help Articles</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <ul className="divide-y divide-gray-200">
              {popularArticles.map((article, index) => (
                <li key={index} className="py-4 first:pt-0 last:pb-0">
                  <a href="#" className="flex items-center text-gray-700 hover:text-blue-600 transition-colors">
                    <FiHelpCircle className="text-blue-500 mr-3 flex-shrink-0" />
                    <span>{article}</span>
                    <FiChevronRight className="ml-auto text-gray-400" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Help Categories */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Browse Help Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map(category => (
              <div key={category.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="text-3xl mb-3">{category.icon}</div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">{category.title}</h3>
                  <p className="text-gray-600 mb-4">{category.description}</p>
                  <ul className="space-y-2 mb-4">
                    {category.articles.slice(0, 3).map((article, index) => (
                      <li key={index}>
                        <a href="#" className="text-blue-600 hover:text-blue-800 transition-colors flex items-center">
                          <FiChevronRight className="mr-2 text-blue-500" />
                          <span>{article}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <a 
                    href={`#${category.id}`} 
                    className="text-blue-600 font-medium hover:text-blue-800 transition-colors inline-flex items-center"
                  >
                    View all articles
                    <FiChevronRight className="ml-1" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Contact Support */}
        <motion.div variants={itemVariants} className="mt-16 bg-blue-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Still Need Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 text-center shadow-md">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FiPhone className="text-blue-600 text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Call Us</h3>
              <p className="text-gray-600 mb-4">Speak directly with our support team</p>
              <p className="text-blue-600 font-medium">+1 (555) 123-4567</p>
              <p className="text-gray-500 text-sm mt-2">Mon-Fri, 9AM-6PM EST</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 text-center shadow-md">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FiMail className="text-blue-600 text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Email Support</h3>
              <p className="text-gray-600 mb-4">Send us a detailed message</p>
              <p className="text-blue-600 font-medium">support@gemaevents.com</p>
              <p className="text-gray-500 text-sm mt-2">Response within 24 hours</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 text-center shadow-md">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FiMessageSquare className="text-blue-600 text-2xl" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Live Chat</h3>
              <p className="text-gray-600 mb-4">Chat with our support agents</p>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
                Start Chat
              </button>
              <p className="text-gray-500 text-sm mt-2">Available 24/7</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
    </>
  );
};

export default HelpPage;