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
  FaSun,
  FaFilePdf,
  FaInstagram,
  FaFacebook,
  FaYoutube,
  FaPlayCircle,
  FaDownload
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
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 p-4">
        <span className="text-6xl mb-6">🏝️</span>
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-4">Partner Not Found</h2>
        <p className="text-slate-500 max-w-md mx-auto text-center mb-8">
          We couldn't find the summer partner you're looking for. It might have been removed or the link is invalid.
        </p>
        <Link
          to="/summer-partners"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm"
        >
          Back to Directory
        </Link>
      </div>
    );
  }

  const badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased pb-16 pt-20">
      
      {/* Dynamic Header Banner Background */}
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden -z-10 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
         {/* Subtle pattern overlay */}
         <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:40px_40px]"></div>
         <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-50 to-transparent"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-300 mb-6 pt-4 font-medium">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <FaChevronRight className="text-[10px]" />
          <Link to="/summer-partners" className="hover:text-white transition-colors">Summer Directory</Link>
          <FaChevronRight className="text-[10px]" />
          <span className="text-white truncate">{partner.organization || partner.name}</span>
        </div>

        {/* Back button */}
        <Link
          to="/summer-partners"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-200 hover:text-white transition-colors mb-12"
        >
          <FaArrowLeft /> Back to Directory
        </Link>

        {/* Hero Profile Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/40 shadow-2xl overflow-hidden mb-12">
          <div className="p-8 sm:p-12 md:flex gap-8 items-center relative">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-[2rem] flex items-center justify-center text-6xl shadow-inner shrink-0 mb-6 md:mb-0 transform rotate-3">
              {partner.images && partner.images.length > 0 ? (
                 <img src={partner.images[0].url} alt={partner.organization || partner.name} className="w-full h-full object-cover rounded-[2rem] shadow-sm transform -rotate-3" />
              ) : (
                 <FaSun className="transform -rotate-3" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`inline-block text-[10px] sm:text-xs font-bold px-4 py-1.5 rounded-full border uppercase tracking-wider ${badgeClass}`}>
                  {partner.partnershipType.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm">
                  <FaCheckCircle className="text-emerald-500" /> Premium Partner
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 leading-tight mb-4 tracking-tight">
                {partner.organization || partner.name}
              </h1>

              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm md:text-base text-slate-600 font-medium">
                {partner.emirate && (
                  <div className="flex items-center gap-2">
                    <FaMapPin className="text-indigo-400" />
                    <span>{partner.emirate}</span>
                  </div>
                )}
                {partner.ageGroups && partner.ageGroups.length > 0 && (
                  <div className="flex items-center gap-2">
                     <FaUsers className="text-indigo-400" />
                     <span>Ages: {partner.ageGroups.join(', ')}</span>
                  </div>
                )}
                {partner.numberOfKids && (
                  <div className="flex items-center gap-2">
                     <FaInfoCircle className="text-indigo-400" />
                     <span>Capacity: {partner.numberOfKids} Kids</span>
                  </div>
                )}
              </div>
            </div>

            {/* Social Links Quick Access */}
            <div className="hidden lg:flex flex-col gap-3 absolute top-12 right-12">
               {partner.socialMedia?.instagram && (
                 <a href={partner.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-pink-600 shadow-md hover:scale-110 transition-transform">
                   <FaInstagram size={20} />
                 </a>
               )}
               {partner.socialMedia?.facebook && (
                 <a href={partner.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-md hover:scale-110 transition-transform">
                   <FaFacebook size={20} />
                 </a>
               )}
               {partner.socialMedia?.youtube && (
                 <a href={partner.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600 shadow-md hover:scale-110 transition-transform">
                   <FaYoutube size={20} />
                 </a>
               )}
            </div>
          </div>
        </div>

        {/* Two Column Layout for Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* About Section */}
            <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
              <h2 className="font-display font-extrabold text-slate-900 text-2xl mb-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg"><FaInfoCircle /></span> 
                About the Program
              </h2>
              <div className="prose prose-slate prose-lg max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                {(partner.campDetails || partner.notes || partner.message || "No specific details provided yet.").replace(/<[^>]*>?/gm, '')}
              </div>
            </div>

            {/* Media Gallery (Images & Videos) */}
            {((partner.images && partner.images.length > 1) || (partner.videoAttachments && partner.videoAttachments.length > 0)) && (
              <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
                <h2 className="font-display font-extrabold text-slate-900 text-2xl mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg"><FaPlayCircle /></span> 
                  Media Gallery
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {/* Videos/Reels */}
                   {partner.videoAttachments?.map((video, idx) => (
                      <div key={idx} className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 group">
                         {video.url.includes('instagram.com') ? (
                            <div className="flex items-center justify-center h-full flex-col">
                               <FaInstagram className="text-white/50 text-5xl mb-2" />
                               <a href={video.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-white font-medium text-sm transition-colors">Watch Reel</a>
                            </div>
                         ) : (
                            <div className="flex items-center justify-center h-full flex-col">
                               <FaPlayCircle className="text-white/50 text-5xl mb-2" />
                               <a href={video.url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-white font-medium text-sm transition-colors">Watch Video</a>
                            </div>
                         )}
                      </div>
                   ))}
                   {/* Extra Images */}
                   {partner.images?.slice(1).map((img, idx) => (
                      <div key={idx} className="relative rounded-2xl overflow-hidden aspect-video group">
                         <img src={img.url} alt={img.caption || 'Gallery Image'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         {img.caption && (
                            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent text-white text-sm font-medium">
                               {img.caption}
                            </div>
                         )}
                      </div>
                   ))}
                </div>
              </div>
            )}
            
            {/* Downloadable Documents */}
            {partner.documentAttachments && partner.documentAttachments.length > 0 && (
              <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm">
                <h2 className="font-display font-extrabold text-slate-900 text-2xl mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg"><FaFilePdf /></span> 
                  Resources & Brochures
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {partner.documentAttachments.map((doc, idx) => (
                     <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all group bg-slate-50 hover:bg-white">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                           <FaFilePdf size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-slate-900 font-bold truncate">{doc.title || 'Promotional Document'}</p>
                           <p className="text-slate-500 text-xs mt-0.5">Click to view or download</p>
                        </div>
                        <FaDownload className="text-slate-400 group-hover:text-rose-500 shrink-0" />
                     </a>
                   ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            
            {/* Contact Information Card */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-0"></div>
              <h3 className="font-display font-extrabold text-slate-900 text-xl mb-6 relative z-10">Get in Touch</h3>
              
              <div className="space-y-5 relative z-10">
                {partner.phone && (
                  <a href={`tel:${partner.phone}`} className="flex items-center gap-4 group p-3 -m-3 rounded-xl hover:bg-emerald-50 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors shadow-sm">
                      <FaPhone size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                      <p className="text-base font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{partner.phone}</p>
                    </div>
                  </a>
                )}

                {partner.email && (
                  <a href={`mailto:${partner.email}`} className="flex items-center gap-4 group p-3 -m-3 rounded-xl hover:bg-blue-50 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors shadow-sm">
                      <FaEnvelope size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                      <p className="text-base font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{partner.email}</p>
                    </div>
                  </a>
                )}
                
                {partner.website && (
                  <a href={partner.website.startsWith('http') ? partner.website : `https://${partner.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group p-3 -m-3 rounded-xl hover:bg-purple-50 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors shadow-sm">
                      <FaGlobe size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Website</p>
                      <p className="text-base font-bold text-slate-800 truncate group-hover:text-purple-700 transition-colors">{partner.website.replace(/(^\w+:|^)\/\//, '')}</p>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* Direct Inquiry Form */}
            <div className="bg-indigo-600 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
               <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
              <h3 className="font-display font-extrabold text-white text-xl mb-6">Send Direct Inquiry</h3>
              <form onSubmit={handleSendInquiry} className="space-y-4 relative z-10">
                <div>
                  <input
                    type="text"
                    required
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all font-medium"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    required
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
                    placeholder="Your Email"
                    className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all font-medium"
                  />
                </div>
                <div>
                  <textarea
                    required
                    value={inquiryMsg}
                    onChange={(e) => setInquiryMsg(e.target.value)}
                    rows={4}
                    placeholder="How can we help?"
                    className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all font-medium resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingInquiry}
                  className="w-full py-4 bg-white hover:bg-slate-50 disabled:bg-white/50 text-indigo-700 font-extrabold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 mt-2"
                >
                  {sendingInquiry ? (
                    <>
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>Send Message</>
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
