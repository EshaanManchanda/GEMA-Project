import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiCalendar, FiMapPin, FiAward, FiHeart, FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';
import { FaQuestionCircle } from 'react-icons/fa';
import SEO from '@/components/common/SEO';
import { useQuery } from '@tanstack/react-query';
import seoContentAPI from '@/services/api/seoContentAPI';
import { FALLBACK_FAQ_DATA } from '@/data/faqData';
import {
  getAppNameFull,
  getStatsEventVendors,
  getStatsMonthlyBookings,
  getStatsHappyFamilies,
  getStatsActivities,
} from '../../utils/brandConfig';

const AboutPage: React.FC = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Kidrove Go', url: '/about' }
  ];

  const { data: seoContentData } = useQuery({
    queryKey: ['seo-content', 'about'],
    queryFn: () => seoContentAPI.getPublicSEOContent('about'),
    staleTime: 5 * 60 * 1000
  });

  const { data: faqContentData } = useQuery({
    queryKey: ['seo-content', 'faq'],
    queryFn: () => seoContentAPI.getPublicSEOContent('faq'),
    staleTime: 5 * 60 * 1000
  });

  // Group fetched FAQs or use fallback FAQ dataset
  const faqGrouped = React.useMemo(() => {
    const rawFaqs = faqContentData?.seoContent?.faqItems;
    if (rawFaqs && rawFaqs.length > 0) {
      const grouped: Record<string, any[]> = {};
      rawFaqs.forEach((item: any, index: number) => {
        const cat = item.category?.trim() || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ id: index + 100, question: item.question, answer: item.answer });
      });
      return Object.entries(grouped).map(([category, questions]) => ({ category, questions }));
    }
    return FALLBACK_FAQ_DATA;
  }, [faqContentData]);

  const faqCategories = faqGrouped.map(f => f.category);
  const [faqActiveCategory, setFaqActiveCategory] = useState<string>('General');
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);

  React.useEffect(() => {
    if (faqCategories.length > 0 && !faqCategories.includes(faqActiveCategory)) {
      setFaqActiveCategory(faqCategories[0]);
    }
  }, [faqCategories, faqActiveCategory]);

  const filteredFaqs = faqGrouped
    .filter(cat => faqSearch ? true : cat.category === faqActiveCategory)
    .flatMap(cat => cat.questions)
    .filter(q =>
      faqSearch
        ? q.question.toLowerCase().includes(faqSearch.toLowerCase()) || q.answer.toLowerCase().includes(faqSearch.toLowerCase())
        : true
    );

  const toggleFaq = (id: number) => {
    setExpandedFaqs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <>
      <SEO
        title={seoContentData?.seoContent?.metaTitle || `Kidrove Go - About & FAQs | ${getAppNameFull()}`}
        description={seoContentData?.seoContent?.metaDescription || `Discover Kidrove Go: learn about our mission, vetting standards, and browse comprehensive answers to frequently asked questions.`}
        keywords={seoContentData?.seoContent?.keywords || ['kidrove go', 'about kidrove', 'faqs', 'kids activities UAE', 'family events']}
        breadcrumbs={breadcrumbs}
      />

      <div className="container mx-auto px-4 py-12">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
              Kidrove Go
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-4 mb-4 text-gray-900 tracking-tight">
              About Kidrove Go
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Connecting families with amazing, safe, and enriching experiences for children across the UAE.
            </p>
            <div className="w-20 h-1 bg-primary mx-auto mt-6 rounded-full"></div>
          </motion.div>

          {/* Our Story */}
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Our Story</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <p className="text-gray-600 leading-relaxed mb-4">
                {getAppNameFull()} was born from a simple idea: parents deserve a single, trusted destination to discover and book the best activities for their children. We understood the challenge of finding quality, age-appropriate experiences across a fast-growing country with so much to offer.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Starting with a small group of passionate educators and event providers, we built a platform that brings together top workshops, academies, and adventure hubs — from art and robotics to public speaking and outdoor camps.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Today, {getAppNameFull()} is the go-to platform for families looking to unlock their children's potential and create lasting memories.
              </p>
            </div>
          </motion.div>

          {/* Our Mission */}
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Our Mission</h2>
            <div className="bg-primary/5 rounded-2xl p-8 border-l-4 border-primary">
              <p className="text-xl italic text-gray-700 leading-relaxed">
                "To enrich children's lives by connecting families with diverse, high-quality experiences that inspire learning, creativity, and joy."
              </p>
            </div>
          </motion.div>

          {/* What We Offer */}
          <motion.div variants={itemVariants} className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">What We Offer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex">
                <div className="mr-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <FiCalendar size={22} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-gray-900">Diverse Events</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">From educational workshops to outdoor adventures, we curate a wide range of programs for all interests.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex">
                <div className="mr-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <FiMapPin size={22} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-gray-900">Easy Discovery</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Find events near you with advanced filtering by city, date, age group, and category.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex">
                <div className="mr-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <FiAward size={22} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-gray-900">Quality Assurance</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">We carefully vet all providers and collect authentic reviews to ensure safe, top-quality experiences.</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex">
                <div className="mr-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <FiHeart size={22} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1 text-gray-900">Seamless Booking</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Book securely in just a few clicks with instant confirmations and straightforward management.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Impact Stats */}
          <motion.div variants={itemVariants} className="mb-20">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Our Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">{getStatsEventVendors()}</div>
                <div className="text-gray-500 text-xs sm:text-sm font-medium">Event Vendors</div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">{getStatsMonthlyBookings()}</div>
                <div className="text-gray-500 text-xs sm:text-sm font-medium">Monthly Bookings</div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">{getStatsHappyFamilies()}</div>
                <div className="text-gray-500 text-xs sm:text-sm font-medium">Happy Families</div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">{getStatsActivities()}</div>
                <div className="text-gray-500 text-xs sm:text-sm font-medium">Activities</div>
              </div>
            </div>
          </motion.div>

          {/* ── FAQ SECTION (REPLACES HOMEPAGE FAQS WITH FULL FAQ DIRECTORY) ── */}
          <motion.div variants={itemVariants} className="mb-20 pt-10 border-t border-gray-200" id="faqs">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-3">
                <FaQuestionCircle className="w-7 h-7" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto mt-2 text-sm sm:text-base">
                Find answers to common questions about Kidrove activities, bookings, payments, and safety.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-8 max-w-xl mx-auto">
              <input
                type="text"
                placeholder="Search for questions or answers..."
                className="w-full py-3.5 pl-12 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm bg-white"
                value={faqSearch}
                onChange={e => setFaqSearch(e.target.value)}
              />
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            </div>

            {/* Category Pills (shown when not searching) */}
            {!faqSearch && faqCategories.length > 1 && (
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {faqCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => setFaqActiveCategory(category)}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                      faqActiveCategory === category
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {/* Accordion List */}
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100 p-8">
                <p className="text-base font-semibold text-gray-700">No matching questions found</p>
                <p className="text-xs text-gray-400 mt-1">Try another search keyword or select a different category above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFaqs.map((faq, idx) => {
                  const faqId = faq.id || idx;
                  const isExpanded = expandedFaqs.includes(faqId);
                  return (
                    <div
                      key={faqId}
                      className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all overflow-hidden shadow-sm"
                    >
                      <button
                        onClick={() => toggleFaq(faqId)}
                        className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-gray-50/50"
                        aria-expanded={isExpanded}
                      >
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 pr-6">
                          {faq.question}
                        </h3>
                        <span className="flex-shrink-0 text-primary">
                          {isExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 text-sm sm:text-base text-gray-650 leading-relaxed border-t border-gray-100 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Join Us CTA */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="rounded-3xl shadow-lg p-8 sm:p-10 bg-secondary text-white">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Join Our Community</h2>
              <p className="text-base sm:text-lg mb-6 text-white/90 max-w-xl mx-auto">
                Discover amazing events for your children or become a vendor and share your experiences with families.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/search"
                  className="px-6 py-3 font-bold rounded-xl transition-all bg-white text-secondary hover:bg-gray-100 shadow-md"
                >
                  Browse Events
                </Link>
                <Link
                  to="/partner-with-us"
                  className="px-6 py-3 font-bold rounded-xl transition-all border border-white/40 bg-white/10 text-white hover:bg-white/20"
                >
                  Become a Vendor
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default AboutPage;
