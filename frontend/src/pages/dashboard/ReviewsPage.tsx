import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Review {
  id: string;
  eventId: string;
  eventTitle: string;
  eventImage: string;
  rating: number;
  comment: string;
  date: string;
  status: 'published' | 'pending' | 'rejected';
}

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'pending'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for reviews
        const mockReviews: Review[] = [
          {
            id: '1001',
            eventId: '101',
            eventTitle: 'Summer Art Camp for Kids',
            eventImage: 'https://placehold.co/600x400/orange/white?text=Art+Camp',
            rating: 5,
            comment: 'My kids had an amazing time at the art camp! The instructors were fantastic and the activities were engaging. Would definitely recommend to other parents!',
            date: '2023-07-20',
            status: 'published'
          },
          {
            id: '1002',
            eventId: '102',
            eventTitle: 'Science Workshop: Rockets and Space',
            eventImage: 'https://placehold.co/600x400/blue/white?text=Science+Workshop',
            rating: 4,
            comment: 'The science workshop was very educational and fun. My son learned a lot about rockets and space. The only downside was that it was a bit crowded.',
            date: '2023-07-25',
            status: 'published'
          },
          {
            id: '1003',
            eventId: '103',
            eventTitle: 'Dinosaur Exhibition Tour',
            eventImage: 'https://placehold.co/600x400/brown/white?text=Dinosaur+Tour',
            rating: 5,
            comment: 'The dinosaur exhibition was absolutely fantastic! The tour guide was knowledgeable and made the experience interactive and engaging for all ages.',
            date: '2023-07-18',
            status: 'published'
          },
          {
            id: '1004',
            eventId: '104',
            eventTitle: 'Kids Cooking Class: Baking Basics',
            eventImage: 'https://placehold.co/600x400/green/white?text=Cooking+Class',
            rating: 3,
            comment: 'The cooking class was good, but I think it could have been better organized. The instructor was nice but sometimes it was hard to follow along with the recipes.',
            date: '2023-08-02',
            status: 'pending'
          },
          {
            id: '1005',
            eventId: '105',
            eventTitle: 'Interactive Storytelling Session',
            eventImage: 'https://placehold.co/600x400/purple/white?text=Storytelling',
            rating: 4,
            comment: 'My daughter loved the storytelling session! The storyteller was engaging and the interactive elements kept all the children interested throughout.',
            date: '2023-08-05',
            status: 'pending'
          }
        ];
        
        setReviews(mockReviews);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('Failed to load reviews. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReviews();
  }, []);

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      // In a real app, you would call an API to delete the review
      setReviews(prevReviews => prevReviews.filter(review => review.id !== reviewId));
    }
  };

  const handleEditReview = (reviewId: string) => {
    // In a real app, you would navigate to an edit review page or open a modal
    console.log('Edit review:', reviewId);
  };

  const filteredReviews = reviews.filter(review => {
    if (activeTab === 'all') {
      return true;
    } else {
      return review.status === activeTab;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Reviews</h1>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('all')}
                className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                All Reviews
              </button>
              <button
                onClick={() => setActiveTab('published')}
                className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'published' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Published
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Pending
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {filteredReviews.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No {activeTab === 'all' ? '' : activeTab} reviews
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeTab === 'all' ? 'You haven\'t written any reviews yet.' : activeTab === 'published' ? 'You don\'t have any published reviews yet.' : 'You don\'t have any pending reviews.'}
                </p>
                <div className="mt-6">
                  <Link to="/events" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Browse Events
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredReviews.map((review) => (
                  <div key={review.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-1/4">
                        <img 
                          className="h-48 w-full object-cover sm:h-full" 
                          src={review.eventImage} 
                          alt={review.eventTitle} 
                        />
                      </div>
                      <div className="p-4 sm:p-6 sm:w-3/4">
                        <div className="flex flex-col sm:flex-row justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 mr-2">
                                <Link to={`/events/${review.eventId}`} className="hover:text-primary">
                                  {review.eventTitle}
                                </Link>
                              </h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(review.status)}`}>
                                {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                              </span>
                            </div>
                            <div className="flex items-center mb-3">
                              {[...Array(5)].map((_, i) => (
                                <svg 
                                  key={i} 
                                  className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 20 20" 
                                  fill="currentColor"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                              <span className="text-sm text-gray-500 ml-2">Reviewed on {formatDate(review.date)}</span>
                            </div>
                            <p className="text-gray-700 mb-4">{review.comment}</p>
                          </div>
                          <div className="mt-4 sm:mt-0 flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2">
                            {review.status === 'pending' && (
                              <button 
                                onClick={() => handleEditReview(review.id)}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                              >
                                Edit
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteReview(review.id)}
                              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;