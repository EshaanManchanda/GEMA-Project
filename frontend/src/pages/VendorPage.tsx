import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { VendorSEO } from '@/components/common/SEO';
import vendorAPI from '@/services/api/vendorAPI';
import { getEventImage } from '@/utils/imageFallbacks';

interface Event {
  id: number;
  title: string;
  image: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string;
}

interface Vendor {
  id: number;
  name: string;
  logo: string;
  coverImage: string;
  description: string;
  longDescription: string;
  rating: number;
  reviewCount: number;
  location: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  socialMedia: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  categories: string[];
  events: Event[];
}

const VendorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'events' | 'reviews'>('about');
  const [usingMockData, setUsingMockData] = useState<boolean>(false);

  // Mock data for a single vendor
  const mockVendor: Vendor = {
    id: parseInt(id || '1'),
    name: 'EventMaster Pro',
    logo: 'https://via.placeholder.com/150',
    coverImage: 'https://via.placeholder.com/1200x400',
    description: 'Premier event planning and management services for corporate events and conferences.',
    longDescription: `EventMaster Pro is a leading event management company with over 10 years of experience in organizing corporate events, conferences, and seminars. Our team of experienced professionals is dedicated to creating memorable and impactful events that exceed client expectations.

We handle everything from venue selection and registration to speaker management and post-event analysis. Our comprehensive approach ensures that every detail is taken care of, allowing our clients to focus on their core objectives.

With a track record of successful events across multiple industries, we have built a reputation for excellence, creativity, and reliability. Our client-centered approach means we work closely with you to understand your goals and deliver events that align with your brand and message.`,
    rating: 4.8,
    reviewCount: 124,
    location: 'New York, NY',
    contactEmail: 'info@eventmasterpro.com',
    contactPhone: '+1 (555) 123-4567',
    website: 'https://www.eventmasterpro.com',
    socialMedia: {
      facebook: 'https://facebook.com/eventmasterpro',
      twitter: 'https://twitter.com/eventmasterpro',
      instagram: 'https://instagram.com/eventmasterpro',
      linkedin: 'https://linkedin.com/company/eventmasterpro'
    },
    categories: ['Corporate', 'Conference', 'Seminar', 'Workshop', 'Training'],
    events: [
      {
        id: 101,
        title: 'Annual Tech Conference 2023',
        image: 'https://via.placeholder.com/400x300',
        date: '2023-11-15',
        time: '09:00 AM - 05:00 PM',
        location: 'Convention Center, New York',
        price: 299.99,
        category: 'Conference'
      },
      {
        id: 102,
        title: 'Leadership Summit',
        image: 'https://via.placeholder.com/400x300',
        date: '2023-12-05',
        time: '10:00 AM - 04:00 PM',
        location: 'Grand Hotel, New York',
        price: 349.99,
        category: 'Seminar'
      },
      {
        id: 103,
        title: 'Digital Marketing Workshop',
        image: 'https://via.placeholder.com/400x300',
        date: '2023-11-25',
        time: '09:30 AM - 03:30 PM',
        location: 'Business Center, New York',
        price: 199.99,
        category: 'Workshop'
      },
      {
        id: 104,
        title: 'Product Management Bootcamp',
        image: 'https://via.placeholder.com/400x300',
        date: '2023-12-15',
        time: '09:00 AM - 05:00 PM',
        location: 'Innovation Hub, New York',
        price: 499.99,
        category: 'Training'
      },
      {
        id: 105,
        title: 'Startup Networking Event',
        image: 'https://via.placeholder.com/400x300',
        date: '2023-11-30',
        time: '06:00 PM - 09:00 PM',
        location: 'Tech Incubator, New York',
        price: 49.99,
        category: 'Networking'
      },
      {
        id: 106,
        title: 'AI in Business Conference',
        image: 'https://via.placeholder.com/400x300',
        date: '2024-01-20',
        time: '09:00 AM - 05:00 PM',
        location: 'Science Center, New York',
        price: 399.99,
        category: 'Conference'
      }
    ]
  };

  useEffect(() => {
    const fetchVendor = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Fetch vendor data from API
        const response = await vendorAPI.getPublicVendorProfile(id);
        const { vendor: vendorData, events: vendorEvents, stats } = response;

        // Transform API data to match component interface
        const transformedVendor: Vendor = {
          id: parseInt(id),
          name: `${vendorData.firstName} ${vendorData.lastName}`,
          logo: vendorData.avatar || 'https://via.placeholder.com/150',
          coverImage: 'https://via.placeholder.com/1200x400',
          description: `Professional Event Organizer - ${vendorData.firstName} ${vendorData.lastName}`,
          longDescription: `${vendorData.firstName} ${vendorData.lastName} is a professional event organizer with expertise in creating memorable experiences. With a commitment to excellence and attention to detail, we ensure every event is executed flawlessly.`,
          rating: 4.8,
          reviewCount: stats?.totalBookings || 0,
          location: 'Location information',
          contactEmail: vendorData.email,
          contactPhone: vendorData.phone || '',
          website: vendorData.socialMedia?.website || '',
          socialMedia: {
            facebook: vendorData.socialMedia?.facebook,
            twitter: vendorData.socialMedia?.twitter,
            instagram: vendorData.socialMedia?.instagram,
            linkedin: vendorData.socialMedia?.linkedin,
          },
          categories: [],
          events: vendorEvents.map((event: any) => ({
            id: event._id,
            title: event.title,
            image: getEventImage(event.images, event.title, 400, 300),
            date: event.dateSchedule?.[0]?.date || event.dateSchedule?.[0]?.startDate || new Date().toISOString(),
            time: event.dateSchedule?.[0]?.date
              ? new Date(event.dateSchedule[0].date).toLocaleTimeString()
              : '10:00 AM - 05:00 PM',
            location: event.location?.city && event.location?.address
              ? `${event.location.address}, ${event.location.city}`
              : event.location?.city || event.location?.address || 'Location TBD',
            price: event.price || 0,
            category: event.category || 'Event',
          }))
        };

        setVendor(transformedVendor);
        setUsingMockData(false);
        setError(null);
      } catch (err) {
        console.error('Error fetching vendor details:', err);
        setError('Failed to load vendor details. Using mock data instead.');
        setVendor(mockVendor);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !vendor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <div className="text-center">
          <Link to="/vendors" className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            Back to Vendors
          </Link>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Vendor not found</h2>
        <p className="mb-6">The vendor you're looking for doesn't exist or has been removed.</p>
        <Link to="/vendors" className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          Back to Vendors
        </Link>
      </div>
    );
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Vendors', url: '/vendors' },
    { name: vendor?.name || 'Vendor', url: `/vendors/${id}` }
  ];

  return (
    <>
      {vendor && <VendorSEO vendor={vendor} breadcrumbs={breadcrumbs} />}
      <div className="container mx-auto px-4 py-8">
        {usingMockData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">Note</p>
          <p>Using mock data. In a production environment, this would be fetched from a backend API.</p>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-64 md:h-80 lg:h-96 rounded-xl overflow-hidden mb-8">
        <img 
          src={vendor.coverImage} 
          alt={`${vendor.name} cover`} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
          <div className="container mx-auto px-4 py-6 flex items-center">
            <img 
              src={vendor.logo} 
              alt={vendor.name} 
              className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white mr-4 object-cover"
            />
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">{vendor.name}</h1>
              <div className="flex items-center mt-2">
                <span className="text-yellow-400 mr-1">★</span>
                <span className="text-white font-medium">{vendor.rating}</span>
                <span className="text-white/80 ml-1">({vendor.reviewCount} reviews)</span>
                <span className="mx-2 text-white/60">•</span>
                <span className="text-white/80">{vendor.location}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('about')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'about' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'events' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Events ({vendor.events.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reviews' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Reviews ({vendor.reviewCount})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mb-12">
        {activeTab === 'about' && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold mb-4">About {vendor.name}</h2>
                <div className="prose max-w-none">
                  {vendor.longDescription.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                  ))}
                </div>
                
                <h3 className="text-xl font-bold mt-8 mb-4">Categories</h3>
                <div className="flex flex-wrap gap-2 mb-8">
                  {vendor.categories.map((category, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Location</h4>
                    <p className="mt-1">{vendor.location}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Email</h4>
                    <p className="mt-1">
                      <a href={`mailto:${vendor.contactEmail}`} className="text-primary hover:underline">
                        {vendor.contactEmail}
                      </a>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Phone</h4>
                    <p className="mt-1">
                      <a href={`tel:${vendor.contactPhone}`} className="text-primary hover:underline">
                        {vendor.contactPhone}
                      </a>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Website</h4>
                    <p className="mt-1">
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {vendor.website.replace(/^https?:\/\//, '')}
                      </a>
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Social Media</h4>
                    <div className="flex space-x-4">
                      {vendor.socialMedia.facebook && (
                        <a href={vendor.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                      {vendor.socialMedia.twitter && (
                        <a href={vendor.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                          </svg>
                        </a>
                      )}
                      {vendor.socialMedia.instagram && (
                        <a href={vendor.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                          </svg>
                        </a>
                      )}
                      {vendor.socialMedia.linkedin && (
                        <a href={vendor.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-700">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'events' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Upcoming Events</h2>
            {vendor.events.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-medium text-gray-500">No upcoming events</h3>
                <p className="mt-2 text-gray-400">Check back later for new events from this vendor</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendor.events.map((event) => (
                  <motion.div
                    key={event.id}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
                  >
                    <Link to={`/events/${event.id}`}>
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={event.image} 
                          alt={event.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 m-2 rounded-full text-sm font-medium">
                          ${event.price.toFixed(2)}
                        </div>
                        <div className="absolute bottom-0 left-0 bg-white px-3 py-1 m-2 rounded-full text-sm font-medium">
                          {event.category}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-2 line-clamp-1">{event.title}</h3>
                        <div className="flex items-center text-gray-500 text-sm mb-2">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex items-center text-gray-500 text-sm mb-2">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          {event.time}
                        </div>
                        <div className="flex items-center text-gray-500 text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          {event.location}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Customer Reviews</h2>
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                Write a Review
              </button>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">{vendor.rating}</div>
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-5 h-5 ${i < Math.floor(vendor.rating) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-500">{vendor.reviewCount} reviews</p>
              </div>
              
              <div className="mt-6 space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  // Calculate percentage for each star rating (mock data)
                  const percentage = star === 5 ? 65 : 
                                    star === 4 ? 20 : 
                                    star === 3 ? 10 : 
                                    star === 2 ? 3 : 2;
                  return (
                    <div key={star} className="flex items-center">
                      <span className="text-sm text-gray-600 w-8">{star} ★</span>
                      <div className="flex-1 h-4 mx-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Mock reviews - in a real app, these would come from the API */}
              {[...Array(5)].map((_, index) => {
                const mockReviews = [
                  {
                    name: 'Sarah Johnson',
                    rating: 5,
                    date: '2023-10-15',
                    comment: 'EventMaster Pro organized our company conference flawlessly. The attention to detail was impressive, and they handled last-minute changes with professionalism. Would definitely hire them again for our next event!'
                  },
                  {
                    name: 'Michael Chen',
                    rating: 4,
                    date: '2023-09-22',
                    comment: 'Great experience working with this team. They were responsive and delivered a high-quality event. The only minor issue was with the AV setup that took some time to resolve, but overall very satisfied.'
                  },
                  {
                    name: 'Emily Rodriguez',
                    rating: 5,
                    date: '2023-08-30',
                    comment: 'We hired EventMaster Pro for our product launch, and they exceeded our expectations. The venue selection was perfect, and they coordinated everything seamlessly. Our guests were impressed with the professionalism and attention to detail.'
                  },
                  {
                    name: 'David Thompson',
                    rating: 3,
                    date: '2023-07-18',
                    comment: 'The event was good overall, but there were some communication issues leading up to the day. Some emails went unanswered for days. The actual execution was solid though.'
                  },
                  {
                    name: 'Jessica Williams',
                    rating: 5,
                    date: '2023-06-05',
                    comment: 'Absolutely outstanding service from start to finish. The team was creative, responsive, and handled everything with utmost professionalism. Our conference was a huge success thanks to their expertise.'
                  }
                ];
                
                const review = mockReviews[index];
                
                return (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold">{review.name}</h3>
                      <span className="text-sm text-gray-500">
                        {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex mb-3">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                );
              })}
              
              <div className="mt-8 text-center">
                <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Load More Reviews
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default VendorPage;