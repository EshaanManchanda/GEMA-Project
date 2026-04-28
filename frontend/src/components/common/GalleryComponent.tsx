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
    className="grid gap-3"
    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
  >
    {images.map((img, i) => (
      <GalleryTile key={i} image={img} onClick={() => onOpen(img)} />
    ))}
  </div>
);

// ─── Masonry (CSS columns) ────────────────────────────────────────────────────

const MessyLayout: React.FC<{ images: GalleryImage[]; onOpen: (img: GalleryImage) => void }> = ({
  images,
  onOpen,
}) => (
  <div
    style={{
      columnCount: 4,
      columnGap: '12px',
    }}
    className="[&>*]:break-inside-avoid [&>*]:mb-3 sm:[column-count:3] xs:[column-count:2]"
  >
    {images.map((img, i) => (
      <GalleryTile key={i} image={img} onClick={() => onOpen(img)} />
    ))}
  </div>
);

// ─── Tile ─────────────────────────────────────────────────────────────────────

const sizeClass: Record<GalleryImage['size'], string> = {
  small: 'aspect-square',
  medium: 'aspect-[4/3]',
  large: 'aspect-[16/9]',
};

const GalleryTile: React.FC<{ image: GalleryImage; onClick: () => void }> = ({ image, onClick }) => (
  <div
    className={`relative overflow-hidden rounded-lg cursor-pointer group ${sizeClass[image.size]}`}
    onClick={onClick}
  >
    <img
      src={image.url}
      alt={image.caption || ''}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
    />
    {image.caption && (
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{image.caption}</p>
      </div>
    )}
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
