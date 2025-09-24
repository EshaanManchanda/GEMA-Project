import React, { useState } from 'react';
import { Mail, Send, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import Input from '../ui/Input';

interface NewsletterSubscriptionProps {
  variant?: 'card' | 'inline' | 'modal';
  title?: string;
  description?: string;
  placeholder?: string;
  className?: string;
}

const NewsletterSubscription: React.FC<NewsletterSubscriptionProps> = ({
  variant = 'card',
  title = 'Subscribe to Our Newsletter',
  description = 'Get the latest blog posts and updates delivered straight to your inbox.',
  placeholder = 'Enter your email address',
  className = ''
}) => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubscribe = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          source: 'blog',
          tags: ['blog_subscriber']
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubscribed(true);
        setEmail('');
        toast.success('Successfully subscribed to our newsletter!');
      } else {
        setError(data.message || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setError('Something went wrong. Please try again later.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubscribe();
    }
  };

  const renderContent = () => {
    if (isSubscribed) {
      return (
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Thank you for subscribing!
            </h3>
            <p className="text-sm text-gray-600">
              You'll receive our latest blog posts and updates in your inbox.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <div className="space-y-3">
          <div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="w-full"
              disabled={isSubscribing}
            />
            {error && (
              <div className="flex items-center space-x-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleSubscribe}
            loading={isSubscribing}
            disabled={!email.trim() || isSubscribing}
            className="w-full"
            variant="primary"
          >
            <Send className="w-4 h-4 mr-2" />
            Subscribe
          </Button>
        </div>

        <div className="text-xs text-center text-gray-500">
          <p>• No spam, unsubscribe at any time</p>
          <p>• We respect your privacy and won't share your email</p>
        </div>
      </div>
    );
  };

  if (variant === 'inline') {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 ${className}`}>
        {renderContent()}
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className={`bg-white p-6 ${className}`}>
        {renderContent()}
      </div>
    );
  }

  // Default card variant
  return (
    <Card className={className}>
      <CardContent className="p-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default NewsletterSubscription;