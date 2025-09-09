import React, { useState } from 'react';
import { FaEnvelope, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const NewsletterSubscription: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);

    try {
      // Simulate API call - replace with actual newsletter API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/newsletter/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email })
      // });

      setIsSubscribed(true);
      toast.success('Successfully subscribed to our newsletter!');
      setEmail('');
      
      // Reset success state after 3 seconds
      setTimeout(() => setIsSubscribed(false), 3000);
      
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast.error('Failed to subscribe. Please try again later.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="col-span-1">
      <h3 className="font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
        Newsletter
      </h3>
      <p className="text-gray-600 text-sm mb-4">
        Subscribe to our newsletter for updates on new activities and promotions.
      </p>
      
      <form onSubmit={handleSubscribe} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-grow relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isSubscribing}
              className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            />
            <FaEnvelope className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          
          <button
            type="submit"
            disabled={isSubscribing || isSubscribed}
            className="px-6 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
            style={{ 
              backgroundColor: isSubscribed ? '#10B981' : 'var(--accent-color)',
              ':hover': { backgroundColor: isSubscribed ? '#059669' : undefined }
            }}
          >
            {isSubscribing ? (
              <>
                <LoadingSpinner size="small" color="white" />
                <span>Subscribing...</span>
              </>
            ) : isSubscribed ? (
              <>
                <FaCheckCircle className="w-4 h-4" />
                <span>Subscribed!</span>
              </>
            ) : (
              <span>Subscribe</span>
            )}
          </button>
        </div>
        
        <p className="text-xs text-gray-500">
          By subscribing, you agree to receive marketing emails from us. 
          You can unsubscribe at any time.
        </p>
      </form>
    </div>
  );
};

export default NewsletterSubscription;