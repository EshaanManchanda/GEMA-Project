import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FiGlobe,
  FiTrendingUp,
  FiHeart,
  FiDollarSign,
  FiBookOpen,
  FiStar,
  FiTarget,
  FiCalendar,
  FiMapPin,
  FiAward,
} from 'react-icons/fi';
import SEO from '@/components/common/SEO';
import useAuth from '@/hooks/useAuth';
import {
  getStatsEventVendors,
  getStatsMonthlyBookings,
  getStatsHappyFamilies,
  getStatsActivities,
} from '../../utils/brandConfig';

const FOR_ORGANIZATIONS_PATH = '/for-organizations';

const ForOrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleApplyOrganization = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(FOR_ORGANIZATIONS_PATH)}`);
      return;
    }

    navigate('/organizations');
  };

  const handleApplyIndividual = () => {
    if (!isAuthenticated || user?.role === 'vendor') {
      navigate('/register');
      return;
    }

    if (user?.role === 'customer') {
      navigate('/teach/register');
      return;
    }

    navigate('/register');
  };

  const whyKidRoveItems = [
    {
      title: 'Global Reach',
      description:
        'Reach families across cities and countries through a trusted platform built for discovery and enrollment.',
      icon: FiGlobe,
    },
    {
      title: 'Rapid Growth',
      description:
        'Tap into growing demand for online and hybrid learning programs with streamlined onboarding and visibility.',
      icon: FiTrendingUp,
    },
    {
      title: 'Real Impact',
      description:
        'Create meaningful learning experiences for children through classes that inspire curiosity and confidence.',
      icon: FiHeart,
    },
    {
      title: 'Competitive Earnings',
      description:
        'Build sustainable revenue with flexible program formats, repeat enrollments, and transparent payouts.',
      icon: FiDollarSign,
    },
  ];

  return (
    <>
      <SEO
        title="KidRove for Organizations | Teach and Grow Your Program"
        description="Bring your organization to KidRove. Teach online, reach more families, and grow with a trusted platform for kids learning experiences."
        keywords={[
          'kidrove for organizations',
          'teach on kidrove',
          'organization classes for kids',
          'online classes for children',
          'kid learning platform',
        ]}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'For Organizations', url: '/for-organizations' },
        ]}
      />

      <div className="bg-gray-50">
        <section className="relative overflow-hidden border-b border-primary-100 bg-gradient-to-br from-primary-100 via-sky-100 to-sky-50">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <FiBookOpen className="absolute left-8 top-16 h-16 w-16 text-primary-900" />
            <FiStar className="absolute right-20 top-12 h-12 w-12 text-primary-900" />
            <FiTarget className="absolute bottom-16 left-1/4 h-14 w-14 text-primary-900" />
            <FiBookOpen className="absolute bottom-10 right-1/3 h-12 w-12 text-primary-900" />
          </div>

          <div className="container mx-auto px-4 py-20 sm:py-24 lg:py-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-4xl text-center"
            >
              <p className="mb-4 text-base font-semibold uppercase tracking-wide text-primary-700 sm:text-lg">
                KidRove for Organizations
              </p>
              <h1 className="text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Open Your Doors to Kids Everywhere
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600 sm:text-xl">
                Launch and scale classes with KidRove. Bring your programs online, connect with families,
                and teach learners wherever they are.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={handleApplyOrganization}
                  className="w-full rounded-full bg-primary-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 sm:w-auto"
                >
                  Apply to Teach as an Organization
                </button>
                {user?.role !== 'teacher' && (
                  <button
                    type="button"
                    onClick={handleApplyIndividual}
                    className="w-full rounded-full border-2 border-primary-300 bg-white px-8 py-3 text-base font-semibold text-primary-700 transition-colors hover:border-primary-400 hover:bg-primary-50 sm:w-auto"
                  >
                    Apply to Teach as an Individual
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-5xl">
                Inspire learners with your programming, within their homes.
              </h2>
              <div className="mx-auto mt-8 max-w-6xl space-y-4 text-lg leading-relaxed text-gray-700">
                <p>
                  Educational organizations like yours, including theater programs, camps, museums,
                  and after-school teams, are looking for better ways to keep delivering value to
                  families from anywhere. KidRove helps you do exactly that.
                </p>
                <p>
                  Built for trusted learning experiences, KidRove supports organizations that want to
                  bring live classes and engaging programs to learners across regions through online
                  sessions. Even when in-person access is limited, your impact can keep growing.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-sky-50 py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl text-center">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">What is KidRove?</h2>
              <p className="mx-auto mt-6 max-w-4xl text-lg leading-relaxed text-gray-600">
                KidRove is a learning marketplace where teachers and organizations offer engaging classes
                for children ages 1 to 18. From one-time interest-based workshops to long-term courses,
                KidRove helps you reach families, manage enrollments, and deliver memorable learning experiences.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 text-center">
                Our Impact
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{getStatsEventVendors()}</div>
                  <div className="text-gray-600">Event Vendors</div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{getStatsMonthlyBookings()}</div>
                  <div className="text-gray-600">Monthly Bookings</div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{getStatsHappyFamilies()}</div>
                  <div className="text-gray-600">Happy Families</div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{getStatsActivities()}</div>
                  <div className="text-gray-600">Activities</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 text-center">
                What We Offer
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6 flex">
                  <div className="mr-4">
                    <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                      <FiCalendar size={24} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Diverse Programs</h3>
                    <p className="text-gray-600">
                      From educational workshops to creative and activity-based sessions, KidRove helps
                      organizations bring a broad range of experiences to learners.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 flex">
                  <div className="mr-4">
                    <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                      <FiMapPin size={24} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Easy Discovery</h3>
                    <p className="text-gray-600">
                      Families can find your programs quickly with filters by age, category, timing,
                      and learning goals.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 flex">
                  <div className="mr-4">
                    <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                      <FiAward size={24} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Quality Standards</h3>
                    <p className="text-gray-600">
                      Showcase high-quality teaching with trusted profiles, reviews, and clear program
                      outcomes for families.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 flex">
                  <div className="mr-4">
                    <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center text-primary">
                      <FiHeart size={24} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Seamless Booking</h3>
                    <p className="text-gray-600">
                      Enable easy enrollment, confirmations, and class management so your team can focus
                      on teaching and impact.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-neutral-100 py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">Why KidRove?</h2>

              <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
                {whyKidRoveItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.article
                      key={item.title}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.4, delay: index * 0.08 }}
                      className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm"
                    >
                      <div className="mb-4 inline-flex rounded-full bg-primary-50 p-3 text-primary-700">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{item.title}</h3>
                      <p className="mt-3 text-lg leading-relaxed text-gray-600">{item.description}</p>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ForOrganizationsPage;
