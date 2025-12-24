import mongoose from 'mongoose';
import { SEOContent, User } from '../models/index';
import { config } from '../config/index';

const MONGODB_URI = config.mongodbUri;

// Default SEO content for all pages
const seoContentData = [
  {
    page: 'homepage',
    metaTitle: 'Kids Events & Activities in UAE - Kidrove',
    metaDescription: 'Find the best kids events, activities, and entertainment in Dubai & UAE. Book tickets for educational workshops, sports, arts, and family fun experiences.',
    keywords: ['kids events UAE', 'Dubai children activities', 'family events', 'kids workshops', 'entertainment Dubai', 'educational activities', 'kids parties UAE'],
    faqItems: [
      {
        question: 'What types of events can I find on Kidrove?',
        answer: 'Kidrove offers a wide variety of events including educational workshops, sports activities, arts & crafts, entertainment shows, music classes, technology camps, and adventure experiences for children of all ages across the UAE.',
        category: 'Events'
      },
      {
        question: 'How do I book tickets for events?',
        answer: 'Simply browse our events, select the one you like, choose your preferred date and number of tickets, and complete the secure checkout process. You\'ll receive your tickets via email instantly.',
        category: 'Booking'
      },
      {
        question: 'Are the events suitable for all age groups?',
        answer: 'Each event listing clearly specifies the recommended age range. We offer activities for toddlers, preschoolers, school-age children, and teenagers, so you can easily find age-appropriate events for your kids.',
        category: 'Events'
      }
    ],
    features: [
      {
        title: 'Discover Events',
        description: 'Browse hundreds of curated kids events and activities across Dubai, Abu Dhabi, and the UAE. From educational workshops to entertainment shows.',
        icon: '🔍'
      },
      {
        title: 'Easy Booking',
        description: 'Secure online booking with instant confirmation. Get your e-tickets delivered directly to your email.',
        icon: '🎫'
      },
      {
        title: 'Trusted Vendors',
        description: 'All event organizers are verified and trusted. Read reviews from other parents before booking.',
        icon: '✅'
      },
      {
        title: 'Family-Friendly',
        description: 'Every event is carefully selected to ensure safe, fun, and enriching experiences for children and families.',
        icon: '👨‍👩‍👧‍👦'
      }
    ],
    trustSignals: {
      yearsInBusiness: 5,
      certifications: ['ISO 9001:2015', 'Child Safety Certified'],
      awards: ['Best Kids Events Platform UAE 2024', 'Parents Choice Award 2023']
    },
    isActive: true
  },
  {
    page: 'about',
    metaTitle: 'About Kidrove - Trusted Kids Events Platform UAE',
    metaDescription: 'Learn about Kidrove\'s mission to connect families with the best kids events and activities in the UAE. Trusted by thousands of parents across Dubai.',
    keywords: ['about Kidrove', 'kids events platform', 'family activities UAE', 'event booking platform', 'Dubai kids activities'],
    faqItems: [
      {
        question: 'What is Kidrove\'s mission?',
        answer: 'Our mission is to make it easy for parents to discover and book enriching events and activities for their children. We connect families with trusted event organizers to create memorable experiences.',
        category: 'Company'
      },
      {
        question: 'How does Kidrove ensure quality?',
        answer: 'We carefully vet all event organizers, monitor reviews and ratings, and maintain strict quality standards. Our team personally reviews each event listing to ensure it meets our criteria for safety and educational value.',
        category: 'Quality'
      },
      {
        question: 'Can event organizers list their events on Kidrove?',
        answer: 'Yes! We welcome event organizers to join our platform. Simply create a vendor account, complete the verification process, and start listing your events to reach thousands of families.',
        category: 'Vendors'
      }
    ],
    features: [
      {
        title: 'Curated Selection',
        description: 'Every event on our platform is carefully reviewed and selected to ensure quality, safety, and educational value for children.',
        icon: '⭐'
      },
      {
        title: 'Parent Community',
        description: 'Join thousands of parents who trust Kidrove to find the best activities for their children across the UAE.',
        icon: '👥'
      },
      {
        title: 'Expert Support',
        description: 'Our dedicated customer support team is here to help with bookings, questions, and ensuring smooth event experiences.',
        icon: '💬'
      }
    ],
    trustSignals: {
      yearsInBusiness: 5,
      certifications: ['ISO 9001:2015', 'Data Privacy Certified', 'Child Safety Standards'],
      awards: ['Excellence in Family Entertainment 2024', 'Innovation in EdTech Award']
    },
    isActive: true
  },
  {
    page: 'contact',
    metaTitle: 'Contact Kidrove - Kids Events Support',
    metaDescription: 'Need help? Contact Kidrove support team for assistance with bookings, event questions, or vendor inquiries. Available 7 days a week.',
    keywords: ['contact Kidrove', 'customer support', 'help desk', 'event booking help', 'vendor inquiries UAE'],
    faqItems: [
      {
        question: 'How can I contact customer support?',
        answer: 'You can reach us via email at support@kidrove.com, call us during business hours, or use the contact form on this page. We typically respond within 2-4 hours during business days.',
        category: 'Support'
      },
      {
        question: 'What are your support hours?',
        answer: 'Our customer support team is available Sunday to Thursday from 9 AM to 6 PM GST, and Saturday from 10 AM to 4 PM. We\'re closed on Fridays but respond to urgent emails.',
        category: 'Support'
      },
      {
        question: 'How do I report an issue with my booking?',
        answer: 'For booking issues, please email us at support@kidrove.com with your order number and details. For urgent matters on the day of an event, call our hotline.',
        category: 'Booking'
      },
      {
        question: 'Can vendors contact you for partnership opportunities?',
        answer: 'Absolutely! Event organizers and venue partners can reach us at vendors@kidrove.com or use the vendor inquiry form. We\'re always looking to partner with quality providers.',
        category: 'Vendors'
      }
    ],
    features: [
      {
        title: 'Fast Response',
        description: 'Our support team responds to all inquiries within 2-4 hours during business days. Urgent issues are prioritized.',
        icon: '⚡'
      },
      {
        title: 'Multiple Channels',
        description: 'Reach us via email, phone, WhatsApp, or our contact form. Choose the method that works best for you.',
        icon: '📞'
      },
      {
        title: 'Dedicated Support',
        description: 'Separate support channels for parents and vendors to ensure specialized assistance for your specific needs.',
        icon: '🎯'
      }
    ],
    trustSignals: {
      yearsInBusiness: 5,
      certifications: ['Customer Service Excellence', 'ISO 9001:2015'],
      awards: ['Best Customer Support Platform 2024']
    },
    isActive: true
  }
];

async function seedSEOContent() {
  try {
    console.log('🌱 Starting SEO content seeding...');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get admin user for updatedBy field
    console.log('👤 Finding admin user...');
    const adminUser = await User.findOne({ email: 'admin@gema.com' });
    if (!adminUser) {
      throw new Error('Admin user not found. Please run main seed script first (npm run db:seed)');
    }
    console.log(`✅ Found admin user: ${adminUser.firstName} ${adminUser.lastName}`);

    // Clear existing SEO content
    console.log('🗑️  Clearing existing SEO content...');
    await SEOContent.deleteMany({});
    console.log('✅ Existing SEO content cleared');

    // Add updatedBy to all content items
    const contentWithUser = seoContentData.map(content => ({
      ...content,
      updatedBy: adminUser._id
    }));

    // Insert SEO content
    console.log(`📝 Inserting ${contentWithUser.length} SEO content items...`);
    const createdContent = await SEOContent.insertMany(contentWithUser);
    console.log(`✅ Successfully created ${createdContent.length} SEO content items:`);

    createdContent.forEach((content, index) => {
      console.log(`   ${index + 1}. ${content.page} - "${content.metaTitle}"`);
      console.log(`      Keywords: ${content.keywords.length} | FAQs: ${content.faqItems.length} | Features: ${content.features.length}`);
    });

    console.log('\n🎉 SEO content seeding completed successfully!');
    console.log(`📊 Total items: ${createdContent.length}`);
    console.log('\n💡 You can now access SEO content via:');
    console.log('   GET /api/seo-content/homepage');
    console.log('   GET /api/seo-content/about');
    console.log('   GET /api/seo-content/contact');

  } catch (error) {
    console.error('❌ Error seeding SEO content:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

// Run seeder if executed directly
if (require.main === module) {
  seedSEOContent();
}

export default seedSEOContent;
