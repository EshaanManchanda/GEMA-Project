import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Share2, Volume2, VolumeX, Calendar } from 'lucide-react';
import reelsAPI, { Reel } from '../../services/api/reelsAPI';
import logger from '../../utils/logger';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { FaPlay, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface ReelsFeedProps {
  reels: Reel[];
  onLike?: (reelId: string) => Promise<void>;
  onShare?: (reelId: string) => void;
  variant?: 'feed' | 'slider';
  title?: string;
  onReachEnd?: () => void;
  isLoadingMore?: boolean;
}

const ReelsFeed: React.FC<ReelsFeedProps> = ({ reels, onLike, onShare, variant = 'feed', title = 'Trending Reels', onReachEnd, isLoadingMore }) => {
  const navigate = useNavigate();

  // ==========================================
  // SHARED LOGIC (Like, Share)
  // ==========================================
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [localLikes, setLocalLikes] = useState<Map<string, number>>(new Map());
  const [openEventReelId, setOpenEventReelId] = useState<string | null>(null);

  // Initialize local likes from reels data
  useEffect(() => {
    const likesMap = new Map<string, number>();
    reels.forEach(reel => {
      likesMap.set(reel._id, reel.likes);
    });
    setLocalLikes(likesMap);
  }, [reels]);

  // Helper function to extract YouTube video ID
  const extractYouTubeId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/,
      /youtube\.com\/embed\/([^?/]+)/
    ];

    for (const pattern of patterns) {
      if (!url) continue;
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return '';
  };

  const getThumbnail = (reel: Reel) => {
    if (reel.thumbnailAsset?.url) return reel.thumbnailAsset.url;
    if (reel.videoAsset?.thumbnailUrl) return reel.videoAsset.thumbnailUrl;
    if (reel.videoSourceType === 'youtube' && reel.externalVideoUrl) {
      const videoId = extractYouTubeId(reel.externalVideoUrl);
      if (videoId) return `https://img.youtube.com/vi/${videoId}/0.jpg`;
    }
    return '/assets/images/placeholder-reel.jpg';
  };

  // ==========================================
  // SLIDER VARIANT LOGIC
  // ==========================================
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    initial: 0,
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
    slides: {
      perView: 1.5,
      spacing: 15,
    },
    breakpoints: {
      '(min-width: 480px)': {
        slides: { perView: 2.5, spacing: 15 },
      },
      '(min-width: 768px)': {
        slides: { perView: 3.5, spacing: 20 },
      },
      '(min-width: 1024px)': {
        slides: { perView: 4.5, spacing: 25 },
      },
      '(min-width: 1280px)': {
        slides: { perView: 5.5, spacing: 30 },
      },
    },
  });


  // ==========================================
  // FEED VARIANT LOGIC
  // ==========================================
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const viewTracked = useRef<Set<string>>(new Set());


  // Intersection Observer for autoplay and view tracking
  useEffect(() => {
    if (variant !== 'feed') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const reelId = video.dataset.reelId;

          if (entry.isIntersecting) {
            video.play().catch(() => { });

            if (reelId && !viewTracked.current.has(reelId)) {
              viewTracked.current.add(reelId);
              setTimeout(() => {
                reelsAPI.incrementView(reelId).catch(() => { });
              }, 1000);
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.75 }
    );

    videoRefs.current.forEach(video => {
      if (video) observer.observe(video);
    });

    return () => {
      observer.disconnect();
    };
  }, [reels, variant]);

  const handleLike = async (reel: Reel) => {
    const isLiked = likedReels.has(reel._id);
    const newLikedReels = new Set(likedReels);
    if (isLiked) {
      newLikedReels.delete(reel._id);
    } else {
      newLikedReels.add(reel._id);
    }
    setLikedReels(newLikedReels);

    const currentLikes = localLikes.get(reel._id) || reel.likes;
    const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;
    setLocalLikes(new Map(localLikes).set(reel._id, newLikes));

    try {
      const result = await reelsAPI.toggleLike(reel._id, !isLiked);
      setLocalLikes(new Map(localLikes).set(reel._id, result.likes));
      if (onLike) await onLike(reel._id);
    } catch (error) {
      setLikedReels(likedReels);
      setLocalLikes(new Map(localLikes).set(reel._id, currentLikes));
    }
  };

  const handleShare = async (reel: Reel) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.title,
          text: reel.description || reel.title,
          url: `${window.location.origin}/reels/${reel._id}`
        });
        if (onShare) onShare(reel._id);
      } catch (error) {
        logger.debug('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/reels/${reel._id}`);
      alert('Link copied to clipboard!');
    }
  };

  const setVideoRef = useCallback((index: number, element: HTMLVideoElement | null) => {
    if (element) {
      videoRefs.current.set(index, element);
    } else {
      videoRefs.current.delete(index);
    }
  }, []);

  if (!reels || reels.length === 0) {
    if (variant === 'slider') return null;
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Reels Yet</h3>
          <p className="text-gray-600">Check back later for amazing content!</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: SLIDER VARIANT
  // ==========================================
  if (variant === 'slider') {
    const sliderReels = reels.filter(r => r.videoAsset?.url || r.externalVideoUrl || r.thumbnailAsset?.url || r.videoAsset?.thumbnailUrl).slice(0, 10);

    if (sliderReels.length === 0) return null;

    return (
      <section className="py-12 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight">{title}</h2>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 font-medium">Short videos from our community</p>
            </div>
            <button
              onClick={() => navigate('/reels')}
              className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
            >
              View All <FaChevronRight size={12} />
            </button>
          </div>

          <div className="relative group/slider">
            <div ref={sliderRef} className="keen-slider -mx-4 px-4 py-8">
              {sliderReels.map((reel) => (
                <div
                  key={reel._id}
                  className="keen-slider__slide group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ring-1 ring-black/5"
                  onClick={() => navigate(`/reels`)}
                >
                  <img
                    src={getThumbnail(reel)}
                    alt={reel.title}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x533?text=Reel';
                    }}
                  />

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80 opacity-90" />

                  {/* Play Icon (Centered) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300">
                      <FaPlay className="text-primary-600 ml-1" size={20} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 transform transition-transform duration-300">
                    <h3 className="text-white font-bold text-lg line-clamp-2 mb-2 leading-tight drop-shadow-md">{reel.title}</h3>
                    <div className="flex items-center justify-between text-white/90 text-xs font-medium">
                      <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span>{reel.viewsCount.toLocaleString()} views</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            {loaded && instanceRef.current && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    instanceRef.current?.prev();
                  }}
                  className={`absolute -left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-gray-800 transition-all duration-300 opacity-0 group-hover/slider:opacity-100 hover:scale-110 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 ${currentSlide === 0 ? 'hidden' : ''
                    }`}
                  aria-label="Previous slide"
                >
                  <FaChevronLeft size={16} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    instanceRef.current?.next();
                  }}
                  className={`absolute -right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100 flex items-center justify-center text-gray-800 transition-all duration-300 opacity-0 group-hover/slider:opacity-100 hover:scale-110 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 ${currentSlide === (instanceRef.current.track.details?.slides.length || 0) - 1 ? 'hidden' : ''
                    }`}
                  aria-label="Next slide"
                >
                  <FaChevronRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Infinite scroll sentinel for feed variant
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (variant !== 'feed' || !onReachEnd) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onReachEnd(); },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant, onReachEnd]);

  // ==========================================
  // RENDER: FEED VARIANT (Original)
  // ==========================================
  return (
    <div className="reels-container h-full w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollasm">
      <style>{`
        .reels-container {
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .reels-container::-webkit-scrollbar {
          display: none;
        }
        .reel-item {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
      `}</style>

      {reels.map((reel, index) => (
        <div
          key={reel._id}
          className="reel-item h-[100dvh] w-full snap-start relative flex items-center justify-center bg-black overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />

          {reel.videoSourceType === 'uploaded' && reel.videoAsset && (
            <video
              ref={(el) => setVideoRef(index, el)}
              data-reel-id={reel._id}
              src={reel.videoAsset.url}
              poster={reel.thumbnailAsset?.url || reel.videoAsset.thumbnailUrl}
              className="w-full h-full object-cover"
              loop
              muted={muted}
              playsInline
              preload="metadata"
            />
          )}

          {reel.videoSourceType === 'youtube' && reel.externalVideoUrl && (
            <div className="w-full h-full pointer-events-none">
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(reel.externalVideoUrl)}?autoplay=1&mute=${muted ? '1' : '0'}&loop=1&playlist=${extractYouTubeId(reel.externalVideoUrl)}&controls=0&showinfo=0&rel=0`}
                className="w-full h-full pointer-events-auto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}

          {reel.videoSourceType === 'instagram' && reel.videoAsset && (
            <video
              ref={(el) => setVideoRef(index, el)}
              data-reel-id={reel._id}
              src={reel.videoAsset.url}
              poster={reel.thumbnailAsset?.url || reel.videoAsset.thumbnailUrl}
              className="w-full h-full object-cover"
              loop
              muted={muted}
              playsInline
              preload="metadata"
            />
          )}

          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20" />

          {reel.showTitle && (
            <div className="absolute bottom-0 left-0 right-0 pt-24 pb-8 px-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto z-20">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                      <span className="text-xs font-bold text-white">KD</span>
                    </div>
                  </div>
                  <span className="text-white font-semibold text-sm drop-shadow-md">KidzReels</span>
                  <button className="px-3 py-1 rounded-full border border-white/30 text-xs font-medium text-white hover:bg-white/10 transition-colors backdrop-blur-sm">
                    Follow
                  </button>
                </div>

                <h3 className="text-white text-lg font-bold mb-2 drop-shadow-lg leading-snug">
                  {reel.title}
                </h3>
                {reel.description && (
                  <p className="text-white/90 text-sm line-clamp-2 drop-shadow-md font-light mb-3">
                    {reel.description}
                  </p>
                )}
                {reel.tags && reel.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {reel.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-medium text-white/90 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="absolute right-4 bottom-28 flex flex-col gap-6 pointer-events-auto z-30">
            {reel.showLikeButton && (
              <button
                onClick={() => handleLike(reel)}
                className="flex flex-col items-center group"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-active:scale-90 transition-all duration-200 border border-white/10 group-hover:bg-black/60">
                  <Heart
                    className={`w-6 h-6 transition-all duration-300 ${likedReels.has(reel._id)
                      ? 'fill-red-500 text-red-500 scale-110'
                      : 'text-white group-hover:scale-110'
                      }`}
                  />
                </div>
                <span className="text-white text-xs mt-1.5 font-medium drop-shadow-lg">
                  {(localLikes.get(reel._id) || reel.likes).toLocaleString()}
                </span>
              </button>
            )}

            {reel.showShareButton && (
              <button
                onClick={() => handleShare(reel)}
                className="flex flex-col items-center group"
              >
                <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-active:scale-90 transition-all duration-200 border border-white/10 group-hover:bg-black/60">
                  <Share2 className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <span className="text-white text-xs mt-1.5 font-medium drop-shadow-lg">
                  Share
                </span>
              </button>
            )}

            {reel.linkedEvent && (
              <button
                onClick={() => setOpenEventReelId(openEventReelId === reel._id ? null : reel._id)}
                className="flex flex-col items-center group"
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 backdrop-blur-md flex items-center justify-center group-active:scale-90 transition-all duration-200 shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 ${openEventReelId === reel._id ? 'ring-2 ring-orange-300 scale-110' : ''}`}>
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1.5 font-semibold drop-shadow-lg">
                  Event
                </span>
              </button>
            )}

            <button
              onClick={() => setMuted(!muted)}
              className="flex flex-col items-center group"
            >
              <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center group-active:scale-90 transition-all duration-200 border border-white/10 group-hover:bg-black/60">
                {muted ? (
                  <VolumeX className="w-6 h-6 text-white" />
                ) : (
                  <Volume2 className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
          </div>

          <div className="absolute top-8 left-6 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-none z-20 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-semibold tracking-wide">
              {reel.viewsCount.toLocaleString()} views
            </span>
          </div>

          {/* Event info overlay — slides up when Calendar button tapped */}
          {reel.linkedEvent && (
            <div
              className={`absolute left-0 right-0 bottom-0 z-40 pointer-events-auto transition-transform duration-300 ease-out ${
                openEventReelId === reel._id ? 'translate-y-0' : 'translate-y-full'
              }`}
            >
              <div className="mx-3 mb-3 rounded-2xl overflow-hidden backdrop-blur-xl bg-black/70 border border-white/10 shadow-2xl">
                {/* Header strip */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-white/70 text-xs font-medium uppercase tracking-wider">Linked Event</span>
                  </div>
                  <button
                    onClick={() => setOpenEventReelId(null)}
                    className="text-white/50 hover:text-white transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Event details */}
                <div className="px-4 py-3">
                  <h4 className="text-white font-bold text-base leading-tight mb-2.5 line-clamp-2">
                    {reel.linkedEvent.title}
                  </h4>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
                    {/* Location */}
                    {reel.linkedEvent.location?.city && (
                      <div className="flex items-center gap-1.5 text-white/70">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs font-medium">{reel.linkedEvent.location.city}</span>
                      </div>
                    )}

                    {/* Date */}
                    {reel.linkedEvent.dateSchedule?.[0] && (
                      <div className="flex items-center gap-1.5 text-white/70">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium">
                          {new Date(reel.linkedEvent.dateSchedule[0].startDate || reel.linkedEvent.dateSchedule[0].date).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}

                    {/* Price */}
                    {reel.linkedEvent.pricing && (
                      <div className="flex items-center gap-1.5 text-orange-400">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-semibold">
                          {reel.linkedEvent.pricing.isFree
                            ? 'Free'
                            : reel.linkedEvent.pricing.basePrice != null
                              ? `${reel.linkedEvent.pricing.currency || 'AED'} ${reel.linkedEvent.pricing.basePrice}`
                              : 'See pricing'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA button */}
                  <button
                    onClick={() => navigate(`/events/${reel.linkedEvent!.slug}`)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Visit Event
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      {onReachEnd && (
        <div ref={sentinelRef} className="h-[50vh] snap-start flex items-center justify-center bg-black">
          {isLoadingMore && (
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white" />
          )}
        </div>
      )}
    </div>
  );
};

export default ReelsFeed;
