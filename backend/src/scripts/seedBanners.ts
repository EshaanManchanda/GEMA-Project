import mongoose from 'mongoose';
import { Banner, User, MediaAsset } from '../models/index';
import { config } from '../config/index';
import { v4 as uuidv4 } from 'uuid';
import cloudinary from '../config/cloudinary';

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
    // Upload each image to Cloudinary and create MediaAsset documents
    console.log(`📷 Uploading ${bannerImages.length} images to Cloudinary...`);
    const mediaAssets: any[] = [];

    for (const img of bannerImages) {
      try {
        console.log(`  ⬆️  Uploading: ${img.title} from ${img.url.substring(0, 50)}...`);

        // Upload image URL directly to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(img.url, {
          folder: 'gema/banners',
          resource_type: 'image',
          use_filename: false,
          unique_filename: true,
          overwrite: false,
          public_id: `banner-${img.title}`,
          tags: ['banner', 'hero', 'promotional', 'seeded']
        });

        console.log(`  ✅ Uploaded to Cloudinary: ${uploadResult.public_id}`);

        // Generate UUID for secure access
        const uuid = uuidv4();
        const baseUrl = config.upload.baseUrl || process.env.BASE_URL || 'http://localhost:5001';

        // Create MediaAsset document with real Cloudinary data
        const asset = await MediaAsset.create({
          uuid,
          filename: `${img.title}.jpg`,
          originalName: `${img.title}.jpg`,
          mimeType: uploadResult.format === 'jpg' ? 'image/jpeg' : `image/${uploadResult.format}`,
          fileExtension: `.${uploadResult.format}`,
          provider: 'cloudinary',
          url: `${baseUrl}/api/media/file/${uuid}`, // UUID proxy URL
          publicId: uploadResult.public_id, // Real Cloudinary publicId
          cloudinaryFolder: 'gema/banners',
          size: uploadResult.bytes,
          width: uploadResult.width,
          height: uploadResult.height,
          category: 'misc',
          folder: 'banners.upload',
          tags: ['banner', 'hero', 'promotional'],
          usedBy: [],
          usageCount: 0,
          uploadedBy: adminUser._id,
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        mediaAssets.push(asset);
        console.log(`  ✅ Created MediaAsset: ${asset.filename} (UUID: ${uuid})`);

      } catch (error: any) {
        console.error(`  ❌ Failed to upload ${img.title}:`, error.message);
        // Continue with next image even if one fails
      }
    }

    console.log(`✅ Successfully uploaded and created ${mediaAssets.length}/${bannerImages.length} media assets`);

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
