/**
 * DEV-ONLY: Visual preview of every EventCard variant.
 * Access at http://localhost:3000/dev/event-cards
 */
import React, { useState } from 'react';
import EventCard, { EventCardProps } from '@/components/client/EventCard';

// ── Realistic sample data (mirrors what comes out of mapToUIEvent) ──────────
const SAMPLE: EventCardProps = {
  _id: 'preview-001',
  slug: 'family-fun-day',
  title: 'Family Fun Day',
  description:
    'A day of entertainment for the whole family with games, activities, food stalls, and live performances.',
  image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=400&fit=crop',
  images: [
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=400&fit=crop',
  ],
  price: 120,
  currency: 'AED',
  category: 'Arts',
  location: { city: 'Abu Dhabi', address: 'Jumeirah Beach Park' },
  dateSchedule: [
    { startDate: '2027-05-02T10:00:00.000Z', endDate: '2027-05-02T18:00:00.000Z' },
  ],
  date: '2027-05-02T10:00:00.000Z',
  isFeatured: true,
  viewsCount: 1506,
  rating: 4.7,
  reviewsCount: 84,
  bookingsCount: 312,
  ageGroup: '3-12',
  vendorId: { businessName: "Eshaan Manchanda's Business" },
};

// ── Variant config table ────────────────────────────────────────────────────
type Variant = EventCardProps['variant'];

const VARIANTS: Array<{
  variant: Variant;
  label: string;
  overrides?: Partial<EventCardProps>;
  wrapperClass?: string;
}> = [
  { variant: 'default',        label: 'default',        wrapperClass: 'w-72' },
  { variant: 'featured',       label: 'featured',        wrapperClass: 'w-80' },
  { variant: 'compact',        label: 'compact',         wrapperClass: 'w-64' },
  { variant: 'vertical-tall',  label: 'vertical-tall',   wrapperClass: 'w-72' },
  { variant: 'overlay',        label: 'overlay',         wrapperClass: 'w-72' },
  { variant: 'minimal',        label: 'minimal',         wrapperClass: 'w-56' },
  { variant: 'magazine',       label: 'magazine',        wrapperClass: 'w-80',
    overrides: { showDescription: true } },
  {
    variant: 'horizontal',
    label: 'horizontal',
    wrapperClass: 'w-[560px]',
  },
  {
    variant: 'list-item',
    label: 'list-item',
    wrapperClass: 'w-full max-w-xl',
  },
];

// ── Toggle panels ───────────────────────────────────────────────────────────
interface Toggles {
  showPrice: boolean;
  showLocation: boolean;
  showDate: boolean;
  showTime: boolean;
  showDescription: boolean;
  showStats: boolean;
  showCategory: boolean;
  showVendor: boolean;
  showAgeGroup: boolean;
  showFeaturedBadge: boolean;
  showWishlist: boolean;
}

const DEFAULT_TOGGLES: Toggles = {
  showPrice: true,
  showLocation: true,
  showDate: true,
  showTime: false,
  showDescription: false,
  showStats: true,
  showCategory: true,
  showVendor: true,
  showAgeGroup: true,
  showFeaturedBadge: true,
  showWishlist: true,
};

// ── Component ───────────────────────────────────────────────────────────────
const EventCardPreviewPage: React.FC = () => {
  const [toggles, setToggles] = useState<Toggles>(DEFAULT_TOGGLES);
  const [focused, setFocused] = useState<Variant | null>(null);

  const toggle = (key: keyof Toggles) =>
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const sharedProps: Partial<EventCardProps> = { ...toggles, disableNavigation: true };

  const visibleVariants = focused
    ? VARIANTS.filter(v => v.variant === focused)
    : VARIANTS;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-1 text-gray-900">EventCard — All Variants</h1>
      <p className="text-gray-500 text-sm mb-6">Dev preview only · <code>/dev/event-cards</code></p>

      {/* ── Controls ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-8">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <span className="font-semibold text-gray-700 text-sm w-full">Toggle props</span>
          {(Object.keys(toggles) as (keyof Toggles)[]).map(key => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={toggles[key]}
                onChange={() => toggle(key)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">{key}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-semibold text-gray-700 text-sm">Focus variant:</span>
          <button
            onClick={() => setFocused(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              focused === null
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            all
          </button>
          {VARIANTS.map(({ variant, label }) => (
            <button
              key={variant}
              onClick={() => setFocused(focused === variant ? null : variant)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                focused === variant
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="flex flex-wrap gap-10 items-start">
        {visibleVariants.map(({ variant, label, overrides, wrapperClass }) => (
          <div key={variant} className="flex flex-col gap-2">
            <span className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
              {label}
            </span>
            <div className={wrapperClass}>
              <EventCard
                {...SAMPLE}
                {...sharedProps}
                {...overrides}
                variant={variant}
              />
            </div>

            {/* Data checklist */}
            <div className="text-xs text-gray-500 space-y-0.5 mt-1">
              <DataBit label="image" value={SAMPLE.image} />
              <DataBit label="price" value={SAMPLE.price} />
              <DataBit label="date" value={SAMPLE.dateSchedule?.[0]?.startDate} />
              <DataBit label="location" value={(SAMPLE.location as any)?.city} />
              <DataBit label="vendor" value={SAMPLE.vendorId?.businessName} />
              <DataBit label="views" value={SAMPLE.viewsCount} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Edge-case cards ── */}
      <h2 className="text-xl font-bold mt-16 mb-4 text-gray-800">Edge cases</h2>
      <div className="flex flex-wrap gap-10 items-start">
        {/* No image → should show placeholder */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
            default · no image
          </span>
          <div className="w-72">
            <EventCard
              {...SAMPLE}
              {...sharedProps}
              variant="default"
              image={undefined}
              images={[]}
            />
          </div>
        </div>

        {/* No date schedule → should show "Date TBD" */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
            default · no date
          </span>
          <div className="w-72">
            <EventCard
              {...SAMPLE}
              {...sharedProps}
              variant="default"
              date={undefined}
              dateSchedule={[]}
            />
          </div>
        </div>

        {/* Old API shape: only `.date` field (seeded events) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
            default · date-only schedule
          </span>
          <div className="w-72">
            <EventCard
              {...SAMPLE}
              {...sharedProps}
              variant="default"
              date="2027-06-08T10:00:00.000Z"
              dateSchedule={[{ startDate: '2027-06-08T10:00:00.000Z', endDate: '' }]}
            />
          </div>
        </div>

        {/* No vendor */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
            default · no vendor
          </span>
          <div className="w-72">
            <EventCard
              {...SAMPLE}
              {...sharedProps}
              variant="default"
              showVendor={true}
              vendorId={undefined}
            />
          </div>
        </div>

        {/* Long title */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
            compact · long title
          </span>
          <div className="w-64">
            <EventCard
              {...SAMPLE}
              {...sharedProps}
              variant="compact"
              title="International Business Summit & Leadership Conference 2027 — Dubai Edition"
            />
          </div>
        </div>

        {/* overlay variant – full display */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
            overlay · show description
          </span>
          <div className="w-72">
            <EventCard
              {...SAMPLE}
              {...sharedProps}
              variant="overlay"
              showDescription={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Small inline helper
const DataBit: React.FC<{ label: string; value: unknown }> = ({ label, value }) => {
  const present = value !== undefined && value !== null && value !== '';
  return (
    <div className={`flex gap-1 ${present ? 'text-green-600' : 'text-red-400'}`}>
      <span>{present ? '✓' : '✗'}</span>
      <span>{label}</span>
    </div>
  );
};

export default EventCardPreviewPage;
