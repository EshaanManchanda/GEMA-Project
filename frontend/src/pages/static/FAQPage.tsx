import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';
import SEO from '@/components/common/SEO';

const FAQPage: React.FC = () => {
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

  // FAQ categories
  const categories = [
    'General',
    'Account',
    'Bookings',
    'Payments',
    'Events',
    'Vendors'
  ];

  // FAQ data
  const faqData = [
    {
      category: 'General',
      questions: [
        {
          id: 1,
          question: 'What is Gema Events?',
          answer: 'Gema Events is a comprehensive platform that connects event organizers with attendees. We provide a marketplace for discovering, booking, and managing various types of events, from concerts and workshops to conferences and private parties.'
        },
        {
          id: 2,
          question: 'How do I contact customer support?',
          answer: 'You can reach our customer support team through multiple channels: email us at support@gemaevents.com, call us at +1 (555) 123-4567 during business hours (9 AM - 6 PM EST, Monday to Friday), or use the live chat feature on our website for immediate assistance.'
        },
        {
          id: 3,
          question: 'Is Gema Events available in my country?',
          answer: 'Gema Events is currently available in the United States, Canada, United Kingdom, Australia, and select European countries. We are continuously expanding our services to new regions. Check our "Locations" page for the most up-to-date information on service availability.'
        },
        {
          id: 4,
          question: 'How do I report an issue with the platform?',
          answer: 'To report any issues with our platform, please use the "Report an Issue" form in the Help Center section of your account, or email us directly at issues@gemaevents.com with details of the problem you\'re experiencing. Include screenshots if possible to help us resolve your issue more quickly.'
        }
      ]
    },
    {
      category: 'Account',
      questions: [
        {
          id: 5,
          question: 'How do I create an account?',
          answer: 'Creating an account is simple! Click on the "Sign Up" button in the top right corner of our homepage. You can register using your email address, or sign up with your Google or Facebook account for a quicker process. Follow the prompts to complete your profile information.'
        },
        {
          id: 6,
          question: 'How do I reset my password?',
          answer: 'To reset your password, click on the "Login" button, then select "Forgot Password". Enter the email address associated with your account, and we\'ll send you a password reset link. Follow the instructions in the email to create a new password.'
        },
        {
          id: 7,
          question: 'Can I have both an attendee and vendor account?',
          answer: 'Yes, you can maintain both types of accounts. Start by creating a regular attendee account, then navigate to "Account Settings" and select "Become a Vendor" to set up your vendor profile. You\'ll be able to switch between the two account types using the toggle in your dashboard.'
        },
        {
          id: 8,
          question: 'How do I delete my account?',
          answer: 'To delete your account, go to "Account Settings" and scroll to the bottom where you\'ll find the "Delete Account" option. Please note that account deletion is permanent and will remove all your data, including booking history and saved events. If you have active bookings, we recommend resolving those before deleting your account.'
        }
      ]
    },
    {
      category: 'Bookings',
      questions: [
        {
          id: 9,
          question: 'How do I book an event?',
          answer: 'To book an event, browse our event listings or search for specific events. Once you find an event you\'re interested in, click on it to view details. Select the number of tickets and any additional options, then click "Book Now". Follow the checkout process to complete your booking with payment.'
        },
        {
          id: 10,
          question: 'Can I cancel my booking?',
          answer: 'Yes, you can cancel bookings, but cancellation policies vary by event. To cancel, go to "My Bookings" in your account dashboard, find the booking you wish to cancel, and click "Cancel Booking". The system will display the applicable refund amount based on the event\'s cancellation policy before you confirm.'
        },
        {
          id: 11,
          question: 'How do I get my tickets after booking?',
          answer: 'After completing your booking, tickets are automatically sent to the email address associated with your account. You can also access your tickets at any time by logging into your account and going to "My Bookings". From there, you can download or print your tickets as needed.'
        },
        {
          id: 12,
          question: 'Can I transfer my tickets to someone else?',
          answer: 'Yes, many events allow ticket transfers. To transfer tickets, go to "My Bookings" in your account, select the booking, and click "Transfer Tickets". Enter the recipient\'s email address and follow the prompts. Please note that some events may have restrictions on ticket transfers or may charge a transfer fee.'
        }
      ]
    },
    {
      category: 'Payments',
      questions: [
        {
          id: 13,
          question: 'What payment methods do you accept?',
          answer: 'We accept various payment methods including major credit cards (Visa, MasterCard, American Express, Discover), PayPal, Apple Pay, and Google Pay. In select regions, we also support bank transfers and local payment options. All payments are processed securely through our payment gateway.'
        },
        {
          id: 14,
          question: 'Is my payment information secure?',
          answer: 'Absolutely. We take security seriously and use industry-standard encryption to protect your payment information. We are PCI DSS compliant and never store your full credit card details on our servers. All transactions are processed through secure, trusted payment gateways.'
        },
        {
          id: 15,
          question: 'When will I receive my refund?',
          answer: 'Refund processing times depend on your payment method. Credit card refunds typically take 5-10 business days to appear on your statement. PayPal refunds are usually processed within 24-48 hours. Bank transfers may take 7-14 business days. Once we process a refund, you\'ll receive an email confirmation.'
        },
        {
          id: 16,
          question: 'Do you charge any booking fees?',
          answer: 'Yes, a small service fee is added to bookings to maintain our platform. The exact fee amount is always displayed transparently during the checkout process before you confirm your payment. Some premium events may have additional fees set by the event organizers.'
        }
      ]
    },
    {
      category: 'Events',
      questions: [
        {
          id: 17,
          question: 'How can I find events near me?',
          answer: 'To find events near you, use the search bar at the top of our homepage and enter your location, or allow the site to access your location when prompted. You can also browse events by category, date, or price range using our filter options. The map view also shows events in your vicinity.'
        },
        {
          id: 18,
          question: 'Can I get notifications about new events?',
          answer: 'Yes! To receive notifications about new events, go to "Account Settings" and enable notifications under "Preferences". You can customize your notifications to receive alerts about new events in specific categories, from favorite vendors, or in your area. You can choose to receive these via email, SMS, or push notifications.'
        },
        {
          id: 19,
          question: 'How do I leave a review for an event?',
          answer: 'You can leave a review for events you\'ve attended. After the event date has passed, go to "My Bookings" in your account, find the event, and click "Leave a Review". Rate your experience and write your feedback. Reviews help other users and provide valuable feedback to event organizers.'
        },
        {
          id: 20,
          question: 'What happens if an event is canceled?',
          answer: 'If an event is canceled by the organizer, you\'ll be automatically notified via email and in-app notification. You\'ll receive a full refund processed to your original payment method. In some cases, the organizer may offer to reschedule the event or provide alternative options instead of cancellation.'
        }
      ]
    },
    {
      category: 'Vendors',
      questions: [
        {
          id: 21,
          question: 'How do I become a vendor on Gema Events?',
          answer: 'To become a vendor, create a regular account first, then click on "Become a Vendor" in your account settings. Complete the vendor application form with details about your business, upload required documents for verification, and select your vendor subscription plan. Our team will review your application within 2-3 business days.'
        },
        {
          id: 22,
          question: 'What are the fees for vendors?',
          answer: 'Vendor fees consist of a monthly subscription fee (with tiered plans starting at $29.99/month) and a per-transaction fee of 2.5-5% depending on your subscription tier. Premium plans offer lower transaction fees and additional features. You can view detailed pricing on our Vendor Pricing page.'
        },
        {
          id: 23,
          question: 'How do I list an event as a vendor?',
          answer: 'To list an event, log in to your vendor dashboard and click "Create New Event". Fill out the event details form with information like title, description, date, time, location, ticket types, and pricing. Upload high-quality images and set your cancellation policy. Once submitted, events typically go live after a brief review process.'
        },
        {
          id: 24,
          question: 'When do vendors receive payment for bookings?',
          answer: 'Vendors receive payments for successful events 24 hours after the event concludes, minus our service fee. For events with advance bookings, you can opt for our Early Payout program to receive partial payments before the event date. Payments are transferred directly to your connected bank account or vendor wallet.'
        }
      ]
    }
  ];

  // State for active category and search
  const [activeCategory, setActiveCategory] = useState('General');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Toggle question expansion
  const toggleQuestion = (id: number) => {
    setExpandedQuestions(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  // Filter questions based on search and category
  const filteredFAQs = faqData
    .filter(category => searchQuery ? true : category.category === activeCategory)
    .flatMap(category => category.questions)
    .filter(question => 
      searchQuery ? 
        question.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        question.answer.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'FAQ', url: '/faq' }
  ];

  // Generate FAQ structured data
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.flatMap(category =>
      category.questions.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    )
  };

  return (
    <>
      <SEO
        title="FAQ - Frequently Asked Questions | Gema Events"
        description="Find answers to common questions about Gema Events, kids activities booking, payments, cancellations, and more. Get quick help and support for your queries."
        keywords={['faq', 'frequently asked questions', 'gema events help', 'kids activities questions', 'booking help', 'support']}
        breadcrumbs={breadcrumbs}
        structuredData={faqStructuredData}
      />
      <div className="container mx-auto px-4 py-12">
      <motion.div 
        className="max-w-4xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">Frequently Asked Questions</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">Find answers to common questions about Gema Events. If you can't find what you're looking for, please contact our support team.</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for questions..."
              className="w-full p-4 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={handleSearch}
            />
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
          </div>
        </motion.div>

        {/* Category Tabs - Only show when not searching */}
        {!searchQuery && (
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* FAQ Accordion */}
        <motion.div variants={itemVariants} className="space-y-4">
          {searchQuery && filteredFAQs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No results found for "{searchQuery}". Please try a different search term.</p>
            </div>
          ) : (
            filteredFAQs.map(faq => (
              <div key={faq.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  className="w-full p-6 text-left flex justify-between items-center focus:outline-none"
                  onClick={() => toggleQuestion(faq.id)}
                >
                  <h3 className="text-lg font-semibold text-gray-800">{faq.question}</h3>
                  {expandedQuestions.includes(faq.id) ? (
                    <FiChevronUp className="text-gray-600 text-xl flex-shrink-0" />
                  ) : (
                    <FiChevronDown className="text-gray-600 text-xl flex-shrink-0" />
                  )}
                </button>
                {expandedQuestions.includes(faq.id) && (
                  <div className="px-6 pb-6">
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>

        {/* Contact Support */}
        <motion.div variants={itemVariants} className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Still have questions?</h2>
          <p className="text-gray-600 mb-6">Our support team is here to help you with any questions or concerns.</p>
          <a 
            href="/contact" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Contact Support
          </a>
        </motion.div>
      </motion.div>
    </div>
    </>
  );
};

export default FAQPage;