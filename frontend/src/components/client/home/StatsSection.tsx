import React from 'react';
import { FaStar } from 'react-icons/fa';
import { FadeIn, SlideIn, StaggerContainer, NumberCounter } from '@/components/animations';

interface StatsProps {
    stats: {
        totalEvents: number;
        totalVendors: number;
        totalVenues: number;
        totalClasses?: number;
        totalReviews?: number;
        totalBookings?: number;
        averageRating?: number;
    };
}

const StatsSection: React.FC<StatsProps> = ({ stats }) => {
    return (
        <section className="relative w-full py-16 px-6">
            {/* Background image with WebP support */}
            <picture className="absolute inset-0 -z-10">
                <source type="image/webp" srcSet="/assets/images/trust-with-kidrove.webp" />
                <img
                    src="/assets/images/trust-with-kidrove.png"
                    alt=""
                    className="w-full h-full object-cover object-bottom"
                    loading="lazy"
                    decoding="async"
                    aria-hidden="true"
                />
            </picture>

            <div className="max-w-6xl mx-auto">
                <StaggerContainer className="text-center mb-12">
                    <SlideIn direction="down">
                        <div className="inline-block mb-4 px-4 py-2 rounded-full bg-primary-50 text-primary-900">
                            <span className="font-semibold">Our Impact</span>
                        </div>
                    </SlideIn>
                    <FadeIn delay={0.1}>
                        <h2 className="text-3xl font-bold mb-4">Trusted by families across UAE</h2>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <p className="text-gray-700 max-w-2xl mx-auto">Helping parents discover and book the best activities for their children since 2017</p>
                    </FadeIn>
                </StaggerContainer>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Trusted Partners Card */}
                    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-300 border border-gray-100 hover:border-primary-100">
                        <div className="mb-4 text-primary-DEFAULT">
                            <div className="relative">
                                <FaStar size={36} />
                                <FaStar className="absolute -top-2 right-0 text-sm" size={16} />
                                <FaStar className="absolute -top-4 right-2 text-xs" size={12} />
                            </div>
                        </div>
                        <p className="text-xl font-semibold mb-2">
                            Trusted by over <span className="text-gray-900">
                                <NumberCounter to={stats?.totalVendors || 750} suffix="+" />
                            </span>
                        </p>
                        <p className="text-gray-700">partners since 2017</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-300 border border-gray-100 hover:border-gray-200">
                        <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center bg-primary-50 text-primary-DEFAULT">
                            <span className="text-xl font-bold">🎯</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mb-2">
                            <NumberCounter to={stats?.totalEvents || 2500} suffix="+" />
                        </p>
                        <p className="text-gray-700">Experiences</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-300 border border-gray-100 hover:border-gray-200">
                        <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center bg-primary-50 text-primary-DEFAULT">
                            <span className="text-xl font-bold">🏢</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mb-2">
                            <NumberCounter to={stats?.totalVenues || 500} suffix="+" />
                        </p>
                        <p className="text-gray-700">Venue & Events</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 flex flex-col items-center text-center transition-all duration-300 border border-gray-100 hover:border-gray-200">
                        <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center bg-primary-50 text-primary-DEFAULT">
                            <span className="text-xl font-bold">🎓</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mb-2">
                            <NumberCounter to={stats?.totalClasses || stats?.totalEvents || 1000} suffix="+" />
                        </p>
                        <p className="text-gray-700">Classes</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default StatsSection;
