import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Globe, Mail, Star, Users, Clock, Award, CheckCircle, HelpCircle } from 'lucide-react';
import { instructors } from '@/data/instructors';

const InstructorDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const instructor = instructors.find(i => i.id === id);

    if (!instructor) {
        return <Navigate to="/404" replace />;
    }

    // Determine primary color from instructor's color class or default to gray
    // We'll extract a color keyword to use for dynamic classes if possible, 
    // but for now we'll stick to a neutral/accent system or try to parse the color string.
    // simpler: use a reliable accent color or standard theme. Let's use standard theme with subtle colored accents.

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            {/* Hero Section */}
            <div className="bg-white shadow-sm overflow-hidden relative">
                <div className="relative h-[50vh] min-h-[400px] md:h-96">
                    {/* Background with overlay */}
                    <div className="absolute inset-0">
                        <img
                            src={instructor.image}
                            alt={instructor.name}
                            className="w-full h-full object-cover blur-[2px] opacity-40 transform scale-105"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent md:bg-gradient-to-r md:from-white/90 md:via-white/50 md:to-transparent`} />
                    </div>

                    <div className="absolute inset-0 flex flex-col">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full flex flex-col justify-between md:justify-center py-6 md:py-0">
                            {/* Navigation */}
                            <div className="pt-4 md:pt-8 md:absolute md:top-0 md:left-0 md:w-full md:px-8 z-20">
                                <Link to="/" className="inline-flex items-center text-white md:text-gray-700 hover:text-gray-200 md:hover:text-gray-900 px-4 py-2 rounded-full bg-black/20 md:bg-white/50 backdrop-blur-md transition-colors font-medium text-sm">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Home
                                </Link>
                            </div>

                            <div className="flex flex-col md:flex-row items-end md:items-center gap-6 md:gap-10 mt-auto md:mt-0 pb-8 md:pb-0">
                                {/* Profile Image */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative flex-shrink-0 mx-auto md:mx-0"
                                >
                                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white shadow-2xl overflow-hidden aspect-square block ring-4 ring-black/5">
                                        <img
                                            src={instructor.image}
                                            alt={instructor.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 bg-green-500 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg" title="Verified Instructor">
                                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                    </div>
                                </motion.div>

                                {/* Info Text */}
                                <div className="flex-1 text-center md:text-left text-white md:text-gray-900 z-10">
                                    <motion.h1
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-md md:drop-shadow-none"
                                    >
                                        {instructor.name}
                                    </motion.h1>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-lg md:text-xl text-gray-200 md:text-gray-700 font-medium mb-6 drop-shadow-sm md:drop-shadow-none max-w-2xl"
                                    >
                                        {instructor.personal_info?.title || instructor.workshop}
                                    </motion.p>

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex flex-wrap justify-center md:justify-start gap-3 text-sm"
                                    >
                                        <div className="flex items-center bg-black/30 md:bg-white/80 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm md:border md:border-gray-100 text-white md:text-gray-700">
                                            <MapPin className="w-4 h-4 mr-2 text-red-400 md:text-red-500" />
                                            {instructor.personal_info?.location || instructor.location}
                                        </div>
                                        {instructor.personal_info?.social_handle && (
                                            <div className="flex items-center bg-black/30 md:bg-white/80 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm md:border md:border-gray-100 text-white md:text-gray-700">
                                                <Globe className="w-4 h-4 mr-2 text-blue-400 md:text-blue-500" />
                                                {instructor.personal_info.social_handle}
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left/Main Column */}
                    <div className="lg:col-span-2 space-y-10">

                        {/* Bio Section */}
                        {instructor.professional_bio && (
                            <section>
                                <div className="flex items-center mb-6">
                                    <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                                        <Users className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900">About the Instructor</h2>
                                </div>
                                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 prose max-w-none text-gray-700 leading-relaxed">
                                    <p className="mb-8 text-lg">{instructor.professional_bio.summary}</p>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-100">
                                            <h3 className="font-bold text-indigo-900 mb-3 flex items-center">
                                                <Award className="w-5 h-5 mr-2" /> Certifications
                                            </h3>
                                            <ul className="space-y-3">
                                                {instructor.professional_bio.certifications.map((cert, idx) => (
                                                    <li key={idx} className="flex items-start text-indigo-800 text-sm font-medium">
                                                        <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 opacity-70" />
                                                        {cert}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-gradient-to-br from-rose-50 to-orange-50 p-5 rounded-xl border border-rose-100">
                                            <h3 className="font-bold text-rose-900 mb-3">Teaching Style</h3>
                                            <p className="text-rose-800 text-sm italic leading-relaxed">"{instructor.professional_bio.teaching_style}"</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Class Offerings */}
                        {instructor.class_offerings && (
                            <section>
                                <div className="flex items-center mb-6">
                                    <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                                        <Star className="w-6 h-6 text-yellow-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900">Classes & Workshops</h2>
                                </div>
                                <div className="space-y-6">
                                    {instructor.class_offerings.map((course, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-all group">
                                            <div className="p-6 md:p-8">
                                                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-4">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{course.course_name}</h3>
                                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                                            <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700 font-medium whitespace-nowrap">{course.target_age}</span>
                                                            <span className="flex items-center whitespace-nowrap"><Clock className="w-4 h-4 mr-1 text-gray-400" /> {course.duration}</span>
                                                        </div>
                                                    </div>
                                                    <div className="md:text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-lg">
                                                        <div className="text-2xl font-bold text-indigo-600">
                                                            AED {course.price_aed}
                                                        </div>
                                                        {course.pricing_unit && (
                                                            <div className="text-xs md:text-sm text-gray-500">{course.pricing_unit}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {course.focus && (
                                                    <div className="mb-5 bg-indigo-50/50 p-3 rounded-lg border-l-4 border-indigo-300">
                                                        <p className="text-indigo-900 text-sm font-medium italic">
                                                            Focus: {course.focus}
                                                        </p>
                                                    </div>
                                                )}

                                                {course.syllabus_highlights && (
                                                    <div className="mt-5 pt-5 border-t border-gray-100">
                                                        <h4 className="font-semibold text-gray-900 mb-3 text-xs uppercase tracking-wider text-opacity-70">Course Highlights</h4>
                                                        <div className="grid md:grid-cols-2 gap-3">
                                                            {course.syllabus_highlights.map((highlight, hIdx) => (
                                                                <div key={hIdx} className="flex items-start text-sm text-gray-600">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 mr-2.5 flex-shrink-0"></div>
                                                                    {highlight}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}


                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* FAQ - Fixed Duplication */}
                        {instructor.faq && (
                            <section>
                                <div className="flex items-center mb-6">
                                    <div className="p-2 bg-teal-100 rounded-lg mr-3">
                                        <HelpCircle className="w-6 h-6 text-teal-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
                                </div>
                                <div className="space-y-4">
                                    {Array.from({ length: Object.keys(instructor.faq || {}).length / 2 }).map((_, i) => {
                                        const qKey = `q${i + 1}`;
                                        const aKey = `a${i + 1}`;
                                        const question = instructor.faq?.[qKey];
                                        const answer = instructor.faq?.[aKey];

                                        if (!question || !answer) return null;

                                        return (
                                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                                <h3 className="font-bold text-gray-900 mb-3 flex items-start text-lg">
                                                    <span className="bg-teal-100 text-teal-700 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">Q</span>
                                                    {question}
                                                </h3>
                                                <div className="flex items-start text-gray-600 pl-10 leading-relaxed">
                                                    {answer}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right Column / Sidebar */}
                    <div className="space-y-8 lg:sticky lg:top-8 h-fit">
                        {/* Quick Stats Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Instructor Highlights</h3>
                            <div className="space-y-4">
                                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4 font-bold text-lg">
                                        {instructor.personal_info?.years_active || "5+"}
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Experience</div>
                                        <div className="font-medium text-gray-900">Years in Education</div>
                                    </div>
                                </div>
                                <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-4">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Languages</div>
                                        <div className="font-medium text-gray-900">{instructor.personal_info?.languages_spoken.join(", ")}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Studio Facilities - Moved to sidebar for better balance */}
                        {instructor.studio_facilities && (
                            <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-2xl p-6 text-white shadow-xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl transform -translate-y-1/2 translate-x-1/2"></div>

                                <div className="relative z-10">
                                    <h3 className="text-lg font-bold mb-4 text-indigo-100 flex items-center">
                                        <MapPin className="w-5 h-5 mr-2" />
                                        Facilities
                                    </h3>
                                    <h4 className="font-bold text-xl mb-4">{instructor.studio_facilities.type}</h4>
                                    <div className="space-y-3">
                                        {instructor.studio_facilities.amenities.map((amenity, idx) => (
                                            <div key={idx} className="flex items-start text-sm text-indigo-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 mr-2.5 flex-shrink-0"></div>
                                                <span>{amenity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Testimonials - Styled as cards */}
                        {instructor.testimonials && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900">Parent & Student Love</h3>
                                {instructor.testimonials.map((t, idx) => (
                                    <div key={idx} className="bg-orange-50/50 rounded-xl p-6 relative border border-orange-100">
                                        <div className="text-5xl text-orange-200 absolute top-2 left-4 font-serif leading-none select-none">"</div>
                                        <div className="relative z-10 pt-4">
                                            <p className="text-gray-800 italic mb-4 text-lg leading-snug">
                                                {t.quote || t.parent_quote}
                                            </p>
                                            <div className="flex items-center pt-2 border-t border-orange-200/50">
                                                <div className="w-8 h-8 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center font-bold text-xs mr-3">
                                                    {t.student_name[0]}
                                                </div>
                                                <div className="text-sm">
                                                    <div className="font-bold text-gray-900">{t.student_name}</div>
                                                    <div className="text-gray-500 text-xs text-opacity-80">
                                                        {t.age ? `${t.age} years old` : 'Parent'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Contact CTA */}
                        {instructor.personal_info?.contact_email && (
                            <div className="bg-gray-900 rounded-2xl p-6 text-center text-white shadow-xl">
                                <h3 className="font-bold text-lg mb-2">Have questions?</h3>
                                <p className="text-gray-400 text-sm mb-6">Contact {instructor.name.split(' ')[0]} directly.</p>
                                <a href={`mailto:${instructor.personal_info.contact_email}`} className="inline-flex items-center justify-center w-full py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                                    <Mail className="w-4 h-4 mr-2" />
                                    Send Email
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstructorDetailPage;
