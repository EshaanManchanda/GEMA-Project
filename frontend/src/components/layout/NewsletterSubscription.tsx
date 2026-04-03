import React, { useState } from 'react';
import { FaEnvelope, FaCheckCircle } from 'react-icons/fa';
import logger from '../../utils/logger';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import newsletterAPI from '../../services/api/newsletterAPI';

const NewsletterSubscription: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [ageOfChildren, setAgeOfChildren] = useState('');
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

    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsSubscribing(true);

    try {
      const data = await newsletterAPI.subscribe({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        city: city.trim() || undefined,
        ageOfChildren: ageOfChildren.trim() || undefined,
        source: 'footer',
        tags: ['footer_subscriber']
      });

      if (data.success) {
        setIsSubscribed(true);
        toast.success('Successfully subscribed to our newsletter!');
        setEmail('');
        setName('');
        setCity('');
        setAgeOfChildren('');

        // Reset success state after 3 seconds
        setTimeout(() => setIsSubscribed(false), 3000);
      } else {
        toast.error(data.message || 'Failed to subscribe. Please try again.');
      }
    } catch (error: any) {
      logger.error('Newsletter subscription error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to subscribe. Please try again later.';
      toast.error(errorMessage);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="col-span-2 md:col-span-1">
      <h3 className="font-semibold mb-4 text-gray-900">
        Newsletter
      </h3>
      <p className="text-gray-700 text-sm mb-4">
        Subscribe to our newsletter for updates on new activities and promotions.
      </p>

      <form onSubmit={handleSubscribe} className="space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex-grow relative">
            <input
              type="email"
              id="newsletter-email"
              name="newsletter-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isSubscribing}
              className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            />
            <FaEnvelope className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>

          <div className="flex-grow">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={isSubscribing}
              className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            />
          </div>

          <div className="flex-grow">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (optional)"
              disabled={isSubscribing}
              className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            />
          </div>

          <div className="flex-grow">
            <input
              type="text"
              value={ageOfChildren}
              onChange={(e) => setAgeOfChildren(e.target.value)}
              placeholder="Age of children (optional)"
              disabled={isSubscribing}
              className="w-full px-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={isSubscribing || isSubscribed || !email.trim() || !name.trim()}
            className="w-full px-6 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isSubscribed ? '#10B981' : 'var(--accent-color)',
            } as any}
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

        <p className="text-xs text-gray-700">
          By subscribing, you agree to receive marketing emails from us.
          You can unsubscribe at any time.
        </p>
      </form>
    </div>
  );
};

export default NewsletterSubscription;