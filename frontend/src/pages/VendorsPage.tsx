import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '@/components/common/SEO';

interface Vendor {
  id: number;
  name: string;
  logo: string;
  coverImage: string;
  description: string;
  rating: number;
  reviewCount: number;
  eventCount: number;
  location: string;
  categories: string[];
}

const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [usingMockData, setUsingMockData] = useState<boolean>(false);

  // Mock data for vendors
  const mockVendors: Vendor[] = [
    {
      id: 1,
      name: 'EventMaster Pro',
      logo: 'https://via.placeholder.com/150',
      coverImage: 'https://via.placeholder.com/800x300',
      description: 'Premier event planning and management services for corporate events and conferences.',
      rating: 4.8,
      reviewCount: 124,
      eventCount: 45,
      location: 'New York, NY',
      categories: ['Corporate', 'Conference', 'Seminar']
    },
    {
      id: 2,
      name: 'Celebration Experts',
      logo: 'https://via.placeholder.com/150',
      coverImage: 'https://via.placeholder.com/800x300',
      description: 'Specializing in weddings, anniversaries, and milestone celebrations with a personal touch.',
      rating: 4.9,
      reviewCount: 215,
      eventCount: 78,
      location: 'Los Angeles, CA',
      categories: ['Wedding', 'Party', 'Celebration']
    },
    {
      id: 3,
      name: 'Festival Organizers',
      logo: 'https://via.placeholder.com/150',
      coverImage: 'https://via.placeholder.com/800x300',
      description: 'Creating memorable music festivals, cultural events, and outdoor experiences.',
      rating: 4.6,
      reviewCount: 89,
      eventCount: 32,
      location: 'Austin, TX',
      categories: ['Festival', 'Music', 'Cultural']
    },
    {
      id: 4,
      name: 'Tech Conference Pros',
      logo: 'https://via.placeholder.com/150',
      coverImage: 'https://via.placeholder.com/800x300',
      description: 'Specialized in organizing technology conferences, hackathons, and developer meetups.',
      rating: 4.7,
      reviewCount: 156,
      eventCount: 62,
      location: 'San Francisco, CA',
      categories: ['Technology', 'Conference', 'Hackathon']
    },
    {
      id: 5,
      name: 'Sports Event Management',
      logo: 'https://via.placeholder.com/150',
      coverImage: 'https://via.placeholder.com/800x300',
      description: 'Expert planning and execution of sporting events, tournaments, and athletic competitions.',
      rating: 4.5,
      reviewCount: 78,
      eventCount: 41,
      location: 'Chicago, IL',
      categories: ['Sports', 'Tournament', 'Competition']
    },
    {
      id: 6,
      name: 'Educational Workshop Organizers',
      logo: 'https://via.placeholder.com/150',
      coverImage: 'https://via.placeholder.com/800x300',
      description: 'Creating engaging educational workshops, seminars, and training sessions for all ages.',
      rating: 4.4,
      reviewCount: 67,
      eventCount: 38,
      location: 'Boston, MA',
      categories: ['Education', 'Workshop', 'Training']
    }
  ];

  // Categories derived from mock data
  const categories = ['all', ...Array.from(new Set(mockVendors.flatMap(vendor => vendor.categories)))];

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        // Simulate API call
        setLoading(true);
        
        // In a real app, you would fetch from an API
        // const response = await fetch('/api/vendors');
        // if (!response.ok) throw new Error('Failed to fetch vendors');
        // const data = await response.json();
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Use mock data instead
        setVendors(mockVendors);
        setUsingMockData(true);
        setError(null);
      } catch (err) {
        console.error('Error fetching vendors:', err);
        setError('Failed to load vendors. Using mock data instead.');
        setVendors(mockVendors);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // Filter vendors based on search term and selected category
  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         vendor.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                           vendor.categories.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Vendors', url: '/vendors' }
  ];

  return (
    <>
      <SEO
        title="Event Vendors - Kids Activities Organizers | Gema Events"
        description="Discover trusted event vendors and organizers for kids activities in the UAE. Find professional service providers for birthday parties, educational programs, and family events."
        keywords={['event vendors', 'kids activities organizers', 'event planners UAE', 'children event services', 'party organizers']}
        breadcrumbs={breadcrumbs}
      />
      <div className="container mx-auto px-4 py-8">
        {usingMockData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">Note</p>
          <p>Using mock data. In a production environment, this would be fetched from a backend API.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8 text-center">Event Organizers & Vendors</h1>
      
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search vendors..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <select
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredVendors.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-500">No vendors found matching your criteria</h3>
          <p className="mt-2 text-gray-400">Try adjusting your search or filter options</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVendors.map((vendor) => (
            <motion.div
              key={vendor.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <Link to={`/vendors/${vendor.id}`}>
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={vendor.coverImage} 
                    alt={`${vendor.name} cover`} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <div className="flex items-center">
                      <img 
                        src={vendor.logo} 
                        alt={vendor.name} 
                        className="w-12 h-12 rounded-full border-2 border-white mr-3 object-cover"
                      />
                      <h3 className="text-white font-bold text-lg truncate">{vendor.name}</h3>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="text-yellow-500">★</span>
                      <span className="ml-1 font-medium">{vendor.rating}</span>
                      <span className="ml-1 text-gray-500">({vendor.reviewCount} reviews)</span>
                    </div>
                    <span className="text-sm text-gray-500">{vendor.eventCount} events</span>
                  </div>
                  <p className="text-gray-600 mb-3 line-clamp-2">{vendor.description}</p>
                  <div className="flex items-center text-gray-500 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    {vendor.location}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {vendor.categories.slice(0, 3).map((category, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {category}
                      </span>
                    ))}
                    {vendor.categories.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{vendor.categories.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </>
  );
};

export default VendorsPage;