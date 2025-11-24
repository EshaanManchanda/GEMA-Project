import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend, FiCheckCircle } from 'react-icons/fi';
import { FaFacebookF, FaTwitter, FaInstagram, FaYoutube, FaLinkedinIn } from 'react-icons/fa';
import SEO from '@/components/common/SEO';
import contactAPI from '@/services/api/contactAPI';
import { selectSocialSettings } from '@/store/slices/settingsSlice';

const ContactPage: React.FC = () => {
  const socialSettings = useSelector(selectSocialSettings);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Submit contact form to backend API
      const response = await contactAPI.submitContact(formData);

      if (response.success) {
        setIsSubmitted(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      } else {
        setError('There was an error submitting your message. Please try again.');
      }
    } catch (err: any) {
      // Handle validation errors and other API errors
      let errorMessage = 'There was an error submitting your message. Please try again.';

      if (err.response?.data?.errors) {
        // Extract field-specific validation errors
        const errors = err.response.data.errors;
        const errorMessages = Object.values(errors) as string[];
        errorMessage = errorMessages.join('. ');
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('Contact form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Contact', url: '/contact' }
  ];

  return (
    <>
      <SEO
        title="Contact Gema Events - Get in Touch for Kids Activities & Events"
        description="Contact Gema Events for questions about kids activities, event bookings, partnerships, or support. We're here to help create amazing experiences for your children in the UAE."
        keywords={['contact gema events', 'customer support', 'kids activities help', 'event booking assistance', 'UAE contact']}
        breadcrumbs={breadcrumbs}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contact Gema Events',
          description: 'Get in touch with Gema Events for kids activities and event support',
          mainEntity: {
            '@type': 'Organization',
            name: 'Gema Events',
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              telephone: '+971-XX-XXX-XXXX',
              email: 'info@gema-events.com',
              areaServed: 'AE',
              availableLanguage: ['English', 'Arabic']
            }
          }
        }}
      />
      <div className="container mx-auto px-4 py-12">
      <motion.div 
        className="max-w-5xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">Contact Us</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">We'd love to hear from you! Whether you have a question about our events, need help with a booking, or want to partner with us.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Get In Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                      <FiMapPin size={20} />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-800">Our Location</h3>
                    <p className="text-gray-600 mt-1">123 Event Street, Suite 200<br />New York, NY 10001</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                      <FiPhone size={20} />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-800">Phone</h3>
                    <p className="text-gray-600 mt-1">+1 (555) 123-4567</p>
                    <p className="text-gray-600">+1 (555) 987-6543</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                      <FiMail size={20} />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-800">Email</h3>
                    <p className="text-gray-600 mt-1">info@gemaevents.com</p>
                    <p className="text-gray-600">support@gemaevents.com</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                      <FiClock size={20} />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-800">Business Hours</h3>
                    <p className="text-gray-600 mt-1">Monday - Friday: 9am - 6pm</p>
                    <p className="text-gray-600">Saturday: 10am - 4pm</p>
                    <p className="text-gray-600">Sunday: Closed</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Follow Us</h3>
                <div className="flex space-x-4">
                  {socialSettings.facebookUrl && (
                    <a href={socialSettings.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
                      <FaFacebookF className="w-5 h-5" />
                    </a>
                  )}
                  {socialSettings.twitterUrl && (
                    <a href={socialSettings.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
                      <FaTwitter className="w-5 h-5" />
                    </a>
                  )}
                  {socialSettings.instagramUrl && (
                    <a href={socialSettings.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
                      <FaInstagram className="w-5 h-5" />
                    </a>
                  )}
                  {socialSettings.youtubeUrl && (
                    <a href={socialSettings.youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
                      <FaYoutube className="w-5 h-5" />
                    </a>
                  )}
                  {socialSettings.linkedinUrl && (
                    <a href={socialSettings.linkedinUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
                      <FaLinkedinIn className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Contact Form */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 text-gray-900">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Send Us a Message</h2>
              
              {isSubmitted ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-6 text-center">
                  <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-800 mb-2">Thank You!</h3>
                  <p className="text-green-700">Your message has been sent successfully. We'll get back to you as soon as possible.</p>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                      {error}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Your Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Please select a subject</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Booking Support">Booking Support</option>
                      <option value="Vendor Partnership">Vendor Partnership</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Feedback">Feedback</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Your Message *</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    ></textarea>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ 
                        backgroundColor: 'var(--primary-color)',
                        borderColor: 'var(--primary-color)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#0070a3';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'var(--primary-color)';
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <FiSend className="mr-2" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
        
        {/* Map Section */}
        <motion.div variants={itemVariants} className="mt-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Our Location</h2>
            <div className="h-96 bg-gray-200 rounded-md">
              {/* In a real application, you would embed a Google Map or similar here */}
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <p>Map Embed Would Go Here</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* FAQ Section */}
        <motion.div variants={itemVariants} className="mt-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">How do I book an event?</h3>
                <p className="text-gray-600">You can book an event by browsing our events page, selecting the event you're interested in, and following the booking process. You'll need to create an account if you don't already have one.</p>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">What is your cancellation policy?</h3>
                <p className="text-gray-600">Our cancellation policy varies by event and vendor. Generally, full refunds are available if cancelled 48 hours before the event. Please check the specific event details for exact policies.</p>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">How can I become a vendor on your platform?</h3>
                <p className="text-gray-600">To become a vendor, click on the "Become a Vendor" button on our homepage or contact us directly. We'll guide you through the application process and help you set up your vendor profile.</p>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Do you offer gift cards?</h3>
                <p className="text-gray-600">Yes, we offer gift cards that can be used for any event on our platform. They make perfect presents for birthdays, holidays, or any special occasion.</p>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <a href="/faq" className="text-primary font-medium hover:underline">View All FAQs</a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
    </>
  );
};

export default ContactPage;