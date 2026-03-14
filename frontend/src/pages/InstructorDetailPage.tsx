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
            <div className="relative h-[72vh] min-h-[600px] overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={getAssetPath(richContent?.hero_section.visual_asset.file_name)}
                        alt={richContent?.hero_section.visual_asset.description || instructor.name}
                        className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-[20s]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-center">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
                        <Link to="/" className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors group">
                            <div className="bg-white/10 p-2 rounded-full mr-3 group-hover:bg-white/20 transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </div>
                            <span className="font-medium tracking-wide">Back to Instructors</span>
                        </Link>

                        <SlideIn direction="up">
                            {richContent ? (
                                <>
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className={`bg-${primaryColor}-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg shadow-${primaryColor}-500/30`}>
                                            {instructor.personal_info?.title}
                                        </span>
                                        {instructor.personal_info?.years_active && (
                                            <span className="bg-white/10 backdrop-blur-md text-white px-4 py-1 rounded-full text-sm font-medium border border-white/20">
                                                {instructor.personal_info.years_active}+ Years Experience
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 max-w-4xl leading-tight tracking-tight drop-shadow-sm">
                                        {richContent.hero_section.headline}
                                    </h1>
                                    <p className="text-xl md:text-2xl text-gray-100 mb-10 max-w-2xl font-light leading-relaxed opacity-90">
                                        {richContent.hero_section.sub_headline}
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-5">
                                        <button className={`${buttonGradient} text-white px-10 py-4 rounded-full font-bold text-lg shadow-xl shadow-${primaryColor}-500/20 hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
                                            {richContent.hero_section.cta_button}
                                        </button>
                                        {richContent.hero_section.hosted_by && (
                                            <div className="flex items-center text-white/90 bg-black/30 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 hover:bg-black/40 transition-colors">
                                                <Users className="w-5 h-5 mr-3 text-orange-200" />
                                                <span className="font-medium tracking-wide">{richContent.hero_section.hosted_by}</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
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
                <section className="py-20 md:py-32 max-w-4xl mx-auto px-4 text-center relative">
                    <div className="absolute top-10 left-10 text-9xl text-gray-100 font-serif opacity-50 -z-10 rotate-12">"</div>
                    <FadeIn>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 tracking-tight">{richContent.introduction_section.heading}</h2>
                        <p className="text-xl md:text-2xl text-gray-600 leading-relaxed font-light">
                            {richContent.introduction_section.body_text}
                        </p>
                    </FadeIn>
                </section>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 mb-10 gap-16">

                    {/* LEFT COLUMN: Main Content */}
                    <div className="lg:col-span-2 space-y-20">

                        {/* --- CURRICULUM / PROGRAMS / WORKSHOP --- */}
                        {richContent?.curriculum_section && (
                            <section>
                                <div className="flex items-center mb-10">
                                    <div className={`p-4 rounded-2xl bg-orange-100 text-orange-600 mr-5 shadow-sm`}>
                                        <BookOpen className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-4xl font-bold text-gray-900 tracking-tight">{richContent.curriculum_section.heading}</h2>
                                </div>
                                <div className="space-y-6">
                                    {richContent.curriculum_section.modules.map((mod, idx) => (
                                        <div key={idx} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex gap-6 group">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xl text-gray-900 mb-3">{mod.title}</h3>
                                                <p className="text-gray-600 text-lg leading-relaxed">{mod.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {richContent?.programs_section && (
                            <section>
                                <div className="flex items-center mb-10">
                                    <div className={`p-4 rounded-2xl bg-blue-100 text-blue-600 mr-5 shadow-sm`}>
                                        <Layers className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-4xl font-bold text-gray-900 tracking-tight">{richContent.programs_section.heading}</h2>
                                </div>
                                <div className="grid md:grid-cols-2 gap-8">
                                    {richContent.programs_section.programs.map((prog, idx) => (
                                        <div key={idx} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                            <div className="bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-full w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                {prog.focus}
                                            </div>
                                            <h3 className="font-bold text-2xl text-gray-900 mb-4">{prog.name}</h3>
                                            <p className="text-gray-600 mb-6 text-base leading-relaxed h-24">{prog.details}</p>
                                            <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 border border-gray-100">
                                                <span className="font-bold text-gray-900 block mb-1">Explore Themes:</span> {prog.themes}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {richContent?.workshop_experience_section && (
                            <section>
                                <div className="flex items-center mb-10">
                                    <div className={`p-4 rounded-2xl bg-green-100 text-green-600 mr-5 shadow-sm`}>
                                        <Star className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-4xl font-bold text-gray-900 tracking-tight">{richContent.workshop_experience_section.heading}</h2>
                                </div>
                                <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl">{richContent.workshop_experience_section.description}</p>

                                <div className="grid md:grid-cols-2 gap-6 mb-12">
                                    {richContent.workshop_experience_section.learning_outcomes.map((outcome, idx) => (
                                        <div key={idx} className="bg-green-50/50 rounded-2xl p-6 border border-green-100 hover:bg-green-50 transition-colors">
                                            <h4 className="font-bold text-green-900 mb-2 text-lg">{outcome.role}</h4>
                                            <p className="text-green-800/80 leading-snug">{outcome.activity}</p>
                                        </div>
                                    ))}
                                </div>

                                {richContent.workshop_experience_section.visual_assets_gallery && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                                        {richContent.workshop_experience_section.visual_assets_gallery.map((img, idx) => (
                                            <div key={idx} className={`rounded-2xl overflow-hidden relative group shadow-md ${idx === 0 ? 'md:col-span-2 md:row-span-2 aspect-[4/3]' : 'aspect-square'}`}>
                                                <img
                                                    src={getAssetPath(img.file_name)}
                                                    alt={img.description}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                                    <p className="text-white font-medium drop-shadow-md border-l-2 border-white pl-3">{img.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

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
                    <div className="lg:col-span-1 space-y-10 relative">
                        <div className="lg:sticky lg:top-8 space-y-10">

                            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden transform transition-all hover:-translate-y-1">
                                <div className="bg-gray-900 p-8 text-white text-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Star className="w-24 h-24" />
                                    </div>
                                    <h3 className="text-2xl font-bold relative z-10">Ready to Start?</h3>
                                    <p className="text-gray-400 text-sm mt-2 relative z-10 font-medium">
                                        {richContent?.booking_section?.details.age_requirement || "Check available slots"}
                                    </p>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="flex items-start group">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-4 group-hover:bg-gray-100 transition-colors">
                                            <MapPin className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</div>
                                            <div className="text-sm text-gray-800 font-bold leading-tight">
                                                {richContent?.booking_section?.details.location || instructor.location}
                                            </div>
                                        </div>
                                    </div>

                                    {richContent?.logistics_section?.who && (
                                        <div className="flex items-start group">
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-4 group-hover:bg-gray-100 transition-colors">
                                                <Users className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Who is this for?</div>
                                                <div className="text-sm text-gray-700">
                                                    {richContent.logistics_section.who}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {richContent?.logistics_section && (
                                        <div className="flex items-start group">
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-4 group-hover:bg-gray-100 transition-colors">
                                                <CheckCircle className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Requirements</div>
                                                <div className="text-sm text-gray-700">
                                                    {richContent.logistics_section.requirements}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {richContent?.booking_section?.details.whats_included && (
                                        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="bg-emerald-100 p-1 rounded-full">
                                                    <Star className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">What's Included</span>
                                            </div>
                                            <p className="text-sm text-emerald-900 leading-snug opacity-90">
                                                {richContent.booking_section.details.whats_included}
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-gray-100">
                                        {instructor.class_offerings?.[0]?.price_estimate ? (
                                            <div className="mb-6 text-center">
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pricing</div>
                                                <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{instructor.class_offerings[0].price_estimate}</div>
                                            </div>
                                        ) : (
                                            instructor.class_offerings?.[0]?.price_aed && (
                                                <div className="mb-6 text-center">
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Course Fee</div>
                                                    <div className="text-3xl font-extrabold text-gray-900">AED {instructor.class_offerings[0].price_aed}</div>
                                                </div>
                                            )
                                        )}

                                        <button className="w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg hover:bg-gray-800 hover:-translate-y-0.5 transition-all flex items-center justify-center text-lg">
                                            {richContent?.booking_section?.cta_button || "Book Now"}
                                        </button>
                                        {instructor.personal_info?.contact_email && (
                                            <div className="text-center mt-4">
                                                <a href={`mailto:${instructor.personal_info.contact_email}`} className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
                                                    Have questions? <span className="underline decoration-gray-300 underline-offset-2">Contact Instructor</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {(richContent?.studio_experience_section || instructor.studio_facilities) && (
                                <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
                                    <h4 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                                        <Award className="w-5 h-5 mr-3 text-orange-500" />
                                        Studio Experience
                                    </h4>

                                    {instructor.studio_facilities?.type && (
                                        <div className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider bg-white inline-block px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
                                            {instructor.studio_facilities.type}
                                        </div>
                                    )}

                                    {richContent?.studio_experience_section && (
                                        <p className="text-sm text-gray-600 leading-relaxed mb-6">
                                            {richContent.studio_experience_section.details}
                                        </p>
                                    )}

                                    {instructor.studio_facilities?.amenities && (
                                        <div className="space-y-3">
                                            {instructor.studio_facilities.amenities.map((amenity, i) => (
                                                <div key={i} className="flex items-center text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                                                    {amenity}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                </div>

                <section className="bg-white rounded-[2rem] overflow-hidden shadow-2xl shadow-gray-200/50 border mb-20 border-gray-100">
                    <div className="md:flex h-full">
                        <div className="md:w-5/12 bg-gray-100 relative min-h-[500px] md:min-h-full group">
                            <img
                                src={instructor.image}
                                alt={instructor.name}
                                className="w-full h-full object-cover object-top absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                        <div className="md:w-7/12 p-10 md:p-16 flex flex-col justify-center">
                            {richContent?.instructor_section ? (
                                <>
                                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 font-serif">{richContent.instructor_section.heading}</h2>
                                    {richContent.instructor_section.quote && (
                                        <blockquote className="text-xl md:text-2xl italic text-gray-500 mb-8 border-l-4 border-orange-400 pl-6 py-2 leading-relaxed font-light">
                                            "{richContent.instructor_section.quote}"
                                        </blockquote>
                                    )}
                                    <p className="text-gray-600 text-lg leading-relaxed mb-10">
                                        {richContent.instructor_section.bio_text}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-6">Meet {instructor.name}</h2>
                                    {instructor.professional_bio && <p className="text-gray-600 leading-relaxed mb-6">{instructor.professional_bio.summary}</p>}
                                </>
                            )}

                            {instructor.professional_bio?.certifications && (
                                <div className="flex flex-wrap gap-2 mb-10">
                                    {instructor.professional_bio.certifications.map((cert, idx) => (
                                        <span key={idx} className="bg-orange-50 text-orange-800 text-xs font-bold px-4 py-2 rounded-full border border-orange-100 uppercase tracking-wide">
                                            {cert}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {instructor.professional_bio?.teaching_philosophy && (
                                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-inner">
                                    <h3 className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-widest flex items-center">
                                        <div className="w-8 h-[1px] bg-gray-400 mr-3"></div>
                                        Teaching Philosophy
                                    </h3>
                                    <div className="space-y-6">
                                        <div>
                                            <span className="font-bold text-gray-900 block text-xs uppercase mb-2">Core Belief</span>
                                            <p className="text-lg text-gray-600 italic font-serif leading-relaxed">"{instructor.professional_bio.teaching_philosophy.core_belief}"</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-200">
                                            <div>
                                                <span className="font-bold text-gray-900 block text-xs uppercase mb-2">Style</span>
                                                <p className="text-sm text-gray-600 leading-relaxed">{instructor.professional_bio.teaching_philosophy.style}</p>
                                            </div>
                                            <div>
                                                <span className="font-bold text-gray-900 block text-xs uppercase mb-2">Methodology</span>
                                                <p className="text-sm text-gray-600 leading-relaxed">{instructor.professional_bio.teaching_philosophy.methodology}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {instructor.testimonials && (
                    <section className="mb-20">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Stories from the Studio</h2>
                            <div className="w-24 h-1 bg-orange-400 mx-auto rounded-full"></div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {instructor.testimonials.map((t, idx) => (
                                <div key={idx} className="bg-white rounded-3xl p-10 relative shadow-xl shadow-gray-100 border border-gray-50 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
                                    <div className="absolute -top-4 -left-2 text-8xl text-orange-100 font-serif leading-none z-0">"</div>
                                    <div className="relative z-10">
                                        <div className="flex gap-1 mb-6">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                            ))}
                                        </div>
                                        <p className="text-xl text-gray-700 font-light italic leading-relaxed mb-8">
                                            {t.quote || t.parent_quote}
                                        </p>
                                    </div>
                                    <div className="flex items-center relative z-10 border-t border-gray-100 pt-6">
                                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 flex items-center justify-center font-bold mr-4 shadow-inner text-xl`}>
                                            {t.student_name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-lg">{t.student_name}</div>
                                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t.age ? `${t.age} years old` : 'Parent'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {instructor.faq && (
                <section className="bg-gray-50 border-t border-gray-100 py-24">
                    <div className="max-w-4xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <span className="text-orange-500 font-bold tracking-widest uppercase text-sm mb-2 block">Got Questions?</span>
                            <h2 className="text-4xl font-bold text-gray-900">Common Questions</h2>
                        </div>

                        <div className="space-y-4">
                            {Array.from({ length: Object.keys(instructor.faq || {}).length / 2 }).map((_, i) => {
                                const qKey = `q${i + 1}`;
                                const aKey = `a${i + 1}`;
                                const question = instructor.faq?.[qKey];
                                const answer = instructor.faq?.[aKey];
                                if (!question || !answer) return null;
                                return (
                                    <div key={i} className="bg-white border text-left border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
                                        <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-start">
                                            <div className="bg-orange-100 p-2 rounded-lg mr-4 mt-1">
                                                <HelpCircle className="w-5 h-5 text-orange-600" />
                                            </div>
                                            <span className="mt-1">{question}</span>
                                        </h3>
                                        <p className="text-gray-600 pl-[4.5rem] leading-relaxed text-lg">{answer}</p>
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
