import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import categoriesAPI from '../services/api/categoriesAPI';
import eventsAPI from '../services/api/eventsAPI';
import { CategorySEO } from '@/components/common/SEO';
import { getPlaceholderUrl } from '../utils/placeholderImage';
import EventCard from '../components/client/EventCard';

// Mock categories data
const mockCategories = [
  { 
    id: '1', 
    name: 'Entertainment', 
    slug: 'entertainment',
    icon: '🎭',
    description: 'Fun activities and entertainment for kids of all ages.',
    image: 'https://via.placeholder.com/800x400?text=Entertainment'
  },
  { 
    id: '2', 
    name: 'Education', 
    slug: 'education',
    icon: '📚',
    description: 'Learning experiences and educational activities for children.',
    image: 'https://via.placeholder.com/800x400?text=Education'
  },
  { 
    id: '3', 
    name: 'Arts', 
    slug: 'arts',
    icon: '🎨',
    description: 'Creative arts and crafts activities to inspire young artists.',
    image: 'https://via.placeholder.com/800x400?text=Arts'
  }
];

// Mock events data
const mockEvents = {
  'entertainment': [
    {
      id: '1',
      title: 'Kids Fun Day',
      description: 'A day full of fun activities for kids of all ages.',
      image: 'https://via.placeholder.com/400x300?text=Kids+Fun+Day',
      price: 25,
      date: '2023-12-15',
      location: 'Central Park',
      category: 'Entertainment'
    },
    {
      id: '4',
      title: 'Magic Show for Kids',
      description: 'An amazing magic show that will leave kids in awe.',
      image: 'https://via.placeholder.com/400x300?text=Magic+Show',
      price: 15,
      date: '2023-12-18',
      location: 'City Theater',
      category: 'Entertainment'
    },
    {
      id: '7',
      title: 'Puppet Show',
      description: 'A delightful puppet show for children of all ages.',
      image: 'https://via.placeholder.com/400x300?text=Puppet+Show',
      price: 10,
      date: '2023-12-22',
      location: 'Community Center',
      category: 'Entertainment'
    }
  ],
  'education': [
    {
      id: '2',
      title: 'Science Workshop',
      description: 'Interactive science experiments for curious minds.',
      image: 'https://via.placeholder.com/400x300?text=Science+Workshop',
      price: 30,
      date: '2023-12-20',
      location: 'Science Museum',
      category: 'Education'
    },
    {
      id: '5',
      title: 'Coding for Kids',
      description: 'Introduction to programming concepts for children aged 8-12.',
      image: 'https://via.placeholder.com/400x300?text=Coding+Kids',
      price: 40,
      date: '2023-12-27',
      location: 'Tech Hub',
      category: 'Education'
    },
    {
      id: '8',
      title: 'History Adventure',
      description: 'An interactive journey through history for young explorers.',
      image: 'https://via.placeholder.com/400x300?text=History+Adventure',
      price: 20,
      date: '2023-12-29',
      location: 'History Museum',
      category: 'Education'
    }
  ],
  'arts': [
    {
      id: '3',
      title: 'Art & Craft Session',
      description: 'Creative art and craft activities for children.',
      image: 'https://via.placeholder.com/400x300?text=Art+Craft',
      price: 20,
      date: '2023-12-18',
      location: 'Community Center',
      category: 'Arts'
    },
    {
      id: '6',
      title: 'Kids Painting Class',
      description: 'A fun painting class for children to express their creativity.',
      image: 'https://via.placeholder.com/400x300?text=Painting+Class',
      price: 25,
      date: '2023-12-23',
      location: 'Art Studio',
      category: 'Arts'
    },
    {
      id: '9',
      title: 'Clay Modeling Workshop',
      description: 'Learn to create amazing sculptures with clay.',
      image: 'https://via.placeholder.com/400x300?text=Clay+Modeling',
      price: 30,
      date: '2023-12-26',
      location: 'Craft Center',
      category: 'Arts'
    }
  ]
};

// Helper functions for event data extraction
const getEventImage = (images?: string[], title?: string): string => {
  if (images && images.length > 0) return images[0];
  return getPlaceholderUrl('eventCard', title || 'Event');
};

const getEventLocation = (location?: any): string => {
  if (!location) return 'Location TBD';
  if (typeof location === 'string') return location;
  const { city, address } = location;
  if (city && address) return `${city}, ${address}`;
  return city || address || 'Location TBD';
};

const getEventDate = (dateSchedule?: any[]): string => {
  if (!dateSchedule || dateSchedule.length === 0) return '';
  const firstSchedule = dateSchedule[0];
  return firstSchedule.date || firstSchedule.startDate || '';
};

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Simulate fetching data from backend
  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setIsLoading(true);

        // Attempt to fetch real data from backend
        const [categoryData, eventsData] = await Promise.all([
          categoriesAPI.getCategoryById(slug),
          eventsAPI.getEventsByCategory(slug)
        ]);

        // Extract data from API response
        const category = categoryData;
        const events = eventsData || [];

        setCategory(category);
        setEvents(Array.isArray(events) ? events : []);
        setUsingMockData(false);
        
      } catch (err) {
        console.error('Error fetching category data:', err);
        // Use mock data if backend is unavailable
        const mockCategory = mockCategories.find(c => c.slug === slug);
        const mockCategoryEvents = slug ? mockEvents[slug as keyof typeof mockEvents] || [] : [];
        
        if (mockCategory) {
          setCategory(mockCategory);
          setEvents(mockCategoryEvents);
          setUsingMockData(true);
          setError('Unable to connect to the server. Showing default category data.');
        } else {
          setError('Category not found. Please try another category.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategoryData();
  }, [slug]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error && !category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <Link to="/categories" className="mt-4 inline-block text-primary hover:underline">Browse all categories</Link>
        </div>
      </div>
    );
  }
  
  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Category Not Found</h2>
          <p className="mb-6">The category you're looking for doesn't exist or has been removed.</p>
          <Link to="/categories" className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors">
            Browse Categories
          </Link>
        </div>
      </div>
    );
  }
  
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
    { name: category?.name || 'Category', url: `/categories/${slug}` }
  ];

  return (
    <>
      {category && <CategorySEO category={category} breadcrumbs={breadcrumbs} />}
      <div className="container mx-auto px-4 py-8">
        {usingMockData && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">Note</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Category Header */}
      <div className="relative h-64 rounded-lg overflow-hidden mb-8">
        <img
          src={category.featuredImage || category.image || getPlaceholderUrl('categoryIcon', category.name)}
          alt={category.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = getPlaceholderUrl('categoryIcon', category.name);
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-6xl mb-2">{category.icon || '📂'}</div>
            <h1 className="text-4xl font-bold">{category.name}</h1>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <p className="text-lg text-center max-w-3xl mx-auto">{category.description}</p>
      </div>
      
      <h2 className="text-2xl font-bold mb-6">Events in {category.name}</h2>
      
      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: any) => (
            <EventCard
              key={event._id || event.id}
              id={event._id || event.id}
              _id={event._id}
              title={event.title}
              description={event.description}
              images={event.images}
              image={getEventImage(event.images, event.title)}
              price={event.price}
              currency={event.currency}
              location={event.location}
              category={event.category}
              ageRange={event.ageRange}
              ageGroup={event.ageGroup}
              dateSchedule={event.dateSchedule}
              date={getEventDate(event.dateSchedule)}
              viewsCount={event.viewsCount}
              rating={event.averageRating}
              reviewsCount={event.reviewCount}
              vendorId={event.vendorId}
              showStats={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <h3 className="text-xl font-medium mb-2">No events found</h3>
          <p className="text-gray-600 mb-6">There are currently no events in this category.</p>
          <Link to="/events" className="text-primary hover:underline">Browse all events</Link>
        </div>
      )}
    </div>
    </>
  );
};

export default CategoryPage;