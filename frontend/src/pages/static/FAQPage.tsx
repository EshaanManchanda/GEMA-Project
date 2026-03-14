import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';
import SEO from '@/components/common/SEO';
import { getAppNameFull } from '../../utils/brandConfig';
import { useQuery } from '@tanstack/react-query';
import seoContentAPI from '@/services/api/seoContentAPI';

const FAQPage: React.FC = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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

  const { data: seoContentData } = useQuery({
    queryKey: ['seo-content', 'faq'],
    queryFn: () => seoContentAPI.getPublicSEOContent('faq'),
    staleTime: 5 * 60 * 1000
  });



  // Group fetched FAQs by category to match the layout
  const dynamicFaqData = React.useMemo(() => {
    const rawFaqs = seoContentData?.seoContent?.faqItems;
    if (!rawFaqs || rawFaqs.length === 0) return [];

    const grouped: Record<string, any[]> = {};
    rawFaqs.forEach((item, index) => {
      const cat = item.category?.trim() || 'General';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push({
        id: index + 100, // arbitrary offset for uniqueness
        question: item.question,
        answer: item.answer
      });
    });

    return Object.entries(grouped).map(([category, questions]) => ({
      category,
      questions
    }));
  }, [seoContentData]);

  const categories = dynamicFaqData.map(f => f.category);

  // State for active category and search
  const [activeCategory, setActiveCategory] = useState('General');

  // Sync category once data returns
  React.useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Toggle question expansion
  const toggleQuestion = (id: number) => {
    setExpandedQuestions(prev =>
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  // Filter questions based on search and category
  const filteredFAQs = dynamicFaqData
    .filter(category => searchQuery ? true : category.category === activeCategory)
    .flatMap(category => category.questions)
    .filter(question =>
      searchQuery ?
        question.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        question.answer.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'FAQ', url: '/faq' }
  ];

  // Generate FAQ structured data
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: dynamicFaqData.flatMap((category: any) =>
      category.questions.map((faq: any) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    )
  };

  return (
    <>
      <SEO
        title={`FAQ - Frequently Asked Questions | ${getAppNameFull()}`}
        description={`Find answers to common questions about ${getAppNameFull()}, kids activities booking, payments, cancellations, and more. Get quick help and support for your queries.`}
        keywords={['faq', 'frequently asked questions', 'gema events help', 'kids activities questions', 'booking help', 'support']}
        breadcrumbs={breadcrumbs}
        structuredData={faqStructuredData}
      />
      <div className="container mx-auto px-4 py-12">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">Frequently Asked Questions</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">Find answers to common questions about {getAppNameFull()}. If you can't find what you're looking for, please contact our support team.</p>
          </motion.div>

          {/* Search Bar */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for questions..."
                className="w-full p-4 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={searchQuery}
                onChange={handleSearch}
              />
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
            </div>
          </motion.div>

          {/* Category Tabs - Only show when not searching */}
          {!searchQuery && (
            <motion.div variants={itemVariants} className="mb-8">
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === category ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    onClick={() => handleCategoryChange(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* FAQ Accordion */}
          <motion.div variants={itemVariants} className="space-y-4">
            {searchQuery && filteredFAQs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No results found for "{searchQuery}". Please try a different search term.</p>
              </div>
            ) : (
              filteredFAQs.map(faq => (
                <div key={faq.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    className="w-full p-6 text-left flex justify-between items-center focus:outline-none"
                    onClick={() => toggleQuestion(faq.id)}
                  >
                    <h3 className="text-lg font-semibold text-gray-800">{faq.question}</h3>
                    {expandedQuestions.includes(faq.id) ? (
                      <FiChevronUp className="text-gray-600 text-xl flex-shrink-0" />
                    ) : (
                      <FiChevronDown className="text-gray-600 text-xl flex-shrink-0" />
                    )}
                  </button>
                  {expandedQuestions.includes(faq.id) && (
                    <div className="px-6 pb-6">
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-gray-600">{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </motion.div>

          {/* Contact Support */}
          <motion.div variants={itemVariants} className="mt-12 bg-primary-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Still have questions?</h2>
            <p className="text-gray-600 mb-6">Our support team is here to help you with any questions or concerns.</p>
            <a
              href="/contact"
              className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Contact Support
            </a>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default FAQPage;
