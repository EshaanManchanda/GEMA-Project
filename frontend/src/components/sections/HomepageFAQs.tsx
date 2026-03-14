import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaQuestionCircle } from 'react-icons/fa';
import { ScrollReveal, StaggerContainer } from '@/components/animations';

interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

interface HomepageFAQsProps {
  faqItems?: FAQItem[];
}

const HomepageFAQs: React.FC<HomepageFAQsProps> = ({ faqItems }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  // Default FAQs if none provided
  const defaultFAQs: FAQItem[] = [
    {
      question: 'What is Kidrove?',
      answer: 'Kidrove is UAE\'s premier platform connecting families with over 2,500 curated kids activities and events. Since 2017, we\'ve helped 50,000+ families discover safe, educational, and entertaining experiences for children of all ages across Dubai, Abu Dhabi, and the UAE. Every activity is vetted by our expert team to ensure quality and safety.',
      category: 'General'
    },
    {
      question: 'How do you ensure activity quality and safety?',
      answer: 'Every activity on Kidrove goes through a rigorous 5-step verification process: (1) Vendor background check, (2) Facility inspection, (3) Safety protocol review, (4) Insurance verification, and (5) Customer review monitoring. We only work with licensed, insured vendors who meet our strict quality standards.',
      category: 'Safety'
    },
    {
      question: 'What types of activities can I find?',
      answer: 'We offer 20+ categories including birthday parties, summer camps, after-school programs, sports activities, art & crafts, STEM workshops, swimming lessons, language classes, dance classes, indoor playgrounds, outdoor adventures, and educational programs for ages 0-16.',
      category: 'General'
    },
    {
      question: 'How does the booking process work?',
      answer: 'Booking is simple! Browse activities, select your preferred date and time slot, add to cart, and checkout securely. You\'ll receive instant confirmation via email with a digital ticket or QR code. No waiting, no hassle. You can manage bookings from your dashboard and make changes if needed.',
      category: 'Booking'
    },
    {
      question: 'Is my payment information secure?',
      answer: 'Absolutely! We use industry-standard SSL encryption and partner with Stripe for secure payment processing. We never store your full credit card details. All transactions are PCI-DSS compliant, ensuring your financial information is protected.',
      category: 'Payment'
    },
    {
      question: 'What is your cancellation policy?',
      answer: 'Cancellation policies vary by vendor and activity. Most allow free cancellation up to 24-48 hours before the event. Check the specific activity\'s cancellation policy before booking. Eligible cancellations receive full refunds within 5-7 business days.',
      category: 'Booking'
    },
    {
      question: 'Do you offer activities for all age groups?',
      answer: 'Yes! We have activities for children from newborns to teenagers (0-16 years). Use our age filter to find age-appropriate activities. Each listing clearly states the recommended age range to help you choose the perfect fit for your child.',
      category: 'General'
    },
    {
      question: 'How can vendors list their activities?',
      answer: 'Vendors can apply through our Vendor Portal. We review applications, conduct background checks, and verify certifications before approval. Once approved, vendors can create and manage activity listings, track bookings, and receive payments through Stripe Connect.',
      category: 'Vendors'
    }
  ];

  const displayFAQs = faqItems && faqItems.length > 0 ? faqItems : defaultFAQs;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4">
              <FaQuestionCircle className="w-8 h-8" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about finding and booking kids activities on our platform
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="space-y-4">
          {displayFAQs.map((faq, index) => (
            <ScrollReveal key={index} delay={index * 0.05}>
              <div className="bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-100 transition-colors duration-200"
                  aria-expanded={openIndex === index}
                >
                  <h3 className="text-lg font-semibold text-gray-900 pr-8">
                    {faq.question}
                  </h3>
                  <span className="flex-shrink-0 text-blue-600">
                    {openIndex === index ? (
                      <FaChevronUp className="w-5 h-5" />
                    ) : (
                      <FaChevronDown className="w-5 h-5" />
                    )}
                  </span>
                </button>

                <div
                  className={`transition-all duration-300 ease-in-out ${
                    openIndex === index
                      ? 'max-h-96 opacity-100'
                      : 'max-h-0 opacity-0'
                  } overflow-hidden`}
                >
                  <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </StaggerContainer>

        {/* CTA */}
        <ScrollReveal delay={0.4}>
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Contact Support
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default HomepageFAQs;
