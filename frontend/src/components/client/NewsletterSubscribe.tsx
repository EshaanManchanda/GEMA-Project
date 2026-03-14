import React, { useState } from 'react';
import { FaPaperPlane, FaCheckCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import newsletterAPI from '../../services/api/newsletterAPI';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [ageOfChildren, setAgeOfChildren] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      const data = await newsletterAPI.subscribe({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        city: city.trim() || undefined,
        ageOfChildren: ageOfChildren.trim() || undefined,
        source: 'footer',
        tags: ['homepage_subscriber']
      });

      if (data.success) {
        setIsSubmitted(true);
        setEmail('');
        setName('');
        setCity('');
        setAgeOfChildren('');
        toast.success('Successfully subscribed to our newsletter!');
      } else {
        setError(data.message || 'Failed to subscribe. Please try again.');
        toast.error(data.message || 'Failed to subscribe');
      }
    } catch (error: any) {
      logger.error('Newsletter subscription error:', error);
      const errorMessage = error.response?.data?.message || 'Something went wrong. Please try again later.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  const circleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    },
  };

  return (
    <section className="w-full bg-gray-50 py-20 px-6 md:px-20 overflow-hidden">
      <motion.div
        ref={ref}
        variants={containerVariants}
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10"
      >
        {/* Left Content */}
        <div className="max-w-xl">
          <motion.div
            variants={itemVariants}
            className="inline-block mb-4 px-4 py-2 rounded-full"
            style={{ backgroundColor: 'rgba(0, 142, 199, 0.1)' }}
          >
            <span className="font-semibold text-gray-900">Stay Updated</span>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="text-4xl font-bold text-black mb-4"
          >
            The Kidrove Feed
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-lg text-gray-700 mb-8"
          >
            Join our family and get the latest updates and exclusive deals sent to your inbox!
          </motion.p>

          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 relative"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                id="homepage-newsletter-email"
                name="homepage-newsletter-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email..."
                className="px-4 py-4 rounded-lg border border-gray-300 w-full sm:flex-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                disabled={isSubmitted || isLoading}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="px-4 py-4 rounded-lg border border-gray-300 w-full sm:flex-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                disabled={isSubmitted || isLoading}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City (optional)"
                className="px-4 py-4 rounded-lg border border-gray-300 w-full sm:flex-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                disabled={isSubmitted || isLoading}
              />
              <input
                type="text"
                value={ageOfChildren}
                onChange={(e) => setAgeOfChildren(e.target.value)}
                placeholder="Age of children (optional, e.g., '3-5')"
                className="px-4 py-4 rounded-lg border border-gray-300 w-full sm:flex-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
                disabled={isSubmitted || isLoading}
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
            <motion.button
              type="submit"
              className="text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 hover:shadow-xl disabled:opacity-70"
              style={{ backgroundColor: 'var(--accent-color)' }}
              disabled={isSubmitted || isLoading || !email.trim() || !name.trim()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isSubmitted ? (
                <>
                  Subscribed <FaCheckCircle />
                </>
              ) : (
                <>
                  Subscribe Now <FaPaperPlane />
                </>
              )}
            </motion.button>
          </motion.form>

          <motion.p
            variants={itemVariants}
            className="text-sm text-gray-700 mt-4"
          >
            By subscribing, you agree to our <Link to="/privacy" className="underline hover:text-blue-600">Privacy Policy</Link> and consent to receive updates from Kidrove.
          </motion.p>
        </div>

        {/* Right Image */}
        <motion.div
          variants={itemVariants}
          className="w-full max-w-md relative"
        >
          <motion.div
            variants={circleVariants}
            className="absolute -top-10 -left-10 w-20 h-20 rounded-full"
            style={{ backgroundColor: 'var(--secondary-color)', opacity: '0.2' }}
          ></motion.div>

          <motion.div
            variants={circleVariants}
            className="absolute -bottom-5 -right-5 w-16 h-16 rounded-full"
            style={{ backgroundColor: 'var(--accent-color)', opacity: '0.15' }}
          ></motion.div>

          <motion.img
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            src="https://images.unsplash.com/photo-1522543558187-768b6df7c25c?w=400&h=400&fit=crop&crop=center"
            alt="Newsletter"
            className="w-full h-auto relative z-10"
            loading="lazy"
            width="400"
            height="400"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
