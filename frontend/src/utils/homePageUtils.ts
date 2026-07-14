import type { Event as ApiEvent } from '../types/event';
import type { Event as UIEvent } from '@/components/client/CollectionSection.types';
import { getPlaceholderUrl } from './placeholderImage';

// Helper to map API Event to UI Event
export const mapToUIEvent = (event: ApiEvent): UIEvent => {
    // The homepage API returns dateSchedule with startDate/endDate/date fields,
    // not startDateTime/endDateTime as the type declares.
    const rawSchedule = event.dateSchedule as any[];
    const firstSchedule = rawSchedule?.[0];
    const fallbackDate =
        firstSchedule?.startDate ||
        firstSchedule?.date ||
        firstSchedule?.startDateTime;

    // vendorId from homepage API returns businessName directly (not firstName/lastName)
    const rawVendor = event.vendorId as any;
    const businessName = rawVendor?.businessName ||
        (rawVendor ? `${rawVendor.firstName || ''} ${rawVendor.lastName || ''}`.trim() : undefined);

    return {
        id: event._id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        // Fall back to imageAssets if images array is empty
        image: event.images?.[0] || (event as any).imageAssets?.[0]?.url,
        images: event.images,
        price: event.price,
        currency: event.currency,
        category: event.category,
        categories: event.tags,
        isFeatured: event.isFeatured,
        viewsCount: event.viewsCount,
        dateSchedule: rawSchedule?.map((ds: any) => ({
            startDate: ds.startDate || ds.date || ds.startDateTime,
            endDate: ds.endDate || ds.endDateTime,
        })),
        date: fallbackDate,
        location: event.location,
        venueType: event.venueType,
        vendorId: businessName ? { businessName } : undefined,
        ageGroup: event.ageRange ? `${event.ageRange[0]}-${event.ageRange[1]}` : undefined,
        rating: 0,
        reviewsCount: 0,
    };
};

// Mock data for when backend is unavailable
export const mockEvents = [
    {
        id: '1',
        slug: 'kids-fun-day',
        title: 'Kids Fun Day',
        description: 'A day full of fun activities for kids of all ages.',
        image: getPlaceholderUrl('eventCard', 'Kids Fun Day'),
        price: 25,
        date: '2023-12-15',
        location: 'Central Park',
        category: 'Entertainment'
    },
    {
        id: '2',
        title: 'Science Workshop',
        description: 'Interactive science experiments for curious minds.',
        image: getPlaceholderUrl('eventCard', 'Science Workshop'),
        price: 30,
        date: '2023-12-20',
        location: 'Science Museum',
        category: 'Education'
    },
    {
        id: '3',
        title: 'Art & Craft Session',
        description: 'Creative art and craft activities for children.',
        image: getPlaceholderUrl('eventCard', 'Art & Craft'),
        price: 20,
        date: '2023-12-18',
        location: 'Community Center',
        category: 'Arts'
    }
];

export const mockCategories = [
    { _id: '1', id: '1', name: 'Entertainment', slug: 'entertainment', icon: '🎭', eventCount: 0, isActive: true, level: 0, sortOrder: 0 },
    { _id: '2', id: '2', name: 'Education', slug: 'education', icon: '📚', eventCount: 0, isActive: true, level: 0, sortOrder: 1 },
    { _id: '3', id: '3', name: 'Arts', slug: 'arts', icon: '🎨', eventCount: 0, isActive: true, level: 0, sortOrder: 2 },
    { _id: '4', id: '4', name: 'Sports', slug: 'sports', icon: '⚽', eventCount: 0, isActive: true, level: 0, sortOrder: 3 },
    { _id: '5', id: '5', name: 'Adventure', slug: 'adventure', icon: '🏕️', eventCount: 0, isActive: true, level: 0, sortOrder: 4 }
];

// Helper function to get category icons
export const getCategoryIcon = (categoryName: string): string => {
    const iconMap: { [key: string]: string } = {
        'Family & Kids': '👨‍👩‍👧‍👦',
        'Technology': '💻',
        'Sports & Recreation': '⚽',
        'Music': '🎵',
        'Art & Culture': '🎨',
        'Culture & Heritage': '🏛️',
        'Business': '💼',
        'Food & Dining': '🍽️',
        'Health & Wellness': '🧘‍♀️',
        'Entertainment': '🎭',
        'Education': '📚',
        'Arts': '🎨',
        'Sports': '⚽',
        'Adventure': '🏕️'
    };
    return iconMap[categoryName] || '📅';
};
