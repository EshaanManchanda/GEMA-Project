import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaArrowRight, FaSun, FaStar, FaEnvelope, FaInstagram, FaFacebook, FaCrown, FaBolt, FaRocket, FaMedal } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const PACKAGES = [
  {
    id: 'basic',
    name: 'Basic Listing',
    emoji: '🟢',
    price: 'AED 0',
    tag: null,
    icon: <FaBolt className="text-2xl text-green-500" />,
    color: 'border-green-400',
    headerBg: 'from-green-400 to-emerald-500',
    includes: [
      'Listing on Summer Camps Pages',
    ],
  },
  {
    id: 'starter',
    name: 'Starter Listing',
    emoji: '🟢',
    price: 'AED 299',
    tag: null,
    icon: <FaBolt className="text-2xl text-green-500" />,
    color: 'border-green-400',
    headerBg: 'from-green-400 to-emerald-500',
    includes: [
      'Listing on Summer Camps page',
      'Visibility in category search',
      'Basic inclusion in Summer Guide',
      '1 Story mention',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Package',
    emoji: '🔵',
    price: 'AED 699',
    tag: 'Most Popular',
    icon: <FaRocket className="text-2xl text-blue-500" />,
    color: 'border-blue-500 ring-4 ring-blue-100',
    headerBg: 'from-blue-500 to-indigo-600',
    includes: [
      'Featured listing (priority placement)',
      '½ Page Ad in Summer Guide',
      '1 Reel + 1 Carousel post',
      '3–5 Story mentions',
      'Inclusion in 1 curated blog/guide',
      'Mention in parent email campaign',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Partner',
    emoji: '🟣',
    price: 'AED 1,299',
    tag: null,
    icon: <FaMedal className="text-2xl text-purple-500" />,
    color: 'border-purple-400',
    headerBg: 'from-purple-500 to-pink-600',
    includes: [
      'Top Featured placement',
      'Full Page Ad in Summer Guide',
      'Homepage ticker/banner visibility',
      '3–4 social media posts (Reels + Posts)',
      'Dedicated blog feature',
      'Highlight in email campaigns (parents + schools)',
      'Priority inclusion across all collections',
    ],
  },
  {
    id: 'category_sponsor',
    name: 'Category Sponsor',
    emoji: '🟡',
    price: 'AED 2,500–3,500',
    tag: 'Exclusive',
    icon: <FaCrown className="text-2xl text-amber-500" />,
    color: 'border-amber-400',
    headerBg: 'from-amber-400 to-orange-500',
    includes: [
      '"Powered by [Your Brand]" category sponsorship',
      'Top placement across all listings',
      'Premium guide positioning',
      'Social media campaign integration',
      'Dedicated email spotlight',
      'Maximum visibility across all touchpoints',
    ],
  },
];

const CHANNELS = [
  { icon: '🌐', title: 'Website', desc: 'Featured on dedicated Summer Camps section with high-intent parent traffic.' },
  { icon: '📖', title: 'Summer Guide', desc: 'Professionally curated digital book shared with parents & schools.' },
  { icon: '📱', title: 'Social Media', desc: 'Reels, Carousels & Stories across Instagram and Facebook.' },
  { icon: '✍️', title: 'Blog Content', desc: '"Top Summer Camps in Dubai 2026" & curated activity guides.' },
  { icon: '📧', title: 'Email Marketing', desc: 'Sent to parent database and shared with school networks.' },
  { icon: '📢', title: 'Website Ticker', desc: 'Continuous visibility during peak browsing period.' },
];

const TIMELINE = [
  { date: 'Now', label: 'Listings Open', color: 'bg-green-500', active: true },
  { date: 'May', label: 'Promotion Starts', color: 'bg-blue-500', active: false },
  { date: 'Jun–Jul', label: 'Peak Campaign', color: 'bg-orange-500', active: false },
  { date: 'August', label: 'Extended Reach', color: 'bg-purple-500', active: false },
];

const AGE_GROUP_OPTIONS = ['Under 3', '3–5 years', '6–9 years', '10–12 years', '13–16 years'];
const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
const PARTNER_TYPES = [
  { value: 'summer_camp', label: 'Summer Camp' },
  { value: 'play_zone', label: 'Play Zone' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'activity_centre', label: 'Activity Centre' },
  { value: 'other', label: 'Other Kids Experience' },
];

const SummerPartnershipPage: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState<string>('growth');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    website: '',
    partnershipType: 'summer_camp',
    emirate: '',
    ageGroups: [] as string[],
    numberOfKids: '',
    campDetails: '',
    message: '',
    agreeToTerms: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(p => ({ ...p, [name]: checked }));
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
  };

  const toggleAgeGroup = (group: string) => {
    setForm(p => ({
      ...p,
      ageGroups: p.ageGroups.includes(group)
        ? p.ageGroups.filter(g => g !== group)
        : [...p.ageGroups, group],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agreeToTerms) { toast.error('Please agree to the terms.'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        website: form.website.trim() || undefined,
        emirate: form.emirate || undefined,
        numberOfKids: form.numberOfKids.trim() || undefined,
        campDetails: form.campDetails.trim(),
        campaignType: 'summer_2026',
        selectedPackage,
        message: form.message || `Interested in ${selectedPackage} package for ${form.organization || 'our activity'}.`,
      };

      const res = await api.post('/partnerships', payload);
      
      if (res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        toast.success('🌞 Application submitted! Our team will contact you within 24 hours.');
        setForm({ name: '', email: '', phone: '', organization: '', website: '', partnershipType: 'summer_camp', emirate: '', ageGroups: [], numberOfKids: '', campDetails: '', message: '', agreeToTerms: false });
        setSelectedPackage('growth');
      }
    } catch (err: any) {
      const fieldErrors = err?.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        const firstFieldError = Object.values(fieldErrors)[0] as string | undefined;
        toast.error(firstFieldError || err?.response?.data?.message || 'Validation failed. Please check your inputs.');
      } else {
        toast.error(err?.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 pt-16 pb-20">
        <div className="absolute inset-0 opacity-10">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute top-1/2 left-1/2 h-[200%] w-0.5 bg-white origin-bottom" style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur text-white font-bold px-5 py-2 rounded-full text-sm mb-6 border border-white/30">
            <FaSun className="animate-spin" style={{ animationDuration: '4s' }} />
            Summer 2026 Campaign — Limited Slots Available
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight drop-shadow-lg">
            🌞 KIDROVE<br />SUMMER 2026
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-4 font-semibold max-w-3xl mx-auto">
            Get Discovered by Parents Planning Summer Activities
          </p>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
            Reach families actively searching for summer camps, play zones, workshops, and kids experiences across the UAE.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#packages"
              className="px-8 py-4 bg-white text-orange-600 font-extrabold rounded-full shadow-xl hover:scale-105 transition-transform text-lg"
            >
              View Packages <FaArrowRight className="inline ml-2" />
            </a>
            <a
              href="#apply"
              className="px-8 py-4 bg-orange-900/30 backdrop-blur text-white font-bold rounded-full border-2 border-white/40 hover:bg-orange-900/50 transition text-lg"
            >
              Apply Now
            </a>
          </div>
        </div>
      </section>

      {/* ── WHY PARTNER ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3">Why Partner with Kidrove?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Connect with high-intent parents actively planning summer for their kids.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '👨‍👩‍👧', title: 'High-Intent Parents', desc: 'Reach parents actively searching for summer camps and kids activities — not passive browsers.' },
              { icon: '⭐', title: 'Stand Out', desc: 'We limit listings per category to ensure your brand gets real visibility, not just another listing.' },
              { icon: '📢', title: 'Multi-Channel Push', desc: 'Website, social media, email campaigns, school networks — all amplified during peak June–August.' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-3">What You Get Across Channels</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {CHANNELS.map((ch, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 hover:border-orange-300 transition-colors">
                <div className="text-4xl mb-3">{ch.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">{ch.title}</h3>
                <p className="text-gray-500 text-sm">{ch.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PACKAGES ── */}
      <section id="packages" className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3">Choose Your Package</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">All packages run May–August 2026. Early partners get better placement.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => { setSelectedPackage(pkg.id); document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' }); }}
                className={`relative cursor-pointer rounded-2xl border-2 bg-white p-6 flex flex-col transition-all duration-200 hover:scale-105 ${pkg.color} ${selectedPackage === pkg.id ? 'scale-105' : ''}`}
              >
                {pkg.tag && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r ${pkg.headerBg} text-white text-xs font-extrabold px-4 py-1 rounded-full shadow`}>
                    {pkg.tag}
                  </div>
                )}
                <div className="mb-4">{pkg.icon}</div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-1">{pkg.name}</h3>
                <p className="text-3xl font-black text-gray-900 mb-5">{pkg.price}</p>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {pkg.includes.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <FaCheckCircle className="text-green-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2.5 rounded-xl font-bold text-sm transition ${selectedPackage === pkg.id ? `bg-gradient-to-r ${pkg.headerBg} text-white shadow-lg` : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {selectedPackage === pkg.id ? '✓ Selected' : 'Select Package'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-8">
            🚀 We limit partners per category — better visibility, higher engagement, less competition.
          </p>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className="py-16 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">Campaign Timeline</h2>
          <div className="relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 hidden md:block" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {TIMELINE.map((t, i) => (
                <div key={i} className="flex flex-col items-center text-center relative z-10">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-sm mb-3 shadow-lg ${t.active ? 'ring-4 ring-offset-2 ring-green-300 animate-pulse' : ''}`}>
                    {i + 1}
                  </div>
                  <p className="font-extrabold text-gray-900">{t.date}</p>
                  <p className="text-sm text-gray-500">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── APPLY FORM ── */}
      <section id="apply" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-4xl">📩</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-2">Apply to Partner</h2>
            <p className="text-gray-500">Share your activity details and we'll onboard and position your listing.</p>
            {selectedPackage && (
              <div className="mt-4 inline-flex items-center gap-2 bg-orange-100 text-orange-700 font-bold px-5 py-2 rounded-full">
                <FaSun />
                Selected: {PACKAGES.find(p => p.id === selectedPackage)?.name} — {PACKAGES.find(p => p.id === selectedPackage)?.price}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 space-y-6">
            {/* Package selector */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Selected Package *</label>
              <div className="grid grid-cols-2 gap-3">
                {PACKAGES.map(pkg => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`p-3 rounded-xl border-2 text-left transition ${selectedPackage === pkg.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="font-bold text-sm text-gray-900">{pkg.name}</p>
                    <p className="text-xs text-gray-500">{pkg.price}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Contact Name *</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder="Your full name" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@company.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number *</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} required placeholder="+971 XX XXX XXXX" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Organization / Camp Name *</label>
                <input name="organization" value={form.organization} onChange={handleChange} required placeholder="Your camp or activity name" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Website</label>
                <input name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://yoursite.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Activity Type *</label>
                <input 
                  type="text" 
                  value="Summer Camp" 
                  readOnly 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Emirate</label>
                <select name="emirate" value={form.emirate} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition bg-white">
                  <option value="">Select Emirate</option>
                  {EMIRATES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Expected # of Kids</label>
                <input name="numberOfKids" value={form.numberOfKids} onChange={handleChange} placeholder="e.g. 50–100" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Age Groups Served</label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUP_OPTIONS.map(g => (
                  <button key={g} type="button" onClick={() => toggleAgeGroup(g)} className={`px-4 py-2 rounded-full border text-sm font-semibold transition ${form.ageGroups.includes(g) ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Tell Us About Your Activity *</label>
              <textarea name="campDetails" value={form.campDetails} onChange={handleChange} rows={3} placeholder="Briefly describe your camp, what kids will do, dates, location..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition resize-none" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Anything Else?</label>
              <textarea name="message" value={form.message} onChange={handleChange} rows={2} placeholder="Questions, special requirements, or additional info..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition resize-none" />
            </div>

            <div className="flex items-start gap-3">
              <input id="agreeToTerms" name="agreeToTerms" type="checkbox" checked={form.agreeToTerms} onChange={handleChange} className="mt-1 h-4 w-4 rounded border-gray-300 accent-orange-500" />
              <label htmlFor="agreeToTerms" className="text-sm text-gray-600">
                I agree to the <Link to="/terms" className="text-orange-500 font-semibold hover:underline">terms and conditions</Link> and consent to being contacted by the Kidrove team.
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-lg rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><span className="animate-spin">⏳</span> Submitting...</>
              ) : (
                <><FaSun /> Submit Partnership Application</>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              📧 Or reach us directly at <a href="mailto:partnerships@kidrove.com" className="text-orange-500 font-semibold">partnerships@kidrove.com</a>
            </p>
          </form>
        </div>
      </section>

      {/* ── EARLY ADVANTAGE ── */}
      <section className="py-16 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-4xl font-extrabold mb-4">Launch Advantage — Limited Time</h2>
          <p className="text-white/90 text-lg mb-8">Early summer partners receive better placement, higher visibility during launch, and preferential positioning in guides.</p>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {['Better placement (less competition)', 'Higher visibility during launch push', 'Preferential positioning in guides'].map((b, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/20 backdrop-blur px-5 py-3 rounded-full font-semibold text-sm">
                <FaCheckCircle /> {b}
              </div>
            ))}
          </div>
          <a href="#apply" className="inline-flex items-center gap-2 bg-white text-orange-600 font-extrabold px-8 py-4 rounded-full shadow-xl hover:scale-105 transition-transform text-lg">
            <FaSun /> Secure Your Slot Now
          </a>
        </div>
      </section>

    </div>
  );
};

export default SummerPartnershipPage;
