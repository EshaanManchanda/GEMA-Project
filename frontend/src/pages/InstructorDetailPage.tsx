import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Users, Award, CheckCircle, HelpCircle, BookOpen, Layers } from 'lucide-react';
import { instructors } from '@/data/instructors';
import { SlideIn, FadeIn } from '@/components/animations';

const InstructorDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const instructor = instructors.find(i => i.id === id);

    if (!instructor) {
        return <Navigate to="/404" replace />;
    }

    const getAssetPath = (filename?: string, fallback: string = instructor.image) => {
        if (!filename) return fallback;
        if (filename.startsWith('/') || filename.startsWith('http')) return filename;
        return `/assets/images/placeholder/${filename}`;
    };

    // Helper to get color classes based on instructor color
    // This assumes instructor.color is a tailwind gradient string "from-color-500/80"
    // We'll try to extract the primary color name.
    const primaryColor = instructor.color.replace('from-', '').replace('-500/80', '');
    const buttonGradient = `bg-gradient-to-r from-${primaryColor}-500 to-${primaryColor}-600`;

    const { website_landing_page_content: richContent } = instructor;

    return (
        <div className="min-h-screen bg-white pb-20 md:pb-0 font-sans">
            {/* --- HERO SECTION --- */}
            <div className="relative h-[60vh] min-h-[500px] overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={getAssetPath(richContent?.hero_section.visual_asset.file_name)}
                        alt={richContent?.hero_section.visual_asset.description || instructor.name}
                        className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-center">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                        <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors">
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back to Instructors
                        </Link>

                        <SlideIn direction="up">
                            {richContent ? (
                                <>
                                    <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 max-w-3xl leading-tight">
                                        {richContent.hero_section.headline}
                                    </h1>
                                    <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl font-light">
                                        {richContent.hero_section.sub_headline}
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button className={`${buttonGradient} text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all`}>
                                            {richContent.hero_section.cta_button}
                                        </button>
                                        {richContent.hero_section.hosted_by && (
                                            <div className="flex items-center text-white/90 bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full">
                                                <Users className="w-5 h-5 mr-3" />
                                                <span>{richContent.hero_section.hosted_by}</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                // Fallback Generic Hero
                                <>
                                    <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-2">
                                        {instructor.name}
                                    </h1>
                                    <p className="text-xl text-gray-200 mb-6">{instructor.personal_info?.title || instructor.workshop}</p>
                                </>
                            )}
                        </SlideIn>
                    </div>
                </div>
            </div>

            {/* --- INTRODUCTION SECTION --- */}
            {richContent?.introduction_section && (
                <section className="py-16 md:py-24 max-w-4xl mx-auto px-4 text-center">
                    <FadeIn>
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">{richContent.introduction_section.heading}</h2>
                        <p className="text-xl text-gray-600 leading-relaxed">
                            {richContent.introduction_section.body_text}
                        </p>
                    </FadeIn>
                </section>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 mb-5 gap-12">

                    {/* LEFT COLUMN: Main Content */}
                    <div className="lg:col-span-2 space-y-16">

                        {/* --- CURRICULUM / PROGRAMS / WORKSHOP --- */}
                        {/* 1. Standard Curriculum (Music) */}
                        {richContent?.curriculum_section && (
                            <section>
                                <div className="flex items-center mb-8">
                                    <div className={`p-3 rounded-xl bg-orange-100 text-orange-600 mr-4`}>
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">{richContent.curriculum_section.heading}</h2>
                                </div>
                                <div className="grid gap-6">
                                    {richContent.curriculum_section.modules.map((mod, idx) => (
                                        <div key={idx} className="bg-orange-50 rounded-xl p-6 border border-orange-100 flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center font-bold text-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 mb-2">{mod.title}</h3>
                                                <p className="text-gray-700">{mod.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 2. Programs (Robotics) */}
                        {richContent?.programs_section && (
                            <section>
                                <div className="flex items-center mb-8">
                                    <div className={`p-3 rounded-xl bg-blue-100 text-blue-600 mr-4`}>
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">{richContent.programs_section.heading}</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {richContent.programs_section.programs.map((prog, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                            <div className="bg-blue-50 text-blue-800 text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full w-fit mb-4">
                                                {prog.focus}
                                            </div>
                                            <h3 className="font-bold text-xl text-gray-900 mb-3">{prog.name}</h3>
                                            <p className="text-gray-600 mb-4 text-sm leading-relaxed">{prog.details}</p>
                                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                                                <span className="font-semibold">Themes:</span> {prog.themes}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 3. Workshop Experience (Soap) */}
                        {richContent?.workshop_experience_section && (
                            <section>
                                <div className="flex items-center mb-8">
                                    <div className={`p-3 rounded-xl bg-green-100 text-green-600 mr-4`}>
                                        <Star className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900">{richContent.workshop_experience_section.heading}</h2>
                                </div>
                                <p className="text-lg text-gray-600 mb-8">{richContent.workshop_experience_section.description}</p>

                                <div className="grid md:grid-cols-2 gap-6 mb-8">
                                    {richContent.workshop_experience_section.learning_outcomes.map((outcome, idx) => (
                                        <div key={idx} className="bg-green-50 rounded-xl p-5 border border-green-100">
                                            <h4 className="font-bold text-green-900 mb-2">{outcome.role}</h4>
                                            <p className="text-green-800 text-sm">{outcome.activity}</p>
                                        </div>
                                    ))}
                                </div>

                                {richContent.workshop_experience_section.visual_assets_gallery && (
                                    <div className="grid grid-cols-3 gap-4 mt-8">
                                        {richContent.workshop_experience_section.visual_assets_gallery.map((img, idx) => (
                                            <div key={idx} className="aspect-video bg-gray-200 rounded-lg overflow-hidden relative group">
                                                <img
                                                    src={getAssetPath(img.file_name)}
                                                    alt={img.description}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                    <p className="text-white text-xs font-medium">{img.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* --- FALLBACK: Standard Class Offerings (if no rich curriculum/programs) --- */}
                        {!richContent?.curriculum_section && !richContent?.programs_section && !richContent?.workshop_experience_section && instructor.class_offerings && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Class Offerings</h2>
                                <div className="grid gap-6">
                                    {instructor.class_offerings.map((cls, idx) => (
                                        <div key={idx} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-gray-900">{cls.course_name}</h3>
                                                <div className="font-bold text-indigo-600">AED {cls.price_aed}</div>
                                            </div>
                                            <div className="text-sm text-gray-500 mb-4">{cls.target_age} • {cls.duration}</div>
                                            {cls.syllabus_highlights && (
                                                <ul className="text-sm text-gray-600 space-y-1">
                                                    {cls.syllabus_highlights.map((h, i) => (
                                                        <li key={i} className="flex items-center">
                                                            <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                                                            {h}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}



                    </div>

                    {/* RIGHT COLUMN: Sidebar (Sticky) */}
                    <div className="lg:col-span-1 space-y-8 relative">

                        <div className="lg:sticky lg:top-8 space-y-8">

                            {/* --- BOOKING / LOGISTICS --- */}
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all hover:shadow-2xl">
                                <div className="bg-gray-900 p-6 text-white text-center">
                                    <h3 className="text-xl font-bold">Ready to Start?</h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        {richContent?.booking_section?.details.age_requirement || "Check available slots"}
                                    </p>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="flex items-start">
                                        <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</div>
                                            <div className="text-sm text-gray-700 font-medium">
                                                {richContent?.booking_section?.details.location || instructor.location}
                                            </div>
                                        </div>
                                    </div>

                                    {richContent?.logistics_section?.who && (
                                        <div className="flex items-start">
                                            <Users className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Who is this for?</div>
                                                <div className="text-sm text-gray-700">
                                                    {richContent.logistics_section.who}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {richContent?.logistics_section && (
                                        <div className="flex items-start">
                                            <CheckCircle className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Requirements</div>
                                                <div className="text-sm text-gray-700">
                                                    {richContent.logistics_section.requirements}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {richContent?.booking_section?.details.whats_included && (
                                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Star className="w-4 h-4 text-green-600" />
                                                <span className="text-xs font-bold text-green-700 uppercase">Included</span>
                                            </div>
                                            <p className="text-xs text-green-800 leading-snug">
                                                {richContent.booking_section.details.whats_included}
                                            </p>
                                        </div>
                                    )}

                                    <div className="py-4 border-t border-gray-100">
                                        {/* Display Price Estimate if available */}
                                        {instructor.class_offerings?.[0]?.price_estimate ? (
                                            <div className="mb-4 text-center">
                                                <div className="text-sm text-gray-500 mb-1">Starting from</div>
                                                <div className="text-2xl font-bold text-gray-900">{instructor.class_offerings[0].price_estimate}</div>
                                            </div>
                                        ) : (
                                            instructor.class_offerings?.[0]?.price_aed && (
                                                <div className="mb-4 text-center">
                                                    <div className="text-sm text-gray-500 mb-1">Course Fee</div>
                                                    <div className="text-2xl font-bold text-gray-900">AED {instructor.class_offerings[0].price_aed}</div>
                                                    {instructor.class_offerings[0].pricing_unit && <div className="text-xs text-gray-400">{instructor.class_offerings[0].pricing_unit}</div>}
                                                </div>
                                            )
                                        )}

                                        <button className="w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center">
                                            {richContent?.booking_section?.cta_button || "Book Now"}
                                        </button>
                                        {instructor.personal_info?.contact_email && (
                                            <div className="text-center mt-3">
                                                <a href={`mailto:${instructor.personal_info.contact_email}`} className="text-sm text-gray-500 hover:text-gray-900 underline decoration-gray-300 underline-offset-2">
                                                    Or contact {instructor.name.split(' ')[0]} directly
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* --- STUDIO HIGHLIGHTS (Small) --- */}
                            {richContent?.studio_experience_section && (
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                        <Award className="w-4 h-4 mr-2 text-gray-500" />
                                        Studio Experience
                                    </h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {richContent.studio_experience_section.details}
                                    </p>
                                </div>
                            )}

                        </div>
                    </div>

                </div>
                {/* --- INSTRUCTOR BIO --- */}
                <section className="bg-white rounded-3xl overflow-hidden shadow-xl border mb-5 border-gray-100">
                    <div className="md:flex h-full">
                        <div className="md:w-5/12 bg-gray-200 relative min-h-[400px] md:min-h-full">
                            <img
                                src={instructor.image}
                                alt={instructor.name}
                                className="w-full h-full object-cover object-top absolute inset-0"
                            />
                        </div>
                        <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
                            {richContent?.instructor_section ? (
                                <>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{richContent.instructor_section.heading}</h2>
                                    {richContent.instructor_section.quote && (
                                        <blockquote className="text-xl italic text-gray-600 mb-6 border-l-4 border-gray-300 pl-4 py-1">
                                            "{richContent.instructor_section.quote}"
                                        </blockquote>
                                    )}
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        {richContent.instructor_section.bio_text}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Meet {instructor.name}</h2>
                                    {instructor.professional_bio && <p className="text-gray-600 leading-relaxed mb-6">{instructor.professional_bio.summary}</p>}
                                </>
                            )}

                            {instructor.professional_bio?.certifications && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {instructor.professional_bio.certifications.map((cert, idx) => (
                                        <span key={idx} className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200">
                                            {cert}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {instructor.professional_bio?.teaching_philosophy && (
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Teaching Philosophy</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="font-bold text-gray-700 block text-xs uppercase mb-1">Core Belief</span>
                                            <p className="text-sm text-gray-600 italic">"{instructor.professional_bio.teaching_philosophy.core_belief}"</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="font-bold text-gray-700 block text-xs uppercase mb-1">Style</span>
                                                <p className="text-sm text-gray-600">{instructor.professional_bio.teaching_philosophy.style}</p>
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-700 block text-xs uppercase mb-1">Methodology</span>
                                                <p className="text-sm text-gray-600">{instructor.professional_bio.teaching_philosophy.methodology}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* --- TESTIMONIALS --- */}
                {instructor.testimonials && (
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What Students & Parents Say</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            {instructor.testimonials.map((t, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-2xl p-8 relative">
                                    <div className="text-6xl text-gray-200 absolute top-4 left-4 font-serif leading-none">"</div>
                                    <p className="relative z-10 text-gray-700 italic mb-6 text-lg">
                                        {t.quote || t.parent_quote}
                                    </p>
                                    <div className="flex items-center relative z-10">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold mr-3 shadow-md">
                                            {t.student_name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{t.student_name}</div>
                                            <div className="text-xs text-gray-500">{t.age ? `${t.age} years old` : 'Parent'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>


            {/* --- FAQ SECTION (Full Width) --- */}
            {instructor.faq && (
                <section className="bg-gray-50 py-16">
                    <div className="max-w-4xl mx-auto px-4">
                        <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Common Questions</h2>
                        <div className="space-y-4">
                            {Array.from({ length: Object.keys(instructor.faq || {}).length / 2 }).map((_, i) => {
                                const qKey = `q${i + 1}`;
                                const aKey = `a${i + 1}`;
                                const question = instructor.faq?.[qKey];
                                const answer = instructor.faq?.[aKey];
                                if (!question || !answer) return null;
                                return (
                                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                        <h3 className="font-bold text-gray-900 mb-2 flex">
                                            <HelpCircle className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                                            {question}
                                        </h3>
                                        <p className="text-gray-600 pl-8">{answer}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

        </div>
    );
};

export default InstructorDetailPage;
