import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import categoriesAPI from '../services/api/categoriesAPI';

// Mock data for when backend is unavailable
const mockCategories = [
  { 
    id: '1', 
    name: 'Entertainment', 
    slug: 'entertainment',
    icon: '🎭',
    description: 'Fun activities and entertainment for kids of all ages.',
    eventCount: 12,
    image: 'https://via.placeholder.com/400x300?text=Entertainment'
  },
  { 
    id: '2', 
    name: 'Education', 
    slug: 'education',
    icon: '📚',
    description: 'Learning experiences and educational activities for children.',
    eventCount: 15,
    image: 'https://via.placeholder.com/400x300?text=Education'
  },
  { 
    id: '3', 
    name: 'Arts', 
    slug: 'arts',
    icon: '🎨',
    description: 'Creative arts and crafts activities to inspire young artists.',
    eventCount: 8,
    image: 'https://via.placeholder.com/400x300?text=Arts'
  },
  { 
    id: '4', 
    name: 'Sports', 
    slug: 'sports',
    icon: '⚽',
    description: 'Sports and physical activities for active kids.',
    eventCount: 10,
    image: 'https://via.placeholder.com/400x300?text=Sports'
  },
  { 
    id: '5', 
    name: 'Adventure', 
    slug: 'adventure',
    icon: '🏕️',
    description: 'Exciting outdoor adventures and exploration activities.',
    eventCount: 6,
    image: 'https://via.placeholder.com/400x300?text=Adventure'
  },
  { 
    id: '6', 
    name: 'Science', 
    slug: 'science',
    icon: '🔬',
    description: 'Scientific experiments and discovery for curious minds.',
    eventCount: 9,
    image: 'https://via.placeholder.com/400x300?text=Science'
  },
  { 
    id: '7', 
    name: 'Music', 
    slug: 'music',
    icon: '🎵',
    description: 'Musical activities and performances for young musicians.',
    eventCount: 7,
    image: 'https://via.placeholder.com/400x300?text=Music'
  },
  { 
    id: '8', 
    name: 'Cooking', 
    slug: 'cooking',
    icon: '🍳',
    description: 'Culinary experiences and cooking classes for kids.',
    eventCount: 5,
    image: 'https://via.placeholder.com/400x300?text=Cooking'
  }
];

const CategoriesPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState(mockCategories);
  const [usingMockData, setUsingMockData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Simulate fetching data from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        
        // Fetch real data from backend using API service
        const categoriesData = await categoriesAPI.getAllCategories();
        
        // Handle API response format - extract data if it's wrapped in response object
        const categories = categoriesData?.data || categoriesData || [];
        setCategories(Array.isArray(categories) ? categories : []);
        setUsingMockData(false);
        
      } catch (err) {
        console.error('Error fetching categories:', err);
        // Use mock data if backend is unavailable
        setCategories(mockCategories);
        setUsingMockData(true);
        setError('Unable to connect to the server. Showing default categories data.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {usingMockData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">Note</p>
          <p>{error}</p>
        </div>
      )}
      
      <h1 className="text-3xl font-bold mb-8 text-center">Categories</h1>
      
      <div className="max-w-md mx-auto mb-8">
        <div className="relative flex items-center w-full h-12 rounded-lg focus-within:shadow-lg bg-white overflow-hidden border border-gray-300">
          <div className="grid place-items-center h-full w-12 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            className="peer h-full w-full outline-none text-sm text-gray-700 pr-2"
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCategories.map(category => (
          <Link 
            key={category.id} 
            to={`/categories/${category.slug}`} 
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="relative h-48">
              <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <span className="text-6xl">{category.icon}</span>
              </div>
            </div>
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">{category.name}</h2>
              <p className="text-gray-600 mb-3 line-clamp-2">{category.description}</p>
              <div className="text-sm text-primary">{category.eventCount} events</div>
            </div>
          </Link>
        ))}
      </div>
      
      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No categories found</h3>
          <p className="text-gray-600">Try a different search term</p>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;