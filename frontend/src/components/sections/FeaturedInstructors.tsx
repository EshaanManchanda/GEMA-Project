import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SlideIn } from '@/components/animations';
import { instructors } from '@/data/instructors';



const FeaturedInstructors: React.FC = () => {
    const navigate = useNavigate();

    return (
        <section className="py-10 sm:py-16 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8 sm:mb-12">
                    <SlideIn direction="down">
                        <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Meet Our Inspiring Instructors
                        </h2>
                        <p className="text-sm sm:text-xl text-gray-600 max-w-2xl mx-auto">
                            Learn from passionate experts who are eager to share their craft with your children.
                        </p>
                    </SlideIn>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                    {instructors.map((instructor, index) => (
                        <SlideIn key={instructor.id} direction="up" delay={index * 0.1}>
                            <motion.div
                                whileHover={{ y: -10, scale: 1.02 }}
                                className="relative group cursor-pointer rounded-2xl overflow-hidden aspect-[4/5] shadow-lg"
                                onClick={() => navigate(`/instructors/${instructor.id}`)}
                            >
                                {/* Background Image */}
                                <div className="absolute inset-0 bg-gray-200">
                                    <img
                                        src={instructor.image}
                                        alt={instructor.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />
                                    {/* Gradient Overlay */}
                                    <div className={`absolute inset-0 bg-gradient-to-t ${instructor.color} to-transparent opacity-60 transition-opacity duration-300`} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                                </div>

                                {/* Content */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform transition-transform duration-300">
                                    <h3 className="text-sm sm:text-lg font-bold leading-tight mb-1">{instructor.name}</h3>
                                    <p className="text-sm font-medium opacity-90 mb-1">
                                        {instructor.personal_info?.title || instructor.workshop}
                                    </p>
                                    <div className="flex items-center text-xs opacity-80">
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                        {instructor.location}
                                    </div>
                                </div>
                            </motion.div>
                        </SlideIn>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <SlideIn direction="up" delay={0.6}>
                        <button
                            onClick={() => navigate('/teachers')}
                            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                        >
                            View All Teachers
                        </button>
                    </SlideIn>
                </div>
            </div>
        </section>
    );
};

export default FeaturedInstructors;
