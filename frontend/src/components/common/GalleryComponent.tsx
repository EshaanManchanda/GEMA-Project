import React, { useState } from 'react';
import type { GalleryImage } from '../../services/api/reviewLinkAPI';

interface GalleryComponentProps {
  layout: 'grid' | 'messy';
  images: GalleryImage[];
  className?: string;
}

const GalleryComponent: React.FC<GalleryComponentProps> = ({ layout, images, className = '' }) => {
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  if (!images.length) return null;

  const sorted = [...images].sort((a, b) => a.order - b.order);

  return (
    <>
      <div className={className}>
        {layout === 'grid' ? (
          <GridLayout images={sorted} onOpen={setLightbox} />
        ) : (
          <MessyLayout images={sorted} onOpen={setLightbox} />
        )}
      </div>

      {lightbox && (
        <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
};

// ─── Grid Layout ──────────────────────────────────────────────────────────────

const GridLayout: React.FC<{ images: GalleryImage[]; onOpen: (img: GalleryImage) => void }> = ({
  images,
  onOpen,
}) => (
  <div
    className="grid gap-4"
    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
  >
    {images.map((img, i) => (
      <GalleryTile key={i} image={img} onClick={() => onOpen(img)} forcedAspect="aspect-[5/4]" />
    ))}
  </div>
);

// ─── Masonry (CSS columns) ────────────────────────────────────────────────────

const MessyLayout: React.FC<{ images: GalleryImage[]; onOpen: (img: GalleryImage) => void }> = ({
  images,
  onOpen,
}) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[110px] md:auto-rows-[130px] gap-3 md:gap-4">
    {images.map((img, i) => (
      <GalleryTile
        key={i}
        image={img}
        onClick={() => onOpen(img)}
        tileClassName={getMasonrySpanClass(i)}
        forcedAspect="aspect-auto"
      />
    ))}
  </div>
);

const getMasonrySpanClass = (index: number): string => {
  const pattern = [
    'col-span-2 row-span-2 md:col-span-2',
    'row-span-1 md:col-span-1',
    'row-span-1 md:col-span-1',
    'row-span-1 md:col-span-1',
    'row-span-1 md:col-span-1',
    'col-span-2 row-span-1 md:col-span-2',
    'row-span-1 md:col-span-1',
    'row-span-1 md:col-span-1',
  ];

  return pattern[index % pattern.length];
};

// ─── Tile ─────────────────────────────────────────────────────────────────────

const sizeClass: Record<GalleryImage['size'], string> = {
  small: 'aspect-square',
  medium: 'aspect-[4/3]',
  large: 'aspect-[16/9]',
};

const GalleryTile: React.FC<{
  image: GalleryImage;
  onClick: () => void;
  tileClassName?: string;
  forcedAspect?: string;
}> = ({ image, onClick, tileClassName = '', forcedAspect }) => (
  <div
    className={`relative overflow-hidden rounded-xl cursor-pointer group ${forcedAspect || sizeClass[image.size]} ${tileClassName}`}
    onClick={onClick}
  >
    <img
      src={image.url}
      alt={image.caption || ''}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
    />
    {(() => {
      const caption = image.caption?.trim();
      if (!caption) return null;
      const isFilename = /whatsapp image|\.(jpg|jpeg|png|gif|heic|webp)$/i.test(caption);
      if (isFilename) return null;

      return (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs truncate">{caption}</p>
        </div>
      );
    })()}
  </div>
);

// ─── Lightbox ─────────────────────────────────────────────────────────────────

const Lightbox: React.FC<{ image: GalleryImage; onClose: () => void }> = ({ image, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
    onClick={onClose}
  >
    <button
      className="absolute top-4 right-4 text-white text-3xl leading-none"
      onClick={onClose}
      aria-label="Close"
    >
      &times;
    </button>
    <img
      src={image.url}
      alt={image.caption || ''}
      className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
      onClick={(e) => e.stopPropagation()}
    />
    {image.caption && (
      <p className="absolute bottom-6 text-white text-sm bg-black/50 px-4 py-1 rounded-full">
        {image.caption}
      </p>
    )}
  </div>
);

export default GalleryComponent;
