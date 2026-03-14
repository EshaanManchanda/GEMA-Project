import React from 'react';
import { FaStar, FaCalendarCheck, FaAward, FaCertificate } from 'react-icons/fa';
import { NumberCounter, ScrollReveal, StaggerContainer } from '@/components/animations';

interface TrustSignalsProps {
  stats?: {
    averageRating?: number;
    totalReviews?: number;
    totalBookings?: number;
  };
  trustSignals?: {
    yearsInBusiness: number;
    certifications?: string[];
    awards?: string[];
  };
}

const TrustSignals: React.FC<TrustSignalsProps> = ({ stats, trustSignals }) => {
  // Default values if not provided (read from env)
  const yearsInBusiness = trustSignals?.yearsInBusiness ||
    Number(import.meta.env.VITE_STATS_YEARS_IN_BUSINESS) || 7;
  const averageRating = stats?.averageRating ||
    Number(import.meta.env.VITE_STATS_AVERAGE_RATING) || 4.8;
  const totalReviews = stats?.totalReviews ||
    Number(import.meta.env.VITE_STATS_TOTAL_REVIEWS) || 10000;
  const totalBookings = stats?.totalBookings ||
    Number(import.meta.env.VITE_STATS_TOTAL_BOOKINGS) || 50000;

  const signals = [
    {
      icon: <FaCalendarCheck className="w-8 h-8" />,
      value: yearsInBusiness,
      suffix: '+',
      label: 'Years Serving Families',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: <FaStar className="w-8 h-8" />,
      value: averageRating,
      suffix: '/5',
      label: 'Average Rating',
      color: 'from-yellow-500 to-orange-500',
      microdata: {
        itemScope: true,
        itemType: 'https://schema.org/AggregateRating',
        props: {
          ratingValue: averageRating,
          reviewCount: totalReviews,
          bestRating: 5,
          worstRating: 1
        }
      }
    },
    {
      icon: <FaAward className="w-8 h-8" />,
      value: totalBookings,
      suffix: '+',
      label: 'Happy Bookings',
      color: 'from-green-500 to-emerald-600',
      shouldAnimate: true
    },
    {
      icon: <FaCertificate className="w-8 h-8" />,
      value: totalReviews,
      suffix: '+',
      label: 'Customer Reviews',
      color: 'from-purple-500 to-pink-600',
      shouldAnimate: true
    }
  ];

  return (
    <section className="py-12 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-screen-xl mx-auto px-6">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900">
            Trusted by Families Across UAE
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Join thousands of families who trust us to create amazing memories for their children
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {signals.map((signal, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                {...(signal.microdata?.itemScope && {
                  itemScope: signal.microdata.itemScope,
                  itemType: signal.microdata.itemType
                })}
              >
                {signal.microdata?.props && (
                  <>
                    <meta itemProp="ratingValue" content={signal.microdata.props.ratingValue.toString()} />
                    <meta itemProp="reviewCount" content={signal.microdata.props.reviewCount.toString()} />
                    <meta itemProp="bestRating" content={signal.microdata.props.bestRating.toString()} />
                    <meta itemProp="worstRating" content={signal.microdata.props.worstRating.toString()} />
                  </>
                )}

                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${signal.color} text-white mb-4`}>
                  {signal.icon}
                </div>

                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {signal.shouldAnimate ? (
                    <>
                      <NumberCounter to={signal.value} duration={2} />
                      {signal.suffix}
                    </>
                  ) : (
                    `${signal.value}${signal.suffix}`
                  )}
                </div>

                <div className="text-sm md:text-base text-gray-600">
                  {signal.label}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </StaggerContainer>

        {/* Additional certifications/awards if provided */}
        {(trustSignals?.certifications && trustSignals.certifications.length > 0) ||
         (trustSignals?.awards && trustSignals.awards.length > 0) ? (
          <ScrollReveal delay={0.4}>
            <div className="mt-12 text-center">
              <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                {trustSignals.certifications?.map((cert, i) => (
                  <span key={`cert-${i}`} className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                    <FaCertificate className="text-blue-600" />
                    {cert}
                  </span>
                ))}
                {trustSignals.awards?.map((award, i) => (
                  <span key={`award-${i}`} className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full">
                    <FaAward className="text-yellow-600" />
                    {award}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        ) : null}
      </div>
    </section>
  );
};

export default TrustSignals;
