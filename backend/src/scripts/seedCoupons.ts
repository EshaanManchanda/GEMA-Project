import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Coupon } from '../models/index';
import { config } from '../config/index';

const MONGODB_URI = config.mongodbUri;

const seedCoupons = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read coupon data from JSON file
    const couponDataPath = path.join(__dirname, '../../../gema.coupons.json');
    const couponData = JSON.parse(fs.readFileSync(couponDataPath, 'utf-8'));
    console.log(`📄 Found ${couponData.length} coupons to import`);

    // Clear existing coupons
    const deleteResult = await Coupon.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing coupons`);

    // Import new coupons
    let imported = 0;
    const failed: string[] = [];

    for (const couponRecord of couponData) {
      try {
        await Coupon.create(couponRecord);
        console.log(`✨ Imported: ${couponRecord.code} (${couponRecord.name})`);
        imported++;
      } catch (error: any) {
        console.error(`❌ Failed to import: ${couponRecord.code} - ${error.message}`);
        failed.push(couponRecord.code);
      }
    }

    console.log('\n✅ Import complete!');
    console.log(`   - Successfully imported: ${imported} coupons`);
    if (failed.length > 0) {
      console.log(`   - Failed: ${failed.length} coupons (${failed.join(', ')})`);
    }

    // Close connection
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding coupons:', error);
    process.exit(1);
  }
};

seedCoupons();
