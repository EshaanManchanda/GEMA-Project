import { getAppNameFull } from '../../utils/brandConfig';
import type { DiscoveryHubConfig } from './DiscoveryHubPage';

const appName = getAppNameFull();

const ALL_HUBS: { label: string; path: string }[] = [
  { label: 'Best Activities for Kids', path: '/best-activities-for-kids' },
  { label: 'Age-Appropriate Experiences', path: '/age-appropriate-experiences' },
  { label: 'Educational Workshops', path: '/educational-workshops' },
  { label: 'Outdoor Activities for Children', path: '/outdoor-activities-for-children' },
  { label: 'Family-Friendly Adventures', path: '/family-friendly-adventures' },
  { label: 'Seasonal Events for Kids', path: '/seasonal-events-for-kids' },
];

const relatedHubsExcluding = (path: string) => ALL_HUBS.filter((hub) => hub.path !== path);

export const bestActivitiesForKidsConfig: DiscoveryHubConfig = {
  slug: 'best-activities-for-kids',
  h1: 'Best Activities for Kids in the UAE',
  intro: `${appName} helps parents discover the best-rated kids activities, workshops, camps and events across the UAE. Browse the highest-rated experiences below, or use the guides underneath to narrow down by age, setting or occasion.`,
  seoTitle: `Best Activities for Kids in the UAE | ${appName}`,
  seoDescription: 'Discover the top-rated kids activities, workshops, camps and events in the UAE. Browse by age, category and location, and book directly.',
  seoKeywords: ['best activities for kids', 'kids activities UAE', 'things to do with kids Dubai', 'family activities UAE'],
  baseFilters: {},
  sortBy: 'averageRating',
  faqs: [
    { question: 'How are these activities selected?', answer: 'We surface the highest-rated, most-booked activities currently live on Kidrove across the UAE.' },
    { question: 'Can I filter by my child\'s age?', answer: 'Yes — visit our Age-Appropriate Experiences guide to browse activities by specific age range.' },
    { question: 'Are these activities available in all emirates?', answer: 'Availability varies by city. Each activity page lists its exact location before you book.' },
  ],
  relatedHubs: relatedHubsExcluding('/best-activities-for-kids'),
  emptyStateMessage: 'No top-rated activities are live right now.',
};

export const ageAppropriateExperiencesConfig: DiscoveryHubConfig = {
  slug: 'age-appropriate-experiences',
  h1: 'Age-Appropriate Experiences for Children',
  intro: `Find activities matched to your child's age. Select an age range below to see events with the right recommended age fit — from toddlers to teens.`,
  seoTitle: `Age-Appropriate Kids Activities by Age Group | ${appName}`,
  seoDescription: 'Browse kids activities and events filtered by age range — toddlers, young children, pre-teens and teens — across the UAE.',
  seoKeywords: ['age appropriate activities for kids', 'activities by age', 'toddler activities UAE', 'teen activities UAE'],
  baseFilters: {},
  sortBy: 'averageRating',
  segments: [
    { label: 'Ages 3–5', params: { ageMin: 3, ageMax: 5 } },
    { label: 'Ages 6–8', params: { ageMin: 6, ageMax: 8 } },
    { label: 'Ages 9–12', params: { ageMin: 9, ageMax: 12 } },
    { label: 'Teens (13+)', params: { ageMin: 13, ageMax: 18 } },
  ],
  faqs: [
    { question: 'What activities are suitable for 6-year-olds?', answer: 'Select the "Ages 6–8" tab above to see activities with a recommended age range that includes 6-year-olds.' },
    { question: 'How is the age range decided for each activity?', answer: 'Vendors set a recommended minimum and maximum age for every activity, shown on the activity page before booking.' },
    { question: 'What if my child is between two age ranges?', answer: 'Age ranges overlap intentionally — check the specific activity page for its exact recommended range and any vendor notes.' },
  ],
  relatedHubs: relatedHubsExcluding('/age-appropriate-experiences'),
  emptyStateMessage: 'No activities are currently listed for this age range.',
};

export const educationalWorkshopsConfig: DiscoveryHubConfig = {
  slug: 'educational-workshops',
  h1: 'Educational Workshops for Kids',
  intro: `Explore hands-on workshops, courses and classes designed to help children learn while having fun — from STEM and coding to arts and career skills.`,
  seoTitle: `Educational Workshops & Classes for Kids | ${appName}`,
  seoDescription: 'Browse educational workshops, courses and classes for children in the UAE — STEM, coding, arts and more, taught by verified providers.',
  seoKeywords: ['educational workshops for kids', 'kids classes UAE', 'STEM workshops Dubai', 'coding classes for kids'],
  baseFilters: { type: 'Workshop,Class,Course' },
  sortBy: 'averageRating',
  faqs: [
    { question: 'What kinds of workshops are available?', answer: 'Workshops span STEM, coding, arts and crafts, and other skill-building classes taught by vetted instructors and providers.' },
    { question: 'Are workshops one-off or recurring?', answer: 'Both — check each activity page\'s schedule for single-session workshops versus multi-week courses.' },
    { question: 'Do I need prior experience?', answer: 'Most workshops are designed for beginners; any prerequisite skill level is noted on the activity page.' },
  ],
  relatedHubs: relatedHubsExcluding('/educational-workshops'),
  emptyStateMessage: 'No educational workshops are currently listed.',
};

export const outdoorActivitiesForChildrenConfig: DiscoveryHubConfig = {
  slug: 'outdoor-activities-for-children',
  h1: 'Outdoor Activities for Children',
  intro: `Get kids outside with outdoor adventures, sports and nature experiences across the UAE — from desert excursions to active play.`,
  seoTitle: `Outdoor Activities for Kids in the UAE | ${appName}`,
  seoDescription: 'Discover outdoor activities, adventures and sports for children in the UAE. Browse and book outdoor experiences for kids of all ages.',
  seoKeywords: ['outdoor activities for kids', 'kids outdoor adventures UAE', 'outdoor play Dubai', 'kids sports activities'],
  baseFilters: { venueType: 'Outdoor' },
  sortBy: 'averageRating',
  faqs: [
    { question: 'Are outdoor activities weather-dependent?', answer: 'Some are — check the individual activity page for any weather policy or rescheduling terms.' },
    { question: 'What should children bring to outdoor activities?', answer: 'Sun protection, water and comfortable clothing are recommended; specific requirements are listed per activity.' },
    { question: 'Are outdoor activities suitable for younger children?', answer: 'Many are — use the recommended age range on each activity page, or check our Age-Appropriate Experiences guide.' },
  ],
  relatedHubs: relatedHubsExcluding('/outdoor-activities-for-children'),
  emptyStateMessage: 'No outdoor activities are currently listed.',
};

export const familyFriendlyAdventuresConfig: DiscoveryHubConfig = {
  slug: 'family-friendly-adventures',
  h1: 'Family-Friendly Adventures',
  intro: `Plan a day out the whole family can enjoy — adventures and experiences designed for parents and children together.`,
  seoTitle: `Family-Friendly Adventures & Activities | ${appName}`,
  seoDescription: 'Find family-friendly adventures and activities in the UAE that parents and kids can enjoy together, from day trips to hands-on experiences.',
  seoKeywords: ['family friendly activities UAE', 'family adventures Dubai', 'things to do as a family', 'kids and parents activities'],
  baseFilters: { tags: 'family,adventure' },
  sortBy: 'averageRating',
  faqs: [
    { question: 'Are parents allowed to attend these activities?', answer: 'Yes — family-friendly adventures are designed for parents and children to take part together.' },
    { question: 'Are these activities suitable for mixed age groups?', answer: 'Most are, since they\'re designed for whole families; check each activity page for any age restrictions.' },
    { question: 'Do family adventures need to be booked in advance?', answer: 'We recommend booking ahead, especially for weekend dates — availability is shown on each activity page.' },
  ],
  relatedHubs: relatedHubsExcluding('/family-friendly-adventures'),
  emptyStateMessage: 'No family-friendly adventures are currently listed.',
};

export const seasonalEventsForKidsConfig: DiscoveryHubConfig = {
  slug: 'seasonal-events-for-kids',
  h1: 'Seasonal Events for Kids',
  intro: `Discover what's coming up soon — the next wave of seasonal camps, festivals and limited-time events for kids across the UAE.`,
  seoTitle: `Seasonal Kids Events & Camps in the UAE | ${appName}`,
  seoDescription: 'Browse upcoming seasonal events, camps and festivals for kids in the UAE, sorted by what\'s happening soonest.',
  seoKeywords: ['seasonal events for kids', 'kids camps UAE', 'school holiday activities Dubai', 'upcoming kids events'],
  baseFilters: { dateFrom: new Date().toISOString().slice(0, 10) },
  sortBy: 'createdAt',
  pinnedCollectionSlug: 'summer-camp-collections',
  faqs: [
    { question: 'What activities are available this weekend?', answer: 'This page lists upcoming events sorted so the newest listings surface first — check each activity\'s schedule for the exact date.' },
    { question: 'Do seasonal camps run during school holidays?', answer: 'Many providers time camps and workshops to school holiday periods — dates are listed on each activity page.' },
    { question: 'What happens if a seasonal event is unavailable?', answer: 'If an event is no longer bookable it will not appear here — browse all events for currently available alternatives.' },
  ],
  relatedHubs: relatedHubsExcluding('/seasonal-events-for-kids'),
  emptyStateMessage: 'No upcoming seasonal events are currently listed.',
};
