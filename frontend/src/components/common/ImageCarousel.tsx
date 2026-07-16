import React, { useState } from 'react';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Autoplay plugin with 5-second interval (matches BannerCarousel.tsx pattern)
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
    }, 5000);
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

interface ImageCarouselProps {
  images: string[];
  alt: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  className?: string;
  autoplay?: boolean;
  showThumbnails?: boolean;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  alt,
  onError,
  className = '',
  autoplay = false,
  showThumbnails: _showThumbnails = false
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: images.length > 1,
      slides: { perView: 1, spacing: 0 },
      slideChanged(slider) {
        setCurrentSlide(slider.track.details.rel);
      },
      created() {
        setLoaded(true);
      },
    },
    autoplay && images.length > 1 ? [AutoplayPlugin] : []
  );

  // If no images or only one image, render single image without carousel controls
  if (!images || images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt={alt}
        className={`w-full h-full object-cover ${className}`}
        onError={onError}
        loading="eager"
      />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={sliderRef} className="keen-slider h-full w-full event-carousel">
        {images.map((image, index) => (
          <div key={index} className="keen-slider__slide">
            <img
              src={image}
              alt={`${alt} - Image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={onError}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {loaded && instanceRef.current && images.length > 1 && (
        <>
          <button
            onClick={() => instanceRef.current?.prev()}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-10"
            aria-label="Previous image"
          >
            <FaChevronLeft className="text-gray-800" />
          </button>
          <button
            onClick={() => instanceRef.current?.next()}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-10"
            aria-label="Next image"
          >
            <FaChevronRight className="text-gray-800" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => instanceRef.current?.moveToIdx(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentSlide
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/75'
                  }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;
