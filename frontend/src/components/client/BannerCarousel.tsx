import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeenSlider } from 'keen-slider/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'keen-slider/keen-slider.min.css';
import { Banner } from '../../services/api/bannerAPI';

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

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: banners.length > 1,
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
    banners.length > 1 ? [AutoplayPlugin] : []
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

  if (!banners || banners.length === 0) {
    return null; // Don't show carousel if no banners
  }

  return (
    <div className="relative w-full bg-gray-50">
      <div ref={sliderRef} className="keen-slider">
        {banners.map((banner, index) => (
          <div
            key={banner._id}
            className="keen-slider__slide relative w-full h-auto md:aspect-[16/7] md:min-h-[650px] md:max-h-[100vh]"
          >
            {/* Banner Image */}
            <img
              src={banner.imageAsset.url}
              alt={banner.title}
              className="w-full h-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />

            {/* Overlay with gradient for text readability */}
            <div className="absolute" />

            {/* Text Overlay */}
            {(banner.titleVisible && banner.title || banner.description || banner.ctaText) && (
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-6 md:px-12 lg:px-20">
                  <div className="max-w-2xl">
                    {banner.titleVisible && banner.title && (
                      <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                        {banner.title}
                      </h2>
                    )}
                    {banner.description && (
                      <p className="text-lg md:text-xl text-white/90 mb-6 leading-relaxed">
                        {banner.description}
                      </p>
                    )}
                    {banner.ctaText && banner.ctaLink && (
                      <button
                        onClick={(e) => handleCtaClick(e, banner)}
                        className="inline-block px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
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
      {loaded && instanceRef.current && banners.length > 1 && (
        <>
          <button
            onClick={() => instanceRef.current?.prev()}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-10"
            aria-label="Previous banner"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={() => instanceRef.current?.next()}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-10"
            aria-label="Next banner"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {loaded && banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                idx === currentSlide
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
