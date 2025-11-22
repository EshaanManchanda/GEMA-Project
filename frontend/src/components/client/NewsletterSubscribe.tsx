import React, { useState } from 'react';
import { FaPaperPlane, FaCheckCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { LottieAnimation } from '../animations';
import { useInView } from 'react-intersection-observer';

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      setEmail('');
    }, 1500);
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
            The Kidzapp Feed
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
            className="flex flex-col sm:flex-row gap-4 relative"
          >
            <input
              type="email"
              id="homepage-newsletter-email"
              name="homepage-newsletter-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email..."
              className="px-4 py-4 rounded-lg border border-gray-300 w-full sm:w-auto sm:flex-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all"
              disabled={isSubmitted || isLoading}
            />
            <motion.button 
              type="submit"
              className="text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 hover:shadow-xl disabled:opacity-70"
              style={{ backgroundColor: 'var(--accent-color)' }}
              disabled={isSubmitted || isLoading || !email}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {isLoading ? (
                <div className="w-5 h-5">
                  <LottieAnimation src="/assets/animations/loading.svg" />
                </div>
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
            By subscribing, you agree to our <a href="#" className="underline hover:text-blue-600">Privacy Policy</a> and consent to receive updates from Kidzapp.
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
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
