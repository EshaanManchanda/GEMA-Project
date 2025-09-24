import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';

const ServerErrorPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Server Error (500) | Gema Events"
        description="We're experiencing technical difficulties. Please try again later or return to our homepage."
        noIndex={true}
        noFollow={true}
      />
      <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-red-500 mb-4">500</h1>
        <h2 className="text-3xl font-semibold mb-6">Server Error</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          We're experiencing some technical difficulties. Our team has been notified and is working to fix the issue.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/" 
            className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors inline-block"
          >
            Back to Home
          </Link>
          <button 
            onClick={() => window.location.reload()} 
            className="border border-primary text-primary px-6 py-3 rounded-md hover:bg-primary hover:text-white transition-colors inline-block"
          >
            Try Again
          </button>
        </div>
      </div>
      </div>
    </>
  );
};

export default ServerErrorPage;