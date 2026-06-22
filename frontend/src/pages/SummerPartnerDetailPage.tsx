import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaMapPin,
  FaUsers,
  FaInfoCircle,
  FaCheckCircle,
  FaArrowLeft,
  FaChevronRight,
  FaSun
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import partnershipAPI, { Partnership } from '../services/api/partnershipAPI';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SummerPartnerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [partner, setPartner] = useState<Partnership | null>(null);
  const [loading, setLoading] = useState(true);

  // Inquiry mock state
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        if (!id) return;
        const res = await partnershipAPI.getPublicById(id);
        setPartner(res.data?.partnership || res.partnership);
      } catch (err) {
        console.error('Error fetching partner details:', err);
        toast.error('Failed to load partner details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPartner();
  }, [id]);

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName || !inquiryEmail || !inquiryMsg) {
      toast.error('Please fill out all fields.');
      return;
    }
    setSendingInquiry(true);
    setTimeout(() => {
      toast.success(`Inquiry sent to ${partner?.organization || partner?.name}!`);
      setSendingInquiry(false);
      setInquiryName('');
      setInquiryEmail('');
      setInquiryMsg('');
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-neutral-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-neutral-50 p-4">
        <span className="text-6xl mb-6">🏝️</span>
        <h2 className="text-2xl font-display font-bold text-neutral-900 mb-4">Partner Not Found</h2>
        <p className="text-neutral-500 max-w-md mx-auto text-center mb-8">
          We couldn't find the summer partner you're looking for. It might have been removed or the link is invalid.
        </p>
        <Link
          to="/summer-partners"
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-all text-sm"
        >
          Back to Directory
        </Link>
      </div>
    );
  }

  const badgeClass = "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-800 antialiased pb-16 pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-neutral-500 mb-8 pt-4">
          <Link to="/" className="hover:text-amber-600 transition-colors">Home</Link>
          <FaChevronRight className="text-[10px]" />
          <Link to="/summer-partners" className="hover:text-amber-600 transition-colors">Summer Directory</Link>
          <FaChevronRight className="text-[10px]" />
          <span className="text-neutral-800 font-medium truncate">{partner.organization || partner.name}</span>
        </div>

        {/* Back button */}
        <Link
          to="/summer-partners"
          className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-amber-600 transition-colors mb-8"
        >
          <FaArrowLeft /> Back to Directory
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-soft overflow-hidden">
              {/* Header Banner */}
              <div className="h-32 bg-gradient-to-r from-amber-400 to-orange-500 relative">
                 <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff2c_1px,transparent_1px),linear-gradient(to_bottom,#ffffff2c_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
              </div>

              <div className="p-8 -mt-10 relative">
                <div className="bg-white p-2 rounded-2xl inline-block shadow-md mb-4">
                   <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-3xl">
                     <FaSun />
                   </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className={`inline-block text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${badgeClass}`}>
                    {partner.partnershipType.replace('_', ' ')}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <FaCheckCircle className="text-emerald-500" /> Verified Summer Partner
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-display font-black text-neutral-900 leading-tight mb-2">
                  {partner.organization || partner.name}
                </h1>

                {/* Info Metadata */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6 text-sm text-neutral-600">
                  <div className="flex items-center gap-2 font-medium">
                    <FaUsers className="text-neutral-400" />
                    <span>Contact: {partner.name}</span>
                  </div>
                  {partner.emirate && (
                    <div className="flex items-center gap-2 font-medium">
                      <FaMapPin className="text-neutral-400" />
                      <span>{partner.emirate}</span>
                    </div>
                  )}
                  {partner.ageGroups && partner.ageGroups.length > 0 && (
                    <div className="flex items-center gap-2 font-medium">
                       <FaInfoCircle className="text-neutral-400" />
                       <span>Ages: {partner.ageGroups.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-soft">
              <h2 className="font-display font-extrabold text-neutral-900 text-xl mb-4 flex items-center gap-2">
                <FaInfoCircle className="text-amber-500" /> About the Program
              </h2>
              <div className="prose prose-neutral max-w-none text-neutral-600 leading-relaxed whitespace-pre-wrap font-medium">
                {(partner.campDetails || partner.notes || partner.message || "No specific details provided yet.").replace(/<[^>]*>?/gm, '')}
              </div>
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-soft">
              <h3 className="font-display font-bold text-neutral-900 text-lg mb-4">Contact Information</h3>
              <div className="space-y-4">
                {partner.email && (
                  <a href={`mailto:${partner.email}`} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                      <FaEnvelope />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email</p>
                      <p className="text-sm font-semibold text-neutral-700 truncate group-hover:text-blue-600 transition-colors">{partner.email}</p>
                    </div>
                  </a>
                )}
                {partner.phone && (
                  <a href={`tel:${partner.phone}`} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                      <FaPhone />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Phone</p>
                      <p className="text-sm font-semibold text-neutral-700 truncate group-hover:text-emerald-600 transition-colors">{partner.phone}</p>
                    </div>
                  </a>
                )}
                {partner.website && (
                  <a href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
                      <FaGlobe />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Website</p>
                      <p className="text-sm font-semibold text-neutral-700 truncate group-hover:text-purple-600 transition-colors">{partner.website.replace(/(^\w+:|^)\/\//, '')}</p>
                    </div>
                  </a>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-soft">
              <h3 className="font-display font-bold text-neutral-900 text-lg mb-4">Send Direct Inquiry</h3>
              <form onSubmit={handleSendInquiry} className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    required
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
                    placeholder="Your Email"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <textarea
                    required
                    value={inquiryMsg}
                    onChange={(e) => setInquiryMsg(e.target.value)}
                    rows={4}
                    placeholder="Your message..."
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingInquiry}
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
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
    </div>
  );
};

export default SummerPartnerDetailPage;
