import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { VendorSEO } from '@/components/common/SEO';
import vendorAPI from '@/services/api/vendorAPI';
import reviewsAPI from '@/services/api/reviewsAPI';
import { getEventImage, generateFallbackImage } from '@/utils/imageFallbacks';

const StarRating: React.FC<{ rating: number; size?: string }> = ({ rating, size = 'w-4 h-4' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} className={`${size} ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const VendorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [userData, setUserData] = useState<any>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'events' | 'reviews'>('about');

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const response = await vendorAPI.getPublicVendorProfile(id);
        setUserData(response.user);
        setVendorProfile(response.vendor);
        setEvents(response.events || []);
        setStats(response.stats || {});
        setError(null);
      } catch (err) {
        console.error('Error fetching vendor:', err);
        setError('Vendor not found or unavailable.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'reviews' || !id) return;
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const response = await reviewsAPI.getVendorReviews(id);
        setReviews(response.data?.reviews || response.reviews || []);
      } catch {
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [activeTab, id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-3">Vendor not found</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/vendors" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          Back to Vendors
        </Link>
      </div>
    );
  }

  const displayName = vendorProfile?.businessName || `${userData.firstName} ${userData.lastName}`;
  const avatar = userData.avatar;
  const description = vendorProfile?.description || '';
  const website = vendorProfile?.website || '';
  const socialMedia = vendorProfile?.socialMedia || {};
  const contactEmail = userData.email;
  const contactPhone = userData.phone || '';
  const locationCity = vendorProfile?.location?.city ||
    (typeof vendorProfile?.address === 'string' ? vendorProfile.address : vendorProfile?.address?.city) || '';
  const avgRating = vendorProfile?.stats?.averageRating || 0;
  const reviewCount = vendorProfile?.stats?.totalReviews || 0;
  const category = vendorProfile?.category;

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Vendors', url: '/vendors' },
    { name: displayName, url: `/vendors/${id}` },
  ];

  // Minimal vendor shape for SEO
  const vendorSeoData = {
    name: displayName,
    logo: avatar,
    description: description || '',
    categories: [],
    location: locationCity,
    id,
  };

  return (
    <>
      <VendorSEO vendor={vendorSeoData} breadcrumbs={breadcrumbs} />
      <div className="container mx-auto px-4 py-8">

        {/* Hero */}
        <div className="relative rounded-xl overflow-hidden mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 h-48 md:h-64">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-indigo-500">
              {avatar ? (
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{displayName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {avgRating > 0 && (
                  <>
                    <StarRating rating={Math.round(avgRating)} />
                    <span className="text-white font-medium text-sm">{avgRating.toFixed(1)}</span>
                    <span className="text-white/70 text-sm">({reviewCount} reviews)</span>
                    <span className="text-white/50">•</span>
                  </>
                )}
                {locationCity && <span className="text-white/80 text-sm">{locationCity}</span>}
                {category && (
                  <>
                    <span className="text-white/50">•</span>
                    <span className="text-white/80 text-sm">{category}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {(['about', 'events', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'events' ? `Events (${events.length})` :
                 tab === 'reviews' ? `Reviews (${reviewCount})` : tab}
              </button>
            ))}
          </nav>
        </div>

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-3">About {displayName}</h2>
                {description ? (
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    {description.split('\n\n').map((p: string, i: number) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No description provided.</p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Events', value: stats.totalEvents ?? 0 },
                  { label: 'Bookings', value: stats.totalBookings ?? 0 },
                  { label: 'Reviews', value: reviewCount },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{value}</div>
                    <div className="text-sm text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Sidebar */}
            <div className="bg-gray-50 p-6 rounded-xl space-y-4">
              <h3 className="text-lg font-bold">Contact</h3>

              {locationCity && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Location</p>
                  <p className="mt-1 text-gray-800">{locationCity}</p>
                </div>
              )}
              {contactEmail && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</p>
                  <a href={`mailto:${contactEmail}`} className="mt-1 block text-primary hover:underline truncate">
                    {contactEmail}
                  </a>
                </div>
              )}
              {contactPhone && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Phone</p>
                  <a href={`tel:${contactPhone}`} className="mt-1 block text-primary hover:underline">
                    {contactPhone}
                  </a>
                </div>
              )}
              {website && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Website</p>
                  <a href={website} target="_blank" rel="noopener noreferrer"
                    className="mt-1 block text-primary hover:underline truncate">
                    {website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}

              {/* Social Media */}
              {(socialMedia.facebook || socialMedia.twitter || socialMedia.instagram || socialMedia.linkedin) && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Social</p>
                  <div className="flex gap-3">
                    {socialMedia.facebook && (
                      <a href={socialMedia.facebook} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                        </svg>
                      </a>
                    )}
                    {socialMedia.twitter && (
                      <a href={socialMedia.twitter} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-400 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                        </svg>
                      </a>
                    )}
                    {socialMedia.instagram && (
                      <a href={socialMedia.instagram} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-pink-600 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                        </svg>
                      </a>
                    )}
                    {socialMedia.linkedin && (
                      <a href={socialMedia.linkedin} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-700 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Events by {displayName}</h2>
            {events.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 font-medium">No published events</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event: any) => {
                  const eventLink = `/events/${event.slug || event._id}`;
                  const firstDate = event.dateSchedule?.[0]?.date || event.dateSchedule?.[0]?.startDate;
                  const eventLocation = event.location?.city && event.location?.address
                    ? `${event.location.address}, ${event.location.city}`
                    : event.location?.city || event.location?.address || 'Location TBD';
                  return (
                    <Link key={event._id} to={eventLink}
                      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200 block">
                      <div className="relative h-44 overflow-hidden bg-gray-100">
                        <img
                          src={getEventImage(event.images, event.title, 400, 300)}
                          alt={event.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = generateFallbackImage(event.title, 400, 300);
                            if (target.src !== fallback) target.src = fallback;
                          }}
                        />
                        {event.price != null && (
                          <div className="absolute top-2 right-2 bg-primary text-white px-2.5 py-1 rounded-full text-xs font-semibold">
                            {event.price === 0 ? 'Free' : new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: event.currency || 'USD',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(event.price)}
                          </div>
                        )}
                        {event.category && (
                          <div className="absolute bottom-2 left-2 bg-white/90 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {event.category}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{event.title}</h3>
                        {firstDate && (
                          <div className="flex items-center text-gray-500 text-sm mb-1.5">
                            <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(firstDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                        <div className="flex items-center text-gray-500 text-sm">
                          <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{eventLocation}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Reviews</h2>
            {loadingReviews ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-gray-500 font-medium">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div key={review._id} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {review.user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">
                          {review.user?.firstName} {review.user?.lastName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={review.rating} />
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.title && <p className="font-medium text-gray-800 mt-2">{review.title}</p>}
                        {review.comment && <p className="text-gray-700 mt-1 leading-relaxed">{review.comment}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default VendorPage;
