import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend, FiCheckCircle } from 'react-icons/fi';
import SEO from '@/components/common/SEO';

const ContactPage: React.FC = () => {
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Form submitted:', formData);
      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (err) {
      setError('There was an error submitting your message. Please try again.');
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
                  <a href="#" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/></svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.054 10.054 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Contact Form */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
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
                      className="px-6 py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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