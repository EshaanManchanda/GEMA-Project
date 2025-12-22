import mongoose from 'mongoose';
import { Category } from '../models/index';
import { config } from '../config/index';

const MONGODB_URI = config.mongodbUri;

// Top-level categories matching existing event categories
const categories = [
  {
    name: 'Entertainment',
    slug: 'entertainment',
    description: 'Fun entertainment activities and events for kids and families',
    icon: '🎭',
    color: '#FF6B35',
    isActive: true,
    level: 0,
    sortOrder: 0,
    eventCount: 0,
    seoMeta: {
      title: 'Entertainment Events for Kids in UAE',
      description: 'Discover amazing entertainment events and activities for children across Dubai, Abu Dhabi, and the UAE.',
      keywords: ['entertainment', 'kids events', 'family fun', 'UAE activities']
    }
  },
  {
    name: 'Education',
    slug: 'education',
    description: 'Educational workshops, classes, and learning experiences',
    icon: '📚',
    color: '#4ECDC4',
    isActive: true,
    level: 0,
    sortOrder: 1,
    eventCount: 0,
    seoMeta: {
      title: 'Educational Activities for Kids in UAE',
      description: 'Browse educational workshops, classes, and learning experiences for children in Dubai and UAE.',
      keywords: ['education', 'learning', 'workshops', 'kids classes']
    }
  },
  {
    name: 'Sports',
    slug: 'sports',
    description: 'Sports activities, training, and athletic programs for kids',
    icon: '⚽',
    color: '#45B7D1',
    isActive: true,
    level: 0,
    sortOrder: 2,
    eventCount: 0,
    seoMeta: {
      title: 'Sports Activities for Kids in UAE',
      description: 'Find sports activities, training sessions, and athletic programs for children across the UAE.',
      keywords: ['sports', 'athletics', 'kids sports', 'training']
    }
  },
  {
    name: 'Arts',
    slug: 'arts',
    description: 'Arts, crafts, and creative activities for children',
    icon: '🎨',
    color: '#FD79A8',
    isActive: true,
    level: 0,
    sortOrder: 3,
    eventCount: 0,
    seoMeta: {
      title: 'Arts & Crafts for Kids in UAE',
      description: 'Explore creative arts, crafts, and artistic activities for children in Dubai and UAE.',
      keywords: ['arts', 'crafts', 'creative', 'kids art']
    }
  },
  {
    name: 'Adventure',
    slug: 'adventure',
    description: 'Outdoor adventures and exciting experiences for kids',
    icon: '🏕️',
    color: '#00B894',
    isActive: true,
    level: 0,
    sortOrder: 4,
    eventCount: 0,
    seoMeta: {
      title: 'Adventure Activities for Kids in UAE',
      description: 'Discover thrilling outdoor adventures and exciting experiences for children in the UAE.',
      keywords: ['adventure', 'outdoor', 'kids activities', 'experiences']
    }
  },
  {
    name: 'Music',
    slug: 'music',
    description: 'Music classes, concerts, and musical events for children',
    icon: '🎵',
    color: '#6C5CE7',
    isActive: true,
    level: 0,
    sortOrder: 5,
    eventCount: 0,
    seoMeta: {
      title: 'Music Activities for Kids in UAE',
      description: 'Browse music classes, concerts, and musical events for children in Dubai and UAE.',
      keywords: ['music', 'concerts', 'kids music', 'music classes']
    }
  },
  {
    name: 'Technology',
    slug: 'technology',
    description: 'Tech workshops, coding classes, and STEM activities',
    icon: '💻',
    color: '#F9CA24',
    isActive: true,
    level: 0,
    sortOrder: 6,
    eventCount: 0,
    seoMeta: {
      title: 'Technology & STEM for Kids in UAE',
      description: 'Find technology workshops, coding classes, and STEM activities for children in the UAE.',
      keywords: ['technology', 'coding', 'STEM', 'kids tech']
    }
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Health, wellness, and fitness activities for kids',
    icon: '🧘‍♀️',
    color: '#E17055',
    isActive: true,
    level: 0,
    sortOrder: 7,
    eventCount: 0,
    seoMeta: {
      title: 'Health & Wellness for Kids in UAE',
      description: 'Explore health, wellness, and fitness activities designed for children in Dubai and UAE.',
      keywords: ['health', 'wellness', 'fitness', 'kids health']
    }
  }
];

async function seedCategories() {
  try {
    console.log('🌱 Starting category seeding...');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing categories (optional - comment out to preserve existing)
    console.log('🗑️  Clearing existing categories...');
    await Category.deleteMany({ level: 0 });
    console.log('✅ Existing categories cleared');

    // Insert categories
    console.log(`📝 Inserting ${categories.length} categories...`);
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Successfully created ${createdCategories.length} categories:`);

    createdCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.icon} ${cat.name} (${cat.slug})`);
    });

    console.log('\n🎉 Category seeding completed successfully!');
    console.log(`📊 Total categories: ${createdCategories.length}`);

  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

// Run seeder if executed directly
if (require.main === module) {
  seedCategories();
}

export default seedCategories;
