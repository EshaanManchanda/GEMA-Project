import mongoose from "mongoose";
import { config, connectDB, logger } from "../config/index";
import {
  User,
  Event,
  Order,
  Ticket,
  Review,
  Employee,
  CheckinLog,
} from "../models/index";
import { UserRole, UserStatus } from "../models/User";
// Venue imports removed
import { ReviewType, ReviewStatus } from "../models/Review";
import { TicketStatus } from "../models/Ticket";
import PopupNotification from "../models/PopupNotification";
import AnnouncementBar from "../models/AnnouncementBar";

// Sample data
const sampleUsers = [
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@gema.com",
    password: "admin123",
    role: UserRole.ADMIN,
    phone: "+971501234567",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: "Event",
    lastName: "Vendor",
    email: "vendor@gema.com",
    password: "vendor123",
    role: UserRole.VENDOR,
    phone: "+971502345678",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
    companyName: "Amazing Events Co.",
    businessLicense: "BL123456789",
  },
  {
    firstName: "John",
    lastName: "Customer",
    email: "customer@gema.com",
    password: "customer123",
    role: UserRole.CUSTOMER,
    phone: "+971503456789",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah@example.com",
    password: "password123",
    role: UserRole.CUSTOMER,
    phone: "+971504567890",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: "Mike",
    lastName: "Wilson",
    email: "mike@example.com",
    password: "password123",
    role: UserRole.VENDOR,
    phone: "+971505678901",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
    companyName: "Wilson Events",
    businessLicense: "BL987654321",
  },
  {
    firstName: "Aisha",
    lastName: "Al-Mansouri",
    email: "aisha@gema.com",
    password: "password123",
    role: UserRole.VENDOR,
    phone: "+971506789012",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
    companyName: "Emirates Entertainment",
    businessLicense: "BL456789123",
  },
  {
    firstName: "David",
    lastName: "Chen",
    email: "david.chen@example.com",
    password: "password123",
    role: UserRole.CUSTOMER,
    phone: "+971507890123",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: "Emma",
    lastName: "Rodriguez",
    email: "emma.rodriguez@example.com",
    password: "password123",
    role: UserRole.CUSTOMER,
    phone: "+971508901234",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: "Ahmed",
    lastName: "Hassan",
    email: "ahmed.hassan@example.com",
    password: "password123",
    role: UserRole.VENDOR,
    phone: "+971509012345",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
    companyName: "Heritage Events",
    businessLicense: "BL789123456",
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@example.com",
    password: "password123",
    role: UserRole.CUSTOMER,
    phone: "+971550123456",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: "Mohamed",
    lastName: "Ali",
    email: "mohamed.ali@example.com",
    password: "password123",
    role: UserRole.CUSTOMER,
    phone: "+971551234567",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: "Jennifer",
    lastName: "Smith",
    email: "jennifer.smith@example.com",
    password: "password123",
    role: UserRole.VENDOR,
    phone: "+971552345678",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
    companyName: "Global Productions",
    businessLicense: "BL321654987",
  },
  {
    firstName: "Omar",
    lastName: "Abdullah",
    email: "omar.abdullah@example.com",
    password: "password123",
    role: UserRole.CUSTOMER,
    phone: "+971553456789",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: "Lisa",
    lastName: "Wang",
    email: "lisa.wang@example.com",
    password: "password123",
    role: UserRole.CUSTOMER,
    phone: "+971554567890",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: "Hassan",
    lastName: "Al-Zahra",
    email: "hassan.alzahra@example.com",
    password: "password123",
    role: UserRole.VENDOR,
    phone: "+971555678901",
    country: "UAE",
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
    companyName: "Desert Star Events",
    businessLicense: "BL654987321",
  },
];

const sampleVenues = [
  {
    title: "Dubai Opera House",
    description:
      "A world-class performing arts venue in the heart of Downtown Dubai",
    status: "published",
    location: {
      address: "Sheikh Mohammed bin Rashid Boulevard",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      zipCode: "12345",
      coordinates: {
        lat: 25.1938,
        lng: 55.2736,
      },
    },
    capacity: 2000,
    venueType: "Indoor",
    facilities: [
      "Air Conditioning",
      "Sound System",
      "Lighting",
      "Parking",
      "VIP Lounge",
    ],
    amenities: [
      "Air Conditioning",
      "Sound System",
      "Lighting",
      "Parking",
      "VIP Lounge",
    ],
    operatingHours: [
      { day: "monday", openTime: "09:00", closeTime: "23:00", isClosed: false },
      {
        day: "tuesday",
        openTime: "09:00",
        closeTime: "23:00",
        isClosed: false,
      },
      {
        day: "wednesday",
        openTime: "09:00",
        closeTime: "23:00",
        isClosed: false,
      },
      {
        day: "thursday",
        openTime: "09:00",
        closeTime: "23:00",
        isClosed: false,
      },
      { day: "friday", openTime: "09:00", closeTime: "23:00", isClosed: false },
      {
        day: "saturday",
        openTime: "09:00",
        closeTime: "23:00",
        isClosed: false,
      },
      { day: "sunday", openTime: "09:00", closeTime: "23:00", isClosed: false },
    ],
    checkInGates: [
      {
        gateName: "Main Entrance",
        gateCode: "GATE01",
        isActive: true,
        description: "Primary entrance for general admission",
      },
      {
        gateName: "VIP Entrance",
        gateCode: "GATE02",
        isActive: true,
        description: "Exclusive entrance for VIP guests",
      },
    ],
    price: 15000,
    currency: "AED",
    seoMeta: {
      title: "Dubai Opera House - Performing Arts Venue",
      description:
        "A world-class performing arts venue in the heart of Downtown Dubai",
      keywords: ["opera", "theatre", "music", "dubai", "venue"],
    },
    ageRange: [0, 100],
    isApproved: true,
    isActive: true,
  },
  {
    title: "Al Wasl Dome",
    description: "The iconic dome structure perfect for large-scale events",
    status: "published",
    location: {
      address: "Expo 2020 Site",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      zipCode: "54321",
      coordinates: {
        lat: 25.0657,
        lng: 55.1713,
      },
    },
    capacity: 5000,
    venueType: "Indoor", // Event schema only has Indoor/Outdoor/Online/Offline? Was Hybrid supported? Checking schema...
    // Event.ts line 252: enum: ['Indoor', 'Outdoor', 'Online', 'Offline']. So Hybrid is not supported. Use Indoor.
    facilities: [
      "360° Projection",
      "Climate Control",
      "Multiple Entrances",
      "Food Courts",
      "Metro Access",
    ],
    amenities: [
      "360° Projection",
      "Climate Control",
      "Multiple Entrances",
      "Food Courts",
      "Metro Access",
    ],
    operatingHours: [
      { day: "monday", openTime: "08:00", closeTime: "23:59", isClosed: false },
      {
        day: "tuesday",
        openTime: "08:00",
        closeTime: "23:59",
        isClosed: false,
      },
      {
        day: "wednesday",
        openTime: "08:00",
        closeTime: "23:59",
        isClosed: false,
      },
      {
        day: "thursday",
        openTime: "08:00",
        closeTime: "23:59",
        isClosed: false,
      },
      { day: "friday", openTime: "08:00", closeTime: "23:59", isClosed: false },
      {
        day: "saturday",
        openTime: "08:00",
        closeTime: "23:59",
        isClosed: false,
      },
      { day: "sunday", openTime: "08:00", closeTime: "23:59", isClosed: false },
    ],
    checkInGates: [
      {
        gateName: "North Gate",
        gateCode: "GATE03",
        isActive: true,
        description: "North entrance",
      },
      {
        gateName: "South Gate",
        gateCode: "GATE04",
        isActive: true,
        description: "South entrance",
      },
    ],
    price: 25000,
    currency: "AED",
    seoMeta: {
      title: "Al Wasl Dome - Iconic Event Venue",
      description: "The iconic dome structure perfect for large-scale events",
      keywords: ["dome", "expo", "events", "dubai", "venue"],
    },
    ageRange: [0, 100],
    isApproved: true,
    isActive: true,
  },
  {
    title: "Jumeirah Beach Park",
    description: "Beautiful outdoor venue with beach views",
    status: "published",
    location: {
      address: "Jumeirah Beach Road",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      zipCode: "67890",
      coordinates: {
        lat: 25.232,
        lng: 55.2515,
      },
    },
    capacity: 3000,
    venueType: "Outdoor",
    facilities: [
      "Beach Access",
      "Palm Trees",
      "Sunset Views",
      "Parking",
      "Restrooms",
    ],
    amenities: [
      "Beach Access",
      "Palm Trees",
      "Sunset Views",
      "Parking",
      "Restrooms",
    ],
    operatingHours: [
      { day: "monday", openTime: "06:00", closeTime: "22:00", isClosed: false },
      {
        day: "tuesday",
        openTime: "06:00",
        closeTime: "22:00",
        isClosed: false,
      },
      {
        day: "wednesday",
        openTime: "06:00",
        closeTime: "22:00",
        isClosed: false,
      },
      {
        day: "thursday",
        openTime: "06:00",
        closeTime: "22:00",
        isClosed: false,
      },
      { day: "friday", openTime: "06:00", closeTime: "23:00", isClosed: false },
      {
        day: "saturday",
        openTime: "06:00",
        closeTime: "23:00",
        isClosed: false,
      },
      { day: "sunday", openTime: "06:00", closeTime: "22:00", isClosed: false },
    ],
    checkInGates: [
      {
        gateName: "Beach Gate",
        gateCode: "GATE05",
        isActive: true,
        description: "Main beach entrance",
      },
    ],
    price: 8000,
    currency: "AED",
    seoMeta: {
      title: "Jumeirah Beach Park - Outdoor Venue",
      description: "Beautiful outdoor venue with beach views",
      keywords: ["beach", "park", "outdoor", "dubai", "venue"],
    },
    ageRange: [0, 100],
    isApproved: true,
    isActive: true,
  },
  {
    title: "Madinat Jumeirah Conference Centre",
    description:
      "Premium conference facility with traditional Arabian architecture",
    status: "published",
    location: {
      address: "Al Sufouh Road, Madinat Jumeirah",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      zipCode: "24578",
      coordinates: {
        lat: 25.1327,
        lng: 55.1857,
      },
    },
    capacity: 1200,
    venueType: "Indoor",
    facilities: [
      "Conference Rooms",
      "Translation Services",
      "Catering",
      "Business Center",
      "WiFi",
    ],
    amenities: [
      "Conference Rooms",
      "Translation Services",
      "Catering",
      "Business Center",
      "WiFi",
    ],
    operatingHours: [
      { day: "monday", openTime: "07:00", closeTime: "22:00", isClosed: false },
      {
        day: "tuesday",
        openTime: "07:00",
        closeTime: "22:00",
        isClosed: false,
      },
      {
        day: "wednesday",
        openTime: "07:00",
        closeTime: "22:00",
        isClosed: false,
      },
      {
        day: "thursday",
        openTime: "07:00",
        closeTime: "22:00",
        isClosed: false,
      },
      { day: "friday", openTime: "07:00", closeTime: "22:00", isClosed: false },
      {
        day: "saturday",
        openTime: "07:00",
        closeTime: "22:00",
        isClosed: false,
      },
      { day: "sunday", openTime: "09:00", closeTime: "20:00", isClosed: false },
    ],
    checkInGates: [
      {
        gateName: "Main Reception",
        gateCode: "GATE06",
        isActive: true,
        description: "Main conference entrance",
      },
      {
        gateName: "Executive Entrance",
        gateCode: "GATE07",
        isActive: true,
        description: "VIP and executive entrance",
      },
    ],
    price: 12000,
    currency: "AED",
    seoMeta: {
      title: "Madinat Jumeirah - Conference Venue",
      description:
        "Premium conference facility with traditional Arabian architecture",
      keywords: ["conference", "madinat", "business", "dubai", "venue"],
    },
    ageRange: [0, 100],
    isApproved: true,
    isActive: true,
  },
  {
    title: "Desert Palm Polo Club",
    description: "Exclusive outdoor venue perfect for luxury events and sports",
    status: "published",
    location: {
      address: "Al Awir Road",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      zipCode: "89012",
      coordinates: {
        lat: 25.1558,
        lng: 55.4302,
      },
    },
    capacity: 800,
    venueType: "Outdoor",
    facilities: [
      "Polo Field",
      "Equestrian Facilities",
      "Garden Area",
      "Valet Parking",
      "Private Dining",
    ],
    amenities: [
      "Polo Field",
      "Equestrian Facilities",
      "Garden Area",
      "Valet Parking",
      "Private Dining",
    ],
    operatingHours: [
      { day: "monday", openTime: "08:00", closeTime: "20:00", isClosed: false },
      {
        day: "tuesday",
        openTime: "08:00",
        closeTime: "20:00",
        isClosed: false,
      },
      {
        day: "wednesday",
        openTime: "08:00",
        closeTime: "20:00",
        isClosed: false,
      },
      {
        day: "thursday",
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: false,
      },
      { day: "friday", openTime: "08:00", closeTime: "22:00", isClosed: false },
      {
        day: "saturday",
        openTime: "08:00",
        closeTime: "22:00",
        isClosed: false,
      },
      { day: "sunday", openTime: "08:00", closeTime: "20:00", isClosed: false },
    ],
    checkInGates: [
      {
        gateName: "Clubhouse Entrance",
        gateCode: "GATE08",
        isActive: true,
        description: "Main clubhouse entrance",
      },
    ],
    price: 18000,
    currency: "AED",
    seoMeta: {
      title: "Desert Palm Polo Club - Luxury Outdoor Venue",
      description:
        "Exclusive outdoor venue perfect for luxury events and sports",
      keywords: ["polo", "luxury", "outdoor", "dubai", "venue"],
    },
    ageRange: [0, 100],
    isApproved: true,
    isActive: true,
  },
  {
    title: "Dubai World Trade Centre",
    description:
      "Premier exhibition and convention center in the heart of Dubai",
    status: "published",
    location: {
      address: "Trade Centre Road",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      zipCode: "45612",
      coordinates: {
        lat: 25.2329,
        lng: 55.3019,
      },
    },
    capacity: 10000,
    venueType: "Indoor",
    facilities: [
      "Exhibition Halls",
      "Meeting Rooms",
      "Catering Services",
      "Metro Station",
      "Parking",
    ],
    amenities: [
      "Exhibition Halls",
      "Meeting Rooms",
      "Catering Services",
      "Metro Station",
      "Parking",
    ],
    operatingHours: [
      { day: "monday", openTime: "06:00", closeTime: "23:59", isClosed: false },
      {
        day: "tuesday",
        openTime: "06:00",
        closeTime: "23:59",
        isClosed: false,
      },
      {
        day: "wednesday",
        openTime: "06:00",
        closeTime: "23:59",
        isClosed: false,
      },
      {
        day: "thursday",
        openTime: "06:00",
        closeTime: "23:59",
        isClosed: false,
      },
      { day: "friday", openTime: "06:00", closeTime: "23:59", isClosed: false },
      {
        day: "saturday",
        openTime: "06:00",
        closeTime: "23:59",
        isClosed: false,
      },
      { day: "sunday", openTime: "06:00", closeTime: "23:59", isClosed: false },
    ],
    checkInGates: [
      {
        gateName: "Gate A",
        gateCode: "GATE09",
        isActive: true,
        description: "Main exhibition entrance",
      },
      {
        gateName: "Gate B",
        gateCode: "GATE10",
        isActive: true,
        description: "Secondary entrance",
      },
      {
        gateName: "VIP Gate",
        gateCode: "GATE11",
        isActive: true,
        description: "VIP and exhibitor entrance",
      },
    ],
    price: 35000,
    currency: "AED",
    seoMeta: {
      title: "Dubai World Trade Centre - Exhibition Venue",
      description:
        "Premier exhibition and convention center in the heart of Dubai",
      keywords: ["exhibition", "trade centre", "convention", "dubai", "venue"],
    },
    ageRange: [0, 100],
    isApproved: true,
    isActive: true,
  },
  {
    title: "The Pavilion Downtown",
    description: "Elegant rooftop venue with stunning skyline views",
    status: "published",
    location: {
      address: "Burj Khalifa Boulevard",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      zipCode: "78901",
      coordinates: {
        lat: 25.1972,
        lng: 55.2744,
      },
    },
    capacity: 500,
    venueType: "Indoor", // Event schema does not support Hybrid. Using Indoor as it covers rooftop terrace usually in this context or Outdoor. Let's use Indoor as it has indoor lounge.
    facilities: [
      "Rooftop Terrace",
      "Indoor Lounge",
      "Bar Service",
      "City Views",
      "Photography Areas",
    ],
    amenities: [
      "Rooftop Terrace",
      "Indoor Lounge",
      "Bar Service",
      "City Views",
      "Photography Areas",
    ],
    operatingHours: [
      { day: "monday", openTime: "10:00", closeTime: "02:00", isClosed: false },
      {
        day: "tuesday",
        openTime: "10:00",
        closeTime: "02:00",
        isClosed: false,
      },
      {
        day: "wednesday",
        openTime: "10:00",
        closeTime: "02:00",
        isClosed: false,
      },
      {
        day: "thursday",
        openTime: "10:00",
        closeTime: "03:00",
        isClosed: false,
      },
      { day: "friday", openTime: "10:00", closeTime: "03:00", isClosed: false },
      {
        day: "saturday",
        openTime: "10:00",
        closeTime: "03:00",
        isClosed: false,
      },
      { day: "sunday", openTime: "10:00", closeTime: "02:00", isClosed: false },
    ],
    checkInGates: [
      {
        gateName: "Elevator Access",
        gateCode: "GATE12",
        isActive: true,
        description: "Express elevator to rooftop",
      },
    ],
    price: 22000,
    currency: "AED",
    seoMeta: {
      title: "The Pavilion Downtown - Rooftop Venue",
      description: "Elegant rooftop venue with stunning skyline views",
      keywords: ["pavilion", "rooftop", "downtown", "dubai", "venue"],
    },
    ageRange: [0, 100],
    isApproved: true,
    isActive: true,
  },
  {
    title: "Al Habtoor City Marina",
    description: "Waterfront venue perfect for yacht parties and marine events",
    status: "published",
    location: {
      address: "Al Habtoor City, Business Bay",
      city: "Dubai",
      state: "Dubai",
      country: "UAE",
      zipCode: "34567",
      coordinates: {
        lat: 25.1906,
        lng: 55.2603,
      },
    },
    capacity: 1500,
    venueType: "Outdoor",
    facilities: [
      "Marina Access",
      "Yacht Berths",
      "Waterfront Dining",
      "Event Deck",
      "Water Sports",
    ],
    amenities: [
      "Marina Access",
      "Yacht Berths",
      "Waterfront Dining",
      "Event Deck",
      "Water Sports",
    ],
    operatingHours: [
      { day: "monday", openTime: "08:00", closeTime: "23:00", isClosed: false },
      {
        day: "tuesday",
        openTime: "08:00",
        closeTime: "23:00",
        isClosed: false,
      },
      {
        day: "wednesday",
        openTime: "08:00",
        closeTime: "23:00",
        isClosed: false,
      },
      {
        day: "thursday",
        openTime: "08:00",
        closeTime: "23:59",
        isClosed: false,
      },
      { day: "friday", openTime: "08:00", closeTime: "23:59", isClosed: false },
      {
        day: "saturday",
        openTime: "08:00",
        closeTime: "23:59",
        isClosed: false,
      },
      { day: "sunday", openTime: "08:00", closeTime: "23:00", isClosed: false },
    ],
    checkInGates: [
      {
        gateName: "Marina Gate",
        gateCode: "GATE13",
        isActive: true,
        description: "Main marina entrance",
      },
      {
        gateName: "Yacht Club",
        gateCode: "GATE14",
        isActive: true,
        description: "Private yacht club entrance",
      },
    ],
    price: 28000,
    currency: "AED",
    seoMeta: {
      title: "Al Habtoor City Marina - Waterfront Venue",
      description:
        "Waterfront venue perfect for yacht parties and marine events",
      keywords: ["marina", "yacht", "waterfront", "dubai", "venue"],
    },
    ageRange: [0, 100],
    isApproved: true,
    isActive: true,
  },
];

const sampleEvents = [
  {
    title: "Dubai Music Festival 2024",
    description:
      "A spectacular showcase of international and local musical talent featuring artists from around the world.",
    category: "Music",
    type: "Event",
    venueType: "Indoor",
    ageRange: [16, 65],
    location: {
      city: "Dubai",
      address: "Dubai Opera House, Downtown Dubai",
      coordinates: { lat: 25.1938, lng: 55.2736 },
    },
    price: 250,
    currency: "AED",
    isApproved: true,
    tags: ["music", "festival", "international", "entertainment"],
    dateSchedule: [
      {
        date: new Date("2024-04-15T19:00:00Z"),
        availableSeats: 1500,
        price: 250,
      },
      {
        date: new Date("2024-04-16T19:00:00Z"),
        availableSeats: 1500,
        price: 250,
      },
    ],
    seoMeta: {
      title: "Dubai Music Festival 2024 - International Music Event",
      description: "Experience world-class music at Dubai Opera House",
      keywords: ["music", "dubai", "festival", "concert"],
    },
    faqs: [
      {
        question: "What time do doors open?",
        answer: "Doors open at 18:00, one hour before the show starts.",
      },
      {
        question: "Is parking available?",
        answer:
          "Yes, complimentary parking is available for all ticket holders.",
      },
    ],
    viewsCount: 1250,
    isFeatured: true,
    images: ["/images/music-festival-1.jpg", "/images/music-festival-2.jpg"],
  },
  {
    title: "Tech Startup Conference",
    description:
      "Connect with innovative startups, investors, and tech enthusiasts in this groundbreaking conference.",
    category: "Technology",
    type: "Event",
    venueType: "Indoor",
    ageRange: [18, 65],
    location: {
      city: "Dubai",
      address: "Al Wasl Dome, Expo 2020 Site",
      coordinates: { lat: 25.0657, lng: 55.1713 },
    },
    price: 450,
    currency: "AED",
    isApproved: true,
    tags: ["technology", "startup", "business", "networking"],
    dateSchedule: [
      {
        date: new Date("2024-05-10T09:00:00Z"),
        availableSeats: 800,
        price: 450,
      },
    ],
    seoMeta: {
      title: "Tech Startup Conference Dubai 2024",
      description: "Premier technology conference for startups and investors",
      keywords: ["tech", "startup", "conference", "dubai", "business"],
    },
    faqs: [
      {
        question: "What is included in the ticket?",
        answer:
          "Full day access, lunch, networking sessions, and conference materials.",
      },
    ],
    viewsCount: 890,
    isFeatured: true,
    images: ["/images/tech-conference-1.jpg"],
  },
  {
    title: "Sunset Yoga Retreat",
    description:
      "Relax and rejuvenate with a peaceful yoga session overlooking the beautiful Dubai coastline.",
    category: "Health & Wellness",
    type: "Event",
    venueType: "Outdoor",
    ageRange: [16, 60],
    location: {
      city: "Dubai",
      address: "Jumeirah Beach Park",
      coordinates: { lat: 25.232, lng: 55.2515 },
    },
    price: 150,
    currency: "AED",
    isApproved: true,
    tags: ["yoga", "wellness", "beach", "sunset", "meditation"],
    dateSchedule: [
      {
        date: new Date("2024-04-20T17:00:00Z"),
        availableSeats: 100,
        price: 150,
      },
    ],
    seoMeta: {
      title: "Sunset Yoga Retreat at Jumeirah Beach",
      description: "Peaceful yoga session with stunning sunset views",
      keywords: ["yoga", "wellness", "beach", "dubai", "sunset"],
    },
    faqs: [
      {
        question: "What should I bring?",
        answer:
          "Please bring your own yoga mat, water bottle, and comfortable clothing.",
      },
    ],
    viewsCount: 456,
    isFeatured: false,
    images: ["/images/yoga-retreat-1.jpg"],
  },
  {
    title: "Culinary Masterclass with Chef Ahmad",
    description:
      "Learn the secrets of Middle Eastern cuisine from renowned Chef Ahmad in this hands-on cooking experience.",
    category: "Food & Dining",
    type: "Course",
    venueType: "Indoor",
    ageRange: [18, 65],
    location: {
      city: "Dubai",
      address: "Dubai Culinary Institute",
      coordinates: { lat: 25.2048, lng: 55.2708 },
    },
    price: 350,
    currency: "AED",
    isApproved: true,
    tags: ["cooking", "culinary", "middle-eastern", "chef", "masterclass"],
    dateSchedule: [
      {
        date: new Date("2024-05-05T14:00:00Z"),
        availableSeats: 20,
        price: 350,
      },
    ],
    seoMeta: {
      title: "Middle Eastern Culinary Masterclass Dubai",
      description: "Learn authentic Middle Eastern cooking techniques",
      keywords: [
        "cooking",
        "culinary",
        "masterclass",
        "middle-eastern",
        "dubai",
      ],
    },
    faqs: [
      {
        question: "Is the meal included?",
        answer: "Yes, you will enjoy the dishes you prepare during the class.",
      },
    ],
    viewsCount: 234,
    isFeatured: false,
    images: ["/images/culinary-masterclass-1.jpg"],
  },
  {
    title: "International Business Summit 2024",
    description:
      "Join global business leaders and entrepreneurs for networking and insights into the future of international trade.",
    category: "Business",
    type: "Event",
    venueType: "Indoor",
    ageRange: [25, 65],
    location: {
      city: "Dubai",
      address: "Madinat Jumeirah Conference Centre",
      coordinates: { lat: 25.1327, lng: 55.1857 },
    },
    price: 650,
    currency: "AED",
    isApproved: true,
    tags: ["business", "summit", "networking", "international", "trade"],
    dateSchedule: [
      {
        date: new Date("2024-06-12T08:00:00Z"),
        availableSeats: 800,
        price: 650,
      },
      {
        date: new Date("2024-06-13T08:00:00Z"),
        availableSeats: 800,
        price: 650,
      },
    ],
    seoMeta: {
      title: "International Business Summit Dubai 2024",
      description: "Premier business conference for global leaders",
      keywords: ["business", "summit", "international", "trade", "dubai"],
    },
    faqs: [
      {
        question: "Is translation available?",
        answer:
          "Yes, simultaneous translation in Arabic and English is provided.",
      },
      {
        question: "What networking opportunities are included?",
        answer:
          "Welcome reception, lunch networking sessions, and evening gala dinner.",
      },
    ],
    viewsCount: 1890,
    isFeatured: true,
    images: ["/images/business-summit-1.jpg", "/images/business-summit-2.jpg"],
  },
  {
    title: "Desert Safari & Cultural Experience",
    description:
      "Experience authentic Emirati culture with desert adventures, traditional meals, and cultural performances.",
    category: "Culture & Heritage",
    type: "Event",
    venueType: "Outdoor",
    ageRange: [12, 70],
    location: {
      city: "Dubai",
      address: "Desert Palm Polo Club",
      coordinates: { lat: 25.1558, lng: 55.4302 },
    },
    price: 280,
    currency: "AED",
    isApproved: true,
    tags: ["desert", "culture", "heritage", "adventure", "traditional"],
    dateSchedule: [
      {
        date: new Date("2024-04-25T15:00:00Z"),
        availableSeats: 200,
        price: 280,
      },
      {
        date: new Date("2024-04-26T15:00:00Z"),
        availableSeats: 200,
        price: 280,
      },
      {
        date: new Date("2024-04-27T15:00:00Z"),
        availableSeats: 200,
        price: 280,
      },
    ],
    seoMeta: {
      title: "Authentic Desert Safari Cultural Experience Dubai",
      description: "Immerse yourself in Emirati culture and desert adventures",
      keywords: [
        "desert",
        "safari",
        "culture",
        "heritage",
        "dubai",
        "traditional",
      ],
    },
    faqs: [
      {
        question: "What is included in the experience?",
        answer:
          "Transportation, camel riding, falconry show, traditional dinner, and cultural performances.",
      },
      {
        question: "What should I wear?",
        answer:
          "Comfortable clothing, closed shoes, and a light jacket for the evening.",
      },
    ],
    viewsCount: 756,
    isFeatured: false,
    images: ["/images/desert-safari-1.jpg", "/images/desert-safari-2.jpg"],
  },
  {
    title: "Art & Design Exhibition",
    description:
      "Showcase of contemporary Middle Eastern art featuring emerging and established artists from the region.",
    category: "Art & Culture",
    type: "Event",
    venueType: "Indoor",
    ageRange: [16, 80],
    location: {
      city: "Dubai",
      address: "Dubai World Trade Centre",
      coordinates: { lat: 25.2329, lng: 55.3019 },
    },
    price: 80,
    currency: "AED",
    isApproved: true,
    tags: ["art", "design", "exhibition", "contemporary", "middle-eastern"],
    dateSchedule: [
      {
        date: new Date("2024-05-15T10:00:00Z"),
        availableSeats: 2000,
        price: 80,
      },
    ],
    seoMeta: {
      title: "Contemporary Middle Eastern Art Exhibition Dubai",
      description: "Explore innovative art and design from regional artists",
      keywords: [
        "art",
        "exhibition",
        "contemporary",
        "middle-eastern",
        "design",
        "dubai",
      ],
    },
    faqs: [
      {
        question: "How long is the exhibition open?",
        answer:
          "The exhibition runs for 30 days with daily access from 10:00 AM to 8:00 PM.",
      },
      {
        question: "Are guided tours available?",
        answer:
          "Yes, guided tours are available at 11:00 AM, 2:00 PM, and 5:00 PM daily.",
      },
    ],
    viewsCount: 445,
    isFeatured: false,
    images: ["/images/art-exhibition-1.jpg"],
  },
  {
    title: "Rooftop Jazz Night",
    description:
      "Intimate jazz performance under the stars with breathtaking views of Dubai's skyline.",
    category: "Music",
    type: "Event",
    venueType: "Indoor",
    ageRange: [21, 65],
    location: {
      city: "Dubai",
      address: "The Pavilion Downtown",
      coordinates: { lat: 25.1972, lng: 55.2744 },
    },
    price: 320,
    currency: "AED",
    isApproved: true,
    tags: ["jazz", "music", "rooftop", "nightlife", "skyline"],
    dateSchedule: [
      {
        date: new Date("2024-05-18T20:00:00Z"),
        availableSeats: 150,
        price: 320,
      },
      {
        date: new Date("2024-05-25T20:00:00Z"),
        availableSeats: 150,
        price: 320,
      },
    ],
    seoMeta: {
      title: "Rooftop Jazz Night with Dubai Skyline Views",
      description: "Intimate jazz performance with stunning city views",
      keywords: ["jazz", "rooftop", "music", "nightlife", "dubai", "skyline"],
    },
    faqs: [
      {
        question: "Is there a dress code?",
        answer:
          "Smart casual dress code is required. No shorts or flip-flops allowed.",
      },
      {
        question: "Are drinks included?",
        answer:
          "Welcome cocktail is included. Additional drinks can be purchased at the bar.",
      },
    ],
    viewsCount: 678,
    isFeatured: true,
    images: ["/images/jazz-night-1.jpg", "/images/jazz-night-2.jpg"],
  },
  {
    title: "Marina Yacht Festival",
    description:
      "Exclusive yacht showcase featuring luxury vessels, water sports demonstrations, and marine lifestyle exhibitions.",
    category: "Sports & Recreation",
    type: "Event",
    venueType: "Outdoor",
    ageRange: [18, 65],
    location: {
      city: "Dubai",
      address: "Al Habtoor City Marina",
      coordinates: { lat: 25.1906, lng: 55.2603 },
    },
    price: 180,
    currency: "AED",
    isApproved: true,
    tags: ["yacht", "marina", "luxury", "water-sports", "marine"],
    dateSchedule: [
      {
        date: new Date("2024-06-08T10:00:00Z"),
        availableSeats: 1000,
        price: 180,
      },
      {
        date: new Date("2024-06-09T10:00:00Z"),
        availableSeats: 1000,
        price: 180,
      },
    ],
    seoMeta: {
      title: "Marina Yacht Festival Dubai - Luxury Marine Experience",
      description: "Explore luxury yachts and marine lifestyle at Dubai Marina",
      keywords: [
        "yacht",
        "marina",
        "festival",
        "luxury",
        "dubai",
        "water-sports",
      ],
    },
    faqs: [
      {
        question: "Can I board the yachts?",
        answer:
          "Yes, guided tours of selected yachts are available throughout the day.",
      },
      {
        question: "Are water sports activities included?",
        answer:
          "Demonstrations are included. Participation in activities requires separate booking.",
      },
    ],
    viewsCount: 923,
    isFeatured: true,
    images: ["/images/yacht-festival-1.jpg", "/images/yacht-festival-2.jpg"],
  },
  {
    title: "AI & Innovation Workshop",
    description:
      "Hands-on workshop exploring artificial intelligence applications in business and daily life.",
    category: "Technology",
    type: "Course",
    venueType: "Indoor",
    ageRange: [18, 55],
    location: {
      city: "Dubai",
      address: "Madinat Jumeirah Conference Centre",
      coordinates: { lat: 25.1327, lng: 55.1857 },
    },
    price: 480,
    currency: "AED",
    isApproved: true,
    tags: ["ai", "innovation", "workshop", "technology", "hands-on"],
    dateSchedule: [
      {
        date: new Date("2024-05-22T09:00:00Z"),
        availableSeats: 50,
        price: 480,
      },
    ],
    seoMeta: {
      title: "AI & Innovation Workshop Dubai - Tech Training",
      description:
        "Learn practical AI applications in interactive workshop format",
      keywords: [
        "ai",
        "innovation",
        "workshop",
        "technology",
        "training",
        "dubai",
      ],
    },
    faqs: [
      {
        question: "Do I need programming experience?",
        answer:
          "No programming experience required. Workshop is designed for all skill levels.",
      },
      {
        question: "What equipment is provided?",
        answer:
          "All computers and software are provided. Just bring a notebook for taking notes.",
      },
    ],
    viewsCount: 387,
    isFeatured: false,
    images: ["/images/ai-workshop-1.jpg"],
  },
  {
    title: "Family Fun Day",
    description:
      "A day of entertainment for the whole family with games, activities, food stalls, and live performances.",
    category: "Family & Kids",
    type: "Event",
    venueType: "Outdoor",
    ageRange: [0, 80],
    location: {
      city: "Dubai",
      address: "Jumeirah Beach Park",
      coordinates: { lat: 25.232, lng: 55.2515 },
    },
    price: 120,
    currency: "AED",
    isApproved: true,
    tags: ["family", "kids", "entertainment", "games", "outdoor"],
    dateSchedule: [
      {
        date: new Date("2024-04-30T10:00:00Z"),
        availableSeats: 2000,
        price: 120,
      },
    ],
    seoMeta: {
      title: "Family Fun Day at Jumeirah Beach - All Ages",
      description:
        "Perfect family day out with activities and entertainment for everyone",
      keywords: [
        "family",
        "kids",
        "entertainment",
        "beach",
        "dubai",
        "outdoor",
      ],
    },
    faqs: [
      {
        question: "What age groups are the activities suitable for?",
        answer:
          "Activities are designed for all ages from toddlers to grandparents.",
      },
      {
        question: "Is food available?",
        answer:
          "Yes, various food stalls and vendors will be available throughout the day.",
      },
    ],
    viewsCount: 1456,
    isFeatured: true,
    images: ["/images/family-fun-1.jpg", "/images/family-fun-2.jpg"],
  },
];

/**
 * Clear existing data
 */
async function clearData() {
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    // Venue.deleteMany({}), // Removed
    Order.deleteMany({}),
    Ticket.deleteMany({}),
    Review.deleteMany({}),
    Employee.deleteMany({}),
    CheckinLog.deleteMany({}),
  ]);
  logger.info("Existing data cleared");
}

/**
 * Seed users
 */
async function seedUsers() {
  const users = [];

  for (const userData of sampleUsers) {
    const user = new User({
      ...userData,
      passwordHash: userData.password, // Let the User model handle hashing
    });
    delete (user as any).password;
    users.push(await user.save());
  }

  logger.info(`${users.length} users created`);
  return users;
}

/**
 * Seed venues
 */
async function seedVenues(users: any[]) {
  const vendors = users.filter((user) => user.role === UserRole.VENDOR);
  const venues = [];

  for (let i = 0; i < sampleVenues.length; i++) {
    const venueData = sampleVenues[i];
    const vendor = vendors[i % vendors.length];

    const venue = new Event({
      ...venueData,
      type: "Venue", // Ensure type is Venue
      category: "Venue", // Default category
      vendorId: vendor._id,
    });
    venues.push(await venue.save());
  }

  logger.info(`${venues.length} venues created`);
  return venues;
}

/**
 * Seed events
 */
async function seedEvents(users: any[], venues: any[]) {
  const vendors = users.filter((user) => user.role === UserRole.VENDOR);
  const events = [];

  for (let i = 0; i < sampleEvents.length; i++) {
    const eventData = sampleEvents[i];
    const vendor = vendors[i % vendors.length];

    const event = new Event({
      ...eventData,
      vendorId: vendor._id,
    });
    events.push(await event.save());
  }

  logger.info(`${events.length} events created`);
  return events;
}

/**
 * Seed orders and tickets
 */
async function seedOrdersAndTickets(users: any[], events: any[]) {
  const customers = users.filter((user) => user.role === UserRole.CUSTOMER);
  const orders = [];
  const tickets = [];

  const orderStatuses = ["confirmed", "pending", "cancelled", "refunded"];
  const paymentStatuses = ["paid", "pending", "failed", "refunded"];
  const paymentMethods = ["stripe", "paypal", "razorpay"];
  const ticketTypes = ["general", "vip", "early_bird", "group"];

  // Create multiple orders per customer and event combination
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const eventsToBook = events.slice(
      0,
      Math.min(events.length, Math.floor(Math.random() * 4) + 1),
    ); // 1-4 events per customer

    for (let j = 0; j < eventsToBook.length; j++) {
      const event = eventsToBook[j];
      const quantity = Math.floor(Math.random() * 4) + 1; // 1-4 tickets
      const orderStatus =
        orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const paymentStatus =
        orderStatus === "confirmed"
          ? "paid"
          : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

      // Create order
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const participants = [];
      for (let p = 0; p < quantity; p++) {
        const participantNames = [
          `${customer.firstName} ${customer.lastName}`,
          "Alex Johnson",
          "Sarah Williams",
          "Mike Brown",
          "Emma Davis",
          "Ahmed Al-Rashid",
          "Fatima Hassan",
          "Omar Abdullah",
          "Layla Mohamed",
        ];

        participants.push({
          name:
            p === 0
              ? `${customer.firstName} ${customer.lastName}`
              : participantNames[
                  Math.floor(Math.random() * participantNames.length)
                ],
          age: Math.floor(Math.random() * 40) + 20, // Age between 20-60
          emergencyContact: {
            name: "Emergency Contact Person",
            relationship: ["Spouse", "Friend", "Family", "Parent", "Sibling"][
              Math.floor(Math.random() * 5)
            ],
            phone: `+971${Math.floor(Math.random() * 900000000) + 100000000}`,
          },
        });
      }
      const totalPrice = event.price * quantity;
      const order = new Order({
        orderNumber,
        userId: customer._id,
        items: [
          {
            eventId: event._id,
            eventTitle: event.title,
            scheduleDate: event.dateSchedule[0].date,
            quantity,
            unitPrice: event.price,
            totalPrice,
            currency: event.currency,
            participants,
          },
        ],
        subtotal: totalPrice,
        total: totalPrice,
        currency: event.currency,
        status: orderStatus,
        paymentStatus,
        paymentMethod:
          paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        billingAddress: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          address: [
            "123 Main Street",
            "456 Business Bay",
            "789 Marina Walk",
            "321 Downtown Blvd",
          ][Math.floor(Math.random() * 4)],
          city: "Dubai",
          state: "Dubai",
          zipCode: String(Math.floor(Math.random() * 90000) + 10000),
          country: "UAE",
        },
        source: ["web", "mobile", "admin"][Math.floor(Math.random() * 3)],
      });

      const savedOrder = await order.save();
      orders.push(savedOrder);

      // Create tickets for the order (only if order is confirmed)
      if (orderStatus === "confirmed") {
        for (let k = 0; k < quantity; k++) {
          const ticketNumber = `GM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          const qrCodeData = `${event._id}-${savedOrder._id}-${ticketNumber}`;
          const isCheckedIn = Math.random() > 0.6; // 40% chance of being checked in

          const ticket = new Ticket({
            ticketNumber,
            orderId: savedOrder._id,
            userId: customer._id,
            eventId: event._id,
            qrCode: qrCodeData,
            qrCodeImage: `/qr/${ticketNumber}.png`,
            ticketType:
              ticketTypes[Math.floor(Math.random() * ticketTypes.length)],
            attendeeName: participants[k].name,
            attendeeEmail: customer.email,
            attendeePhone: customer.phone,
            price: event.price,
            currency: event.currency,
            status:
              Math.random() > 0.1
                ? TicketStatus.ACTIVE
                : (["cancelled", "refunded"][
                    Math.floor(Math.random() * 2)
                  ] as any),
            checkInDetails: {
              isCheckedIn,
              scanCount: isCheckedIn ? Math.floor(Math.random() * 3) + 1 : 0,
              checkInTime: isCheckedIn
                ? new Date(
                    event.dateSchedule[0].date.getTime() -
                      Math.random() * 2 * 60 * 60 * 1000,
                  )
                : undefined, // Check-in within 2 hours of event
              checkInLocation: isCheckedIn ? "Main Entrance" : undefined,
            },
            validFrom: new Date(),
            validUntil: new Date(
              event.dateSchedule[0].date.getTime() + 24 * 60 * 60 * 1000,
            ), // 24 hours after event
          });

          tickets.push(await ticket.save());
        }
      }
    }
  }

  // Create some additional random orders to simulate more activity
  for (let i = 0; i < 20; i++) {
    const randomCustomer =
      customers[Math.floor(Math.random() * customers.length)];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    const orderStatus =
      orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentStatus =
      orderStatus === "confirmed"
        ? "paid"
        : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const totalPrice = randomEvent.price * quantity;

    const order = new Order({
      orderNumber,
      userId: randomCustomer._id,
      items: [
        {
          eventId: randomEvent._id,
          eventTitle: randomEvent.title,
          scheduleDate: randomEvent.dateSchedule[0].date,
          quantity,
          unitPrice: randomEvent.price,
          totalPrice,
          currency: randomEvent.currency,
          participants: Array.from({ length: quantity }, (_, idx) => ({
            name:
              idx === 0
                ? `${randomCustomer.firstName} ${randomCustomer.lastName}`
                : `Guest ${idx}`,
            age: Math.floor(Math.random() * 40) + 20,
            emergencyContact: {
              name: "Emergency Contact",
              relationship: "Friend",
              phone: `+971${Math.floor(Math.random() * 900000000) + 100000000}`,
            },
          })),
        },
      ],
      subtotal: totalPrice,
      total: totalPrice,
      currency: randomEvent.currency,
      status: orderStatus,
      paymentStatus,
      paymentMethod:
        paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      billingAddress: {
        firstName: randomCustomer.firstName,
        lastName: randomCustomer.lastName,
        email: randomCustomer.email,
        phone: randomCustomer.phone,
        address: `${Math.floor(Math.random() * 999) + 1} Random Street`,
        city: "Dubai",
        state: "Dubai",
        zipCode: String(Math.floor(Math.random() * 90000) + 10000),
        country: "UAE",
      },
      source: ["web", "mobile", "admin"][Math.floor(Math.random() * 3)],
    });

    const savedOrder = await order.save();
    orders.push(savedOrder);

    // Create tickets for confirmed orders
    if (orderStatus === "confirmed") {
      for (let k = 0; k < quantity; k++) {
        const ticketNumber = `GM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const qrCodeData = `${randomEvent._id}-${savedOrder._id}-${ticketNumber}`;
        const isCheckedIn = Math.random() > 0.7;

        const ticket = new Ticket({
          ticketNumber,
          orderId: savedOrder._id,
          userId: randomCustomer._id,
          eventId: randomEvent._id,
          qrCode: qrCodeData,
          qrCodeImage: `/qr/${ticketNumber}.png`,
          ticketType:
            ticketTypes[Math.floor(Math.random() * ticketTypes.length)],
          attendeeName:
            k === 0
              ? `${randomCustomer.firstName} ${randomCustomer.lastName}`
              : `Guest ${k}`,
          attendeeEmail: randomCustomer.email,
          attendeePhone: randomCustomer.phone,
          price: randomEvent.price,
          currency: randomEvent.currency,
          status: TicketStatus.ACTIVE,
          checkInDetails: {
            isCheckedIn,
            scanCount: isCheckedIn ? Math.floor(Math.random() * 2) + 1 : 0,
            checkInTime: isCheckedIn
              ? new Date(
                  randomEvent.dateSchedule[0].date.getTime() -
                    Math.random() * 3 * 60 * 60 * 1000,
                )
              : undefined,
            checkInLocation: isCheckedIn
              ? ["Main Entrance", "VIP Entrance", "Side Gate"][
                  Math.floor(Math.random() * 3)
                ]
              : undefined,
          },
          validFrom: new Date(),
          validUntil: new Date(
            randomEvent.dateSchedule[0].date.getTime() + 24 * 60 * 60 * 1000,
          ),
        });

        tickets.push(await ticket.save());
      }
    }
  }

  logger.info(`${orders.length} orders and ${tickets.length} tickets created`);
  return { orders, tickets };
}

/**
 * Seed reviews
 */
async function seedReviews(
  users: any[],
  events: any[],
  orders: any[],
  venues: any[],
) {
  const customers = users.filter((user) => user.role === UserRole.CUSTOMER);
  const reviews = [];

  const reviewTexts = [
    {
      title: "Amazing experience!",
      comment:
        "Absolutely loved this event. The organization was perfect and the venue was beautiful. Every detail was thought through and the staff were incredibly helpful throughout the entire experience.",
      pros: [
        "Great venue",
        "Excellent organization",
        "Amazing atmosphere",
        "Helpful staff",
      ],
      cons: ["A bit expensive"],
    },
    {
      title: "Good but could be better",
      comment:
        "Overall a good experience but there were some issues with the sound system. The event content was interesting but the technical difficulties were distracting.",
      pros: ["Good location", "Friendly staff", "Interesting content"],
      cons: ["Sound issues", "Long queues", "Technical problems"],
    },
    {
      title: "Highly recommend!",
      comment:
        "This was exactly what I was looking for. Will definitely attend again. The venue was perfect and the timing worked well for my schedule.",
      pros: [
        "Perfect timing",
        "Great value",
        "Well organized",
        "Excellent venue",
      ],
      cons: [],
    },
    {
      title: "Outstanding event!",
      comment:
        "Exceeded all my expectations. The quality of speakers and presentations was top-notch. Great networking opportunities and fantastic food.",
      pros: [
        "High-quality content",
        "Great networking",
        "Excellent food",
        "Professional organization",
      ],
      cons: ["Parking was limited"],
    },
    {
      title: "Disappointing experience",
      comment:
        "Had high hopes but the event was not well organized. Long wait times and poor communication from staff. Would not recommend.",
      pros: ["Nice venue"],
      cons: [
        "Poor organization",
        "Long wait times",
        "Bad communication",
        "Overpriced",
      ],
    },
    {
      title: "Great family event",
      comment:
        "Perfect for families with children. Lots of activities and entertainment for all ages. Kids had a blast and parents could relax.",
      pros: [
        "Family-friendly",
        "Good activities for kids",
        "Safe environment",
        "Good value",
      ],
      cons: ["Could use more shade areas"],
    },
    {
      title: "Professional and well-run",
      comment:
        "Very professional event with excellent speakers and well-managed logistics. Perfect for business networking and learning.",
      pros: [
        "Professional speakers",
        "Good logistics",
        "Networking opportunities",
        "Quality content",
      ],
      cons: ["Could be longer", "Limited seating"],
    },
    {
      title: "Fun but crowded",
      comment:
        "Enjoyed the event but it was quite crowded. Hard to move around and get food. The entertainment was good though.",
      pros: [
        "Good entertainment",
        "Lively atmosphere",
        "Variety of activities",
      ],
      cons: ["Too crowded", "Hard to get food", "Limited space"],
    },
    {
      title: "Unique experience",
      comment:
        "Unlike anything I 've attended before. Very creative and innovative approach. Definitely worth the money.",
      pros: [
        "Unique concept",
        "Creative approach",
        "Innovative",
        "Worth the money",
      ],
      cons: ["Could be clearer instructions"],
    },
    {
      title: "Mediocre at best",
      comment:
        "Average event, nothing special. Some parts were good but overall didn't live up to the hype. Might consider similar events in the future.",
      pros: ["Some good moments", "Decent venue"],
      cons: ["Overhyped", "Average content", "Not great value"],
    },
    {
      title: "Excellent organization",
      comment:
        "Everything ran smoothly from start to finish. Clear instructions, helpful staff, and great timing. Would definitely attend future events.",
      pros: [
        "Smooth organization",
        "Clear instructions",
        "Helpful staff",
        "Good timing",
      ],
      cons: ["Wish it was longer"],
    },
    {
      title: "Beautiful venue, great atmosphere",
      comment:
        "The venue was absolutely stunning and created a perfect atmosphere for the event. Photography opportunities were endless.",
      pros: [
        "Beautiful venue",
        "Great atmosphere",
        "Perfect for photos",
        "Memorable experience",
      ],
      cons: ["Expensive drinks", "Limited parking"],
    },
  ];

  // Create reviews for orders with confirmed status
  const confirmedOrders = orders.filter(
    (order) => order.status === "confirmed",
  );

  for (let i = 0; i < Math.min(confirmedOrders.length * 0.7); i++) {
    // 70% of confirmed orders get reviews
    const order = confirmedOrders[i];
    const customer = users.find(
      (user) => user._id.toString() === order.userId.toString(),
    );
    const event = events.find(
      (event) => event._id.toString() === order.items[0].eventId.toString(),
    );

    if (!customer || !event) continue;

    const reviewData =
      reviewTexts[Math.floor(Math.random() * reviewTexts.length)];
    const rating = Math.floor(Math.random() * 5) + 1; // Rating between 1-5

    // Adjust review content based on rating
    let adjustedReviewData = { ...reviewData };
    if (rating <= 2) {
      adjustedReviewData =
        reviewTexts.find(
          (r) =>
            r.title.includes("Disappointing") || r.title.includes("Mediocre"),
        ) || reviewTexts[4];
    } else if (rating >= 4) {
      adjustedReviewData =
        reviewTexts.find(
          (r) =>
            r.title.includes("Amazing") ||
            r.title.includes("Outstanding") ||
            r.title.includes("Excellent"),
        ) || reviewTexts[0];
    }

    const review = new Review({
      type: ReviewType.EVENT,
      event: event._id,
      user: customer._id,
      order: order._id,
      rating,
      title: adjustedReviewData.title,
      comment: adjustedReviewData.comment,
      pros: adjustedReviewData.pros,
      cons: adjustedReviewData.cons,
      verified: true,
      verifiedPurchase: true,
      status:
        Math.random() > 0.1 ? ReviewStatus.APPROVED : ReviewStatus.PENDING, // 90% approved
      helpful: Math.floor(Math.random() * 25),
      notHelpful: Math.floor(Math.random() * 8),
      source: ["web", "mobile", "admin"][Math.floor(Math.random() * 3)],
    });

    reviews.push(await review.save());
  }

  // Create some additional random reviews (unverified purchases)
  for (let i = 0; i < 15; i++) {
    const randomCustomer =
      customers[Math.floor(Math.random() * customers.length)];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    const reviewData =
      reviewTexts[Math.floor(Math.random() * reviewTexts.length)];
    const rating = Math.floor(Math.random() * 5) + 1;

    const review = new Review({
      type: ReviewType.EVENT,
      event: randomEvent._id,
      user: randomCustomer._id,
      rating,
      title: reviewData.title,
      comment: reviewData.comment,
      pros: reviewData.pros,
      cons: reviewData.cons,
      verified: false,
      verifiedPurchase: false,
      status:
        Math.random() > 0.2 ? ReviewStatus.APPROVED : ReviewStatus.PENDING, // 80% approved for unverified
      helpful: Math.floor(Math.random() * 15),
      notHelpful: Math.floor(Math.random() * 5),
      source: ["web", "mobile"][Math.floor(Math.random() * 2)],
    });

    reviews.push(await review.save());
  }

  // Create some venue reviews
  for (let i = 0; i < 10; i++) {
    const randomCustomer =
      customers[Math.floor(Math.random() * customers.length)];
    const randomOrder =
      confirmedOrders[Math.floor(Math.random() * confirmedOrders.length)];
    const reviewData =
      reviewTexts[Math.floor(Math.random() * reviewTexts.length)];
    const rating = Math.floor(Math.random() * 5) + 1;
    const randomVenue = venues[Math.floor(Math.random() * venues.length)];

    if (!randomOrder || !randomVenue) continue;

    const review = new Review({
      type: ReviewType.VENUE,
      venue: randomVenue._id, // Set the venue (Event type='Venue')
      user: randomCustomer._id,
      order: randomOrder._id,
      rating,
      title: `Venue Review: ${reviewData.title}`,
      comment: `Venue-specific feedback: ${reviewData.comment}`,
      pros: reviewData.pros,
      cons: reviewData.cons,
      verified: true,
      verifiedPurchase: true,
      status: ReviewStatus.APPROVED,
      helpful: Math.floor(Math.random() * 20),
      notHelpful: Math.floor(Math.random() * 6),
      source: "web",
    });

    reviews.push(await review.save());
  }

  logger.info(`${reviews.length} reviews created`);
  return reviews;
}

/**
 * Seed employees
 */
async function seedEmployees(users: any[], venues: any[]) {
  const vendors = users.filter((user) => user.role === UserRole.VENDOR);
  const employees: mongoose.Document[] = [];

  const employeeData = [
    {
      firstName: "Ahmed",
      lastName: "Hassan",
      position: "Event Manager",
      department: "Operations",
    },
    {
      firstName: "Fatima",
      lastName: "Al-Zahra",
      position: "Check-in Supervisor",
      department: "Guest Services",
    },
    {
      firstName: "Omar",
      lastName: "Abdullah",
      position: "Security Chief",
      department: "Security",
    },
    {
      firstName: "Layla",
      lastName: "Mohamed",
      position: "Customer Service Rep",
      department: "Guest Services",
    },
    {
      firstName: "Khalid",
      lastName: "Al-Rashid",
      position: "Operations Coordinator",
      department: "Operations",
    },
    {
      firstName: "Mariam",
      lastName: "Saleh",
      position: "Marketing Specialist",
      department: "Marketing",
    },
    {
      firstName: "Hassan",
      lastName: "Al-Maktoum",
      position: "Technical Support",
      department: "Technical",
    },
    {
      firstName: "Noor",
      lastName: "Abdullah",
      position: "Finance Coordinator",
      department: "Finance",
    },
    {
      firstName: "Saeed",
      lastName: "Al-Ameri",
      position: "Venue Coordinator",
      department: "Operations",
    },
    {
      firstName: "Amal",
      lastName: "Hussain",
      position: "Guest Relations Manager",
      department: "Guest Services",
    },
    {
      firstName: "Tariq",
      lastName: "Al-Zaabi",
      position: "Security Officer",
      department: "Security",
    },
    {
      firstName: "Zahra",
      lastName: "Mohamed",
      position: "Event Coordinator",
      department: "Operations",
    },
    {
      firstName: "Rashid",
      lastName: "Al-Shamsi",
      position: "IT Support Specialist",
      department: "Technical",
    },
    {
      firstName: "Hanan",
      lastName: "Al-Kaabi",
      position: "Sales Representative",
      department: "Sales",
    },
    {
      firstName: "Mohammed",
      lastName: "Al-Nuaimi",
      position: "Logistics Manager",
      department: "Operations",
    },
    {
      firstName: "Salma",
      lastName: "Al-Dhaheri",
      position: "HR Coordinator",
      department: "Human Resources",
    },
    {
      firstName: "Youssef",
      lastName: "Al-Mansouri",
      position: "Quality Assurance",
      department: "Operations",
    },
    {
      firstName: "Moza",
      lastName: "Al-Ketbi",
      position: "Public Relations",
      department: "Marketing",
    },
    {
      firstName: "Abdullah",
      lastName: "Al-Suwaidi",
      position: "Maintenance Supervisor",
      department: "Maintenance",
    },
    {
      firstName: "Noura",
      lastName: "Al-Falasi",
      position: "Training Coordinator",
      department: "Human Resources",
    },
  ];

  const departments = [
    "Operations",
    "Guest Services",
    "Security",
    "Marketing",
    "Technical",
    "Finance",
    "Sales",
    "Human Resources",
    "Maintenance",
  ];
  const permissions = [
    ["checkin", "view_reports"],
    ["checkin", "view_reports", "manage_guests"],
    ["security_access", "view_reports", "emergency_response"],
    ["marketing_access", "social_media", "content_management"],
    ["technical_support", "system_admin", "troubleshooting"],
    ["financial_access", "payment_processing", "refunds"],
    ["sales_access", "customer_management", "pricing"],
    ["hr_access", "employee_management", "training"],
    ["maintenance_access", "facility_management", "equipment"],
  ];

  // Create employees for each vendor
  vendors.forEach((vendor, vendorIndex) => {
    const numEmployees = Math.floor(Math.random() * 8) + 5; // 5-12 employees per vendor

    for (let i = 0; i < numEmployees; i++) {
      const employeeIndex =
        (vendorIndex * numEmployees + i) % employeeData.length;
      const data = employeeData[employeeIndex];
      const department =
        departments[Math.floor(Math.random() * departments.length)];
      const employeePermissions = permissions[
        departments.indexOf(department)
      ] || ["basic_access"];

      const employee = new Employee({
        employeeId: `EMP${String(employees.length + 1).padStart(3, "0")}`,
        firstName: data.firstName,
        lastName: data.lastName,
        email: `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}${employeeIndex}@${vendor.companyName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}.com`,
        phone: `+971${Math.floor(Math.random() * 2) === 0 ? "50" : "55"}${Math.floor(Math.random() * 9000000) + 1000000}`,
        position: data.position,
        department,
        vendorId: vendor._id,
        permissions: employeePermissions,
        status:
          Math.random() > 0.1
            ? "active"
            : ["inactive", "suspended"][Math.floor(Math.random() * 2)], // 90% active
        hireDate: new Date(
          Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000,
        ), // Random date within last 2 years
        salary: Math.floor(Math.random() * 8000) + 3000, // Salary between 3000-11000 AED
        emergencyContact: {
          name: `Emergency Contact for ${data.firstName}`,
          relationship: ["Spouse", "Parent", "Sibling", "Friend"][
            Math.floor(Math.random() * 4)
          ],
          phone: `+971${Math.floor(Math.random() * 2) === 0 ? "50" : "55"}${Math.floor(Math.random() * 9000000) + 1000000}`,
        },
        address: {
          street: `${Math.floor(Math.random() * 999) + 1} ${["Al Wasl Road", "Sheikh Zayed Road", "Jumeirah Road", "Business Bay Boulevard"][Math.floor(Math.random() * 4)]}`,
          city: "Dubai",
          state: "Dubai",
          country: "UAE",
          zipCode: String(Math.floor(Math.random() * 90000) + 10000),
        },
        notes:
          Math.random() > 0.7
            ? [
                "Excellent performance in customer service",
                "Completed advanced training program",
                "Multilingual - speaks Arabic and English",
                "Available for overtime work",
                "Specialized in event setup and coordination",
              ][Math.floor(Math.random() * 5)]
            : undefined,
      });

      employees.push(employee);
    }
  });

  // Save all employees
  const savedEmployees = [];
  for (const employee of employees) {
    savedEmployees.push(await employee.save());
  }

  logger.info(
    `${savedEmployees.length} employees created across ${vendors.length} vendors`,
  );
  return savedEmployees;
}

/**
 * Update event statistics
 */
async function updateEventStats(events: any[], orders: any[], reviews: any[]) {
  for (const event of events) {
    // Calculate total revenue and tickets sold
    const eventOrders = orders.filter((order) =>
      order.items.some(
        (item: any) => item.eventId.toString() === event._id.toString(),
      ),
    );

    let totalRevenue = 0;
    let ticketsSold = 0;

    eventOrders.forEach((order) => {
      const eventItems = order.items.filter(
        (item: any) => item.eventId.toString() === event._id.toString(),
      );
      eventItems.forEach((item: any) => {
        totalRevenue += item.totalPrice;
        ticketsSold += item.quantity;
      });
    });

    // Calculate average rating
    const eventReviews = reviews.filter(
      (review) =>
        review.event && review.event.toString() === event._id.toString(),
    );

    const averageRating =
      eventReviews.length > 0
        ? eventReviews.reduce((sum, review) => sum + review.rating, 0) /
          eventReviews.length
        : 0;

    // Update available seats based on tickets sold
    event.dateSchedule.forEach((schedule: any) => {
      schedule.availableSeats = Math.max(
        0,
        schedule.availableSeats - ticketsSold,
      );
    });

    // Add analytics data (would be calculated by analytics service)
    event.viewsCount = Math.floor(Math.random() * 2000) + 500;
    event.averageRating = Math.round(averageRating * 10) / 10;

    await event.save();
  }

  logger.info("Event statistics updated");
}

/**
 * Seed check-in logs
 */
async function seedCheckinLogs(
  users: any[],
  events: any[],
  tickets: any[],
  employees: any[],
) {
  const checkinLogs = [];

  // Get tickets that are checked in
  const checkedInTickets = tickets.filter(
    (ticket) => ticket.checkInDetails?.isCheckedIn,
  );

  for (const ticket of checkedInTickets) {
    const event = events.find(
      (e) => e._id.toString() === ticket.eventId.toString(),
    );
    const customer = users.find(
      (u) => u._id.toString() === ticket.userId.toString(),
    );

    if (!event || !customer) continue;

    // Find employees who could have processed the check-in
    const eventVendors = users.filter((u) => u.role === UserRole.VENDOR);
    const eventEmployees = employees.filter(
      (emp) =>
        eventVendors.some(
          (vendor) => vendor._id.toString() === emp.vendorId.toString(),
        ) &&
        emp.permissions.includes("checkin") &&
        emp.status === "active",
    );

    if (eventEmployees.length === 0) continue;

    const scanEmployee =
      eventEmployees[Math.floor(Math.random() * eventEmployees.length)];
    const checkInTime =
      ticket.checkInDetails.checkInTime ||
      new Date(
        event.dateSchedule[0].date.getTime() -
          Math.random() * 2 * 60 * 60 * 1000,
      );

    const checkinLog = new CheckinLog({
      ticketId: ticket._id,
      eventId: event._id,
      userId: customer._id,
      employeeId: scanEmployee._id,
      ticketNumber: ticket.ticketNumber,
      attendeeName: ticket.attendeeName,
      checkInTime,
      checkInLocation: ticket.checkInDetails.checkInLocation || "Main Entrance",
      deviceInfo: {
        deviceId: `SCANNER-${Math.floor(Math.random() * 999) + 1}`,
        deviceType: ["mobile", "tablet", "scanner"][
          Math.floor(Math.random() * 3)
        ],
        os: ["iOS", "Android", "Windows"][Math.floor(Math.random() * 3)],
        browser:
          Math.random() > 0.5
            ? ["Chrome", "Safari", "Firefox"][Math.floor(Math.random() * 3)]
            : undefined,
      },
      scanMethod: ["qr_code", "manual_entry", "nfc"][
        Math.floor(Math.random() * 3)
      ],
      status:
        Math.random() > 0.05
          ? "successful"
          : ["failed", "duplicate"][Math.floor(Math.random() * 2)], // 95% successful
      notes:
        Math.random() > 0.8
          ? [
              "VIP guest - expedited entry",
              "Late arrival - after event start",
              "Group check-in processed",
              "Special assistance provided",
              "ID verification completed",
            ][Math.floor(Math.random() * 5)]
          : undefined,
      geoLocation: {
        latitude: event.location?.coordinates?.lat || 25.2048,
        longitude: event.location?.coordinates?.lng || 55.2708,
        accuracy: Math.floor(Math.random() * 10) + 5, // 5-15 meters accuracy
      },
      verificationDetails: {
        idChecked: Math.random() > 0.3, // 70% had ID checked
        photoTaken: Math.random() > 0.7, // 30% had photo taken
        additionalVerification: Math.random() > 0.8, // 20% had additional verification
      },
    });

    checkinLogs.push(await checkinLog.save());

    // Create additional scan attempts for some tickets (duplicate scans, failed attempts)
    if (Math.random() > 0.7) {
      // 30% chance of additional scans
      const additionalScans = Math.floor(Math.random() * 2) + 1;

      for (let i = 0; i < additionalScans; i++) {
        const additionalLog = new CheckinLog({
          ticketId: ticket._id,
          eventId: event._id,
          userId: customer._id,
          employeeId: scanEmployee._id,
          ticketNumber: ticket.ticketNumber,
          attendeeName: ticket.attendeeName,
          checkInTime: new Date(checkInTime.getTime() + (i + 1) * 30000), // 30 seconds later
          checkInLocation:
            ticket.checkInDetails.checkInLocation || "Main Entrance",
          deviceInfo: {
            deviceId: `SCANNER-${Math.floor(Math.random() * 999) + 1}`,
            deviceType: ["mobile", "tablet", "scanner"][
              Math.floor(Math.random() * 3)
            ],
            os: ["iOS", "Android", "Windows"][Math.floor(Math.random() * 3)],
          },
          scanMethod: "qr_code",
          status: "duplicate",
          notes: "Duplicate scan attempt - ticket already checked in",
          geoLocation: {
            latitude:
              (event.location?.coordinates?.lat || 25.2048) +
              (Math.random() - 0.5) * 0.001,
            longitude:
              (event.location?.coordinates?.lng || 55.2708) +
              (Math.random() - 0.5) * 0.001,
            accuracy: Math.floor(Math.random() * 10) + 5,
          },
        });

        checkinLogs.push(await additionalLog.save());
      }
    }
  }

  // Create some failed check-in attempts for non-checked-in tickets
  const nonCheckedInTickets = tickets.filter(
    (ticket) => !ticket.checkInDetails?.isCheckedIn,
  );
  const failedAttempts = Math.min(
    20,
    Math.floor(nonCheckedInTickets.length * 0.1),
  ); // 10% failed attempts

  for (let i = 0; i < failedAttempts; i++) {
    const ticket =
      nonCheckedInTickets[
        Math.floor(Math.random() * nonCheckedInTickets.length)
      ];
    const event = events.find(
      (e) => e._id.toString() === ticket.eventId.toString(),
    );
    const customer = users.find(
      (u) => u._id.toString() === ticket.userId.toString(),
    );

    if (!event || !customer) continue;

    const eventVendors = users.filter((u) => u.role === UserRole.VENDOR);
    const eventEmployees = employees.filter(
      (emp) =>
        eventVendors.some(
          (vendor) => vendor._id.toString() === emp.vendorId.toString(),
        ) &&
        emp.permissions.includes("checkin") &&
        emp.status === "active",
    );

    if (eventEmployees.length === 0) continue;

    const scanEmployee =
      eventEmployees[Math.floor(Math.random() * eventEmployees.length)];

    const failureReasons = [
      "Invalid QR code format",
      "Ticket already used",
      "Event date mismatch",
      "Scanner connectivity issue",
      "Ticket expired",
      "Cancelled ticket",
    ];

    const failedLog = new CheckinLog({
      ticketId: ticket._id,
      eventId: event._id,
      userId: customer._id,
      employeeId: scanEmployee._id,
      ticketNumber: ticket.ticketNumber,
      attendeeName: ticket.attendeeName,
      checkInTime: new Date(
        event.dateSchedule[0].date.getTime() -
          Math.random() * 4 * 60 * 60 * 1000,
      ),
      checkInLocation: "Main Entrance",
      deviceInfo: {
        deviceId: `SCANNER-${Math.floor(Math.random() * 999) + 1}`,
        deviceType: ["mobile", "tablet", "scanner"][
          Math.floor(Math.random() * 3)
        ],
        os: ["iOS", "Android", "Windows"][Math.floor(Math.random() * 3)],
      },
      scanMethod: "qr_code",
      status: "failed",
      notes: failureReasons[Math.floor(Math.random() * failureReasons.length)],
      geoLocation: {
        latitude:
          (event.location?.coordinates?.lat || 25.2048) +
          (Math.random() - 0.5) * 0.001,
        longitude:
          (event.location?.coordinates?.lng || 55.2708) +
          (Math.random() - 0.5) * 0.001,
        accuracy: Math.floor(Math.random() * 15) + 5,
      },
    });

    checkinLogs.push(await failedLog.save());
  }

  logger.info(`${checkinLogs.length} check-in logs created`);
  return checkinLogs;
}

/**
 * Seed popup notifications
 */
async function seedPopups() {
  try {
    await PopupNotification.deleteMany({});
    logger.info("Cleared existing popups");

    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) throw new Error("Admin user not found — run seedUsers first");

    const popups = await PopupNotification.insertMany([
      {
        title: "Welcome to Gema!",
        message: "Discover amazing events happening around you. Browse and book your next experience today.",
        targetAudience: "anonymous",
        targetPages: "all",
        trigger: "pageLoad",
        frequency: "once",
        status: "active",
        isActive: true,
        displayOrder: 1,
        ctaText: "Browse Events",
        ctaLink: "/events",
        createdBy: adminUser._id,
      },
      {
        title: "Complete Your Profile",
        message: "Add your preferences and payment details to unlock personalised recommendations and faster checkout.",
        targetAudience: "authenticated",
        targetPages: "all",
        trigger: "timeDelay",
        triggerValue: 5,
        frequency: "once",
        status: "active",
        isActive: true,
        displayOrder: 2,
        ctaText: "Update Profile",
        ctaLink: "/profile",
        createdBy: adminUser._id,
      },
      {
        title: "Summer Sale — 20% Off",
        message: "Use code SUMMER20 at checkout to save 20% on all events this season. Limited time only!",
        targetAudience: "all",
        targetPages: "all",
        trigger: "scrollPercent",
        triggerValue: 50,
        frequency: "session",
        status: "scheduled",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000),
        isActive: false,
        displayOrder: 3,
        ctaText: "Shop Now",
        ctaLink: "/events",
        createdBy: adminUser._id,
      },
      {
        title: "Join as a Vendor",
        message: "Host your own events on Gema and reach thousands of attendees. Sign up today — it's free!",
        targetAudience: "anonymous",
        targetPages: "all",
        trigger: "exitIntent",
        frequency: "daily",
        status: "inactive",
        isActive: false,
        displayOrder: 4,
        ctaText: "Become a Vendor",
        ctaLink: "/vendor/register",
        createdBy: adminUser._id,
      },
    ]);

    logger.info(`Seeded ${popups.length} popups`);
    return popups;
  } catch (error) {
    console.error("seedPopups failed:", error);
    throw error;
  }
}

/**
 * Seed announcement bars
 */
async function seedAnnouncements() {
  try {
    await AnnouncementBar.deleteMany({});
    logger.info("Cleared existing announcements");

    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) throw new Error("Admin user not found — run seedUsers first");

    const announcements = await AnnouncementBar.insertMany([
      {
        message: "Free shipping on orders over AED 200!",
        backgroundColor: "#1a1a2e",
        textColor: "#ffffff",
        variant: "info",
        status: "active",
        isActive: true,
        displayOrder: 1,
        targetPages: "all",
        isDismissible: true,
        createdBy: adminUser._id,
      },
      {
        message: "Platform maintenance scheduled for Sunday 2 AM — brief downtime expected.",
        backgroundColor: "#1a1a2e",
        textColor: "#ffffff",
        variant: "warning",
        status: "scheduled",
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        isActive: false,
        displayOrder: 2,
        targetPages: "all",
        isDismissible: false,
        createdBy: adminUser._id,
      },
      {
        message: "New: Vendor dashboard analytics are live — track your event performance in real time.",
        backgroundColor: "#1a1a2e",
        textColor: "#ffffff",
        variant: "success",
        status: "active",
        isActive: true,
        displayOrder: 3,
        targetPages: "all",
        isDismissible: true,
        createdBy: adminUser._id,
      },
    ]);

    logger.info(`Seeded ${announcements.length} announcements`);
    return announcements;
  } catch (error) {
    console.error("seedAnnouncements failed:", error);
    throw error;
  }
}

/**
 * Main seed function
 */
async function seed() {
  try {
    // Connect to MongoDB
    await connectDB();

    logger.info("Starting database seeding...");

    // Clear existing data
    await clearData();

    // Seed data in order (respecting dependencies)
    const users = await seedUsers();
    const venues = await seedVenues(users);
    const events = await seedEvents(users, venues);
    const { orders, tickets } = await seedOrdersAndTickets(users, events);
    const reviews = await seedReviews(users, events, orders, venues);
    const employees = await seedEmployees(users, venues);
    const checkinLogs = await seedCheckinLogs(
      users,
      events,
      tickets,
      employees,
    );

    const popups = await seedPopups();
    const announcements = await seedAnnouncements();

    // Update statistics
    await updateEventStats(events, orders, reviews);

    logger.info("Database seeding completed successfully");
    logger.info(`Summary:
      - Users: ${users.length}
      - Venues: ${venues.length}
      - Events: ${events.length}
      - Orders: ${orders.length}
      - Tickets: ${tickets.length}
      - Reviews: ${reviews.length}
      - Employees: ${employees.length}
      - Check-in Logs: ${checkinLogs.length}
      - Popups: ${popups.length}
      - Announcements: ${announcements.length}
    `);

    // Display login credentials
    logger.info("\n🔐 Login Credentials:");
    logger.info("Admin: admin@gema.com / admin123");
    logger.info("Vendor: vendor@gema.com / vendor123");
    logger.info("Customer: customer@gema.com / customer123");

    process.exit(0);
  } catch (error) {
    console.error(
      "Database seeding failed:",
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    );
    process.exit(1);
  }
}

// Run the seed function
seed();
