import React, { useEffect, useState } from 'react';
import {
  FaSun,
  FaGlobe,
  FaUsers,
  FaChevronRight,
  FaSearch,
  FaEnvelope,
  FaPhone,
  FaCheckCircle,
  FaTimes,
  FaExternalLinkAlt,
  FaMusic,
  FaLaptop,
  FaTrophy,
  FaCampground,
  FaInfoCircle,
  FaFilter,
  FaShieldAlt,
  FaMapPin,
  FaRegPaperPlane
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import partnershipAPI, { Partnership } from '../services/api/partnershipAPI';
import collectionsAPI from '../services/api/collectionsAPI';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CollectionSection from '../components/client/CollectionSection';
import { mapToUIEvent } from '../utils/homePageUtils';
import type { Event as UIEvent } from '../components/client/CollectionSection.types';

const SummerPartnersDirectoryPage: React.FC = () => {
  const [partners, setPartners] = useState<Partnership[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<UIEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter/Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Detail Modal state
  const [selectedPartner, setSelectedPartner] = useState<Partnership | null>(null);

  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Inquiry mock state
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partnersRes, collRes] = await Promise.all([
          partnershipAPI.getPublicDirectory({ partnershipType: 'summer_camp', limit: 100 } as any).catch(err => {
            console.error('Error fetching partners:', err);
            toast.error('Failed to load summer partners.');
            return { partnerships: [] };
          }),
          collectionsAPI.getCollectionById('summer-camp-collections').catch(err => {
            console.error('Error fetching summer camp collection:', err);
            return { collection: null };
          })
        ]);

        const partnershipsList = (partnersRes as any).data?.partnerships || (partnersRes as any).partnerships || [];
        const approvedPartners = partnershipsList.filter((p: any) => p.status === 'approved');
        setPartners(approvedPartners);

        const events = collRes.collection?.events || [];
        const mappedEvents = events.map(mapToUIEvent);
        setTrendingEvents(mappedEvents);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCategoryInfo = (partner: Partnership) => {
    const text = `${partner.notes || ''} ${partner.message || ''} ${partner.organization || ''} ${partner.name || ''}`.toLowerCase();
    if (text.includes('stem') || text.includes('code') || text.includes('robot') || text.includes('science') || text.includes('tech') || text.includes('comput')) {
      return {
        name: 'STEM & Tech',
        gradient: 'from-blue-400 to-indigo-500',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: FaLaptop,
      };
    }
    if (text.includes('sport') || text.includes('swim') || text.includes('gym') || text.includes('dance') || text.includes('football') || text.includes('fitness') || text.includes('tenni') || text.includes('play')) {
      return {
        name: 'Sports & Fitness',
        gradient: 'from-emerald-400 to-teal-500',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: FaTrophy,
      };
    }
    if (text.includes('art') || text.includes('craft') || text.includes('music') || text.includes('paint') || text.includes('draw') || text.includes('theatr') || text.includes('drama') || text.includes('sing') || text.includes('creative')) {
      return {
        name: 'Arts & Creative',
        gradient: 'from-purple-400 to-pink-500',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: FaMusic,
      };
    }
    if (text.includes('adventure') || text.includes('outdoor') || text.includes('camp') || text.includes('game') || text.includes('fun') || text.includes('ride') || text.includes('trip')) {
      return {
        name: 'Adventure & Play',
        gradient: 'from-amber-400 to-orange-500',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: FaCampground,
      };
    }
    return {
      name: 'General Activity',
      gradient: 'from-sky-400 to-cyan-500',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: FaGlobe,
    };
  };

  const categories = ['All', 'Sports & Fitness', 'Arts & Creative', 'STEM & Tech', 'Adventure & Play', 'General Activity'];
  const partnershipTypes = ['All', 'vendor', 'influencer', 'school', 'affiliate', 'other'];

  const filteredPartners = partners.filter(partner => {
    const catInfo = getCategoryInfo(partner);
    const matchesSearch =
      (partner.organization || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (partner.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (partner.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (partner.message || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || catInfo.name === selectedCategory;
    const matchesType = selectedType === 'All' || partner.partnershipType === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  });

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName || !inquiryEmail || !inquiryMsg) {
      toast.error('Please fill out all fields.');
      return;
    }
    setSendingInquiry(true);
    setTimeout(() => {
      toast.success(`Inquiry sent to ${selectedPartner?.organization || selectedPartner?.name}!`);
      setSendingInquiry(false);
      setInquiryName('');
      setInquiryEmail('');
      setInquiryMsg('');
      setSelectedPartner(null);
    }, 1000);
  };

  const faqs = [
    {
      q: "How can my company become a Kidrove Summer Partner?",
      a: "We welcome all premium children's activity providers, camp organizers, and academies in the UAE! You can submit a partnership request through our Partner Registration form, and our team will review your application within 24-48 hours. Once approved, you'll be featured on this directory and can post events."
    },
    {
      q: "Are the camps listed here safe and verified?",
      a: "Absolutely. Safety is our primary concern. All approved Kidrove Summer Partners undergo a verification process where we check their licenses, safety records, and verify that all camp supervisors are qualified professionals."
    },
    {
      q: "What age groups are these summer camps for?",
      a: "Camps range from toddlers (2-4 years) to teenagers (13-17 years). You can filter the specific age groups on each camp's detail page or under our curated collections."
    },
    {
      q: "Is there a discount for booking multiple camps?",
      a: "Many of our partners offer early bird or multi-child sibling discounts. When viewing the details for a partner or sending an inquiry, be sure to ask about active promotions for Kidrove members!"
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-800 antialiased pb-16">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 pt-20 pb-32">
        {/* Animated Background Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-400 rounded-full blur-[80px] opacity-20 animate-pulse-soft pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500 rounded-full blur-[100px] opacity-20 animate-float pointer-events-none" />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-rose-400 rounded-full blur-[60px] opacity-15 animate-bounce-gentle pointer-events-none" />

        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0c_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white font-bold px-5 py-2 rounded-full text-xs sm:text-sm mb-6 border border-white/30 shadow-inner animate-bounce-gentle">
            <FaSun className="animate-spin text-amber-100" style={{ animationDuration: '6s' }} />
            <span className="tracking-wide uppercase">Summer Camp Directory 2026</span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-black text-white mb-6 leading-[1.1] drop-shadow-lg tracking-tight">
            <span className="select-none pointer-events-none mr-2 inline-block" aria-hidden="true">🌞</span>Discover the Best <br />
            <span className="text-white">
              Summer Camp Experiences
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/95 mb-10 max-w-3xl mx-auto font-semibold leading-relaxed drop-shadow-sm">
            Connect with premium, verified camps, workshops, activity zones, and kid-friendly organizations offering spectacular learning and play environments across the UAE.
          </p>
        </div>
      </section>

      {/* ── METRICS OVERLAY BANNER ── */}
      <section className="relative -mt-16 z-20 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 sm:p-8 bg-white/70 backdrop-blur-lg border border-white/60 shadow-large rounded-3xl">
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-3 p-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
              <FaSun className="text-2xl" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-900 leading-tight">
                {loading ? '...' : partners.length}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-neutral-500">Premium Camps</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-3 p-3 border-l-0 sm:border-l border-neutral-100">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <FaShieldAlt className="text-2xl" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-900 leading-tight">100%</p>
              <p className="text-xs sm:text-sm font-semibold text-neutral-500">Verified & Safe</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-3 p-3 border-l-0 md:border-l border-neutral-100">
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
              <FaMapPin className="text-2xl" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-900 leading-tight">7</p>
              <p className="text-xs sm:text-sm font-semibold text-neutral-500">Emirates Covered</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-3 p-3 border-l-0 sm:border-l border-neutral-100">
            <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl">
              <FaUsers className="text-2xl" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-900 leading-tight">10k+</p>
              <p className="text-xs sm:text-sm font-semibold text-neutral-500">Happy Campers</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN DIRECTORY SECTION ── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-black text-neutral-900 mb-4">
            Our Summer Partners Directory
          </h2>
          <div className="w-16 h-1 bg-amber-500 mx-auto rounded-full mb-4" />
          <p className="text-neutral-500 text-base sm:text-lg max-w-2xl mx-auto">
            Use our interactive filter system to browse camps by category, partnership type, or search for their name directly.
          </p>
        </div>

        {/* ── FILTER & SEARCH CONTROLS ── */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-soft mb-12 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-grow">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-lg" />
              <input
                type="text"
                placeholder="Search camps, organizations or contact name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Partnership Type Filter */}
            <div className="flex items-center gap-2 min-w-[200px]">
              <FaFilter className="text-neutral-400 text-sm flex-shrink-0" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm capitalize focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              >
                <option value="All">All Types</option>
                {partnershipTypes.filter(t => t !== 'All').map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Quick Filter Chips */}
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Filter by Category</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all duration-200 ${selectedCategory === cat
                      ? 'bg-neutral-900 border-neutral-900 text-white shadow-md'
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── PARTNERS GRID ── */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <LoadingSpinner size="large" />
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-neutral-100 shadow-soft">
            <span className="text-6xl mb-6 block animate-bounce-gentle">🏝️</span>
            <h3 className="text-2xl font-display font-bold text-neutral-900 mb-2">No matching camps found</h3>
            <p className="text-neutral-500 max-w-md mx-auto mb-6 px-4">
              Try adjusting your search criteria, selecting another category, or clearing filters to discover partners.
            </p>
            {(searchQuery || selectedCategory !== 'All' || selectedType !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedType('All');
                }}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-all text-sm"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPartners.map((partner) => {
              const catInfo = getCategoryInfo(partner);
              return (
                <div
                  key={partner._id}
                  className="bg-white rounded-3xl border border-neutral-100 shadow-soft hover:shadow-large hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group overflow-hidden relative"
                >
                  {/* Decorative Category Top Strip */}
                  <div className={`h-3 bg-gradient-to-r ${catInfo.gradient}`} />

                  {/* Card Content */}
                  <div className="p-8 flex flex-col h-full">
                    {/* Header Tag and Verification */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-block text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full border ${catInfo.badgeClass}`}>
                        {catInfo.name}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <FaCheckCircle className="text-emerald-500" /> Verified
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl sm:text-2xl font-display font-black text-neutral-900 mb-3 group-hover:text-amber-500 transition-colors line-clamp-2 leading-snug">
                      {partner.organization || partner.name}
                    </h3>

                    {/* Description/Notes */}
                    <p className="text-sm text-neutral-500 leading-relaxed line-clamp-3 mb-6 flex-grow">
                      {partner.notes || partner.message || "A premier Kidrove summer partner offering exceptional programs and structured spaces for child safety and enrichment."}
                    </p>

                    {/* Info Metadata */}
                    <div className="border-t border-neutral-100 pt-5 space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-xs sm:text-sm text-neutral-600 font-medium">
                        <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400">
                          <FaUsers />
                        </div>
                        <span className="truncate">{partner.name || "Contact Representative"}</span>
                      </div>

                      {partner.email && (
                        <div className="flex items-center gap-3 text-xs sm:text-sm text-neutral-600 font-medium">
                          <div className="w-8 h-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400">
                            <FaEnvelope />
                          </div>
                          <span className="truncate">{partner.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Buttons CTA */}
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button
                        onClick={() => setSelectedPartner(partner)}
                        className="py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl text-center shadow-md hover:shadow-lg transition-all"
                      >
                        Inquire Now
                      </button>

                      {partner.website ? (
                        <a
                          href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition-all"
                        >
                          Website <FaExternalLinkAlt className="text-[10px]" />
                        </a>
                      ) : (
                        <div className="py-3 bg-neutral-50 text-neutral-400 text-xs font-semibold rounded-xl text-center border border-neutral-100 cursor-not-allowed">
                          No Link
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── TRENDING COLLECTIONS ── */}
      {!loading && trendingEvents.length > 0 && (
        <section className="py-16 bg-white border-y border-neutral-100">
          <div className="max-w-6xl mx-auto">
            <CollectionSection
              badge="Trending"
              badgeColor="rgba(var(--color-primary-500), 0.1)"
              title="Trending summer camps"
              subtitle="Discover the most popular summer camps and activities for kids"
              events={trendingEvents}
              layout="grid"
              eventCardVariant="featured"
              cardBorderRadius="xl"
              cardHoverEffect="lift"
              maxItems={8}
              enablePagination={true}
              viewAllLink="/collections/summer-camp-collections"
              showPrice={true}
              showLocation={true}
              showAgeGroup={true}
              showWishlist={false}
              showVendor={true}
              showStats={true}
              showDescription={true}
            />
          </div>
        </section>
      )}

      {/* ── FAQ SECTION ── */}
      <section className="relative z-30 py-20 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs uppercase font-extrabold text-amber-500 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-200">
            FAQ
          </span>
          <h2 className="text-3xl font-display font-black text-neutral-900 mt-4 mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-neutral-500">
            Got questions about registration, vetting, or becoming a partner? We've got answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-white border border-neutral-100 shadow-soft rounded-2xl overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none cursor-pointer"
                >
                  <span className="font-bold text-base sm:text-lg text-neutral-900 pr-4">
                    {faq.q}
                  </span>
                  <div className={`p-1.5 rounded-lg bg-neutral-50 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-amber-50 text-amber-500' : ''}`}>
                    <FaChevronRight className="text-sm" />
                  </div>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100 border-t border-neutral-50' : 'max-h-0 opacity-0'
                    }`}
                >
                  <p className="p-6 text-sm sm:text-base text-neutral-500 leading-relaxed bg-neutral-50/50">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── PARTNER DETAIL MODAL ── */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div
            className="relative bg-white rounded-3xl shadow-large max-w-xl w-full overflow-hidden border border-neutral-100 max-h-[90vh] flex flex-col transform animate-fade-in-up"
          >
            {/* Header Gradient */}
            <div className={`h-4 bg-gradient-to-r ${getCategoryInfo(selectedPartner).gradient}`} />

            {/* Close Button */}
            <button
              onClick={() => setSelectedPartner(null)}
              className="absolute top-8 right-6 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-700 transition-all focus:outline-none z-10"
            >
              <FaTimes />
            </button>

            <div className="p-6 sm:p-8 overflow-y-auto flex-grow space-y-6">
              {/* Partner Basic Info */}
              <div>
                <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider mb-3 ${getCategoryInfo(selectedPartner).badgeClass}`}>
                  {getCategoryInfo(selectedPartner).name}
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-neutral-900 leading-tight">
                  {selectedPartner.organization || selectedPartner.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 capitalize font-medium">
                  Partnership Type: {selectedPartner.partnershipType.replace('_', ' ')}
                </p>
              </div>

              {/* Message/Bio statement */}
              <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FaInfoCircle /> Partner Statement
                </p>
                <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-medium">
                  {selectedPartner.notes || selectedPartner.message || "This partner is fully registered and verified under the Kidrove 2026 Summer Directory framework. Programs offered follow certified standards of kid safety, development, and fun."}
                </p>
              </div>

              {/* Contact Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center flex-shrink-0">
                    <FaUsers />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Contact Person</p>
                    <p className="text-sm font-semibold text-neutral-700 truncate">{selectedPartner.name}</p>
                  </div>
                </div>

                {selectedPartner.email && (
                  <a href={`mailto:${selectedPartner.email}`} className="p-4 bg-neutral-50 hover:bg-neutral-100 rounded-2xl border border-neutral-100 flex items-center gap-3.5 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <FaEnvelope />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email Address</p>
                      <p className="text-sm font-semibold text-neutral-700 truncate group-hover:text-blue-600 transition-colors">{selectedPartner.email}</p>
                    </div>
                  </a>
                )}

                {selectedPartner.phone && (
                  <a href={`tel:${selectedPartner.phone}`} className="p-4 bg-neutral-50 hover:bg-neutral-100 rounded-2xl border border-neutral-100 flex items-center gap-3.5 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <FaPhone />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Phone Number</p>
                      <p className="text-sm font-semibold text-neutral-700 truncate group-hover:text-emerald-600 transition-colors">{selectedPartner.phone}</p>
                    </div>
                  </a>
                )}

                {selectedPartner.website && (
                  <a
                    href={selectedPartner.website.startsWith('http') ? selectedPartner.website : `https://${selectedPartner.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-neutral-50 hover:bg-neutral-100 rounded-2xl border border-neutral-100 flex items-center gap-3.5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <FaGlobe />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Website URL</p>
                      <p className="text-sm font-semibold text-neutral-700 truncate group-hover:text-purple-600 transition-colors">{selectedPartner.website.replace(/(^\w+:|^)\/\//, '')}</p>
                    </div>
                  </a>
                )}
              </div>

              {/* Inquiry form */}
              <div className="border-t border-neutral-100 pt-6">
                <h4 className="font-display font-extrabold text-neutral-900 text-lg mb-4 flex items-center gap-2">
                  <FaRegPaperPlane className="text-amber-500 text-base" /> Send Direct Camp Inquiry
                </h4>

                <form onSubmit={handleSendInquiry} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1.5">Your Name</label>
                      <input
                        type="text"
                        required
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1.5">Your Email</label>
                      <input
                        type="email"
                        required
                        value={inquiryEmail}
                        onChange={(e) => setInquiryEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wide mb-1.5">Your Inquiry Details</label>
                    <textarea
                      required
                      value={inquiryMsg}
                      onChange={(e) => setInquiryMsg(e.target.value)}
                      rows={3}
                      placeholder="Hi, I'm interested in signing up my kids for your summer programs. Could you please share the age groups, schedule, and prices?"
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingInquiry}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-200 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
                  >
                    {sendingInquiry ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>Send Inquiry</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummerPartnersDirectoryPage;
