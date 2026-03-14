import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';

const NotFoundPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Page Not Found (404) | Gema Events"
        description="The page you are looking for could not be found. Return to our homepage to continue browsing kids activities and events."
        noIndex={true}
        noFollow={true}
      />
      <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-3xl font-semibold mb-6">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link 
          to="/" 
          className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors inline-block"
        >
          Back to Home
        </Link>
      </div>
      </div>
    </>
  );
};

export default NotFoundPage;