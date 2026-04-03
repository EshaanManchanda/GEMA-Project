require('dotenv').config();
const mongoose = require('mongoose');

async function updateVendor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gema');
    console.log('✓ Connected to MongoDB');

    const result = await mongoose.connection.db.collection('vendors').updateOne(
      { email: 'affiliate@gema-system.com' },
      { $set: { businessName: 'Platform Affiliate' } }
    );

    console.log('✅ Updated:', result.modifiedCount, 'vendor(s)');

    // Verify the update
    const vendor = await mongoose.connection.db.collection('vendors').findOne({ email: 'affiliate@gema-system.com' });
    console.log('Verified - Business Name:', vendor.businessName);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateVendor();
