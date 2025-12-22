import mongoose from 'mongoose';
import { Banner, User, MediaAsset } from '../models/index';
import { config } from '../config/index';
import { v4 as uuidv4 } from 'uuid';

const MONGODB_URI = config.mongodbUri;

// Banner placeholder images (Unsplash)
const bannerImages = [
  {
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=600&fit=crop',
    title: 'hero-banner-1',
    alt: 'Kids playing at an event'
  },
  {
    url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1920&h=600&fit=crop',
    title: 'hero-banner-2',
    alt: 'Children enjoying activities'
  },
  {
    url: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=1920&h=600&fit=crop',
    title: 'promo-banner-1',
    alt: 'Family fun event'
  },
  {
    url: 'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?w=1920&h=600&fit=crop',
    title: 'secondary-banner-1',
    alt: 'Kids activities and events'
  }
];

async function seedBanners() {
  try {
    console.log('🌱 Starting banner seeding...');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get admin user for createdBy field
    console.log('👤 Finding admin user...');
    const adminUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });

    if (!adminUser) {
      console.error('❌ No admin user found. Please run main seed script first (npm run db:seed)');
      process.exit(1);
    }
    console.log(`✅ Found admin user: ${adminUser.email}`);

    // Clear existing banners
    console.log('🗑️  Clearing existing banners and related media assets...');
    const existingBanners = await Banner.find();
    const existingMediaAssetIds = existingBanners.map(b => b.imageAsset);
    await MediaAsset.deleteMany({ _id: { $in: existingMediaAssetIds }, category: 'misc' });
    await Banner.deleteMany({});
    console.log('✅ Existing banners cleared');

    // Create MediaAsset entries for banner images
    console.log(`📷 Creating ${bannerImages.length} media assets...`);
    const mediaAssets = await MediaAsset.insertMany(
      bannerImages.map((img, index) => ({
        uuid: uuidv4(),
        filename: `${img.title}.jpg`,
        originalName: `${img.title}.jpg`,
        mimeType: 'image/jpeg',
        fileExtension: 'jpg',
        provider: 'cloudinary',
        url: img.url,
        publicId: `banners/${img.title}`,
        cloudinaryFolder: 'banners',
        size: 500000, // 500KB estimate
        width: 1920,
        height: 600,
        category: 'misc',
        folder: 'banners.upload',
        tags: ['banner', 'hero', 'promotional'],
        usedBy: [],
        usageCount: 0,
        uploadedBy: adminUser._id,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    );
    console.log(`✅ Created ${mediaAssets.length} media assets`);

    // Create banners
    const banners = [
      {
        title: 'Discover Amazing Kids Activities',
        description: 'Find the perfect events and activities for your children across UAE',
        imageAsset: mediaAssets[0]._id,
        link: '/search',
        ctaText: 'Explore Now',
        ctaLink: '/search',
        displayOrder: 0,
        status: 'active' as const,
        startDate: new Date(),
        endDate: null,
        isActive: true,
        titleVisible: true,
        createdBy: adminUser._id
      },
      {
        title: 'Book Events Today',
        description: 'Secure your spot at the most popular kids events in Dubai and Abu Dhabi',
        imageAsset: mediaAssets[1]._id,
        link: '/search?featured=true',
        ctaText: 'View Featured',
        ctaLink: '/search?featured=true',
        displayOrder: 1,
        status: 'active' as const,
        startDate: new Date(),
        endDate: null,
        isActive: true,
        titleVisible: true,
        createdBy: adminUser._id
      },
      {
        title: 'Weekend Special Events',
        description: 'Check out our handpicked weekend activities for families',
        imageAsset: mediaAssets[2]._id,
        link: '/search?collection=handpicked',
        ctaText: 'See Events',
        ctaLink: '/search?collection=handpicked',
        displayOrder: 2,
        status: 'active' as const,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
        titleVisible: true,
        createdBy: adminUser._id
      },
      {
        title: 'Educational Workshops & Classes',
        description: 'Enrich your child\'s learning with expert-led workshops',
        imageAsset: mediaAssets[3]._id,
        link: '/search?category=education',
        ctaText: 'Browse Classes',
        ctaLink: '/search?category=education',
        displayOrder: 3,
        status: 'active' as const,
        startDate: new Date(),
        endDate: null,
        isActive: true,
        titleVisible: false,
        createdBy: adminUser._id
      }
    ];

    console.log(`📝 Creating ${banners.length} banners...`);
    const createdBanners = await Banner.insertMany(banners);
    console.log(`✅ Successfully created ${createdBanners.length} banners:`);

    createdBanners.forEach((banner, index) => {
      console.log(`   ${index + 1}. "${banner.title}" (${banner.status}, order: ${banner.displayOrder})`);
    });

    // Update MediaAsset usage tracking
    console.log('🔗 Updating media asset usage tracking...');
    for (const banner of createdBanners) {
      await MediaAsset.updateOne(
        { _id: banner.imageAsset },
        {
          $push: {
            usedBy: {
              model: 'Banner' as any,
              field: 'imageAsset',
              documentId: banner._id
            }
          },
          $inc: { usageCount: 1 }
        }
      );
    }
    console.log('✅ Media asset usage tracking updated');

    console.log('\n🎉 Banner seeding completed successfully!');
    console.log(`📊 Total banners: ${createdBanners.length}`);
    console.log(`📷 Total media assets: ${mediaAssets.length}`);

  } catch (error) {
    console.error('❌ Error seeding banners:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

// Run seeder if executed directly
if (require.main === module) {
  seedBanners();
}

export default seedBanners;
