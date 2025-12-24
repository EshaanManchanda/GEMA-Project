import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Share2, Volume2, VolumeX, Calendar } from 'lucide-react';
import reelsAPI, { Reel } from '../../services/api/reelsAPI';

interface ReelsFeedProps {
  reels: Reel[];
  onLike?: (reelId: string) => Promise<void>;
  onShare?: (reelId: string) => void;
}

const ReelsFeed: React.FC<ReelsFeedProps> = ({ reels, onLike, onShare }) => {
  const navigate = useNavigate();
  const [muted, setMuted] = useState(true);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [localLikes, setLocalLikes] = useState<Map<string, number>>(new Map());
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const viewTracked = useRef<Set<string>>(new Set());

  // Helper function to extract YouTube video ID
  const extractYouTubeId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/,
      /youtube\.com\/embed\/([^?/]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return '';
  };

  // Initialize local likes from reels data
  useEffect(() => {
    const likesMap = new Map<string, number>();
    reels.forEach(reel => {
      likesMap.set(reel._id, reel.likes);
    });
    setLocalLikes(likesMap);
  }, [reels]);

  // Load Instagram embed script for Instagram reels
  useEffect(() => {
    if (reels.some(r => r.videoSourceType === 'instagram')) {
      const script = document.createElement('script');
      script.src = '//www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [reels]);

  // Intersection Observer for autoplay and view tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const reelId = video.dataset.reelId;

          if (entry.isIntersecting) {
            // Play video when visible
            video.play().catch(() => {
              // Autoplay failed (browser policy), ignore
            });

            // Track view once per reel
            if (reelId && !viewTracked.current.has(reelId)) {
              viewTracked.current.add(reelId);
              // Debounce view tracking (wait 1 second before tracking)
              setTimeout(() => {
                reelsAPI.incrementView(reelId).catch(() => {
                  // Silently fail if view tracking fails
                });
              }, 1000);
            }
          } else {
            // Pause video when not visible
            video.pause();
          }
        });
      },
      { threshold: 0.75 } // Video must be 75% visible to play
    );

    // Observe all video elements
    videoRefs.current.forEach(video => {
      if (video) observer.observe(video);
    });

    return () => {
      observer.disconnect();
    };
  }, [reels]);

  const handleLike = async (reel: Reel) => {
    const isLiked = likedReels.has(reel._id);

    // Optimistic update
    const newLikedReels = new Set(likedReels);
    if (isLiked) {
      newLikedReels.delete(reel._id);
    } else {
      newLikedReels.add(reel._id);
    }
    setLikedReels(newLikedReels);

    // Update local likes count
    const currentLikes = localLikes.get(reel._id) || reel.likes;
    const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;
    setLocalLikes(new Map(localLikes).set(reel._id, newLikes));

    try {
      // Call API
      const result = await reelsAPI.toggleLike(reel._id, !isLiked);

      // Update with server response
      setLocalLikes(new Map(localLikes).set(reel._id, result.likes));

      // Call parent handler
      if (onLike) {
        await onLike(reel._id);
      }
    } catch (error) {
      // Revert on error
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

        if (onShare) {
          onShare(reel._id);
        }
      } catch (error) {
        // User cancelled share or share failed
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
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

  return (
    <div className="reels-container h-full overflow-y-scroll snap-y snap-mandatory bg-black">
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
          className="reel-item h-full w-full snap-start relative flex items-center justify-center bg-black"
        >
          {/* Uploaded Video */}
          {reel.videoSourceType === 'uploaded' && reel.videoAsset && (
            <video
              ref={(el) => setVideoRef(index, el)}
              data-reel-id={reel._id}
              src={reel.videoAsset.url}
              poster={reel.thumbnailAsset?.url || reel.videoAsset.thumbnailUrl}
              className="w-full h-full object-contain"
              loop
              muted={muted}
              playsInline
              preload="metadata"
            />
          )}

          {/* YouTube Embed */}
          {reel.videoSourceType === 'youtube' && reel.externalVideoUrl && (
            <iframe
              src={`https://www.youtube.com/embed/${extractYouTubeId(reel.externalVideoUrl)}?autoplay=1&mute=${muted ? '1' : '0'}&loop=1&playlist=${extractYouTubeId(reel.externalVideoUrl)}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}

          {/* Instagram Embed */}
          {reel.videoSourceType === 'instagram' && reel.externalVideoUrl && (
            <div className="w-full h-full overflow-auto bg-white flex items-center justify-center">
              <blockquote
                className="instagram-media"
                data-instgrm-permalink={reel.externalVideoUrl}
                data-instgrm-version="14"
              />
            </div>
          )}

          {/* Top gradient overlay */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

          {/* Bottom info panel - conditional */}
          {reel.showTitle && (
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 via-black/50 to-transparent pointer-events-auto">
              <div className="max-w-2xl">
                <h3 className="text-white text-xl font-bold mb-2 drop-shadow-lg">
                  {reel.title}
                </h3>
                {reel.description && (
                  <p className="text-white/90 text-sm line-clamp-2 drop-shadow-lg">
                    {reel.description}
                  </p>
                )}
                {reel.tags && reel.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {reel.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs text-white/80 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right side action buttons */}
          <div className="absolute right-4 bottom-24 flex flex-col gap-6 pointer-events-auto">
            {/* Like button - conditional */}
            {reel.showLikeButton && (
              <button
                onClick={() => handleLike(reel)}
                className="flex flex-col items-center transition-transform active:scale-90"
              >
                <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors">
                  <Heart
                    className={`w-7 h-7 transition-colors ${
                      likedReels.has(reel._id)
                        ? 'fill-red-500 text-red-500'
                        : 'text-white'
                    }`}
                  />
                </div>
                <span className="text-white text-xs mt-1 drop-shadow-lg font-medium">
                  {(localLikes.get(reel._id) || reel.likes).toLocaleString()}
                </span>
              </button>
            )}

            {/* Share button - conditional */}
            {reel.showShareButton && (
              <button
                onClick={() => handleShare(reel)}
                className="flex flex-col items-center transition-transform active:scale-90"
              >
                <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1 drop-shadow-lg font-medium">
                  Share
                </span>
              </button>
            )}

            {/* Book Event button - conditional, only if linkedEvent exists */}
            {reel.linkedEvent && (
              <button
                onClick={() => navigate(`/events/${reel.linkedEvent!.slug}`)}
                className="flex flex-col items-center transition-transform active:scale-90"
              >
                <div className="w-12 h-12 rounded-full bg-orange-500 backdrop-blur-sm flex items-center justify-center hover:bg-orange-600 transition-colors shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1 drop-shadow-lg font-semibold">
                  Book
                </span>
              </button>
            )}

            {/* Mute/Unmute toggle - always show */}
            <button
              onClick={() => setMuted(!muted)}
              className="flex flex-col items-center transition-transform active:scale-90"
            >
              <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors">
                {muted ? (
                  <VolumeX className="w-6 h-6 text-white" />
                ) : (
                  <Volume2 className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
          </div>

          {/* Views counter (subtle, top-left) */}
          <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-medium">
              {reel.viewsCount.toLocaleString()} views
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReelsFeed;
