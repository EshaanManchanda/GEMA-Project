import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, Keyboard } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

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
  showThumbnails = false
}) => {
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
    <div className={className}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay, Keyboard]}
        navigation
        pagination={{ clickable: true }}
        autoplay={autoplay ? { delay: 5000, pauseOnMouseEnter: true, disableOnInteraction: false } : false}
        keyboard={{ enabled: true }}
        loop={images.length > 1}
        className="h-full w-full event-carousel"
        spaceBetween={0}
        slidesPerView={1}
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <img
              src={image}
              alt={`${alt} - Image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={onError}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ImageCarousel;
