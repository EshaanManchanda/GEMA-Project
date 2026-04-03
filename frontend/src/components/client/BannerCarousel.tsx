import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeenSlider } from 'keen-slider/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'keen-slider/keen-slider.min.css';
import { Banner } from '../../services/api/bannerAPI';
import { getCloudinaryWebP, generateSrcSet, getLQIP } from '@/utils/cloudinaryHelpers';

// Autoplay plugin with 5-second interval
const AutoplayPlugin = (slider: any) => {
  let timeout: NodeJS.Timeout;
  let mouseOver = false;

  function clearNextTimeout() {
    clearTimeout(timeout);
  }

  function nextTimeout() {
    clearTimeout(timeout);
    if (mouseOver) return;
    timeout = setTimeout(() => {
      slider.next();
    }, 5000); // 5-second interval
  }

  slider.on("created", () => {
    slider.container.addEventListener("mouseover", () => {
      mouseOver = true;
      clearNextTimeout();
    });
    slider.container.addEventListener("mouseout", () => {
      mouseOver = false;
      nextTimeout();
    });
    nextTimeout();
  });

  slider.on("animationEnded", nextTimeout);
  slider.on("updated", nextTimeout);
};

interface BannerCarouselProps {
  banners: Banner[];
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({ banners }) => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<{ [key: number]: boolean }>({});

  // Filter out banners with missing imageAsset early for slider config
  const validBanners = banners.filter(b => b.imageAsset?.url);

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: validBanners.length > 1,
      slides: {
        perView: 1,
        spacing: 0,
      },
      slideChanged(slider) {
        setCurrentSlide(slider.track.details.rel);
      },
      created() {
        setLoaded(true);
      },
    },
    validBanners.length > 1 ? [AutoplayPlugin] : []
  );

  const handleBannerClick = (banner: Banner) => {
    if (banner.link) {
      if (banner.link.startsWith('http')) {
        window.open(banner.link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(banner.link);
      }
    }
  };

  const handleCtaClick = (e: React.MouseEvent, banner: Banner) => {
    e.stopPropagation(); // Prevent banner link from firing
    if (banner.ctaLink) {
      if (banner.ctaLink.startsWith('http')) {
        window.open(banner.ctaLink, '_blank', 'noopener,noreferrer');
      } else {
        navigate(banner.ctaLink);
      }
    }
  };

  if (!validBanners || validBanners.length === 0) {
    return null; // Don't show carousel if no valid banners
  }

  return (
    <div className="relative w-full bg-gray-50">
      <div ref={sliderRef} className="keen-slider">
        {validBanners.map((banner, index) => (
          <div
            key={banner._id}
            className="keen-slider__slide relative w-full aspect-video sm:aspect-auto sm:h-[55vh] md:h-[65vh] lg:h-[70vh] max-h-[800px]"
          >
            {/* Blurred background fill — only for explicitly 'contain' banners */}
            {banner.objectFit === 'contain' && (
              <img
                src={banner.imageAsset?.url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
              />
            )}

            {/* Banner Image with WebP optimization */}
            <picture className="block absolute inset-0 w-full h-full">
              {/* LQIP as background for perceived performance */}
              {getLQIP(banner.imageAsset?.url) && !imageLoaded[index] && (
                <img
                  src={getLQIP(banner.imageAsset?.url)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-sm"
                  aria-hidden="true"
                />
              )}

              {/* WebP source with responsive srcSet */}
              <source
                type="image/webp"
                srcSet={generateSrcSet(banner.imageAsset?.url, [1920, 1280, 768])}
                sizes="100vw"
              />

              {/* Fallback to original format */}
              <img
                src={getCloudinaryWebP(banner.imageAsset?.url, 1920)}
                alt={banner.title}
                className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
                  banner.objectFit === 'contain' ? 'object-contain' :
                  banner.objectFit === 'fill' ? 'object-fill' : 'object-cover'
                } ${imageLoaded[index] ? 'opacity-100' : 'opacity-0'}`}
                style={{ objectPosition: banner.objectPosition || 'center' }}
                loading={index === 0 ? 'eager' : 'lazy'}
                // @ts-expect-error - React 18 warning requires lowercase fetchpriority, but types are not updated yet
                fetchpriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                width="1920"
                height="600"
                onLoad={() => setImageLoaded(prev => ({ ...prev, [index]: true }))}
              />
            </picture>

            {/* Overlay with gradient for text readability */}
            <div className="absolute" />

            {/* Text Overlay */}
            {(banner.titleVisible && banner.title || banner.descriptionVisible && banner.description || banner.ctaVisible && banner.ctaText) && (
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-4 sm:px-6 md:px-12 lg:px-20">
                  <div className="max-w-2xl">
                    {banner.titleVisible && banner.title && (
                      <h2 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                        {banner.title}
                      </h2>
                    )}
                    {banner.descriptionVisible && banner.description && (
                      <p className="text-sm sm:text-base md:text-xl text-white/90 mb-4 sm:mb-6 leading-relaxed">
                        {banner.description}
                      </p>
                    )}
                    {banner.ctaVisible && banner.ctaText && banner.ctaLink && (
                      <button
                        onClick={(e) => handleCtaClick(e, banner)}
                        className="inline-block px-4 py-2 sm:px-8 sm:py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm sm:text-lg rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        {banner.ctaText}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Click area for banner link */}
            {banner.link && (
              <div
                className="absolute inset-0 cursor-pointer"
                onClick={() => handleBannerClick(banner)}
                role="link"
                aria-label={`Go to ${banner.title}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {loaded && instanceRef.current && validBanners.length > 1 && (
        <>
          <button
            onClick={() => instanceRef.current?.prev()}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-10"
            aria-label="Previous banner"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={() => instanceRef.current?.next()}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-10"
            aria-label="Next banner"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {loaded && validBanners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {validBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${idx === currentSlide
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75'
                }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
