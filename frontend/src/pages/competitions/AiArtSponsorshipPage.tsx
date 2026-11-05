import React from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiChevronRight, FiArrowLeft, FiBookOpen, FiAward, FiBriefcase, FiGlobe, FiStar } from 'react-icons/fi';
import SEO from '@/components/common/SEO';

export default function AiArtSponsorshipPage() {
  return (
    <div className="min-h-screen bg-[#0A0F1A] text-slate-300 font-sans selection:bg-blue-500/30 selection:text-white relative overflow-x-hidden">
      <SEO
        title="Partnership & Sponsorship — KidRove AI Art Competition 2026"
        description="Become a partner or sponsor for the KidRove AI Art Competition 2026. Discover opportunities for schools, universities, and corporates to empower the next generation of AI creators."
      />

      <div id="partnerships" className="py-24 min-h-screen relative overflow-hidden flex flex-col justify-center">
        {/* Subtle Corporate Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-blue-900/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto px-4 relative z-10 w-full">
          {/* Header Section */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center border border-slate-700/60 text-purple-400  font-semibold px-5 py-1.5 rounded-full text-xs uppercase tracking-widest mb-6 bg-slate-800/30 backdrop-blur-sm">
              Partnership & Sponsorship
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Empowering the Next Generation of <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">AI Creators</span>
            </h2>
            <p className="text-slate-400 max-w-3xl mx-auto text-lg leading-relaxed mb-12">
              The KidRove AI Art Competition brings together students from across the UAE and beyond to explore Artificial Intelligence, creativity, imagination and the future.
              <br /><br />
              We invite schools, universities, and forward-thinking businesses to become part of this initiative through meaningful partnerships that create real value for students.
            </p>

            {/* Target Audience Pillars */}
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              <div className="flex items-center gap-4 bg-slate-800/30 border border-slate-700/50 px-8 py-4 rounded-2xl backdrop-blur-sm transition-all hover:bg-slate-800/50 hover:border-slate-600/50">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <FiBookOpen className="text-xl" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-slate-200">Schools</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Learn. Create. Compete.</span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-800/30 border border-slate-700/50 px-8 py-4 rounded-2xl backdrop-blur-sm transition-all hover:bg-slate-800/50 hover:border-slate-600/50">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <FiAward className="text-xl" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-slate-200">Universities</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Engage. Inspire. Connect.</span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-800/30 border border-slate-700/50 px-8 py-4 rounded-2xl backdrop-blur-sm transition-all hover:bg-slate-800/50 hover:border-slate-600/50">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <FiBriefcase className="text-xl" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-slate-200">Corporates</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Support. Empower. Impact.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sponsorship Tiers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">

            {/* Official Partner School */}
            <div className="bg-[#0D1322] border border-slate-700/50 hover:border-blue-500/40 rounded-3xl p-8 lg:p-10 relative overflow-hidden group transition-all duration-300 shadow-lg">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-blue-500/10 text-blue-400 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500/20">1 per Emirate</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 border border-blue-500/20">
                <FiBookOpen className="text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Official Partner School</h3>
              <div className="text-slate-400 font-medium mb-8 text-lg">AED 3,000</div>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3 items-start"><FiCheck className="text-blue-400 mt-1 shrink-0 text-base" /> <span>Up to 100 complimentary student registrations</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-blue-400 mt-1 shrink-0 text-base" /> <span>FREE 2-hour live AI & Generative AI workshop</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-blue-400 mt-1 shrink-0 text-base" /> <span>One Million Prompters learning guidance</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-blue-400 mt-1 shrink-0 text-base" /> <span>Partner School recognition for the Emirate</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-blue-400 mt-1 shrink-0 text-base" /> <span>Student participation certificates and awards</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-blue-400 mt-1 shrink-0 text-base" /> <span>Opportunity for student artwork to be showcased</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-blue-400 mt-1 shrink-0 text-base" /> <span>Website and selected competition communications recognition</span></li>
              </ul>
            </div>

            {/* University Partner */}
            <div className="bg-[#0D1322] border border-slate-700/50 hover:border-indigo-500/40 rounded-3xl p-8 lg:p-10 relative overflow-hidden group transition-all duration-300 shadow-lg">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-indigo-500/10 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-500/20">2 available</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20">
                <FiAward className="text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">University Partner</h3>
              <div className="text-slate-400 font-medium mb-8 text-lg">AED 10,000</div>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>Official University Partner recognition</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>University branding on the competition website</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>AI & Future Careers webinar</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>University faculty speaker/representative</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>Opportunity for faculty participation in judging/mentoring</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>University-sponsored student award</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>Opportunity to interact with selected finalists/winners through KidRove-managed sessions</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>Opportunity for a university campus experience</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>Website and social media visibility</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-indigo-400 mt-1 shrink-0 text-base" /> <span>Closing ceremony recognition & Post-event impact report</span></li>
              </ul>
            </div>

            {/* Young Creators Showcase Partner */}
            <div className="bg-[#0D1322] border border-slate-700/50 hover:border-cyan-500/40 rounded-3xl p-8 lg:p-10 relative overflow-hidden group transition-all duration-300 shadow-lg">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-cyan-500/10 text-cyan-400 text-xs font-semibold px-3 py-1 rounded-full border border-cyan-500/20">1 available</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 border border-cyan-500/20">
                <FiGlobe className="text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Young Creators Showcase Partner</h3>
              <div className="text-slate-400 font-medium mb-8 text-lg">AED 10,000</div>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-400 mt-1 shrink-0 text-base" /> <span>Official Young Creators Showcase Partner status</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-400 mt-1 shrink-0 text-base" /> <span>Brand association with the KidRove Student AI Art Showcase</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-400 mt-1 shrink-0 text-base" /> <span>Branding on the digital showcase/gallery</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-400 mt-1 shrink-0 text-base" /> <span>Association with selected student artworks</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-400 mt-1 shrink-0 text-base" /> <span>Website and competition visibility</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-400 mt-1 shrink-0 text-base" /> <span>Social media recognition</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-400 mt-1 shrink-0 text-base" /> <span>Closing ceremony recognition</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-400 mt-1 shrink-0 text-base" /> <span>Post-event partner recognition</span></li>
              </ul>
            </div>

            {/* Future Creators Recognition Partner */}
            <div className="bg-[#0D1322] border border-slate-700/50 hover:border-amber-500/40 rounded-3xl p-8 lg:p-10 relative overflow-hidden group transition-all duration-300 shadow-lg">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-amber-500/10 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/20">4 available</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6 border border-amber-500/20">
                <FiStar className="text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">Future Creators Recognition Partner</h3>
              <div className="text-slate-400 font-medium mb-8 text-lg">AED 7,500</div>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3 items-start"><FiCheck className="text-amber-400 mt-1 shrink-0 text-base" /> <span>Gold Partner branding</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-amber-400 mt-1 shrink-0 text-base" /> <span>Dedicated Future Creators Award or a relevant themed award</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-amber-400 mt-1 shrink-0 text-base" /> <span>Student AI/creativity workshop</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-amber-400 mt-1 shrink-0 text-base" /> <span>Company representative participation</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-amber-400 mt-1 shrink-0 text-base" /> <span>"Award presented by [Company]" recognition</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-amber-400 mt-1 shrink-0 text-base" /> <span>Website and social media visibility</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-amber-400 mt-1 shrink-0 text-base" /> <span>Closing ceremony recognition</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-amber-400 mt-1 shrink-0 text-base" /> <span>Post-event impact report</span></li>
              </ul>
            </div>

          </div>

          {/* Clean Corporate CTA */}
          <div className="max-w-4xl mx-auto px-4 relative z-10 mt-16 mb-20 md:mb-28">
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:border-emerald-500/30 transition-colors group">

              {/* Content */}
              <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-5">

                {/* Icon */}
                <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <svg
                    className="w-7 h-7 text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                </div>

                {/* Text */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-1.5">
                    Ready to make an impact?
                  </h3>

                  <p className="text-slate-400 text-sm">
                    Connect with our partnership team to discuss how we can tailor a
                    sponsorship package that aligns with your organization's goals.
                  </p>
                </div>
              </div>

              {/* CTA */}
              <a
                href="https://wa.me/971529881170"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-full transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 active:scale-95"
              >
                Contact our Team
                <FiChevronRight className="stroke-[3] text-lg" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
