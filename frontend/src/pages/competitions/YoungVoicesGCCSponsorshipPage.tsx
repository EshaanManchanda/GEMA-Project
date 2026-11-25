import { FiCheck, FiChevronRight, FiBookOpen, FiAward, FiBriefcase, FiGlobe, FiStar } from 'react-icons/fi';
import SEO from '@/components/common/SEO';

export default function YoungVoicesGCCSponsorshipPage() {
  return (
    <div className="min-h-screen bg-[#F4F9F9] text-slate-800 font-sans selection:bg-teal-500/30 selection:text-teal-950 relative overflow-x-hidden">
      <SEO
        title="Partnership & Sponsorship — Young Voices of the GCC 2027"
        description="Become a partner or sponsor for Young Voices of the GCC Creative Challenge 2027. Discover opportunities for schools, universities, and corporates across the GCC to empower young writers and storytellers."
      />

      <div id="partnerships" className="py-20 md:py-28 min-h-screen relative overflow-hidden flex flex-col justify-center">
        {/* Subtle Teal, Cyan & Mint Spotlights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-teal-200/40 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-[-10%] w-[50%] h-[500px] bg-[#9DF4F3]/30 blur-[150px] pointer-events-none rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[500px] bg-emerald-200/30 blur-[150px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto px-4 relative z-10 w-full">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center border border-teal-300 text-teal-900 font-bold px-5 py-1.5 rounded-full text-xs uppercase tracking-widest mb-6 bg-teal-100/70 backdrop-blur-md shadow-xs">
              Partnership & Sponsorship
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
              Empowering the Next Generation of <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700">
                GCC Storytellers
              </span>
            </h1>
            <p className="text-slate-600 max-w-3xl mx-auto text-lg leading-relaxed mb-10 font-medium">
              Young Voices of the GCC brings together students from Bahrain, Kuwait, Oman, Qatar, Saudi Arabia, and the UAE to celebrate rich regional heritage, creative writing, and young literary talent.
              <br /><br />
              We invite schools, universities, and forward-thinking businesses to become part of this initiative through meaningful partnerships that create real value for students.
            </p>

            {/* Target Audience Pillars */}
            <div className="flex flex-wrap justify-center gap-5 mt-4">
              <div className="flex items-center gap-4 bg-white/80 border border-teal-200/80 px-8 py-4 rounded-2xl backdrop-blur-md transition-all shadow-sm hover:shadow-md hover:border-teal-300 hover:bg-white">
                <div className="w-11 h-11 rounded-2xl bg-teal-100/80 flex items-center justify-center text-teal-700">
                  <FiBookOpen className="text-xl" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-slate-900">Schools</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Learn. Create. Compete.</span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/80 border border-cyan-200/80 px-8 py-4 rounded-2xl backdrop-blur-md transition-all shadow-sm hover:shadow-md hover:border-cyan-300 hover:bg-white">
                <div className="w-11 h-11 rounded-2xl bg-cyan-100/80 flex items-center justify-center text-cyan-700">
                  <FiAward className="text-xl" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-slate-900">Universities</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Engage. Inspire. Connect.</span>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/80 border border-emerald-200/80 px-8 py-4 rounded-2xl backdrop-blur-md transition-all shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-white">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 flex items-center justify-center text-emerald-700">
                  <FiBriefcase className="text-xl" />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-bold text-slate-900">Corporates</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Support. Empower. Impact.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sponsorship Tiers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">

            {/* Official Partner School */}
            <div className="bg-white/85 border border-teal-200/90 hover:border-teal-400 rounded-3xl p-8 lg:p-10 relative overflow-hidden group transition-all duration-300 shadow-md hover:shadow-xl backdrop-blur-md">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-teal-100 text-teal-900 text-xs font-bold px-3 py-1 rounded-full border border-teal-300">1 per GCC Country</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-6 border border-teal-200">
                <FiBookOpen className="text-2xl" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">Official Partner School</h2>
              <div className="text-teal-700 font-extrabold mb-8 text-xl">AED 3,000</div>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Up to 100 complimentary student registrations</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>FREE live Creative Writing & Storytelling workshop</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Young Authors guide and creative prompts packet</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Partner School recognition for the Country/Region</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Student participation certificates and awards</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Opportunity for student stories to be published in the GCC Anthology</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Website and selected competition communications recognition</span></li>
              </ul>
            </div>

            {/* University Partner */}
            <div className="bg-white/85 border border-cyan-200/90 hover:border-cyan-400 rounded-3xl p-8 lg:p-10 relative overflow-hidden group transition-all duration-300 shadow-md hover:shadow-xl backdrop-blur-md">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-cyan-100 text-cyan-900 text-xs font-bold px-3 py-1 rounded-full border border-cyan-300">2 available</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center mb-6 border border-cyan-200">
                <FiAward className="text-2xl" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">University Partner</h2>
              <div className="text-cyan-700 font-extrabold mb-8 text-xl">AED 10,000</div>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>Official University Partner recognition across GCC</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>University branding on the competition website</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>Literature, Humanities & Media Careers webinar</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>University faculty speaker/representative</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>Opportunity for faculty participation in judging/mentoring</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>University-sponsored literary award</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>Opportunity to interact with selected finalists/winners through KidRove-managed sessions</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>Opportunity for a university campus experience</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>Website and social media visibility</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-cyan-600 mt-1 shrink-0 text-base" /> <span>Closing ceremony recognition & Post-event impact report</span></li>
              </ul>
            </div>

            {/* Young Creators Showcase Partner */}
            <div className="bg-white/85 border border-emerald-200/90 hover:border-emerald-400 rounded-3xl p-8 lg:p-10 relative overflow-hidden group transition-all duration-300 shadow-md hover:shadow-xl backdrop-blur-md">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300">1 available</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-6 border border-emerald-200">
                <FiGlobe className="text-2xl" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">Young Authors Anthology Partner</h2>
              <div className="text-emerald-700 font-extrabold mb-8 text-xl">AED 10,000</div>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex gap-3 items-start"><FiCheck className="text-emerald-600 mt-1 shrink-0 text-base" /> <span>Official Young Authors Anthology Partner status</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-emerald-600 mt-1 shrink-0 text-base" /> <span>Brand association with the KidRove GCC Digital Story Anthology</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-emerald-600 mt-1 shrink-0 text-base" /> <span>Branding on the digital publication and reading showcase</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-emerald-600 mt-1 shrink-0 text-base" /> <span>Association with selected published student stories</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-emerald-600 mt-1 shrink-0 text-base" /> <span>Website and regional competition visibility</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-emerald-600 mt-1 shrink-0 text-base" /> <span>Social media recognition across GCC channels</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-emerald-600 mt-1 shrink-0 text-base" /> <span>Closing ceremony recognition</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-emerald-600 mt-1 shrink-0 text-base" /> <span>Post-event partner recognition</span></li>
              </ul>
            </div>

            {/* Future Creators Recognition Partner */}
            <div className="bg-white/85 border border-[#9DF4F3]/80 hover:border-teal-400 rounded-3xl p-8 lg:p-10 relative overflow-hidden group transition-all duration-300 shadow-md hover:shadow-xl backdrop-blur-md">
              <div className="absolute top-0 right-0 p-6">
                <span className="bg-teal-100 text-teal-900 text-xs font-bold px-3 py-1 rounded-full border border-teal-300">4 available</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-6 border border-teal-200">
                <FiStar className="text-2xl" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-teal-700 transition-colors">GCC Heritage Recognition Partner</h2>
              <div className="text-teal-700 font-extrabold mb-8 text-xl">AED 7,500</div>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Gold Partner branding across GCC</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Dedicated Young Voice of the Year or themed regional award</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Youth literature & heritage workshop</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Company representative participation</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>"Award presented by [Company]" recognition</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Website and social media visibility</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Closing ceremony recognition</span></li>
                <li className="flex gap-3 items-start"><FiCheck className="text-teal-600 mt-1 shrink-0 text-base" /> <span>Post-event impact report</span></li>
              </ul>
            </div>

          </div>

          {/* Clean Glassy Corporate CTA */}
          <div className="max-w-4xl mx-auto px-4 relative z-10 mt-16 mb-16 md:mb-24">
            <div className="bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-emerald-500/10 border border-teal-200/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg backdrop-blur-md hover:border-teal-300 transition-all group">

              {/* Content */}
              <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-5">
                <div className="w-14 h-14 bg-teal-500/15 rounded-full flex items-center justify-center border border-teal-300/60 shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <svg
                    className="w-7 h-7 text-teal-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                    Ready to make an impact?
                  </h3>
                  <p className="text-slate-600 text-sm">
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
                className="shrink-0 px-8 py-3.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold rounded-full transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95"
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
