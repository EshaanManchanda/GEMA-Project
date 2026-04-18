import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Vendor } from "../models/index";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function updateAffiliateVendorName() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/gema";
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");

    // Find and update affiliate vendor
    const vendor = await Vendor.findOne({ email: "affiliate@gema-system.com" });

    if (!vendor) {
      console.log("❌ Affiliate vendor not found");
      await mongoose.disconnect();
      return;
    }

    console.log("Found vendor:", vendor.businessName);

    vendor.businessName = "Platform Affiliate";
    await vendor.save();

    console.log('✅ Successfully updated vendor name to "Platform Affiliate"');
    console.log("Vendor ID:", vendor._id);
    console.log("Business Name:", vendor.businessName);
    console.log("Email:", vendor.email);

    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error updating affiliate vendor:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateAffiliateVendorName();
}

export default updateAffiliateVendorName;
