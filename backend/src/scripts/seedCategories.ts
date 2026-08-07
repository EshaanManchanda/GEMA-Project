import mongoose from "mongoose";
import { Category } from "../models/index";
import { config } from "../config/index";

const MONGODB_URI = config.mongodbUri;

// Top-level categories matching existing event categories
const categories = [
  {
    "name": "Afterschool Activities",
    "slug": "afterschool-activities",
    "description": "Afterschool Activities",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 0,
    "eventCount": 0,
    "seoMeta": {
      "title": "Afterschool Activities in UAE",
      "description": "Discover Afterschool Activities for children across the UAE.",
      "keywords": [
        "afterschool activities",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Arts and Crafts",
    "slug": "arts-and-crafts",
    "description": "Arts and Crafts",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 1,
    "eventCount": 0,
    "seoMeta": {
      "title": "Arts and Crafts in UAE",
      "description": "Discover Arts and Crafts for children across the UAE.",
      "keywords": [
        "arts and crafts",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Baby & Toddler",
    "slug": "baby-toddler",
    "description": "Baby & Toddler",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 2,
    "eventCount": 0,
    "seoMeta": {
      "title": "Baby & Toddler in UAE",
      "description": "Discover Baby & Toddler for children across the UAE.",
      "keywords": [
        "baby & toddler",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Birthday Deals",
    "slug": "birthday-deals",
    "description": "Birthday Deals",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 3,
    "eventCount": 0,
    "seoMeta": {
      "title": "Birthday Deals in UAE",
      "description": "Discover Birthday Deals for children across the UAE.",
      "keywords": [
        "birthday deals",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Career Counselling",
    "slug": "career-counselling",
    "description": "Career Counselling",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 4,
    "eventCount": 0,
    "seoMeta": {
      "title": "Career Counselling in UAE",
      "description": "Discover Career Counselling for children across the UAE.",
      "keywords": [
        "career counselling",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Courses, Camps & Workshops",
    "slug": "courses-camps-workshops",
    "description": "Courses, Camps & Workshops",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 5,
    "eventCount": 0,
    "seoMeta": {
      "title": "Courses, Camps & Workshops in UAE",
      "description": "Discover Courses, Camps & Workshops for children across the UAE.",
      "keywords": [
        "courses, camps & workshops",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Creative Workshops",
    "slug": "creative-workshops",
    "description": "Creative Workshops",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 6,
    "eventCount": 0,
    "seoMeta": {
      "title": "Creative Workshops in UAE",
      "description": "Discover Creative Workshops for children across the UAE.",
      "keywords": [
        "creative workshops",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Cruises",
    "slug": "cruises",
    "description": "Cruises",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 7,
    "eventCount": 0,
    "seoMeta": {
      "title": "Cruises in UAE",
      "description": "Discover Cruises for children across the UAE.",
      "keywords": [
        "cruises",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Discover Something New",
    "slug": "discover-something-new",
    "description": "Discover Something New",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 8,
    "eventCount": 0,
    "seoMeta": {
      "title": "Discover Something New in UAE",
      "description": "Discover Discover Something New for children across the UAE.",
      "keywords": [
        "discover something new",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Eat Out",
    "slug": "eat-out",
    "description": "Eat Out",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 9,
    "eventCount": 0,
    "seoMeta": {
      "title": "Eat Out in UAE",
      "description": "Discover Eat Out for children across the UAE.",
      "keywords": [
        "eat out",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Free for People of Determination",
    "slug": "free-for-people-of-determination",
    "description": "Free for People of Determination",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 10,
    "eventCount": 0,
    "seoMeta": {
      "title": "Free for People of Determination in UAE",
      "description": "Discover Free for People of Determination for children across the UAE.",
      "keywords": [
        "free for people of determination",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Gifts, Shops & Services",
    "slug": "gifts-shops-services",
    "description": "Gifts, Shops & Services",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 11,
    "eventCount": 0,
    "seoMeta": {
      "title": "Gifts, Shops & Services in UAE",
      "description": "Discover Gifts, Shops & Services for children across the UAE.",
      "keywords": [
        "gifts, shops & services",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Hair-Raising and Horrors",
    "slug": "hair-raising-and-horrors",
    "description": "Hair-Raising and Horrors",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 12,
    "eventCount": 0,
    "seoMeta": {
      "title": "Hair-Raising and Horrors in UAE",
      "description": "Discover Hair-Raising and Horrors for children across the UAE.",
      "keywords": [
        "hair-raising and horrors",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Handpicked Experience",
    "slug": "handpicked-experience",
    "description": "Handpicked Experience",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 13,
    "eventCount": 0,
    "seoMeta": {
      "title": "Handpicked Experience in UAE",
      "description": "Discover Handpicked Experience for children across the UAE.",
      "keywords": [
        "handpicked experience",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Immersive Experiences & Exhibits",
    "slug": "immersive-experiences-exhibits",
    "description": "Immersive Experiences & Exhibits",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 14,
    "eventCount": 0,
    "seoMeta": {
      "title": "Immersive Experiences & Exhibits in UAE",
      "description": "Discover Immersive Experiences & Exhibits for children across the UAE.",
      "keywords": [
        "immersive experiences & exhibits",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "KidRated-Places",
    "slug": "kidrated-places",
    "description": "KidRated-Places",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 15,
    "eventCount": 0,
    "seoMeta": {
      "title": "KidRated-Places in UAE",
      "description": "Discover KidRated-Places for children across the UAE.",
      "keywords": [
        "kidrated-places",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Looking for Childcare?",
    "slug": "looking-for-childcare",
    "description": "Looking for Childcare?",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 16,
    "eventCount": 0,
    "seoMeta": {
      "title": "Looking for Childcare? in UAE",
      "description": "Discover Looking for Childcare? for children across the UAE.",
      "keywords": [
        "looking for childcare?",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Markets & Fairs",
    "slug": "markets-fairs",
    "description": "Markets & Fairs",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 17,
    "eventCount": 0,
    "seoMeta": {
      "title": "Markets & Fairs in UAE",
      "description": "Discover Markets & Fairs for children across the UAE.",
      "keywords": [
        "markets & fairs",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Museum & Culture",
    "slug": "museum-culture",
    "description": "Museum & Culture",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 18,
    "eventCount": 0,
    "seoMeta": {
      "title": "Museum & Culture in UAE",
      "description": "Discover Museum & Culture for children across the UAE.",
      "keywords": [
        "museum & culture",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Mystery, Games & Puzzles",
    "slug": "mystery-games-puzzles",
    "description": "Mystery, Games & Puzzles",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 19,
    "eventCount": 0,
    "seoMeta": {
      "title": "Mystery, Games & Puzzles in UAE",
      "description": "Discover Mystery, Games & Puzzles for children across the UAE.",
      "keywords": [
        "mystery, games & puzzles",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Outdoor & Nature",
    "slug": "outdoor-nature",
    "description": "Outdoor & Nature",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 20,
    "eventCount": 0,
    "seoMeta": {
      "title": "Outdoor & Nature in UAE",
      "description": "Discover Outdoor & Nature for children across the UAE.",
      "keywords": [
        "outdoor & nature",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Outdoor Adventures",
    "slug": "outdoor-adventures",
    "description": "Outdoor Adventures",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 21,
    "eventCount": 0,
    "seoMeta": {
      "title": "Outdoor Adventures in UAE",
      "description": "Discover Outdoor Adventures for children across the UAE.",
      "keywords": [
        "outdoor adventures",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Parent Zone",
    "slug": "parent-zone",
    "description": "Parent Zone",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 22,
    "eventCount": 0,
    "seoMeta": {
      "title": "Parent Zone in UAE",
      "description": "Discover Parent Zone for children across the UAE.",
      "keywords": [
        "parent zone",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Picks of the Week",
    "slug": "picks-of-the-week",
    "description": "Picks of the Week",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 23,
    "eventCount": 0,
    "seoMeta": {
      "title": "Picks of the Week in UAE",
      "description": "Discover Picks of the Week for children across the UAE.",
      "keywords": [
        "picks of the week",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Pool, Brunch & More",
    "slug": "pool-brunch-more",
    "description": "Pool, Brunch & More",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 24,
    "eventCount": 0,
    "seoMeta": {
      "title": "Pool, Brunch & More in UAE",
      "description": "Discover Pool, Brunch & More for children across the UAE.",
      "keywords": [
        "pool, brunch & more",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "School & Nurseries",
    "slug": "school-nurseries",
    "description": "School & Nurseries",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 25,
    "eventCount": 0,
    "seoMeta": {
      "title": "School & Nurseries in UAE",
      "description": "Discover School & Nurseries for children across the UAE.",
      "keywords": [
        "school & nurseries",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Sports & Active",
    "slug": "sports-active",
    "description": "Sports & Active",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 26,
    "eventCount": 0,
    "seoMeta": {
      "title": "Sports & Active in UAE",
      "description": "Discover Sports & Active for children across the UAE.",
      "keywords": [
        "sports & active",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Student Exchange Programs",
    "slug": "student-exchange-programs",
    "description": "Student Exchange Programs",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 27,
    "eventCount": 0,
    "seoMeta": {
      "title": "Student Exchange Programs in UAE",
      "description": "Discover Student Exchange Programs for children across the UAE.",
      "keywords": [
        "student exchange programs",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Teens",
    "slug": "teens",
    "description": "Teens",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 28,
    "eventCount": 0,
    "seoMeta": {
      "title": "Teens in UAE",
      "description": "Discover Teens for children across the UAE.",
      "keywords": [
        "teens",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Themed Parks & Attractions",
    "slug": "themed-parks-attractions",
    "description": "Themed Parks & Attractions",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 29,
    "eventCount": 0,
    "seoMeta": {
      "title": "Themed Parks & Attractions in UAE",
      "description": "Discover Themed Parks & Attractions for children across the UAE.",
      "keywords": [
        "themed parks & attractions",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Top Attractions in Dubai",
    "slug": "top-attractions-in-dubai",
    "description": "Top Attractions in Dubai",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 30,
    "eventCount": 0,
    "seoMeta": {
      "title": "Top Attractions in Dubai in UAE",
      "description": "Discover Top Attractions in Dubai for children across the UAE.",
      "keywords": [
        "top attractions in dubai",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Top Experiences",
    "slug": "top-experiences",
    "description": "Top Experiences",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 31,
    "eventCount": 0,
    "seoMeta": {
      "title": "Top Experiences in UAE",
      "description": "Discover Top Experiences for children across the UAE.",
      "keywords": [
        "top experiences",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Top Kid Playzone",
    "slug": "top-kid-playzone",
    "description": "Top Kid Playzone",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 32,
    "eventCount": 0,
    "seoMeta": {
      "title": "Top Kid Playzone in UAE",
      "description": "Discover Top Kid Playzone for children across the UAE.",
      "keywords": [
        "top kid playzone",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Tours & Excursions",
    "slug": "tours-excursions",
    "description": "Tours & Excursions",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 33,
    "eventCount": 0,
    "seoMeta": {
      "title": "Tours & Excursions in UAE",
      "description": "Discover Tours & Excursions for children across the UAE.",
      "keywords": [
        "tours & excursions",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Waterparks & Splash Fun",
    "slug": "waterparks-splash-fun",
    "description": "Waterparks & Splash Fun",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 34,
    "eventCount": 0,
    "seoMeta": {
      "title": "Waterparks & Splash Fun in UAE",
      "description": "Discover Waterparks & Splash Fun for children across the UAE.",
      "keywords": [
        "waterparks & splash fun",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Winter Camps",
    "slug": "winter-camps",
    "description": "Winter Camps",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 35,
    "eventCount": 0,
    "seoMeta": {
      "title": "Winter Camps in UAE",
      "description": "Discover Winter Camps for children across the UAE.",
      "keywords": [
        "winter camps",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Zoo & Animals",
    "slug": "zoo-animals",
    "description": "Zoo & Animals",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 36,
    "eventCount": 0,
    "seoMeta": {
      "title": "Zoo & Animals in UAE",
      "description": "Discover Zoo & Animals for children across the UAE.",
      "keywords": [
        "zoo & animals",
        "kids",
        "UAE"
      ]
    }
  },
  {
    "name": "Enjoy a Pool Day",
    "slug": "enjoy-a-pool-day",
    "description": "Enjoy a Pool Day",
    "icon": "✨",
    "color": "#00B894",
    "isActive": true,
    "level": 0,
    "sortOrder": 37,
    "eventCount": 0,
    "seoMeta": {
      "title": "Enjoy a Pool Day in UAE",
      "description": "Discover Enjoy a Pool Day for children across the UAE.",
      "keywords": [
        "enjoy a pool day",
        "kids",
        "UAE"
      ]
    }
  }
];

async function seedCategories() {
  try {
    console.log("🌱 Starting category seeding...");
    console.log(
      `📡 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`,
    );

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing categories (optional - comment out to preserve existing)
    console.log("🗑️  Clearing existing categories...");
    await Category.deleteMany({ level: 0 });
    console.log("✅ Existing categories cleared");

    // Insert categories
    console.log(`📝 Inserting ${categories.length} categories...`);
    const createdCategories = await Category.insertMany(categories);
    console.log(
      `✅ Successfully created ${createdCategories.length} categories:`,
    );

    createdCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.icon} ${cat.name} (${cat.slug})`);
    });

    console.log("\n🎉 Category seeding completed successfully!");
    console.log(`📊 Total categories: ${createdCategories.length}`);
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("👋 Database connection closed");
    process.exit(0);
  }
}

// Run seeder if executed directly
if (require.main === module) {
  seedCategories();
}

export default seedCategories;
